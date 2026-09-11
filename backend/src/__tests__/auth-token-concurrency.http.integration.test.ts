import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../app";
import { prisma } from "../infrastructure/db/prisma";
import { hashPassword } from "../shared/utils/hash";
import { generateRawToken, hashToken } from "../shared/utils/token";
import { resetTestDatabase } from "./support/test-database";

const password = "Password-segura-123";

beforeEach(async () => {
  await resetTestDatabase(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function createActiveTrainer() {
  return prisma.user.create({
    data: {
      email: "concurrent-trainer@fitpro.test",
      passwordHash: await hashPassword(password),
      role: "TRAINER",
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
      trainer: {
        create: { firstName: "Connie", lastName: "Current" },
      },
    },
  });
}

async function createPendingStudentInvitation() {
  const trainer = await prisma.user.create({
    data: {
      email: "inviting-trainer@fitpro.test",
      role: "TRAINER",
      status: "ACTIVE",
      trainer: { create: { firstName: "Invita", lastName: "Trainer" } },
    },
    include: { trainer: true },
  });
  const student = await prisma.user.create({
    data: {
      email: "pending-student@fitpro.test",
      role: "STUDENT",
      status: "INVITED",
      student: {
        create: {
          trainerId: trainer.trainer!.id,
          email: "pending-student@fitpro.test",
          dni: "30000001",
          firstName: "Penda",
          lastName: "Student",
          status: "INVITED",
        },
      },
    },
    include: { student: true },
  });
  const rawToken = generateRawToken();
  const invitation = await prisma.accountInvitation.create({
    data: {
      studentId: student.student!.id,
      email: student.email,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + 60_000),
      createdByTrainerId: trainer.trainer!.id,
    },
  });
  return { rawToken, invitation };
}

async function createPendingTrainerVerification() {
  const trainer = await prisma.user.create({
    data: {
      email: "pending-trainer@fitpro.test",
      role: "TRAINER",
      status: "INVITED",
      trainer: { create: { firstName: "Pending", lastName: "Trainer" } },
    },
    include: { trainer: true },
  });
  const rawToken = generateRawToken();
  const verification = await prisma.trainerVerification.create({
    data: {
      trainerId: trainer.trainer!.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + 60_000),
    },
  });
  return { rawToken, verification };
}

describe("consumo concurrente de credenciales de un solo uso", () => {
  it("permite rotar un refresh token una sola vez", async () => {
    const user = await createActiveTrainer();
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password })
      .expect(200);
    const refreshCookie = login.headers["set-cookie"][0].split(";")[0];

    const responses = await Promise.all([
      request(app).post("/api/auth/refresh").set("Cookie", refreshCookie),
      request(app).post("/api/auth/refresh").set("Cookie", refreshCookie),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 401]);
    expect(
      await prisma.refreshToken.count({
        where: { userId: user.id, revokedAt: null },
      })
    ).toBe(1);
  });

  it("permite activar una invitación de alumno una sola vez", async () => {
    const { rawToken, invitation } = await createPendingStudentInvitation();

    const responses = await Promise.all([
      request(app)
        .post("/api/auth/activate-account")
        .send({ token: rawToken, password: "Primera-clave-123" }),
      request(app)
        .post("/api/auth/activate-account")
        .send({ token: rawToken, password: "Segunda-clave-456" }),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 400]);
    expect(
      await prisma.accountInvitation.count({
        where: { id: invitation.id, usedAt: { not: null } },
      })
    ).toBe(1);
  });

  it("permite verificar el email de un entrenador una sola vez", async () => {
    const { rawToken, verification } = await createPendingTrainerVerification();

    const responses = await Promise.all([
      request(app).post("/api/auth/verify-email").send({ token: rawToken }),
      request(app).post("/api/auth/verify-email").send({ token: rawToken }),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 400]);
    expect(
      await prisma.trainerVerification.count({
        where: { id: verification.id, usedAt: { not: null } },
      })
    ).toBe(1);
  });
});

describe("contrato web del refresh token", () => {
  it("no expone el refresh token en el JSON de login", async () => {
    const user = await createActiveTrainer();
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password })
      .expect(200);

    expect(login.body.data).not.toHaveProperty("refreshToken");
    expect(login.headers["set-cookie"][0]).toContain("HttpOnly");
  });

  it("no acepta refresh tokens enviados en el body", async () => {
    const user = await createActiveTrainer();
    const rawToken = generateRawToken(48);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: rawToken })
      .expect(401);
  });
});
