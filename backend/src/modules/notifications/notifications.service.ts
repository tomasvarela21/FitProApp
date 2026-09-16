import { Prisma } from "@prisma/client";
import webpush from "web-push";
import { prisma } from "../../infrastructure/db/prisma";
import { AppError } from "../../shared/errors/app-error";
import { SubscribeInput, UnsubscribeInput, subscribeSchema } from "./notifications.schema";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT ?? "mailto:noreply@varelab.com";

const configuredSubscriptionLimit = Number(process.env.MAX_WEB_PUSH_SUBSCRIPTIONS_PER_USER);
const MAX_WEB_PUSH_SUBSCRIPTIONS =
  Number.isInteger(configuredSubscriptionLimit) && configuredSubscriptionLimit > 0
    ? configuredSubscriptionLimit
    : 10;
const configuredTimeout = Number(process.env.PUSH_DELIVERY_TIMEOUT_MS);
const PUSH_DELIVERY_TIMEOUT_MS =
  Number.isInteger(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 10_000;
const configuredConcurrency = Number(process.env.PUSH_DELIVERY_CONCURRENCY);
const PUSH_DELIVERY_CONCURRENCY =
  Number.isInteger(configuredConcurrency) && configuredConcurrency > 0
    ? Math.min(configuredConcurrency, 10)
    : 5;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
} else {
  console.warn(
    "[NotificationService] VAPID keys not configured. Web Push notifications will be disabled."
  );
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  operation: (item: T) => Promise<void>
): Promise<void> {
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const item = items[nextIndex];
        nextIndex += 1;
        await operation(item);
      }
    }
  );
  await Promise.all(workers);
}

function statusCodeOf(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("statusCode" in error)) return undefined;
  return typeof error.statusCode === "number" ? error.statusCode : undefined;
}

export class NotificationService {
  static async subscribe(userId: string, data: SubscribeInput) {
    if (data.type === "WEB") {
      try {
        return await prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`web-push:${userId}`}))`;

          const existing = await tx.pushSubscription.findFirst({
            where: { endpoint: data.endpoint },
          });
          if (existing) {
            if (existing.userId !== userId) {
              throw new AppError("El destino Web Push pertenece a otra cuenta", 409);
            }
            return tx.pushSubscription.update({
              where: { id: existing.id },
              data: { p256dh: data.p256dh, auth: data.auth },
            });
          }

          const subscriptionCount = await tx.pushSubscription.count({
            where: { userId, type: "WEB" },
          });
          if (subscriptionCount >= MAX_WEB_PUSH_SUBSCRIPTIONS) {
            throw new AppError(
              `La cuenta alcanzó el límite de ${MAX_WEB_PUSH_SUBSCRIPTIONS} destinos Web Push`,
              409
            );
          }

          return tx.pushSubscription.create({
            data: {
              userId,
              type: "WEB",
              endpoint: data.endpoint,
              p256dh: data.p256dh,
              auth: data.auth,
            },
          });
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new AppError("El destino Web Push ya está registrado", 409);
        }
        throw error;
      }
    }

    return prisma.pushSubscription.upsert({
      where: { token: data.token },
      update: { userId },
      create: { userId, type: "EXPO", token: data.token },
    });
  }

  static async unsubscribe(userId: string, data: UnsubscribeInput) {
    if ("endpoint" in data) {
      await prisma.pushSubscription.deleteMany({ where: { userId, endpoint: data.endpoint } });
    } else {
      await prisma.pushSubscription.deleteMany({ where: { userId, token: data.token } });
    }
    return { unsubscribed: true };
  }

  static async sendNotification(
    userId: string,
    payload: { title: string; body: string; data?: unknown }
  ): Promise<{ sent: number; failed?: number }> {
    const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
    let sent = 0;
    let failed = 0;

    await runWithConcurrency(subscriptions, PUSH_DELIVERY_CONCURRENCY, async (sub) => {
      try {
        if (sub.type === "WEB") {
          const validation = subscribeSchema.safeParse({
            type: "WEB",
            endpoint: sub.endpoint,
            p256dh: sub.p256dh,
            auth: sub.auth,
          });
          if (!validation.success || validation.data.type !== "WEB") {
            throw new Error("Suscripción Web Push almacenada inválida");
          }

          const response = await webpush.sendNotification(
            {
              endpoint: validation.data.endpoint,
              keys: { p256dh: validation.data.p256dh, auth: validation.data.auth },
            },
            JSON.stringify(payload),
            { TTL: 60, timeout: PUSH_DELIVERY_TIMEOUT_MS }
          );
          if (response.statusCode < 200 || response.statusCode >= 300) {
            throw Object.assign(new Error("Web Push rechazado por el proveedor"), {
              statusCode: response.statusCode,
            });
          }
          sent += 1;
          return;
        }

        if (sub.type === "EXPO" && sub.token) {
          const response = await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: sub.token,
              title: payload.title,
              body: payload.body,
              data: payload.data,
            }),
            signal: AbortSignal.timeout(PUSH_DELIVERY_TIMEOUT_MS),
          });
          if (!response.ok) {
            throw Object.assign(new Error(`Expo Push rechazado: ${response.statusText}`), {
              statusCode: response.status,
            });
          }
          sent += 1;
          return;
        }

        throw new Error("Suscripción push almacenada inválida");
      } catch (error) {
        failed += 1;
        console.error(
          `[NotificationService] Error sending to subscription ${sub.id}:`,
          error
        );

        const statusCode = statusCodeOf(error);
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
        }
      }
    });

    return { sent, failed };
  }
}
