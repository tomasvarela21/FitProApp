import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../db/prisma";
import { encryptOutboxPayload } from "./outbox-crypto";
import { OutboxPayload, outboxPayloadSchema } from "./outbox-payload";

type OutboxClient = Pick<PrismaClient, "notificationOutbox"> | Pick<Prisma.TransactionClient, "notificationOutbox">;

export class OutboxService {
  static async enqueue(
    idempotencyKey: string,
    payload: OutboxPayload,
    client: OutboxClient = prisma
  ): Promise<{ id: string; created: boolean }> {
    const validated = outboxPayloadSchema.parse(payload);
    const existing = await client.notificationOutbox.findUnique({
      where: { idempotencyKey },
      select: { id: true },
    });
    if (existing) return { ...existing, created: false };

    const item = await client.notificationOutbox.upsert({
      where: { idempotencyKey },
      update: {},
      create: {
        idempotencyKey,
        channel: validated.channel,
        payloadEncrypted: encryptOutboxPayload(validated),
        availableAt: new Date(Date.now() - 1_000),
      },
      select: { id: true },
    });
    return { ...item, created: true };
  }
}
