CREATE TYPE "NotificationOutboxChannel" AS ENUM ('EMAIL', 'PUSH');
CREATE TYPE "NotificationOutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'ACCEPTED', 'FAILED', 'DEAD');

CREATE TABLE "NotificationOutbox" (
  "id" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "channel" "NotificationOutboxChannel" NOT NULL,
  "payloadEncrypted" TEXT NOT NULL,
  "status" "NotificationOutboxStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3),
  "providerMessageId" TEXT,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NotificationOutbox_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "NotificationOutbox_attempts_check" CHECK ("attempts" >= 0)
);

CREATE UNIQUE INDEX "NotificationOutbox_idempotencyKey_key"
ON "NotificationOutbox"("idempotencyKey");

CREATE INDEX "NotificationOutbox_status_availableAt_idx"
ON "NotificationOutbox"("status", "availableAt");

CREATE INDEX "NotificationOutbox_lockedAt_idx"
ON "NotificationOutbox"("lockedAt");
