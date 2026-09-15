import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../app";
import { prisma } from "../infrastructure/db/prisma";
import { signAccessToken } from "../shared/utils/jwt";
import { createTenantFixture } from "./support/tenant.fixture";
import { resetTestDatabase } from "./support/test-database";

type Fixture = Awaited<ReturnType<typeof createTenantFixture>>;

let fixture: Fixture;
let trainerToken: string;

beforeEach(async () => {
  await resetTestDatabase(prisma);
  fixture = await createTenantFixture(prisma);
  trainerToken = signAccessToken({
    userId: fixture.trainerA.userId,
    email: "trainer-a@fitpro.test",
    role: "TRAINER",
    authVersion: 1,
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

const trainerAuth = () => ({ Authorization: `Bearer ${trainerToken}` });
const replacementPayload = () => ({
  studentId: fixture.studentA.id,
  planId: fixture.plan.id,
  replacesSubscriptionId: fixture.subscription.id,
  startDate: "2026-09-14T12:00:00.000Z",
  totalAmount: 100.01,
  installmentCount: 3,
  frequency: "MONTHLY",
});

describe("reemplazo atómico de suscripciones", () => {
  it("cancela la suscripción anterior y todas sus cuotas cobrables", async () => {
    await request(app)
      .post("/api/subscriptions")
      .set(trainerAuth())
      .send(replacementPayload())
      .expect(201);

    expect(
      await prisma.subscription.findUniqueOrThrow({
        where: { id: fixture.subscription.id },
        select: { status: true },
      })
    ).toEqual({ status: "CANCELLED" });
    expect(
      await prisma.installment.findMany({
        where: { subscriptionId: fixture.subscription.id },
        select: { status: true },
      })
    ).toEqual([{ status: "CANCELLED" }]);

    const active = await prisma.subscription.findFirstOrThrow({
      where: { studentId: fixture.studentA.id, status: "ACTIVE" },
      include: { installments: { orderBy: { number: "asc" } } },
    });
    expect(active.installments).toHaveLength(3);
    expect(
      active.installments.reduce(
        (sum, item) => sum + Math.round(Number(item.amount) * 100),
        0
      )
    ).toBe(10_001);
  });

  it("revierte la cancelación si falla la creación de cuotas", async () => {
    await prisma.$executeRawUnsafe(`
      CREATE FUNCTION reject_test_installment() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'controlled installment failure';
      END;
      $$ LANGUAGE plpgsql
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER reject_test_installment_trigger
      BEFORE INSERT ON "Installment"
      FOR EACH ROW EXECUTE FUNCTION reject_test_installment()
    `);

    try {
      await request(app)
        .post("/api/subscriptions")
        .set(trainerAuth())
        .send(replacementPayload())
        .expect(500);
    } finally {
      await prisma.$executeRawUnsafe(
        `DROP TRIGGER IF EXISTS reject_test_installment_trigger ON "Installment"`
      );
      await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS reject_test_installment()`);
    }

    expect(
      await prisma.subscription.findUniqueOrThrow({
        where: { id: fixture.subscription.id },
        select: { status: true },
      })
    ).toEqual({ status: "ACTIVE" });
    expect(
      await prisma.installment.findFirstOrThrow({
        where: { subscriptionId: fixture.subscription.id },
        select: { status: true },
      })
    ).toEqual({ status: "PENDING" });
    expect(
      await prisma.subscription.count({
        where: { studentId: fixture.studentA.id },
      })
    ).toBe(1);
  });

  it("acepta un solo reemplazo cuando llegan dos solicitudes simultáneas", async () => {
    const responses = await Promise.all([
      request(app).post("/api/subscriptions").set(trainerAuth()).send(replacementPayload()),
      request(app).post("/api/subscriptions").set(trainerAuth()).send(replacementPayload()),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(
      await prisma.subscription.count({
        where: { studentId: fixture.studentA.id, status: "ACTIVE" },
      })
    ).toBe(1);
  });

  it("rechaza reemplazos que no identifican la suscripción activa", async () => {
    const { replacesSubscriptionId: _ignored, ...payload } = replacementPayload();

    await request(app)
      .post("/api/subscriptions")
      .set(trainerAuth())
      .send(payload)
      .expect(409);

    expect(
      await prisma.subscription.findUniqueOrThrow({
        where: { id: fixture.subscription.id },
        select: { status: true },
      })
    ).toEqual({ status: "ACTIVE" });
    expect(
      await prisma.installment.findFirstOrThrow({
        where: { subscriptionId: fixture.subscription.id },
        select: { status: true },
      })
    ).toEqual({ status: "PENDING" });
  });

  it("permite la primera asignación sin identificador de reemplazo", async () => {
    await prisma.$transaction([
      prisma.installment.updateMany({
        where: { subscriptionId: fixture.subscription.id },
        data: { status: "CANCELLED" },
      }),
      prisma.subscription.update({
        where: { id: fixture.subscription.id },
        data: { status: "CANCELLED" },
      }),
    ]);
    const { replacesSubscriptionId: _ignored, ...payload } = replacementPayload();

    await request(app)
      .post("/api/subscriptions")
      .set(trainerAuth())
      .send(payload)
      .expect(201);

    expect(
      await prisma.subscription.count({
        where: { studentId: fixture.studentA.id, status: "ACTIVE" },
      })
    ).toBe(1);
  });

  it("impide crear dos suscripciones activas directamente en PostgreSQL", async () => {
    let rejected = false;
    try {
      await prisma.subscription.create({
        data: {
          trainerId: fixture.trainerA.id,
          studentId: fixture.studentA.id,
          planId: fixture.plan.id,
          planName: fixture.plan.name,
          planDuration: fixture.plan.duration,
          startDate: new Date("2026-09-14T12:00:00.000Z"),
          endDate: new Date("2026-10-14T12:00:00.000Z"),
          totalAmount: 100,
          status: "ACTIVE",
        },
      });
    } catch {
      rejected = true;
    }

    expect(rejected).toBe(true);
    expect(
      await prisma.subscription.count({
        where: { studentId: fixture.studentA.id, status: "ACTIVE" },
      })
    ).toBe(1);
  });

  it("rechaza crear una suscripción para un alumno eliminado", async () => {
    await prisma.student.update({
      where: { id: fixture.studentA.id },
      data: { deletedAt: new Date() },
    });

    await request(app)
      .post("/api/subscriptions")
      .set(trainerAuth())
      .send(replacementPayload())
      .expect(404);

    expect(
      await prisma.subscription.count({
        where: { studentId: fixture.studentA.id },
      })
    ).toBe(1);
  });
});
