import cron from "node-cron";
import { NotificationOutbox } from "@prisma/client";
import { prisma } from "../db/prisma";
import { EmailService } from "../email/email.service";
import { NotificationService } from "../../modules/notifications/notifications.service";
import { decryptOutboxPayload } from "./outbox-crypto";
import { OutboxPayload, outboxPayloadSchema } from "./outbox-payload";

const configuredBatchSize = Number(process.env.OUTBOX_BATCH_SIZE);
const BATCH_SIZE = Number.isInteger(configuredBatchSize) && configuredBatchSize > 0
  ? Math.min(configuredBatchSize, 100)
  : 25;
const configuredMaxAttempts = Number(process.env.OUTBOX_MAX_ATTEMPTS);
const MAX_ATTEMPTS = Number.isInteger(configuredMaxAttempts) && configuredMaxAttempts > 0
  ? configuredMaxAttempts
  : 5;
const configuredLockTimeout = Number(process.env.OUTBOX_LOCK_TIMEOUT_MS);
const LOCK_TIMEOUT_MS = Number.isInteger(configuredLockTimeout) && configuredLockTimeout > 0
  ? configuredLockTimeout
  : 300_000;
const REDACTED_PAYLOAD = "redacted-after-provider-acceptance";

type DeliveryResult = { providerMessageId?: string };

export async function deliverOutboxPayload(payload: OutboxPayload): Promise<DeliveryResult> {
  if (payload.channel === "PUSH") {
    const result = await NotificationService.sendNotification(payload.userId, {
      title: payload.title,
      body: payload.body,
      data: payload.data,
    });
    if ((result.failed ?? 0) > 0) {
      throw new Error(`Fallaron ${result.failed} destinos push`);
    }
    return { providerMessageId: `push:${result.sent}` };
  }

  switch (payload.kind) {
    case "INVITATION":
      return EmailService.sendInvitation(payload.params);
    case "TRAINER_VERIFICATION":
      return EmailService.sendTrainerVerification(payload.params);
    case "PASSWORD_RESET":
      return EmailService.sendPasswordReset(payload.params);
    case "INSTALLMENT_REMINDER":
      return EmailService.sendInstallmentReminder({
        ...payload.params,
        dueDate: new Date(payload.params.dueDate),
      });
    case "OVERDUE_REMINDER":
      return EmailService.sendOverdueReminder({
        ...payload.params,
        dueDate: new Date(payload.params.dueDate),
      });
    case "PAYMENT_ALERTS":
      return EmailService.sendPaymentAlerts({
        ...payload.params,
        overdueInstallments: payload.params.overdueInstallments.map((item) => ({
          ...item,
          dueDate: new Date(item.dueDate),
        })),
        expiringSoonInstallments: payload.params.expiringSoonInstallments.map((item) => ({
          ...item,
          dueDate: new Date(item.dueDate),
        })),
      });
  }
}

async function claimBatch(): Promise<NotificationOutbox[]> {
  const staleBefore = new Date(Date.now() - LOCK_TIMEOUT_MS);
  const lockedAt = new Date();

  const claimed = await prisma.$queryRaw<NotificationOutbox[]>`
    WITH candidates AS (
      SELECT id FROM "NotificationOutbox"
      WHERE attempts < ${MAX_ATTEMPTS}
        AND (
          (status IN ('PENDING', 'FAILED') AND "availableAt" <= ${lockedAt})
          OR (status = 'PROCESSING' AND "lockedAt" < ${staleBefore})
        )
      ORDER BY "createdAt" ASC
      LIMIT ${BATCH_SIZE}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE "NotificationOutbox" o
    SET status = 'PROCESSING',
        attempts = o.attempts + 1,
        "lockedAt" = ${lockedAt}
    FROM candidates
    WHERE o.id = candidates.id
    RETURNING o.*
  `;

  return claimed;
}

export async function processOutboxBatch(
  deliver: (payload: OutboxPayload) => Promise<DeliveryResult> = deliverOutboxPayload
): Promise<{ accepted: number; failed: number }> {
  const items = await claimBatch();
  let accepted = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const payload = outboxPayloadSchema.parse(decryptOutboxPayload(item.payloadEncrypted));
      const result = await deliver(payload);
      await prisma.notificationOutbox.update({
        where: { id: item.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
          lockedAt: null,
          lastError: null,
          payloadEncrypted: REDACTED_PAYLOAD,
          providerMessageId: result.providerMessageId,
        },
      });
      accepted += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error de entrega desconocido";
      const dead = item.attempts >= MAX_ATTEMPTS;
      const delaySeconds = Math.min(60 * 2 ** Math.max(item.attempts - 1, 0), 3600);
      await prisma.notificationOutbox.update({
        where: { id: item.id },
        data: {
          status: dead ? "DEAD" : "FAILED",
          availableAt: new Date(Date.now() + delaySeconds * 1000),
          lockedAt: null,
          lastError: message.slice(0, 1000),
        },
      });
      failed += 1;
    }
  }

  return { accepted, failed };
}

let scheduledTask: ReturnType<typeof cron.schedule> | undefined;
let activeRun: Promise<unknown> | undefined;

function runWorker(): Promise<unknown> {
  if (activeRun) return activeRun;
  activeRun = processOutboxBatch()
    .catch((error) => console.error("[OutboxWorker] Error procesando outbox:", error))
    .finally(() => {
      activeRun = undefined;
    });
  return activeRun;
}

export function startOutboxWorker() {
  if (scheduledTask) return;
  scheduledTask = cron.schedule("* * * * *", () => void runWorker(), {
    timezone: "America/Argentina/Buenos_Aires",
    noOverlap: true,
  });
  void runWorker();
}

export async function stopOutboxWorker() {
  scheduledTask?.stop();
  scheduledTask = undefined;
  await activeRun;
}
