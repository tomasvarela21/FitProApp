import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../app";
import { prisma } from "../infrastructure/db/prisma";
import { createTenantFixture } from "./support/tenant.fixture";
import { resetTestDatabase } from "./support/test-database";

beforeAll(async () => {
  await resetTestDatabase(prisma);
  await createTenantFixture(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("POST /api/auth/login", () => {
  it("devuelve 400 con email inválido", async () => {
    const res = await request(app).post("/api/auth/login")
      .send({ email: "not-an-email", password: "password123" }).expect(400);
    expect(res.body.ok).toBe(false);
  });

  it("devuelve 400 con contraseña corta", async () => {
    const res = await request(app).post("/api/auth/login")
      .send({ email: "user@test.com", password: "abc" }).expect(400);
    expect(res.body.ok).toBe(false);
  });

  it("devuelve 400 con body vacío", async () => {
    const res = await request(app).post("/api/auth/login").send({}).expect(400);
    expect(res.body.ok).toBe(false);
  });

  it("devuelve 401 con credenciales inválidas", async () => {
    const res = await request(app).post("/api/auth/login")
      .send({ email: "noexiste@test.com", password: "password123" }).expect(401);
    expect(res.body.ok).toBe(false);
  });
});

describe("autenticación y rutas básicas", () => {
  it("rechaza /api/auth/me sin token", async () => {
    const res = await request(app).get("/api/auth/me").expect(401);
    expect(res.body.ok).toBe(false);
  });

  it("rechaza /api/auth/me con token inválido", async () => {
    const res = await request(app).get("/api/auth/me")
      .set("Authorization", "Bearer token_invalido").expect(401);
    expect(res.body.ok).toBe(false);
  });

  it("rechaza refresh sin token", async () => {
    const res = await request(app).post("/api/auth/refresh").send({}).expect(401);
    expect(res.body.ok).toBe(false);
  });

  it("rechaza refresh con token inexistente", async () => {
    const res = await request(app).post("/api/auth/refresh")
      .send({ refreshToken: "token_inexistente_en_db" }).expect(401);
    expect(res.body.ok).toBe(false);
  });

  it("responde health y 404", async () => {
    expect((await request(app).get("/health").expect(200)).body.ok).toBe(true);
    await request(app).get("/api/ruta-que-no-existe").expect(404);
  });
});

describe("fixture multiusuario", () => {
  it("crea dos tenants aislados para pruebas posteriores", async () => {
    const [trainers, exerciseCount, subscriptionCount, workoutCount] = await Promise.all([
      prisma.trainer.findMany({ include: { students: true } }),
      prisma.exercise.count(),
      prisma.subscription.count(),
      prisma.workoutLog.count(),
    ]);
    expect(trainers).toHaveLength(2);
    expect(trainers.every((trainer) => trainer.students.length === 1)).toBe(true);
    expect(exerciseCount).toBe(3);
    expect(subscriptionCount).toBe(1);
    expect(workoutCount).toBe(1);
  });
});
