import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../app";
import { prisma } from "../infrastructure/db/prisma";

describe("límites de la aplicación", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rechaza cuerpos JSON mayores al límite configurado", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "a@fitpro.test", password: "x".repeat(110_000) })
      .expect(413);

    expect(response.body).toMatchObject({
      ok: false,
      message: "El cuerpo de la solicitud es demasiado grande",
    });
  });

  it("solo refleja orígenes CORS autorizados", async () => {
    const allowed = await request(app)
      .get("/health")
      .set("Origin", "http://localhost:5173")
      .expect(200);
    const rejected = await request(app)
      .get("/health")
      .set("Origin", "https://attacker.example")
      .expect(200);

    expect(allowed.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(rejected.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("no confía en cabeceras de proxy si no se configuraron saltos", () => {
    expect(app.get("trust proxy")).toBe(false);
  });
});
