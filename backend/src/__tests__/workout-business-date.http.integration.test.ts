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

beforeEach(async () => {
  await resetTestDatabase(prisma);
  fixture = await createTenantFixture(prisma);
  studentToken = signAccessToken({
    userId: fixture.studentA.userId!,
    email: "student-a@fitpro.test",
    role: "STUDENT",
    authVersion: 1,
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

const studentAuth = () => ({ Authorization: `Bearer ${studentToken}` });

function workoutRow(date: Date) {
  return {
    studentId: fixture.studentA.id,
    studentRoutineId: fixture.studentRoutine.id,
    routineId: fixture.routineA.id,
    routineName: fixture.routineA.name,
    date,
    businessDate: new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`),
  };
}

describe("fechas de negocio y rachas", () => {
  it("atribuye a Buenos Aires una sesión cercana a medianoche UTC", async () => {
    const submit = (date: string, idempotencyKey: string) =>
      request(app)
        .post("/api/student/workout-log")
        .set(studentAuth())
        .set("Idempotency-Key", idempotencyKey)
        .send({
          date,
          routineExercises: [
            {
              routineExerciseId: fixture.routineA.routineExercises[0].id,
              sets: [{ setNumber: 1, reps: 10 }],
            },
          ],
        });

    await submit("2026-03-01T02:30:00.000Z", "8dbeb6b3-ddc6-40fc-af5a-3f612944d111").expect(201);
    await submit("2026-03-01T02:45:00.000Z", "e363245e-c88f-49af-9014-4aa4b7c3f5e9").expect(201);

    const history = await request(app)
      .get("/api/student/workout-history")
      .set(studentAuth())
      .expect(200);
    expect(history.body.data.slice(0, 2).map((log: { businessDate: string }) => log.businessDate))
      .toEqual(["2026-02-28", "2026-02-28"]);

    const response = await request(app)
      .get("/api/student/streak?today=2026-02-28")
      .set(studentAuth())
      .expect(200);

    expect(response.body.data).toEqual({
      streak: 1,
      lastWorkoutDate: "2026-02-28",
      trainedToday: true,
    });
  });

  it("calcula una racha mayor a 90 días sin truncarla por cantidad de sesiones", async () => {
    const today = new Date("2026-04-30T12:00:00.000Z");
    const rows = Array.from({ length: 120 }, (_, index) => {
      const date = new Date(today);
      date.setUTCDate(date.getUTCDate() - index);
      return workoutRow(date);
    });
    await prisma.workoutLog.createMany({ data: rows });

    const response = await request(app)
      .get("/api/student/streak?today=2026-04-30")
      .set(studentAuth())
      .expect(200);

    expect(response.body.data).toMatchObject({
      streak: 120,
      lastWorkoutDate: "2026-04-30",
      trainedToday: true,
    });
  });
});
