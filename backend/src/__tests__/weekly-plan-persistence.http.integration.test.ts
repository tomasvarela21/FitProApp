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
const studentAuth = () => ({ Authorization: `Bearer ${studentToken}` });

const weeks = [
  { weekNumber: 1, startDate: "2026-09-14", endDate: "2026-09-20" },
  { weekNumber: 2, startDate: "2026-09-21", endDate: "2026-09-27" },
  { weekNumber: 3, startDate: "2026-09-28", endDate: "2026-10-04" },
];

describe("persistencia y validación del plan semanal", () => {
  it("conserva semanas sin overrides y sus fechas al recargar", async () => {
    const created = await request(app)
      .post(`/api/students/${fixture.studentA.id}/weekly-plan`)
      .set(trainerAuth())
      .send({ routineId: fixture.routineA.id, weeks, notes: "Bloque de fuerza" })
      .expect(201);

    const reloaded = await request(app)
      .get(`/api/students/${fixture.studentA.id}/weekly-plan`)
      .set(trainerAuth())
      .expect(200);

    for (const response of [created, reloaded]) {
      expect(response.body.data.weeks).toEqual([
        expect.objectContaining({ weekNumber: 1, startDate: expect.stringContaining("2026-09-14"), endDate: expect.stringContaining("2026-09-20"), overrides: [] }),
        expect.objectContaining({ weekNumber: 2, startDate: expect.stringContaining("2026-09-21"), endDate: expect.stringContaining("2026-09-27"), overrides: [] }),
        expect.objectContaining({ weekNumber: 3, startDate: expect.stringContaining("2026-09-28"), endDate: expect.stringContaining("2026-10-04"), overrides: [] }),
      ]);
    }
  });

  it("rechaza semanas duplicadas sin reemplazar la asignación vigente", async () => {
    await request(app)
      .post(`/api/students/${fixture.studentA.id}/weekly-plan`)
      .set(trainerAuth())
      .send({ routineId: fixture.routineA.id, weeks: [weeks[0], weeks[0]] })
      .expect(400);

    expect(
      await prisma.studentRoutine.findUnique({ where: { id: fixture.studentRoutine.id } })
    ).toMatchObject({ isActive: true });
  });

  it("rechaza intervalos incompletos, invertidos o superpuestos", async () => {
    const invalidWeeks = [
      [{ weekNumber: 1, startDate: "2026-09-14" }],
      [{ weekNumber: 1, startDate: "2026-09-20", endDate: "2026-09-14" }],
      [
        { weekNumber: 1, startDate: "2026-09-14", endDate: "2026-09-21" },
        { weekNumber: 2, startDate: "2026-09-21", endDate: "2026-09-27" },
      ],
    ];

    for (const candidate of invalidWeeks) {
      await request(app)
        .post(`/api/students/${fixture.studentA.id}/weekly-plan`)
        .set(trainerAuth())
        .send({ routineId: fixture.routineA.id, weeks: candidate })
        .expect(400);
    }
  });

  it("solo permite activar una semana persistida", async () => {
    await request(app)
      .patch(`/api/students/${fixture.studentA.id}/active-week`)
      .set(trainerAuth())
      .send({ weekNumber: 8 })
      .expect(404);

    expect(
      await prisma.studentRoutine.findUnique({ where: { id: fixture.studentRoutine.id } })
    ).toMatchObject({ weekNumber: 1 });
  });

  it("activa una semana persistida y sincroniza sus fechas", async () => {
    await request(app)
      .post(`/api/students/${fixture.studentA.id}/weekly-plan`)
      .set(trainerAuth())
      .send({ routineId: fixture.routineA.id, weeks })
      .expect(201);

    await request(app)
      .patch(`/api/students/${fixture.studentA.id}/active-week`)
      .set(trainerAuth())
      .send({ weekNumber: 2 })
      .expect(200);

    const reloaded = await request(app)
      .get(`/api/students/${fixture.studentA.id}/weekly-plan`)
      .set(trainerAuth())
      .expect(200);
    expect(reloaded.body.data.studentRoutine).toMatchObject({
      weekNumber: 2,
      startDate: expect.stringContaining("2026-09-21"),
      endDate: expect.stringContaining("2026-09-27"),
    });
  });

  it("aplica en el portal las notas del override de la semana activa", async () => {
    const routineExerciseId = fixture.routineA.routineExercises[0].id;
    await request(app)
      .patch(`/api/students/${fixture.studentA.id}/weekly-plan/1`)
      .set(trainerAuth())
      .send({ version: 1, overrides: [{ routineExerciseId, notes: "Pausa de dos segundos" }] })
      .expect(200);

    const portal = await request(app)
      .get("/api/student/routine")
      .set(studentAuth())
      .expect(200);

    expect(portal.body.data.routine.routineExercises[0].notes).toBe("Pausa de dos segundos");
  });
});
