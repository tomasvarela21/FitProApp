import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../infrastructure/db/prisma";
import { EmailService } from "../infrastructure/email/email.service";
import { sendDailyPaymentAlerts } from "../infrastructure/jobs/payment-alerts.job";
import { OutboxService } from "../infrastructure/outbox/outbox.service";
import { processOutboxBatch } from "../infrastructure/outbox/outbox.worker";
import { OutboxPayload } from "../infrastructure/outbox/outbox-payload";
import { createTenantFixture } from "./support/tenant.fixture";
import { resetTestDatabase } from "./support/test-database";

const pushPayload = (title: string) => ({
  channel: "PUSH" as const,
  userId: "test-user",
  title,
  body: `body:${title}`,
  data: { type: "TEST" },
});

describe("outbox de notificaciones", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await resetTestDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("confirma el evento y la outbox en la misma transacción", async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        await OutboxService.enqueue("rolled-back", pushPayload("rollback"), tx);
        throw new Error("controlled rollback");
      })
    ).rejects.toThrow("controlled rollback");

    expect(await prisma.notificationOutbox.count()).toBe(0);
  });

  it("cifra el payload, registra el fallo y reintenta hasta la aceptación", async () => {
    await OutboxService.enqueue("retryable", pushPayload("sensitive-body"));
    const stored = await prisma.notificationOutbox.findUniqueOrThrow({
      where: { idempotencyKey: "retryable" },
    });
    expect(stored.payloadEncrypted).not.toContain("sensitive-body");

    const failingDelivery = vi.fn().mockRejectedValue(new Error("provider unavailable"));
    await expect(processOutboxBatch(failingDelivery)).resolves.toEqual({ accepted: 0, failed: 1 });
    expect(
      await prisma.notificationOutbox.findUniqueOrThrow({
        where: { idempotencyKey: "retryable" },
        select: { status: true, attempts: true, lastError: true },
      })
    ).toEqual({ status: "FAILED", attempts: 1, lastError: "provider unavailable" });

    await prisma.notificationOutbox.update({
      where: { idempotencyKey: "retryable" },
      data: { availableAt: new Date(0) },
    });
    await expect(
      processOutboxBatch(async () => ({ providerMessageId: "provider-accepted" }))
    ).resolves.toEqual({ accepted: 1, failed: 0 });
    expect(
      await prisma.notificationOutbox.findUniqueOrThrow({
        where: { idempotencyKey: "retryable" },
        select: { status: true, attempts: true, providerMessageId: true, acceptedAt: true },
      })
    ).toEqual({
      status: "ACCEPTED",
      attempts: 2,
      providerMessageId: "provider-accepted",
      acceptedAt: expect.any(Date),
    });
  });

  it("reclama cada trabajo una sola vez con procesadores simultáneos", async () => {
    await Promise.all(
      Array.from({ length: 30 }, (_, index) =>
        OutboxService.enqueue(`concurrent:${index}`, pushPayload(`message-${index}`))
      )
    );
    const delivered: string[] = [];
    const deliver = vi.fn(async (payload: OutboxPayload) => {
      if (payload.channel !== "PUSH") throw new Error("unexpected payload");
      delivered.push(payload.title);
      await new Promise((resolve) => setTimeout(resolve, 2));
      return {};
    });

    await Promise.all([
      processOutboxBatch(deliver),
      processOutboxBatch(deliver),
      processOutboxBatch(deliver),
    ]);

    expect(delivered).toHaveLength(30);
    expect(new Set(delivered).size).toBe(30);
    expect(await prisma.notificationOutbox.count({ where: { status: "ACCEPTED" } })).toBe(30);
  });

  it("recupera un trabajo cuyo procesador dejó un lock vencido", async () => {
    await OutboxService.enqueue("stale-lock", pushPayload("stale"));
    await prisma.notificationOutbox.update({
      where: { idempotencyKey: "stale-lock" },
      data: {
        status: "PROCESSING",
        attempts: 1,
        lockedAt: new Date("2000-01-01T00:00:00.000Z"),
      },
    });

    await expect(processOutboxBatch(async () => ({ providerMessageId: "recovered" }))).resolves.toEqual({
      accepted: 1,
      failed: 0,
    });
    expect(
      await prisma.notificationOutbox.findUniqueOrThrow({
        where: { idempotencyKey: "stale-lock" },
        select: { status: true, attempts: true, providerMessageId: true },
      })
    ).toEqual({ status: "ACCEPTED", attempts: 2, providerMessageId: "recovered" });
  });

  it("distingue la aceptación del proveedor y conserva su identificador", async () => {
    vi.spyOn(EmailService, "sendTrainerVerification").mockResolvedValue({
      providerMessageId: "resend-message-id",
    });
    await OutboxService.enqueue("provider-acceptance", {
      channel: "EMAIL",
      kind: "TRAINER_VERIFICATION",
      params: {
        to: "trainer@example.test",
        firstName: "Trainer",
        verificationToken: "secret-token",
      },
    });

    await expect(processOutboxBatch()).resolves.toEqual({ accepted: 1, failed: 0 });
    expect(
      await prisma.notificationOutbox.findUniqueOrThrow({
        where: { idempotencyKey: "provider-acceptance" },
        select: {
          status: true,
          providerMessageId: true,
          acceptedAt: true,
          payloadEncrypted: true,
        },
      })
    ).toEqual({
      status: "ACCEPTED",
      providerMessageId: "resend-message-id",
      acceptedAt: expect.any(Date),
      payloadEncrypted: "redacted-after-provider-acceptance",
    });
  });

  it("detiene los reintentos después del máximo configurado", async () => {
    await OutboxService.enqueue("dead-letter", pushPayload("dead"));
    const failingDelivery = vi.fn().mockRejectedValue(new Error("permanent failure"));

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await expect(processOutboxBatch(failingDelivery)).resolves.toEqual({ accepted: 0, failed: 1 });
      if (attempt < 5) {
        await prisma.notificationOutbox.update({
          where: { idempotencyKey: "dead-letter" },
          data: { availableAt: new Date(0) },
        });
      }
    }

    expect(failingDelivery).toHaveBeenCalledTimes(5);
    expect(
      await prisma.notificationOutbox.findUniqueOrThrow({
        where: { idempotencyKey: "dead-letter" },
        select: { status: true, attempts: true, lastError: true },
      })
    ).toEqual({ status: "DEAD", attempts: 5, lastError: "permanent failure" });
    await expect(processOutboxBatch(failingDelivery)).resolves.toEqual({ accepted: 0, failed: 0 });
    expect(failingDelivery).toHaveBeenCalledTimes(5);
  });

  it("prepara las alertas una sola vez usando el día de Buenos Aires", async () => {
    const fixture = await createTenantFixture(prisma);
    const installment = await prisma.installment.findFirstOrThrow({
      where: { subscriptionId: fixture.subscription.id },
    });
    await prisma.installment.update({
      where: { id: installment.id },
      data: { dueDate: new Date("2026-09-16T00:00:00.000Z"), status: "PENDING" },
    });

    const instant = new Date("2026-09-17T01:30:00.000Z");
    const [first, concurrent] = await Promise.all([
      sendDailyPaymentAlerts(instant),
      sendDailyPaymentAlerts(instant),
    ]);
    expect(first).toEqual(concurrent);
    await sendDailyPaymentAlerts(instant);

    const rows = await prisma.notificationOutbox.findMany({
      where: { idempotencyKey: { contains: `payment-alert:${installment.id}:today:2026-09-16` } },
    });
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.channel).sort()).toEqual(["EMAIL", "PUSH"]);
  });

  it("no interpreta un error de infraestructura como duplicado", async () => {
    const brokenClient = {
      notificationOutbox: {
        findUnique: vi.fn().mockRejectedValue(new Error("database unavailable")),
      },
    };
    await expect(
      OutboxService.enqueue("infra-error", pushPayload("infra"), brokenClient as never)
    ).rejects.toThrow("database unavailable");
  });
});
