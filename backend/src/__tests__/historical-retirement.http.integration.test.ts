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

describe("retiro de recursos con historial", () => {
  it("archiva un plan y conserva la suscripción y su cuota pagada", async () => {
    await prisma.$transaction([
      prisma.installment.updateMany({
        where: { subscriptionId: fixture.subscription.id },
        data: { status: "PAID", paidAt: new Date("2026-01-10T12:00:00.000Z") },
      }),
      prisma.subscription.update({
        where: { id: fixture.subscription.id },
        data: { status: "CANCELLED" },
      }),
    ]);

    const response = await request(app)
      .delete(`/api/plans/${fixture.plan.id}`)
      .set(trainerAuth())
      .expect(200);

    expect(response.body.data).toMatchObject({
      id: fixture.plan.id,
      archived: true,
      deleted: false,
    });
    expect(await prisma.plan.count({ where: { id: fixture.plan.id, isActive: false } })).toBe(1);
    expect(await prisma.subscription.count({ where: { id: fixture.subscription.id } })).toBe(1);
    expect(
      await prisma.installment.count({
        where: { subscriptionId: fixture.subscription.id, status: "PAID" },
      })
    ).toBe(1);
  });

  it("archiva una rutina y conserva asignación, sesión y series", async () => {
    const response = await request(app)
      .delete(`/api/routines/${fixture.routineA.id}`)
      .set(trainerAuth())
      .expect(200);

    expect(response.body.data).toMatchObject({
      id: fixture.routineA.id,
      archived: true,
      deleted: false,
    });
    expect(await prisma.routine.count({ where: { id: fixture.routineA.id } })).toBe(1);
    expect(await prisma.studentRoutine.count({ where: { id: fixture.studentRoutine.id } })).toBe(1);
    expect(await prisma.workoutLog.count({ where: { id: fixture.workoutLog.id } })).toBe(1);
    expect(await prisma.workoutSet.count({ where: { workoutLogId: fixture.workoutLog.id } })).toBe(1);
    expect(
      await prisma.studentRoutine.findUniqueOrThrow({
        where: { id: fixture.studentRoutine.id },
        select: { isActive: true },
      })
    ).toEqual({ isActive: false });
    await request(app)
      .get(`/api/routines/${fixture.routineA.id}`)
      .set(trainerAuth())
      .expect(404);
  });

  it("archiva un ejercicio y conserva la rutina y sus series", async () => {
    const response = await request(app)
      .delete(`/api/exercises/${fixture.privateExerciseA.id}`)
      .set(trainerAuth())
      .expect(200);

    expect(response.body.data).toMatchObject({
      id: fixture.privateExerciseA.id,
      archived: true,
      deleted: false,
    });
    expect(await prisma.exercise.count({ where: { id: fixture.privateExerciseA.id } })).toBe(1);
    expect(
      await prisma.routineExercise.count({
        where: { id: fixture.routineA.routineExercises[0].id },
      })
    ).toBe(1);
    expect(await prisma.workoutSet.count({ where: { workoutLogId: fixture.workoutLog.id } })).toBe(1);
    await request(app)
      .get(`/api/exercises/${fixture.privateExerciseA.id}`)
      .set(trainerAuth())
      .expect(404);

    await request(app)
      .post("/api/student/workout-log")
      .set({ Authorization: `Bearer ${studentToken}` })
      .send({
        date: "2026-09-14T12:00:00.000Z",
        routineExercises: [
          {
            routineExerciseId: fixture.routineA.routineExercises[0].id,
            sets: [{ setNumber: 1, reps: 12, weight: 25 }],
          },
        ],
      })
      .expect(404);
    expect(
      await prisma.workoutLog.count({
        where: { studentRoutine: { studentId: fixture.studentA.id } },
      })
    ).toBe(1);
  });

  it("archiva un ejercicio retirado de la rutina si tiene series", async () => {
    const routineExerciseId = fixture.routineA.routineExercises[0].id;
    const response = await request(app)
      .delete(`/api/routines/${fixture.routineA.id}/exercises/${routineExerciseId}`)
      .set(trainerAuth())
      .expect(200);

    expect(response.body.data).toMatchObject({
      id: routineExerciseId,
      archived: true,
      deleted: false,
    });
    expect(await prisma.routineExercise.count({ where: { id: routineExerciseId } })).toBe(1);
    expect(await prisma.workoutSet.count({ where: { workoutLogId: fixture.workoutLog.id } })).toBe(1);

    const routine = await request(app)
      .get(`/api/routines/${fixture.routineA.id}`)
      .set(trainerAuth())
      .expect(200);
    expect(routine.body.data.routineExercises).toEqual([]);
  });

  it.each(["plan", "routine", "exercise", "routineExercise", "studentRoutine"] as const)(
    "bloquea el borrado directo de un %s utilizado",
    async (resource) => {
      let rejected = false;
      try {
        if (resource === "plan") {
          await prisma.plan.delete({ where: { id: fixture.plan.id } });
        } else if (resource === "routine") {
          await prisma.routine.delete({ where: { id: fixture.routineA.id } });
        } else if (resource === "exercise") {
          await prisma.exercise.delete({ where: { id: fixture.privateExerciseA.id } });
        } else if (resource === "routineExercise") {
          await prisma.routineExercise.delete({
            where: { id: fixture.routineA.routineExercises[0].id },
          });
        } else {
          await prisma.studentRoutine.delete({ where: { id: fixture.studentRoutine.id } });
        }
      } catch {
        rejected = true;
      }

      expect(rejected).toBe(true);
      expect(await prisma.workoutLog.count({ where: { id: fixture.workoutLog.id } })).toBe(1);
      expect(await prisma.workoutSet.count({ where: { workoutLogId: fixture.workoutLog.id } })).toBe(1);
    }
  );

  it("elimina físicamente recursos que nunca fueron utilizados", async () => {
    const [plan, routine, exercise] = await Promise.all([
      prisma.plan.create({
        data: {
          trainerId: fixture.trainerA.id,
          name: "Plan sin uso",
          price: 50,
          duration: "MONTHLY",
        },
      }),
      prisma.routine.create({
        data: { trainerId: fixture.trainerA.id, name: "Rutina sin uso" },
      }),
      prisma.exercise.create({
        data: {
          trainerId: fixture.trainerA.id,
          name: "Ejercicio sin uso",
          muscleGroupId: fixture.privateExerciseA.muscleGroupId,
          movementType: "CORE",
        },
      }),
    ]);

    const routineExercise = await prisma.routineExercise.create({
      data: {
        routineId: routine.id,
        exerciseId: exercise.id,
        dayOfWeek: "TUESDAY",
        order: 1,
        sets: 2,
        reps: "8",
      },
    });

    const removedExercise = await request(app)
      .delete(`/api/routines/${routine.id}/exercises/${routineExercise.id}`)
      .set(trainerAuth())
      .expect(200);
    const removedRoutine = await request(app)
      .delete(`/api/routines/${routine.id}`)
      .set(trainerAuth())
      .expect(200);
    const removedCatalogExercise = await request(app)
      .delete(`/api/exercises/${exercise.id}`)
      .set(trainerAuth())
      .expect(200);
    const removedPlan = await request(app)
      .delete(`/api/plans/${plan.id}`)
      .set(trainerAuth())
      .expect(200);

    for (const response of [
      removedExercise,
      removedRoutine,
      removedCatalogExercise,
      removedPlan,
    ]) {
      expect(response.body.data).toMatchObject({ archived: false, deleted: true });
    }
    expect(await prisma.routineExercise.count({ where: { id: routineExercise.id } })).toBe(0);
    expect(await prisma.routine.count({ where: { id: routine.id } })).toBe(0);
    expect(await prisma.exercise.count({ where: { id: exercise.id } })).toBe(0);
    expect(await prisma.plan.count({ where: { id: plan.id } })).toBe(0);
  });
});
