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

beforeEach(async () => {
  await resetTestDatabase(prisma);
  fixture = await createTenantFixture(prisma);
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

const trainerAuth = () => ({ Authorization: `Bearer ${trainerToken}` });

describe("versionado de planificación semanal", () => {
  it("acepta un solo guardado concurrente y rechaza la versión obsoleta con 409", async () => {
    await request(app)
      .post(`/api/students/${fixture.studentA.id}/weekly-plan`)
      .set(trainerAuth())
      .send({
        routineId: fixture.routineA.id,
        weeks: [{ weekNumber: 1 }],
      })
      .expect(201);

    const initial = await request(app)
      .get(`/api/students/${fixture.studentA.id}/weekly-plan`)
      .set(trainerAuth())
      .expect(200);
    expect(initial.body.data.weeks[0].version).toBe(1);

    const routineExerciseId = fixture.routineA.routineExercises[0].id;
    const save = (notes: string) =>
      request(app)
        .patch(`/api/students/${fixture.studentA.id}/weekly-plan/1`)
        .set(trainerAuth())
        .send({
          version: 1,
          overrides: [{ routineExerciseId, notes }],
        });

    const responses = await Promise.all([save("Pestaña A"), save("Pestaña B")]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);

    const winner = responses.find((response) => response.status === 200)!;
    expect(winner.body.data).toMatchObject({ weekNumber: 1, version: 2 });

    const staleRetry = await save("Reintento obsoleto");
    expect(staleRetry.status).toBe(409);

    const reloaded = await request(app)
      .get(`/api/students/${fixture.studentA.id}/weekly-plan`)
      .set(trainerAuth())
      .expect(200);
    expect(reloaded.body.data.weeks[0]).toMatchObject({
      weekNumber: 1,
      version: 2,
      overrides: [expect.objectContaining({ notes: expect.stringMatching(/^Pestaña [AB]$/) })],
    });
  });
});
