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

async function expectPersistedStatusesUnchanged() {
  expect(
    await prisma.subscription.findUniqueOrThrow({
      where: { id: fixture.subscription.id },
      select: { status: true },
    })
  ).toEqual({ status: "ACTIVE" });
  expect(
    await prisma.installment.findFirstOrThrow({
      where: { subscriptionId: fixture.subscription.id },
      select: { status: true },
    })
  ).toEqual({ status: "PENDING" });
}

describe("pureza de las consultas de cobros", () => {
  it("muestra la cuota vencida al entrenador sin modificarla", async () => {
    const response = await request(app)
      .get(`/api/subscriptions/student/${fixture.studentA.id}`)
      .set(trainerAuth())
      .expect(200);

    expect(response.body.data.installments[0].status).toBe("OVERDUE");
    await expectPersistedStatusesUnchanged();
  });

  it("muestra la cuota vencida al alumno sin modificarla", async () => {
    const response = await request(app)
      .get("/api/student/subscription")
      .set(studentAuth())
      .expect(200);

    expect(response.body.data.installments[0].status).toBe("OVERDUE");
    await expectPersistedStatusesUnchanged();
  });

  it("arma el resumen del alumno sin escrituras posteriores a la respuesta", async () => {
    const response = await request(app)
      .get(`/api/students/${fixture.studentA.id}/summary`)
      .set(trainerAuth())
      .expect(200);

    expect(response.body.data.subscription.installments[0].status).toBe("OVERDUE");
    await new Promise((resolve) => setTimeout(resolve, 50));
    await expectPersistedStatusesUnchanged();
  });

  it("arma el dashboard sin escrituras fire-and-forget", async () => {
    const response = await request(app)
      .get("/api/trainers/dashboard-summary")
      .set(trainerAuth())
      .expect(200);

    expect(response.body.data.alerts.expired).toHaveLength(1);
    await new Promise((resolve) => setTimeout(resolve, 50));
    await expectPersistedStatusesUnchanged();
  });

  it("informa suscripciones vencidas sin cambiar su estado persistido", async () => {
    const firstResponse = await request(app)
      .get("/api/subscriptions/expiring")
      .set(trainerAuth())
      .expect(200);
    const secondResponse = await request(app)
      .get("/api/subscriptions/expiring")
      .set(trainerAuth())
      .expect(200);

    expect(firstResponse.body.data.expired).toHaveLength(1);
    expect(secondResponse.body.data.expired).toHaveLength(1);
    await expectPersistedStatusesUnchanged();
  });

  it("mantiene visibles las suscripciones vencidas registradas por el sistema anterior", async () => {
    await prisma.subscription.update({
      where: { id: fixture.subscription.id },
      data: { status: "EXPIRED" },
    });

    const response = await request(app)
      .get("/api/subscriptions/expiring")
      .set(trainerAuth())
      .expect(200);

    expect(response.body.data.expired).toHaveLength(1);
    expect(
      await prisma.subscription.findUniqueOrThrow({
        where: { id: fixture.subscription.id },
        select: { status: true },
      })
    ).toEqual({ status: "EXPIRED" });
  });

  it("clasifica importes vencidos en analíticas sin depender de una lectura previa", async () => {
    const response = await request(app)
      .get("/api/analytics/business")
      .set(trainerAuth())
      .expect(200);

    expect(response.body.data.revenue).toMatchObject({
      totalPending: 0,
      totalOverdue: 100,
    });
    await expectPersistedStatusesUnchanged();
  });
});
