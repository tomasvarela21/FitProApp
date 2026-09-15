import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../app";
import { prisma } from "../infrastructure/db/prisma";
import { signAccessToken } from "../shared/utils/jwt";
import { createTenantFixture } from "./support/tenant.fixture";
import { resetTestDatabase } from "./support/test-database";

type Fixture = Awaited<ReturnType<typeof createTenantFixture>>;

let fixture: Fixture;
let trainerAToken: string;
let studentAToken: string;
let routineBId: string;
let routineExerciseBId: string;
let globalRoutineId: string;
let gymAId: string;
let gymBId: string;

beforeEach(async () => {
  await resetTestDatabase(prisma);
  fixture = await createTenantFixture(prisma);

  const [routineB, globalRoutine, gymA, gymB] = await Promise.all([
    prisma.routine.create({
      data: {
        name: "Tenant B relation routine",
        trainerId: fixture.trainerB.id,
        routineExercises: {
          create: {
            exerciseId: fixture.privateExerciseB.id,
            dayOfWeek: "TUESDAY",
            order: 1,
            sets: 3,
            reps: "8",
          },
        },
      },
      include: { routineExercises: true },
    }),
    prisma.routine.create({
      data: { name: "Global relation routine", isGlobal: true },
    }),
    prisma.gym.create({
      data: { name: "Tenant A gym", trainerId: fixture.trainerA.id },
    }),
    prisma.gym.create({
      data: { name: "Tenant B gym", trainerId: fixture.trainerB.id },
    }),
  ]);

  routineBId = routineB.id;
  routineExerciseBId = routineB.routineExercises[0].id;
  globalRoutineId = globalRoutine.id;
  gymAId = gymA.id;
  gymBId = gymB.id;

  trainerAToken = signAccessToken({
    userId: fixture.trainerA.userId,
    email: "trainer-a@fitpro.test",
    role: "TRAINER",
    authVersion: 1,
  });
  studentAToken = signAccessToken({
    userId: fixture.studentA.userId!,
    email: fixture.studentA.email,
    role: "STUDENT",
    authVersion: 1,
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

const trainerAuth = () => ({ Authorization: `Bearer ${trainerAToken}` });
const studentAuth = () => ({ Authorization: `Bearer ${studentAToken}` });

describe("relaciones de rutinas y planes semanales", () => {
  it("rechaza asignar una rutina privada ajena sin reemplazar la activa", async () => {
    const countBefore = await prisma.studentRoutine.count({
      where: { studentId: fixture.studentA.id },
    });

    await request(app)
      .post(`/api/students/${fixture.studentA.id}/assign-routine`)
      .set(trainerAuth())
      .send({ routineId: routineBId })
      .expect(404);

    expect(
      await prisma.studentRoutine.count({ where: { studentId: fixture.studentA.id } }),
    ).toBe(countBefore);
    expect(
      await prisma.studentRoutine.findUniqueOrThrow({
        where: { id: fixture.studentRoutine.id },
        select: { isActive: true },
      }),
    ).toEqual({ isActive: true });
  });

  it("rechaza crear un plan semanal con una rutina privada ajena", async () => {
    await request(app)
      .post(`/api/students/${fixture.studentA.id}/weekly-plan`)
      .set(trainerAuth())
      .send({ routineId: routineBId, weeks: [{ weekNumber: 1 }] })
      .expect(404);

    expect(
      await prisma.studentRoutine.findUniqueOrThrow({
        where: { id: fixture.studentRoutine.id },
        select: { isActive: true },
      }),
    ).toEqual({ isActive: true });
  });

  it("rechaza overrides de ejercicios que no pertenecen a la rutina elegida", async () => {
    const countBefore = await prisma.studentRoutine.count();

    await request(app)
      .post(`/api/students/${fixture.studentA.id}/weekly-plan`)
      .set(trainerAuth())
      .send({
        routineId: fixture.routineA.id,
        weeks: [
          {
            weekNumber: 1,
            overrides: [
              {
                routineExerciseId: fixture.routineA.routineExercises[0].id,
                suggestedReps: "10",
              },
              { routineExerciseId: routineExerciseBId, suggestedReps: "12" },
            ],
          },
        ],
      })
      .expect(404);

    expect(await prisma.studentRoutine.count()).toBe(countBefore);
    expect(await prisma.weeklyExerciseOverride.count()).toBe(0);
  });

  it("rechaza reemplazar overrides con ejercicios de otra rutina", async () => {
    await request(app)
      .patch(`/api/students/${fixture.studentA.id}/weekly-plan/1`)
      .set(trainerAuth())
      .send({
        version: 1,
        overrides: [{ routineExerciseId: routineExerciseBId, suggestedWeight: 30 }],
      })
      .expect(404);

    expect(await prisma.weeklyExerciseOverride.count()).toBe(0);
  });

  it("conserva asignaciones y overrides válidos", async () => {
    const ownRoutineExerciseId = fixture.routineA.routineExercises[0].id;

    await request(app)
      .post(`/api/students/${fixture.studentA.id}/assign-routine`)
      .set(trainerAuth())
      .send({ routineId: fixture.routineA.id })
      .expect(200);

    await request(app)
      .patch(`/api/students/${fixture.studentA.id}/weekly-plan/1`)
      .set(trainerAuth())
      .send({
        version: 1,
        overrides: [{ routineExerciseId: ownRoutineExerciseId, suggestedWeight: 25 }],
      })
      .expect(200);

    expect(await prisma.weeklyExerciseOverride.count()).toBe(1);
  });

  it("permite asignar una rutina global", async () => {
    await request(app)
      .post(`/api/students/${fixture.studentA.id}/assign-routine`)
      .set(trainerAuth())
      .send({ routineId: globalRoutineId })
      .expect(200);

    expect(
      await prisma.studentRoutine.findFirstOrThrow({
        where: { studentId: fixture.studentA.id, isActive: true },
        select: { routineId: true },
      }),
    ).toEqual({ routineId: globalRoutineId });
  });
});

describe("relaciones de entrenamientos", () => {
  it("rechaza ejercicios de otra rutina sin crear una sesión parcial", async () => {
    const logsBefore = await prisma.workoutLog.count();
    const setsBefore = await prisma.workoutSet.count();

    await request(app)
      .post("/api/student/workout-log")
      .set(studentAuth())
      .send({
        routineExercises: [
          {
            routineExerciseId: fixture.routineA.routineExercises[0].id,
            sets: [{ setNumber: 1, reps: 10, weight: 22 }],
          },
          {
            routineExerciseId: routineExerciseBId,
            sets: [{ setNumber: 1, reps: 8, weight: 20 }],
          },
        ],
      })
      .expect(404);

    expect(await prisma.workoutLog.count()).toBe(logsBefore);
    expect(await prisma.workoutSet.count()).toBe(setsBefore);
  });

  it("conserva el registro de ejercicios de la rutina activa", async () => {
    const logsBefore = await prisma.workoutLog.count();

    await request(app)
      .post("/api/student/workout-log")
      .set(studentAuth())
      .send({
        routineExercises: [
          {
            routineExerciseId: fixture.routineA.routineExercises[0].id,
            sets: [{ setNumber: 1, reps: 10, weight: 22 }],
          },
        ],
      })
      .expect(201);

    expect(await prisma.workoutLog.count()).toBe(logsBefore + 1);
  });
});

describe("gimnasios y alumnos eliminados", () => {
  it("rechaza un gimnasio ajeno y permite uno propio", async () => {
    await request(app)
      .patch(`/api/students/${fixture.studentA.id}`)
      .set(trainerAuth())
      .send({ gymId: gymBId })
      .expect(404);

    expect(
      await prisma.student.findUniqueOrThrow({
        where: { id: fixture.studentA.id },
        select: { gymId: true },
      }),
    ).toEqual({ gymId: null });

    await request(app)
      .patch(`/api/students/${fixture.studentA.id}`)
      .set(trainerAuth())
      .send({ gymId: gymAId })
      .expect(200);

    expect(
      await prisma.student.findUniqueOrThrow({
        where: { id: fixture.studentA.id },
        select: { gymId: true },
      }),
    ).toEqual({ gymId: gymAId });
  });

  it("rechaza asignaciones y planes para un alumno eliminado", async () => {
    await prisma.student.update({
      where: { id: fixture.studentA.id },
      data: { deletedAt: new Date() },
    });

    await request(app)
      .post(`/api/students/${fixture.studentA.id}/assign-routine`)
      .set(trainerAuth())
      .send({ routineId: fixture.routineA.id })
      .expect(404);
    await request(app)
      .post(`/api/students/${fixture.studentA.id}/weekly-plan`)
      .set(trainerAuth())
      .send({ routineId: fixture.routineA.id, weeks: [{ weekNumber: 1 }] })
      .expect(404);
    await request(app)
      .get(`/api/students/${fixture.studentA.id}/summary`)
      .set(trainerAuth())
      .expect(404);
  });

  it("rechaza el portal y nuevos entrenamientos de un alumno eliminado", async () => {
    const logsBefore = await prisma.workoutLog.count();
    await prisma.student.update({
      where: { id: fixture.studentA.id },
      data: { deletedAt: new Date() },
    });

    await request(app).get("/api/student/profile").set(studentAuth()).expect(401);
    await request(app).get("/api/student/subscription").set(studentAuth()).expect(401);
    await request(app).get("/api/student/routine").set(studentAuth()).expect(401);
    await request(app)
      .post("/api/student/workout-log")
      .set(studentAuth())
      .send({
        routineExercises: [
          {
            routineExerciseId: fixture.routineA.routineExercises[0].id,
            sets: [{ setNumber: 1, reps: 10 }],
          },
        ],
      })
      .expect(401);

    expect(await prisma.workoutLog.count()).toBe(logsBefore);
  });
});
