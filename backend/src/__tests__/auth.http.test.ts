import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../app";

// Tests de HTTP que no requieren un usuario real — validan respuestas de la API
describe("POST /api/auth/login", () => {
  it("devuelve 400 con email inválido", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "not-an-email", password: "password123" })
      .expect(400);

    expect(res.body.ok).toBe(false);
  });

  it("devuelve 400 con contraseña corta", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@test.com", password: "abc" })
      .expect(400);

    expect(res.body.ok).toBe(false);
  });

  it("devuelve 400 con body vacío", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({})
      .expect(400);

    expect(res.body.ok).toBe(false);
  });

  it("devuelve 401 con credenciales inválidas", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "noexiste@test.com", password: "password123" })
      .expect(401);

    expect(res.body.ok).toBe(false);
  });
});

describe("GET /api/auth/me", () => {
  it("devuelve 401 sin token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .expect(401);

    expect(res.body.ok).toBe(false);
  });

  it("devuelve 401 con token inválido", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer token_invalido")
      .expect(401);

    expect(res.body.ok).toBe(false);
  });
});

describe("POST /api/auth/refresh", () => {
  it("devuelve 401 sin refresh token", async () => {
    const res = await request(app)
      .post("/api/auth/refresh")
      .send({})
      .expect(401);

    expect(res.body.ok).toBe(false);
  });

  it("devuelve 401 con refresh token falso", async () => {
    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: "token_inexistente_en_db" })
      .expect(401);

    expect(res.body.ok).toBe(false);
  });
});

describe("GET /health", () => {
  it("devuelve 200", async () => {
    const res = await request(app)
      .get("/health")
      .expect(200);

    expect(res.body.ok).toBe(true);
  });
});

describe("Rutas inexistentes", () => {
  it("devuelve 404 para rutas no definidas", async () => {
    await request(app)
      .get("/api/ruta-que-no-existe")
      .expect(404);
  });
});
