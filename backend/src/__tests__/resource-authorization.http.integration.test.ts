import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../app";
import { prisma } from "../infrastructure/db/prisma";
import { signAccessToken } from "../shared/utils/jwt";
import { createTenantFixture } from "./support/tenant.fixture";
import { resetTestDatabase } from "./support/test-database";

type Fixture = Awaited<ReturnType<typeof createTenantFixture>>;

let fixture: Fixture;
let routineBId: string;
let globalRoutineId: string;

const tokens: Record<"trainerA" | "trainerB" | "studentA" | "studentB", string> = {
  trainerA: "",
  trainerB: "",
  studentA: "",
  studentB: "",
};

function bearer(identity: keyof typeof tokens) {
  return `Bearer ${tokens[identity]}`;
}

beforeAll(async () => {
  await resetTestDatabase(prisma);
  fixture = await createTenantFixture(prisma);

  const [routineB, globalRoutine] = await Promise.all([
    prisma.routine.create({
      data: { name: "Tenant B private routine", trainerId: fixture.trainerB.id },
    }),
    prisma.routine.create({
      data: { name: "Global routine", isGlobal: true },
    }),
  ]);
  routineBId = routineB.id;
  globalRoutineId = globalRoutine.id;

  tokens.trainerA = signAccessToken({
    userId: fixture.trainerA.userId,
    email: "trainer-a@fitpro.test",
    role: "TRAINER",
    authVersion: 1,
  });
  tokens.trainerB = signAccessToken({
    userId: fixture.trainerB.userId,
    email: "trainer-b@fitpro.test",
    role: "TRAINER",
    authVersion: 1,
  });
  tokens.studentA = signAccessToken({
    userId: fixture.studentA.userId!,
    email: fixture.studentA.email,
    role: "STUDENT",
    authVersion: 1,
  });
  tokens.studentB = signAccessToken({
    userId: fixture.studentB.userId!,
    email: fixture.studentB.email,
    role: "STUDENT",
    authVersion: 1,
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("autorización de ejercicios", () => {
  it("rechaza una lectura sin sesión", async () => {
    await request(app).get(`/api/exercises/${fixture.globalExercise.id}`).expect(401);
  });

  it("permite al entrenador leer ejercicios propios y globales", async () => {
    await request(app)
      .get(`/api/exercises/${fixture.privateExerciseA.id}`)
      .set("Authorization", bearer("trainerA"))
      .expect(200);
    await request(app)
      .get(`/api/exercises/${fixture.privateExerciseB.id}`)
      .set("Authorization", bearer("trainerB"))
      .expect(200);
    await request(app)
      .get(`/api/exercises/${fixture.globalExercise.id}`)
      .set("Authorization", bearer("trainerA"))
      .expect(200);
  });

  it("oculta al entrenador los ejercicios privados de otro entrenador", async () => {
    await request(app)
      .get(`/api/exercises/${fixture.privateExerciseB.id}`)
      .set("Authorization", bearer("trainerA"))
      .expect(404);
  });

  it("permite al alumno ejercicios globales y ejercicios incluidos en su asignación", async () => {
    await request(app)
      .get(`/api/exercises/${fixture.globalExercise.id}`)
      .set("Authorization", bearer("studentA"))
      .expect(200);
    await request(app)
      .get(`/api/exercises/${fixture.privateExerciseA.id}`)
      .set("Authorization", bearer("studentA"))
      .expect(200);
  });

  it("oculta al alumno ejercicios privados no asignados", async () => {
    await request(app)
      .get(`/api/exercises/${fixture.privateExerciseB.id}`)
      .set("Authorization", bearer("studentA"))
      .expect(404);
    await request(app)
      .get(`/api/exercises/${fixture.privateExerciseA.id}`)
      .set("Authorization", bearer("studentB"))
      .expect(404);
  });

  it("impide modificar ejercicios ajenos sin revelar su existencia", async () => {
    await request(app)
      .patch(`/api/exercises/${fixture.privateExerciseB.id}`)
      .set("Authorization", bearer("trainerA"))
      .send({ name: "Intento de cambio" })
      .expect(404);

    expect(
      await prisma.exercise.findUniqueOrThrow({
        where: { id: fixture.privateExerciseB.id },
        select: { name: true },
      }),
    ).toEqual({ name: fixture.privateExerciseB.name });
  });

  it("impide modificar un ejercicio global", async () => {
    await request(app)
      .patch(`/api/exercises/${fixture.globalExercise.id}`)
      .set("Authorization", bearer("trainerA"))
      .send({ name: "Intento de cambio global" })
      .expect(404);
  });
});

describe("autorización de rutinas", () => {
  it("permite al entrenador leer rutinas propias y globales", async () => {
    await request(app)
      .get(`/api/routines/${fixture.routineA.id}`)
      .set("Authorization", bearer("trainerA"))
      .expect(200);
    await request(app)
      .get(`/api/routines/${routineBId}`)
      .set("Authorization", bearer("trainerB"))
      .expect(200);
    await request(app)
      .get(`/api/routines/${globalRoutineId}`)
      .set("Authorization", bearer("trainerA"))
      .expect(200);
  });

  it("oculta las rutinas privadas de otro entrenador", async () => {
    await request(app)
      .get(`/api/routines/${routineBId}`)
      .set("Authorization", bearer("trainerA"))
      .expect(404);
  });

  it("impide modificar rutinas ajenas sin revelar su existencia", async () => {
    await request(app)
      .patch(`/api/routines/${routineBId}`)
      .set("Authorization", bearer("trainerA"))
      .send({ name: "Intento de cambio" })
      .expect(404);

    expect(
      await prisma.routine.findUniqueOrThrow({
        where: { id: routineBId },
        select: { name: true },
      }),
    ).toEqual({ name: "Tenant B private routine" });
  });

  it("rechaza asociar un ejercicio privado ajeno sin escrituras parciales", async () => {
    const countBefore = await prisma.routineExercise.count({
      where: { routineId: fixture.routineA.id },
    });

    await request(app)
      .post(`/api/routines/${fixture.routineA.id}/exercises`)
      .set("Authorization", bearer("trainerA"))
      .send({
        exerciseId: fixture.privateExerciseB.id,
        dayOfWeek: "TUESDAY",
        order: 2,
        sets: 3,
        reps: "10",
      })
      .expect(404);

    expect(
      await prisma.routineExercise.count({ where: { routineId: fixture.routineA.id } }),
    ).toBe(countBefore);
  });

  it("conserva la asociación de ejercicios propios y globales", async () => {
    for (const [exerciseId, order] of [
      [fixture.privateExerciseA.id, 2],
      [fixture.globalExercise.id, 3],
    ] as const) {
      await request(app)
        .post(`/api/routines/${fixture.routineA.id}/exercises`)
        .set("Authorization", bearer("trainerA"))
        .send({
          exerciseId,
          dayOfWeek: "TUESDAY",
          order,
          sets: 3,
          reps: "10",
        })
        .expect(201);
    }

    expect(
      await prisma.routineExercise.count({ where: { routineId: fixture.routineA.id } }),
    ).toBe(3);
  });

  it("impide clonar una rutina privada ajena", async () => {
    const countBefore = await prisma.routine.count();

    await request(app)
      .post(`/api/routines/${routineBId}/clone`)
      .set("Authorization", bearer("trainerA"))
      .expect(404);

    expect(await prisma.routine.count()).toBe(countBefore);
  });
});
