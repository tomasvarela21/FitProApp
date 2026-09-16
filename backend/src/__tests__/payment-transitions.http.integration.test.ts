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
let installmentId: string;

beforeEach(async () => {
  await resetTestDatabase(prisma);
  fixture = await createTenantFixture(prisma);
  trainerToken = signAccessToken({
    userId: fixture.trainerA.userId,
    email: "trainer-a@fitpro.test",
    role: "TRAINER",
    authVersion: 1,
  });
  installmentId = (
    await prisma.installment.findFirstOrThrow({
      where: { subscriptionId: fixture.subscription.id },
      select: { id: true },
    })
  ).id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

const trainerAuth = () => ({ Authorization: `Bearer ${trainerToken}` });
const pay = (notes?: string) =>
  request(app)
    .post(`/api/subscriptions/installments/${installmentId}/pay`)
    .set(trainerAuth())
    .send({ notes });
const cancel = () =>
  request(app)
    .delete(`/api/subscriptions/${fixture.subscription.id}`)
    .set(trainerAuth());

describe("transiciones de cobros", () => {
  it("registra una sola vez dos pagos simultáneos", async () => {
    const responses = await Promise.all([pay("solicitud A"), pay("solicitud B")]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    const installment = await prisma.installment.findUniqueOrThrow({
      where: { id: installmentId },
      select: { status: true, notes: true, paidAt: true },
    });
    expect(installment.status).toBe("PAID");
    expect(["solicitud A", "solicitud B"]).toContain(installment.notes);
    expect(installment.paidAt).not.toBeNull();
    expect(
      await prisma.notificationOutbox.count({
        where: { idempotencyKey: `payment-recorded:${installmentId}` },
      })
    ).toBe(1);
  });

  it("permite una sola cancelación simultánea", async () => {
    const responses = await Promise.all([cancel(), cancel()]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(
      await prisma.subscription.findUniqueOrThrow({
        where: { id: fixture.subscription.id },
        select: { status: true },
      })
    ).toEqual({ status: "CANCELLED" });
    expect(
      await prisma.installment.findUniqueOrThrow({
        where: { id: installmentId },
        select: { status: true },
      })
    ).toEqual({ status: "CANCELLED" });
  });

  it("revierte toda la cancelación si falla la actualización de cuotas", async () => {
    await prisma.$executeRawUnsafe(`
      CREATE FUNCTION reject_test_installment_cancellation() RETURNS trigger AS $$
      BEGIN
        IF NEW.status = 'CANCELLED' THEN
          RAISE EXCEPTION 'controlled cancellation failure';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER reject_test_installment_cancellation_trigger
      BEFORE UPDATE ON "Installment"
      FOR EACH ROW EXECUTE FUNCTION reject_test_installment_cancellation()
    `);

    try {
      await cancel().expect(500);
    } finally {
      await prisma.$executeRawUnsafe(
        `DROP TRIGGER IF EXISTS reject_test_installment_cancellation_trigger ON "Installment"`
      );
      await prisma.$executeRawUnsafe(
        `DROP FUNCTION IF EXISTS reject_test_installment_cancellation()`
      );
    }

    expect(
      await prisma.subscription.findUniqueOrThrow({
        where: { id: fixture.subscription.id },
        select: { status: true },
      })
    ).toEqual({ status: "ACTIVE" });
    expect(
      await prisma.installment.findUniqueOrThrow({
        where: { id: installmentId },
        select: { status: true },
      })
    ).toEqual({ status: "PENDING" });
  });

  it("responde 409 al pagar o cancelar un estado ya cancelado", async () => {
    await cancel().expect(200);

    await pay().expect(409);
    await cancel().expect(409);
  });

  it("mantiene una transición válida si pago y cancelación coinciden", async () => {
    const [paymentResponse, cancellationResponse] = await Promise.all([pay(), cancel()]);
    const [subscription, installment] = await Promise.all([
      prisma.subscription.findUniqueOrThrow({ where: { id: fixture.subscription.id } }),
      prisma.installment.findUniqueOrThrow({ where: { id: installmentId } }),
    ]);

    expect(cancellationResponse.status).toBe(200);
    expect(subscription.status).toBe("CANCELLED");
    if (paymentResponse.status === 200) {
      expect(installment.status).toBe("PAID");
      expect(installment.paidAt).not.toBeNull();
    } else {
      expect(paymentResponse.status).toBe(409);
      expect(installment.status).toBe("CANCELLED");
      expect(installment.paidAt).toBeNull();
    }
  });

  it("permite consultar mientras se registra un pago sin escrituras de lectura", async () => {
    const [readResponse, paymentResponse] = await Promise.all([
      request(app)
        .get(`/api/subscriptions/student/${fixture.studentA.id}`)
        .set(trainerAuth()),
      pay(),
    ]);

    expect(readResponse.status).toBe(200);
    expect(paymentResponse.status).toBe(200);
    expect(
      await prisma.installment.findUniqueOrThrow({
        where: { id: installmentId },
        select: { status: true },
      })
    ).toEqual({ status: "PAID" });
  });

  it.each([
    ["más de dos decimales", { totalAmount: 10.001, installmentCount: 1 }],
    ["fuera del límite decimal", { totalAmount: 100_000_000, installmentCount: 1 }],
    ["cuotas de valor cero", { totalAmount: 0.01, installmentCount: 2 }],
  ])("rechaza un monto %s", async (_case, monetaryFields) => {
    await request(app)
      .post("/api/subscriptions")
      .set(trainerAuth())
      .send({
        studentId: fixture.studentA.id,
        planId: fixture.plan.id,
        replacesSubscriptionId: fixture.subscription.id,
        startDate: "2026-09-14T12:00:00.000Z",
        frequency: "MONTHLY",
        ...monetaryFields,
      })
      .expect(400);

    expect(
      await prisma.subscription.count({
        where: { studentId: fixture.studentA.id, status: "ACTIVE" },
      })
    ).toBe(1);
  });

  it("limita las notas de pago", async () => {
    await pay("x".repeat(1001)).expect(400);

    expect(
      await prisma.installment.findUniqueOrThrow({
        where: { id: installmentId },
        select: { status: true, notes: true },
      })
    ).toEqual({ status: "PENDING", notes: null });
  });

  it("oculta las cuotas de un alumno eliminado", async () => {
    await prisma.student.update({
      where: { id: fixture.studentA.id },
      data: { deletedAt: new Date() },
    });

    await pay().expect(404);

    expect(
      await prisma.installment.findUniqueOrThrow({
        where: { id: installmentId },
        select: { status: true, paidAt: true },
      })
    ).toEqual({ status: "PENDING", paidAt: null });
  });

  it("oculta cobros y cancelaciones a otro entrenador", async () => {
    const trainerBToken = signAccessToken({
      userId: fixture.trainerB.userId,
      email: "trainer-b@fitpro.test",
      role: "TRAINER",
      authVersion: 1,
    });
    const otherTrainerAuth = { Authorization: `Bearer ${trainerBToken}` };

    await request(app)
      .post(`/api/subscriptions/installments/${installmentId}/pay`)
      .set(otherTrainerAuth)
      .send({})
      .expect(404);
    await request(app)
      .delete(`/api/subscriptions/${fixture.subscription.id}`)
      .set(otherTrainerAuth)
      .expect(404);

    expect(
      await prisma.subscription.findUniqueOrThrow({
        where: { id: fixture.subscription.id },
        select: { status: true },
      })
    ).toEqual({ status: "ACTIVE" });
    expect(
      await prisma.installment.findUniqueOrThrow({
        where: { id: installmentId },
        select: { status: true },
      })
    ).toEqual({ status: "PENDING" });
  });
});
