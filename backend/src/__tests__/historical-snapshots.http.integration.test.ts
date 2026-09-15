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
let studentToken: string;

beforeEach(async () => {
  await resetTestDatabase(prisma);
  fixture = await createTenantFixture(prisma);
  trainerToken = signAccessToken({
    userId: fixture.trainerA.userId,
    email: "trainer-a@fitpro.test",
    role: "TRAINER",
    authVersion: 1,
  });
  studentToken = signAccessToken({
    userId: fixture.studentA.userId!,
    email: fixture.studentA.email,
    role: "STUDENT",
    authVersion: 1,
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

const trainerAuth = () => ({ Authorization: `Bearer ${trainerToken}` });
const studentAuth = () => ({ Authorization: `Bearer ${studentToken}` });

describe("snapshots históricos", () => {
  it("conserva el nombre y duración contratados aunque se edite el plan", async () => {
    const originalName = fixture.plan.name;
    const originalDuration = fixture.plan.duration;
    await prisma.plan.update({
      where: { id: fixture.plan.id },
      data: { name: "Plan editado", duration: "ANNUAL" },
    });

    const [subscription, portal, summary, payments, expiring] = await Promise.all([
      request(app)
        .get(`/api/subscriptions/student/${fixture.studentA.id}`)
        .set(trainerAuth())
        .expect(200),
      request(app).get("/api/student/subscription").set(studentAuth()).expect(200),
      request(app)
        .get(`/api/students/${fixture.studentA.id}/summary`)
        .set(trainerAuth())
        .expect(200),
      request(app).get("/api/trainers/subscriptions").set(trainerAuth()).expect(200),
      request(app).get("/api/subscriptions/expiring").set(trainerAuth()).expect(200),
    ]);

    expect(subscription.body.data).toMatchObject({
      planName: originalName,
      planDuration: originalDuration,
    });
    expect(portal.body.data).toMatchObject({
      planName: originalName,
      planDuration: originalDuration,
    });
    expect(summary.body.data.subscription).toMatchObject({
      planName: originalName,
      planDuration: originalDuration,
    });
    expect(payments.body.data.items[0].planName).toBe(originalName);
    expect(expiring.body.data.expired[0].planName).toBe(originalName);
  });

  it("conserva rutina, ejercicio y progreso de una sesión después de editarlos", async () => {
    const routineExerciseId = fixture.routineA.routineExercises[0].id;
    await prisma.$transaction([
      prisma.routine.update({
        where: { id: fixture.routineA.id },
        data: { name: "Rutina al registrar" },
      }),
      prisma.exercise.update({
        where: { id: fixture.privateExerciseA.id },
        data: { name: "Ejercicio al registrar" },
      }),
      prisma.muscleGroup.update({
        where: { id: fixture.privateExerciseA.muscleGroupId },
        data: { name: "Grupo al registrar" },
      }),
      prisma.routineExercise.update({
        where: { id: routineExerciseId },
        data: { order: 7, sets: 4, reps: "8-10", restSeconds: 120 },
      }),
    ]);

    await request(app)
      .post("/api/student/workout-log")
      .set(studentAuth())
      .set("Idempotency-Key", "b9740777-82f5-4f79-a255-6f73ce4bf62c")
      .send({
        date: "2026-09-14T12:00:00.000Z",
        notes: "Sesión histórica",
        routineExercises: [
          {
            routineExerciseId,
            sets: [{ setNumber: 1, reps: 9, weight: 30, rpe: 8 }],
          },
        ],
      })
      .expect(201);

    await prisma.$transaction([
      prisma.routine.update({
        where: { id: fixture.routineA.id },
        data: { name: "Rutina editada" },
      }),
      prisma.exercise.update({
        where: { id: fixture.privateExerciseA.id },
        data: { name: "Ejercicio editado" },
      }),
      prisma.muscleGroup.update({
        where: { id: fixture.privateExerciseA.muscleGroupId },
        data: { name: "Grupo editado" },
      }),
      prisma.routineExercise.update({
        where: { id: routineExerciseId },
        data: { exerciseId: fixture.globalExercise.id, order: 1, sets: 1, reps: "20" },
      }),
    ]);

    const [trainerHistory, portalHistory, summary, originalProgress, movedProgress] =
      await Promise.all([
        request(app)
          .get(`/api/students/${fixture.studentA.id}/workout-history`)
          .set(trainerAuth())
          .expect(200),
        request(app).get("/api/student/workout-history").set(studentAuth()).expect(200),
        request(app)
          .get(`/api/students/${fixture.studentA.id}/summary`)
          .set(trainerAuth())
          .expect(200),
        request(app)
          .get(`/api/student/progress/${fixture.privateExerciseA.id}`)
          .set(studentAuth())
          .expect(200),
        request(app)
          .get(`/api/student/progress/${fixture.globalExercise.id}`)
          .set(studentAuth())
          .expect(200),
      ]);

    for (const history of [
      trainerHistory.body.data,
      portalHistory.body.data,
      summary.body.data.workoutHistory,
    ]) {
      expect(history[0]).toMatchObject({
        routine: { id: fixture.routineA.id, name: "Rutina al registrar" },
        sets: [
          {
            exercise: {
              id: fixture.privateExerciseA.id,
              name: "Ejercicio al registrar",
              order: 7,
              muscleGroup: { name: "Grupo al registrar" },
            },
          },
        ],
      });
    }
    expect(originalProgress.body.data).toHaveLength(2);
    expect(movedProgress.body.data).toEqual([]);
  });
});
