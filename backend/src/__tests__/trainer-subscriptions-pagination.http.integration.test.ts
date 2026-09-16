import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../app";
import { prisma } from "../infrastructure/db/prisma";
import { signAccessToken } from "../shared/utils/jwt";
import { createTenantFixture } from "./support/tenant.fixture";
import { resetTestDatabase } from "./support/test-database";

type Fixture = Awaited<ReturnType<typeof createTenantFixture>>;

describe("paginación de cobros en PostgreSQL", () => {
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

  const auth = () => ({ Authorization: `Bearer ${trainerToken}` });

  async function createSubscription(params: {
    suffix: string;
    firstName: string;
    installmentStatus: "PENDING" | "PAID";
    dueDate: Date;
    subscriptionStatus?: "ACTIVE" | "CANCELLED";
    deletedAt?: Date;
  }) {
    const student = await prisma.student.create({
      data: {
        trainerId: fixture.trainerA.id,
        email: `${params.suffix}@fitpro.test`,
        dni: `dni-${params.suffix}`,
        firstName: params.firstName,
        lastName: "Estado",
        status: "ACTIVE",
        deletedAt: params.deletedAt,
      },
    });
    return prisma.subscription.create({
      data: {
        trainerId: fixture.trainerA.id,
        studentId: student.id,
        planId: fixture.plan.id,
        planName: fixture.plan.name,
        planDuration: fixture.plan.duration,
        status: params.subscriptionStatus ?? "ACTIVE",
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        endDate: new Date("2027-12-31T00:00:00.000Z"),
        totalAmount: 100,
        installmentCount: 1,
        frequency: "MONTHLY",
        installments: {
          create: {
            trainerId: fixture.trainerA.id,
            number: 1,
            amount: 100,
            dueDate: params.dueDate,
            status: params.installmentStatus,
            paidAt: params.installmentStatus === "PAID" ? new Date() : null,
          },
        },
      },
    });
  }

  it("filtra los estados derivados antes de paginar y conserva el total", async () => {
    const now = Date.now();
    await createSubscription({
      suffix: "expiring",
      firstName: "Expiring",
      installmentStatus: "PENDING",
      dueDate: new Date(now + 2 * 86_400_000),
    });
    await createSubscription({
      suffix: "paid",
      firstName: "Paid",
      installmentStatus: "PAID",
      dueDate: new Date(now - 2 * 86_400_000),
    });
    await createSubscription({
      suffix: "active",
      firstName: "Active",
      installmentStatus: "PENDING",
      dueDate: new Date(now + 30 * 86_400_000),
    });

    const expected = {
      OVERDUE: "Alma Student",
      EXPIRING_SOON: "Expiring Estado",
      PAID: "Paid Estado",
      ACTIVE: "Active Estado",
    } as const;
    for (const [status, studentName] of Object.entries(expected)) {
      const response = await request(app)
        .get(`/api/trainers/subscriptions?status=${status}&page=1&limit=1`)
        .set(auth())
        .expect(200);
      expect(response.body.data.meta).toMatchObject({ total: 1, totalPages: 1 });
      expect(response.body.data.items).toEqual([
        expect.objectContaining({ paymentStatus: status, studentName }),
      ]);
    }
  });

  it("mantiene búsqueda literal, aislamiento y metadatos en una página vacía", async () => {
    const future = new Date(Date.now() + 30 * 86_400_000);
    await createSubscription({
      suffix: "literal",
      firstName: "Nombre%Literal",
      installmentStatus: "PENDING",
      dueDate: future,
    });
    await createSubscription({
      suffix: "ordinary",
      firstName: "NombreComun",
      installmentStatus: "PENDING",
      dueDate: future,
    });
    await createSubscription({
      suffix: "cancelled",
      firstName: "Cancelado",
      installmentStatus: "PENDING",
      dueDate: future,
      subscriptionStatus: "CANCELLED",
    });
    await createSubscription({
      suffix: "deleted",
      firstName: "Eliminado",
      installmentStatus: "PENDING",
      dueDate: future,
      deletedAt: new Date(),
    });

    const literal = await request(app)
      .get("/api/trainers/subscriptions?search=%25")
      .set(auth())
      .expect(200);
    expect(literal.body.data.items.map((item: { studentName: string }) => item.studentName))
      .toEqual(["Nombre%Literal Estado"]);

    const emptyPage = await request(app)
      .get("/api/trainers/subscriptions?page=99&limit=2")
      .set(auth())
      .expect(200);
    expect(emptyPage.body.data.items).toEqual([]);
    expect(emptyPage.body.data.meta).toEqual({ page: 99, limit: 2, total: 3, totalPages: 2 });
  });
});
