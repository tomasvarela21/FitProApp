import { afterAll, beforeAll, describe, expect, it } from "vitest";
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

beforeAll(async () => {
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

function expectValidationError(response: request.Response) {
  expect(response.body).toMatchObject({ ok: false, message: "Datos inválidos" });
}

describe("errores de validación HTTP", () => {
  it("devuelve 400 para un body inválido procesado por el controlador", async () => {
    const response = await request(app)
      .post("/api/routines")
      .set(trainerAuth())
      .send({ name: "x" })
      .expect(400);

    expectValidationError(response);
  });

  it("devuelve 400 para JSON malformado", async () => {
    const response = await request(app)
      .post("/api/routines")
      .set(trainerAuth())
      .set("Content-Type", "application/json")
      .send('{"name":')
      .expect(400);

    expectValidationError(response);
  });

  it("rechaza filtros de ejercicios desconocidos", async () => {
    const response = await request(app)
      .get("/api/exercises?isGlobal=quizas")
      .set(trainerAuth())
      .expect(400);

    expectValidationError(response);
  });

  it("rechaza queries inválidas de alumnos", async () => {
    const response = await request(app)
      .get("/api/students?page=0&limit=500")
      .set(trainerAuth())
      .expect(400);

    expectValidationError(response);
  });

  it.each([
    ["ejercicio", "/api/exercises/no-es-cuid"],
    ["rutina", "/api/routines/no-es-cuid"],
    ["alumno", "/api/students/no-es-cuid"],
    ["plan", "/api/plans/no-es-cuid"],
    ["suscripción", "/api/subscriptions/no-es-cuid"],
  ])("rechaza un ID inválido de %s", async (_label, url) => {
    const operation = url.includes("/plans/") || url.includes("/subscriptions/")
      ? request(app).delete(url)
      : request(app).get(url);
    const response = await operation.set(trainerAuth()).expect(400);
    expectValidationError(response);
  });

  it("rechaza un ID inválido de gimnasio", async () => {
    const response = await request(app)
      .patch("/api/gyms/no-es-cuid")
      .set(trainerAuth())
      .send({ name: "Gimnasio" })
      .expect(400);
    expectValidationError(response);
  });

  it("rechaza un número de semana inválido", async () => {
    const response = await request(app)
      .patch(`/api/students/${fixture.studentA.id}/weekly-plan/no-es-semana`)
      .set(trainerAuth())
      .send({ overrides: [] })
      .expect(400);

    expectValidationError(response);
  });

  it("rechaza fechas inválidas en planes semanales", async () => {
    const response = await request(app)
      .post(`/api/students/${fixture.studentA.id}/weekly-plan`)
      .set(trainerAuth())
      .send({
        routineId: fixture.routineA.id,
        weeks: [{ weekNumber: 1, startDate: "fecha-invalida" }],
      })
      .expect(400);

    expectValidationError(response);
  });

  it("rechaza fechas inválidas al registrar entrenamientos", async () => {
    const response = await request(app)
      .post("/api/student/workout-log")
      .set(studentAuth())
      .send({
        date: "fecha-invalida",
        routineExercises: [
          {
            routineExerciseId: fixture.routineA.routineExercises[0].id,
            sets: [{ setNumber: 1, reps: 10 }],
          },
        ],
      })
      .expect(400);

    expectValidationError(response);
  });

  it("mantiene 404 para un recurso válido pero inaccesible", async () => {
    await request(app)
      .get(`/api/exercises/${fixture.privateExerciseB.id}`)
      .set(trainerAuth())
      .expect(404);
  });
});
