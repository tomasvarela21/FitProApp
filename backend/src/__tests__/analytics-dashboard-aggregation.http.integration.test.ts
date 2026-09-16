import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../app";
import { prisma } from "../infrastructure/db/prisma";
import { signAccessToken } from "../shared/utils/jwt";
import { createTenantFixture } from "./support/tenant.fixture";
import { resetTestDatabase } from "./support/test-database";

type Fixture = Awaited<ReturnType<typeof createTenantFixture>>;

describe("agregaciones de analíticas y dashboard", () => {
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

  it("calcula importes y estados en PostgreSQL sin mezclar tenants ni alumnos eliminados", async () => {
    const now = new Date();
    const future = new Date(now.getTime() + 30 * 86_400_000);
    const past = new Date(now.getTime() - 30 * 86_400_000);
    const gym = await prisma.gym.create({
      data: { trainerId: fixture.trainerA.id, name: "Gimnasio A" },
    });
    await prisma.student.update({
      where: { id: fixture.studentA.id },
      data: { gymId: gym.id },
    });

    const students = await Promise.all([
      prisma.student.create({
        data: {
          trainerId: fixture.trainerA.id,
          email: "paused@fitpro.test",
          dni: "analytics-paused",
          firstName: "Pausa",
          lastName: "Visible",
          status: "PAUSED",
        },
      }),
      prisma.student.create({
        data: {
          trainerId: fixture.trainerA.id,
          email: "deleted@fitpro.test",
          dni: "analytics-deleted",
          firstName: "Borrado",
          lastName: "Oculto",
          status: "ACTIVE",
          deletedAt: now,
        },
      }),
    ]);

    const activeSubscription = await prisma.subscription.create({
      data: {
        trainerId: fixture.trainerA.id,
        studentId: students[0].id,
        planId: fixture.plan.id,
        planName: fixture.plan.name,
        planDuration: fixture.plan.duration,
        status: "ACTIVE",
        startDate: past,
        endDate: future,
        totalAmount: 120,
        installmentCount: 2,
        frequency: "MONTHLY",
      },
    });
    await prisma.installment.createMany({
      data: [
        {
          subscriptionId: activeSubscription.id,
          trainerId: fixture.trainerA.id,
          number: 1,
          amount: 55.25,
          dueDate: past,
          paidAt: past,
          status: "PAID",
        },
        {
          subscriptionId: activeSubscription.id,
          trainerId: fixture.trainerA.id,
          number: 2,
          amount: 64.75,
          dueDate: future,
          status: "PENDING",
        },
      ],
    });
    await prisma.subscription.create({
      data: {
        trainerId: fixture.trainerA.id,
        studentId: students[1].id,
        planId: fixture.plan.id,
        planName: fixture.plan.name,
        planDuration: fixture.plan.duration,
        status: "CANCELLED",
        startDate: past,
        endDate: future,
        totalAmount: 10,
        installmentCount: 1,
        frequency: "MONTHLY",
      },
    });

    const tenantBPlan = await prisma.plan.create({
      data: {
        trainerId: fixture.trainerB.id,
        name: "Plan B",
        price: 999,
        duration: "MONTHLY",
      },
    });
    const tenantBSubscription = await prisma.subscription.create({
      data: {
        trainerId: fixture.trainerB.id,
        studentId: fixture.studentB.id,
        planId: tenantBPlan.id,
        planName: tenantBPlan.name,
        planDuration: tenantBPlan.duration,
        status: "ACTIVE",
        startDate: past,
        endDate: future,
        totalAmount: 999,
        installmentCount: 1,
        frequency: "MONTHLY",
      },
    });
    await prisma.installment.create({
      data: {
        subscriptionId: tenantBSubscription.id,
        trainerId: fixture.trainerB.id,
        number: 1,
        amount: 999,
        dueDate: past,
        paidAt: past,
        status: "PAID",
      },
    });

    const response = await request(app)
      .get("/api/analytics/business")
      .set(auth())
      .expect(200);

    expect(response.body.data.revenue).toMatchObject({
      totalCollected: 55.25,
      totalPending: 64.75,
      totalOverdue: 100,
    });
    expect(response.body.data.revenue.monthlyRevenue).toHaveLength(12);
    expect(response.body.data.students).toMatchObject({
      total: 2,
      byStatus: { ACTIVE: 1, PAUSED: 1, INVITED: 0, INACTIVE: 0 },
      unassignedToGym: 1,
    });
    expect(response.body.data.subscriptions).toEqual({
      total: 3,
      byStatus: { ACTIVE: 1, EXPIRED: 1, CANCELLED: 1 },
    });
    expect(response.body.data.gyms).toEqual([
      expect.objectContaining({ name: "Gimnasio A", studentCount: 1, revenue: 0 }),
    ]);
    expect(JSON.stringify(response.body.data)).not.toContain("999");
  });

  it("limita inactividad y deduplica alertas por alumno", async () => {
    const students = Array.from({ length: 12 }, (_, index) => ({
      id: randomUUID(),
      trainerId: fixture.trainerA.id,
      email: `inactive-${index}@fitpro.test`,
      dni: `inactive-${index}`,
      firstName: `Inactivo ${index}`,
      lastName: "Dashboard",
      status: "ACTIVE" as const,
    }));
    await prisma.student.createMany({ data: students });
    await prisma.studentRoutine.createMany({
      data: students.map((student) => ({
        studentId: student.id,
        routineId: fixture.routineA.id,
        isActive: true,
      })),
    });
    await prisma.installment.create({
      data: {
        subscriptionId: fixture.subscription.id,
        trainerId: fixture.trainerA.id,
        number: 2,
        amount: 75,
        dueDate: new Date("2025-12-01T12:00:00.000Z"),
        status: "OVERDUE",
      },
    });

    const response = await request(app)
      .get("/api/trainers/dashboard-summary")
      .set(auth())
      .expect(200);

    expect(response.body.data.inactivity.noWorkoutLast7).toHaveLength(5);
    expect(response.body.data.inactivity.noWorkoutLast14).toHaveLength(5);
    expect(response.body.data.alerts.expired).toHaveLength(1);
    expect(response.body.data.alerts.expired[0]).toMatchObject({
      studentId: fixture.studentA.id,
      amount: 75,
    });
    expect(
      response.body.data.inactivity.noWorkoutLast7.some(
        (student: { id: string }) => student.id === fixture.studentB.id
      )
    ).toBe(false);
  });
});
