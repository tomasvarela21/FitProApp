import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request, { type Response } from "supertest";
import { app } from "../app";
import { prisma } from "../infrastructure/db/prisma";
import { signAccessToken } from "../shared/utils/jwt";
import { createTenantFixture } from "./support/tenant.fixture";
import { resetTestDatabase } from "./support/test-database";

const SUBSCRIPTION_COUNT = 600;

describe("rendimiento del listado de cobros", () => {
  let trainerToken: string;

  beforeAll(async () => {
    await resetTestDatabase(prisma);
    const fixture = await createTenantFixture(prisma);
    trainerToken = signAccessToken({
      userId: fixture.trainerA.userId,
      email: "trainer-a@fitpro.test",
      role: "TRAINER",
      authVersion: 1,
    });

    const students = Array.from({ length: SUBSCRIPTION_COUNT }, (_, index) => ({
      id: randomUUID(),
      trainerId: fixture.trainerA.id,
      email: `perf-student-${index}@fitpro.test`,
      dni: `perf-${index}`,
      firstName: `Alumno ${String(index).padStart(4, "0")}`,
      lastName: "Performance",
      status: "ACTIVE" as const,
    }));
    const subscriptions = students.map((student, index) => ({
      id: randomUUID(),
      trainerId: fixture.trainerA.id,
      studentId: student.id,
      planId: fixture.plan.id,
      planName: fixture.plan.name,
      planDuration: fixture.plan.duration,
      status: "ACTIVE" as const,
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      endDate: new Date("2027-12-31T00:00:00.000Z"),
      totalAmount: 200,
      installmentCount: 2,
      frequency: "MONTHLY" as const,
      createdAt: new Date(1_700_000_000_000 + index),
    }));
    const installments = subscriptions.flatMap((subscription, index) => [
      {
        id: randomUUID(),
        subscriptionId: subscription.id,
        trainerId: fixture.trainerA.id,
        number: 1,
        amount: 100,
        dueDate: new Date("2026-01-01T00:00:00.000Z"),
        status: index % 3 === 0 ? ("PAID" as const) : ("PENDING" as const),
        paidAt: index % 3 === 0 ? new Date("2026-01-01T00:00:00.000Z") : null,
      },
      {
        id: randomUUID(),
        subscriptionId: subscription.id,
        trainerId: fixture.trainerA.id,
        number: 2,
        amount: 100,
        dueDate: new Date("2027-01-01T00:00:00.000Z"),
        status: "PENDING" as const,
        paidAt: null,
      },
    ]);

    await prisma.student.createMany({ data: students });
    await prisma.subscription.createMany({ data: subscriptions });
    await prisma.installment.createMany({ data: installments });
  }, 30_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("mantiene tiempo y memoria observables con un volumen representativo", async () => {
    const samples: number[] = [];
    const heapBefore = process.memoryUsage().heapUsed;
    let lastResponse: Response | undefined;

    for (let run = 0; run < 3; run += 1) {
      const startedAt = performance.now();
      lastResponse = await request(app)
        .get("/api/trainers/subscriptions?page=2&limit=20")
        .set({ Authorization: `Bearer ${trainerToken}` })
        .expect(200);
      samples.push(performance.now() - startedAt);
    }

    const heapDeltaBytes = Math.max(0, process.memoryUsage().heapUsed - heapBefore);
    const medianMs = [...samples].sort((a, b) => a - b)[1];
    console.log(
      "[Phase8Benchmark]",
      JSON.stringify({ subscriptions: SUBSCRIPTION_COUNT + 1, medianMs, heapDeltaBytes })
    );

    expect(lastResponse?.body.data.items).toHaveLength(20);
    expect(lastResponse?.body.data.meta).toEqual({
      page: 2,
      limit: 20,
      total: SUBSCRIPTION_COUNT + 1,
      totalPages: Math.ceil((SUBSCRIPTION_COUNT + 1) / 20),
    });
  });
});
