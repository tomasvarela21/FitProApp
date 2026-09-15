import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../app";
import { prisma } from "../infrastructure/db/prisma";
import { signAccessToken } from "../shared/utils/jwt";
import { createTenantFixture } from "./support/tenant.fixture";
import { resetTestDatabase } from "./support/test-database";

type Fixture = Awaited<ReturnType<typeof createTenantFixture>>;

let fixture: Fixture;
let studentToken: string;
let trainerToken: string;

beforeEach(async () => {
  await resetTestDatabase(prisma);
  fixture = await createTenantFixture(prisma);
  studentToken = signAccessToken({
    userId: fixture.studentA.userId!,
    email: "student-a@fitpro.test",
    role: "STUDENT",
    authVersion: 1,
  });
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

const studentAuth = () => ({ Authorization: `Bearer ${studentToken}` });
const trainerAuth = () => ({ Authorization: `Bearer ${trainerToken}` });
const workoutPayload = () => ({
  date: "2026-09-14T12:00:00.000Z",
  routineExercises: [
    {
      routineExerciseId: fixture.routineA.routineExercises[0].id,
      sets: [{ setNumber: 1, reps: 10, weight: 25 }],
    },
  ],
});

async function createReplacementRoutine() {
  return prisma.routine.create({
    data: {
      name: "Rutina de reemplazo",
      trainerId: fixture.trainerA.id,
      routineExercises: {
        create: {
          exerciseId: fixture.privateExerciseA.id,
          dayOfWeek: "TUESDAY",
          order: 1,
          sets: 2,
          reps: "12",
        },
      },
    },
  });
}

describe("idempotencia de entrenamientos y rutina activa única", () => {
  it("registra una sola sesión cuando llegan dos solicitudes con la misma clave", async () => {
    const before = await prisma.workoutLog.count({
      where: { studentRoutine: { studentId: fixture.studentA.id } },
    });
    const idempotencyKey = "6a1a2411-bc85-4b0b-af8d-e4c46e463c0b";
    const submit = () =>
      request(app)
        .post("/api/student/workout-log")
        .set(studentAuth())
        .set("Idempotency-Key", idempotencyKey)
        .send(workoutPayload());

    const responses = await Promise.all([submit(), submit()]);

    expect(responses.map((response) => response.status)).toEqual([201, 201]);
    expect(responses[0].body.data.id).toBe(responses[1].body.data.id);
    expect(
      await prisma.workoutLog.count({
        where: { studentRoutine: { studentId: fixture.studentA.id } },
      })
    ).toBe(before + 1);
  });

  it("reconoce el reintento aunque haya cambiado la rutina activa", async () => {
    const idempotencyKey = "a47ef426-e796-42b8-8af1-4e781fb2a6f5";
    const first = await request(app)
      .post("/api/student/workout-log")
      .set(studentAuth())
      .set("Idempotency-Key", idempotencyKey)
      .send(workoutPayload())
      .expect(201);

    const replacement = await createReplacementRoutine();
    await request(app)
      .post(`/api/students/${fixture.studentA.id}/assign-routine`)
      .set(trainerAuth())
      .send({ routineId: replacement.id })
      .expect(200);

    const replay = await request(app)
      .post("/api/student/workout-log")
      .set(studentAuth())
      .set("Idempotency-Key", idempotencyKey)
      .send(workoutPayload())
      .expect(201);

    expect(replay.body.data.id).toBe(first.body.data.id);
    expect(
      await prisma.workoutLog.count({ where: { id: first.body.data.id } })
    ).toBe(1);
  });

  it("rechaza reutilizar una clave con un contenido diferente", async () => {
    const idempotencyKey = "d5ada7e8-40c6-40bd-9fa5-b3b2d5e12298";
    await request(app)
      .post("/api/student/workout-log")
      .set(studentAuth())
      .set("Idempotency-Key", idempotencyKey)
      .send(workoutPayload())
      .expect(201);

    await request(app)
      .post("/api/student/workout-log")
      .set(studentAuth())
      .set("Idempotency-Key", idempotencyKey)
      .send({ ...workoutPayload(), notes: "contenido distinto" })
      .expect(409);
  });

  it("impide dos asignaciones activas para el mismo alumno en PostgreSQL", async () => {
    const replacement = await createReplacementRoutine();
    let rejected = false;

    try {
      await prisma.studentRoutine.create({
        data: {
          studentId: fixture.studentA.id,
          routineId: replacement.id,
          isActive: true,
        },
      });
    } catch {
      rejected = true;
    }

    expect(rejected).toBe(true);
    expect(
      await prisma.studentRoutine.count({
        where: { studentId: fixture.studentA.id, isActive: true },
      })
    ).toBe(1);
  });

  it("mantiene una sola rutina activa ante dos asignaciones simultáneas", async () => {
    const first = await createReplacementRoutine();
    const second = await prisma.routine.create({
      data: { name: "Rutina concurrente", trainerId: fixture.trainerA.id },
    });
    const assign = (routineId: string) =>
      request(app)
        .post(`/api/students/${fixture.studentA.id}/assign-routine`)
        .set(trainerAuth())
        .send({ routineId });

    const responses = await Promise.all([assign(first.id), assign(second.id)]);

    expect(responses.every((response) => response.status === 200 || response.status === 409)).toBe(true);
    expect(responses.some((response) => response.status === 200)).toBe(true);
    expect(
      await prisma.studentRoutine.count({
        where: { studentId: fixture.studentA.id, isActive: true },
      })
    ).toBe(1);
  });

  it("exige una clave de idempotencia válida antes de registrar", async () => {
    const before = await prisma.workoutLog.count();

    await request(app)
      .post("/api/student/workout-log")
      .set(studentAuth())
      .send(workoutPayload())
      .expect(400);

    expect(await prisma.workoutLog.count()).toBe(before);
  });
});
