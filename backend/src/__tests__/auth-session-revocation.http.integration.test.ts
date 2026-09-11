import jwt from "jsonwebtoken";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../app";
import { prisma } from "../infrastructure/db/prisma";
import { hashPassword } from "../shared/utils/hash";
import { resetTestDatabase } from "./support/test-database";

const currentPassword = "Password-actual-123";
const newPassword = "Password-nueva-456";

beforeEach(async () => {
  await resetTestDatabase(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function createTrainer() {
  return prisma.user.create({
    data: {
      email: "session-trainer@fitpro.test",
      passwordHash: await hashPassword(currentPassword),
      role: "TRAINER",
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
      trainer: {
        create: { firstName: "Session", lastName: "Trainer" },
      },
    },
    include: { trainer: true },
  });
}

async function createStudent(trainerId: string) {
  return prisma.user.create({
    data: {
      email: "session-student@fitpro.test",
      passwordHash: await hashPassword(currentPassword),
      role: "STUDENT",
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
      student: {
        create: {
          trainerId,
          email: "session-student@fitpro.test",
          dni: "31000001",
          firstName: "Session",
          lastName: "Student",
          status: "ACTIVE",
          activatedAt: new Date(),
        },
      },
    },
    include: { student: true },
  });
}

async function login(email: string) {
  const response = await request(app)
    .post("/api/auth/login")
    .send({ email, password: currentPassword })
    .expect(200);
  return {
    accessToken: response.body.data.accessToken as string,
    refreshCookie: response.headers["set-cookie"][0].split(";")[0] as string,
  };
}

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

describe("estado actual y revocación de sesiones", () => {
  it("rechaza un access token después de suspender al usuario", async () => {
    const user = await createTrainer();
    const session = await login(user.email);

    await prisma.user.update({
      where: { id: user.id },
      data: { status: "SUSPENDED" },
    });

    await request(app)
      .get("/api/auth/me")
      .set(bearer(session.accessToken))
      .expect(401);
  });

  it("revoca access y refresh tokens al cambiar la contraseña", async () => {
    const user = await createTrainer();
    const session = await login(user.email);

    await request(app)
      .post("/api/auth/change-password")
      .set(bearer(session.accessToken))
      .send({ currentPassword, newPassword })
      .expect(200);

    const [meResponse, refreshResponse] = await Promise.all([
      request(app).get("/api/auth/me").set(bearer(session.accessToken)),
      request(app).post("/api/auth/refresh").set("Cookie", session.refreshCookie),
    ]);
    expect(meResponse.status).toBe(401);
    expect(refreshResponse.status).toBe(401);
    expect(
      await prisma.refreshToken.count({
        where: { userId: user.id, revokedAt: null },
      })
    ).toBe(0);

    await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: newPassword })
      .expect(200);
  });

  it("revoca las sesiones del alumno al resetear su contraseña", async () => {
    const trainer = await createTrainer();
    const student = await createStudent(trainer.trainer!.id);
    const trainerSession = await login(trainer.email);
    const studentSession = await login(student.email);

    await request(app)
      .post(`/api/students/${student.student!.id}/reset-password`)
      .set(bearer(trainerSession.accessToken))
      .expect(200);

    const [meResponse, refreshResponse] = await Promise.all([
      request(app).get("/api/auth/me").set(bearer(studentSession.accessToken)),
      request(app).post("/api/auth/refresh").set("Cookie", studentSession.refreshCookie),
    ]);
    expect(meResponse.status).toBe(401);
    expect(refreshResponse.status).toBe(401);
    expect(
      await prisma.refreshToken.count({
        where: { userId: student.id, revokedAt: null },
      })
    ).toBe(0);
    expect(
      await prisma.accountInvitation.count({
        where: { studentId: student.student!.id, usedAt: null },
      })
    ).toBe(1);
  });

  it("rechaza JWT antiguos sin versión de autenticación", async () => {
    const user = await createTrainer();
    expect(user.authVersion).toBe(1);
    const legacyToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_ACCESS_SECRET!
    );

    await request(app)
      .get("/api/auth/me")
      .set(bearer(legacyToken))
      .expect(401);
  });

  it("rechaza un rol firmado que no coincide con el usuario actual", async () => {
    const trainer = await createTrainer();
    const student = await createStudent(trainer.trainer!.id);
    const mismatchedRoleToken = jwt.sign(
      {
        userId: student.id,
        email: student.email,
        role: "TRAINER",
        authVersion: 1,
      },
      process.env.JWT_ACCESS_SECRET!
    );

    await request(app)
      .get("/api/plans")
      .set(bearer(mismatchedRoleToken))
      .expect(401);
  });
});

describe("atomicidad del reset administrativo", () => {
  it("revierte todos los cambios si no puede crear la invitación", async () => {
    const trainer = await createTrainer();
    const student = await createStudent(trainer.trainer!.id);
    const trainerSession = await login(trainer.email);
    const studentSession = await login(student.email);

    await prisma.$executeRawUnsafe(`
      CREATE FUNCTION reject_test_invitation() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'controlled invitation failure';
      END;
      $$ LANGUAGE plpgsql
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER reject_test_invitation_trigger
      BEFORE INSERT ON "AccountInvitation"
      FOR EACH ROW EXECUTE FUNCTION reject_test_invitation()
    `);

    try {
      await request(app)
        .post(`/api/students/${student.student!.id}/reset-password`)
        .set(bearer(trainerSession.accessToken))
        .expect(500);
    } finally {
      await prisma.$executeRawUnsafe(
        `DROP TRIGGER IF EXISTS reject_test_invitation_trigger ON "AccountInvitation"`
      );
      await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS reject_test_invitation()`);
    }

    const [userAfter, studentAfter, activeRefreshTokens] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: student.id } }),
      prisma.student.findUniqueOrThrow({ where: { id: student.student!.id } }),
      prisma.refreshToken.count({
        where: { userId: student.id, revokedAt: null },
      }),
    ]);
    expect(userAfter.status).toBe("ACTIVE");
    expect(userAfter.passwordHash).not.toBeNull();
    expect(studentAfter.status).toBe("ACTIVE");
    expect(studentAfter.activatedAt).not.toBeNull();
    expect(activeRefreshTokens).toBe(1);
    await request(app)
      .get("/api/auth/me")
      .set(bearer(studentSession.accessToken))
      .expect(200);
  });
});
