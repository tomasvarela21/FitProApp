import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import webpush from "web-push";
import { app } from "../app";
import { prisma } from "../infrastructure/db/prisma";
import { NotificationService } from "../modules/notifications/notifications.service";
import { signAccessToken } from "../shared/utils/jwt";
import { createTenantFixture } from "./support/tenant.fixture";
import { resetTestDatabase } from "./support/test-database";

type Fixture = Awaited<ReturnType<typeof createTenantFixture>>;

const webSubscription = (suffix: string) => ({
  type: "WEB" as const,
  endpoint: `https://fcm.googleapis.com/fcm/send/${suffix}`,
  p256dh: "A".repeat(87),
  auth: "B".repeat(22),
});

describe("suscripciones Web Push", () => {
  let fixture: Fixture;
  let trainerAToken: string;
  let trainerBToken: string;

  beforeAll(async () => {
    await resetTestDatabase(prisma);
    fixture = await createTenantFixture(prisma);
    trainerAToken = signAccessToken({
      userId: fixture.trainerA.userId,
      email: "trainer-a@fitpro.test",
      role: "TRAINER",
      authVersion: 1,
    });
    trainerBToken = signAccessToken({
      userId: fixture.trainerB.userId,
      email: "trainer-b@fitpro.test",
      role: "TRAINER",
      authVersion: 1,
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(() => {
    vi.mocked(webpush.sendNotification).mockReset();
    vi.mocked(webpush.sendNotification).mockResolvedValue({ statusCode: 201 } as never);
  });

  it("rechaza endpoints inseguros y campos incompatibles", async () => {
    await request(app)
      .post("/api/notifications/subscribe")
      .set("Authorization", `Bearer ${trainerAToken}`)
      .send({ ...webSubscription("unsafe"), endpoint: "https://localhost/push" })
      .expect(400);

    await request(app)
      .post("/api/notifications/subscribe")
      .set("Authorization", `Bearer ${trainerAToken}`)
      .send({ ...webSubscription("mixed"), token: "ExponentPushToken[unexpected]" })
      .expect(400);
  });

  it("impide que otra cuenta reclame un endpoint registrado", async () => {
    const subscription = webSubscription("owned-endpoint");

    await request(app)
      .post("/api/notifications/subscribe")
      .set("Authorization", `Bearer ${trainerAToken}`)
      .send(subscription)
      .expect(200);

    await request(app)
      .post("/api/notifications/subscribe")
      .set("Authorization", `Bearer ${trainerBToken}`)
      .send(subscription)
      .expect(409);

    const stored = await prisma.pushSubscription.findFirstOrThrow({
      where: { endpoint: subscription.endpoint },
    });
    expect(stored.userId).toBe(fixture.trainerA.userId);
  });

  it("limita a diez destinos web por usuario", async () => {
    await prisma.pushSubscription.deleteMany({ where: { userId: fixture.trainerA.userId } });

    for (let index = 0; index < 10; index += 1) {
      await request(app)
        .post("/api/notifications/subscribe")
        .set("Authorization", `Bearer ${trainerAToken}`)
        .send(webSubscription(`limit-${index}`))
        .expect(200);
    }

    await request(app)
      .post("/api/notifications/subscribe")
      .set("Authorization", `Bearer ${trainerAToken}`)
      .send(webSubscription("limit-overflow"))
      .expect(409);
  });

  it("mantiene el límite ante altas simultáneas", async () => {
    await prisma.pushSubscription.deleteMany({ where: { userId: fixture.trainerA.userId } });

    const responses = await Promise.all(
      Array.from({ length: 11 }, (_, index) =>
        request(app)
          .post("/api/notifications/subscribe")
          .set("Authorization", `Bearer ${trainerAToken}`)
          .send(webSubscription(`concurrent-${index}`))
      )
    );

    expect(responses.map((response) => response.status).sort()).toEqual([
      200,
      200,
      200,
      200,
      200,
      200,
      200,
      200,
      200,
      200,
      409,
    ]);
    expect(
      await prisma.pushSubscription.count({
        where: { userId: fixture.trainerA.userId, type: "WEB" },
      })
    ).toBe(10);
  });

  it("exige un destino al cancelar la suscripción", async () => {
    await request(app)
      .post("/api/notifications/unsubscribe")
      .set("Authorization", `Bearer ${trainerAToken}`)
      .send({})
      .expect(400);
  });

  it("no contacta destinos inseguros almacenados antes de la validación", async () => {
    await prisma.pushSubscription.deleteMany({ where: { userId: fixture.trainerA.userId } });
    await prisma.pushSubscription.create({
      data: {
        userId: fixture.trainerA.userId,
        type: "WEB",
        endpoint: "https://localhost/internal",
        p256dh: "A".repeat(87),
        auth: "B".repeat(22),
      },
    });

    await expect(
      NotificationService.sendNotification(fixture.trainerA.userId, {
        title: "Test",
        body: "Unsafe legacy endpoint",
      })
    ).resolves.toEqual({ sent: 0, failed: 1 });
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it("limita la concurrencia y entrega el timeout al proveedor", async () => {
    await prisma.pushSubscription.deleteMany({ where: { userId: fixture.trainerA.userId } });
    await prisma.pushSubscription.createMany({
      data: Array.from({ length: 10 }, (_, index) => ({
        userId: fixture.trainerA.userId,
        ...webSubscription(`delivery-${index}`),
      })),
    });

    let active = 0;
    let maximumActive = 0;
    vi.mocked(webpush.sendNotification).mockImplementation(async () => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return { statusCode: 201 } as never;
    });

    const result = await NotificationService.sendNotification(fixture.trainerA.userId, {
      title: "Test",
      body: "Bounded delivery",
    });

    expect(result).toEqual({ sent: 10, failed: 0 });
    expect(maximumActive).toBeLessThanOrEqual(5);
    expect(webpush.sendNotification).toHaveBeenCalledTimes(10);
    expect(vi.mocked(webpush.sendNotification).mock.calls[0]?.[2]).toEqual({
      TTL: 60,
      timeout: 10_000,
    });
  });

  it("registra rechazos y retira destinos expirados", async () => {
    await prisma.pushSubscription.deleteMany({ where: { userId: fixture.trainerA.userId } });
    await prisma.pushSubscription.createMany({
      data: [
        { userId: fixture.trainerA.userId, ...webSubscription("gone") },
        { userId: fixture.trainerA.userId, ...webSubscription("rejected") },
      ],
    });

    vi.mocked(webpush.sendNotification).mockImplementation(async (subscription) => {
      if (subscription.endpoint.endsWith("/gone")) {
        throw Object.assign(new Error("expired"), { statusCode: 410 });
      }
      return { statusCode: 503 } as never;
    });

    const result = await NotificationService.sendNotification(fixture.trainerA.userId, {
      title: "Test",
      body: "Provider errors",
    });

    expect(result).toEqual({ sent: 0, failed: 2 });
    expect(
      await prisma.pushSubscription.findFirst({
        where: { endpoint: webSubscription("gone").endpoint },
      })
    ).toBeNull();
    expect(
      await prisma.pushSubscription.findFirst({
        where: { endpoint: webSubscription("rejected").endpoint },
      })
    ).not.toBeNull();
  });
});
