import webpush from "web-push";
import { prisma } from "../../infrastructure/db/prisma";
import { SubscribeInput, UnsubscribeInput } from "./notifications.schema";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT ?? "mailto:noreply@varelab.com";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
} else {
  console.warn(
    "[NotificationService] VAPID keys not configured. Web Push notifications will be disabled."
  );
}

export class NotificationService {
  static async subscribe(userId: string, data: SubscribeInput) {
    if (data.type === "WEB") {
      if (!data.endpoint || !data.p256dh || !data.auth) {
        throw new Error("Missing Web Push subscription parameters");
      }

      // Upsert by endpoint to avoid duplicates
      const existing = await prisma.pushSubscription.findFirst({
        where: { endpoint: data.endpoint },
      });

      if (existing) {
        return await prisma.pushSubscription.update({
          where: { id: existing.id },
          data: {
            userId,
            p256dh: data.p256dh,
            auth: data.auth,
          },
        });
      }

      return await prisma.pushSubscription.create({
        data: {
          userId,
          type: "WEB",
          endpoint: data.endpoint,
          p256dh: data.p256dh,
          auth: data.auth,
        },
      });
    } else {
      if (!data.token) {
        throw new Error("Missing Expo Push token");
      }

      // Upsert by token to avoid duplicates
      return await prisma.pushSubscription.upsert({
        where: { token: data.token },
        update: { userId },
        create: {
          userId,
          type: "EXPO",
          token: data.token,
        },
      });
    }
  }

  static async unsubscribe(userId: string, data: UnsubscribeInput) {
    if (data.endpoint) {
      await prisma.pushSubscription.deleteMany({
        where: {
          userId,
          endpoint: data.endpoint,
        },
      });
    } else if (data.token) {
      await prisma.pushSubscription.deleteMany({
        where: {
          userId,
          token: data.token,
        },
      });
    }
    return { unsubscribed: true };
  }

  static async sendNotification(
    userId: string,
    payload: { title: string; body: string; data?: any }
  ) {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) {
      return { sent: 0 };
    }

    let sentCount = 0;

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          if (sub.type === "WEB" && sub.endpoint && sub.p256dh && sub.auth) {
            const pushSub = {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            };

            await webpush.sendNotification(
              pushSub,
              JSON.stringify({
                title: payload.title,
                body: payload.body,
                data: payload.data,
              })
            );
            sentCount++;
          } else if (sub.type === "EXPO" && sub.token) {
            const response = await fetch("https://exp.host/--/api/v2/push/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: sub.token,
                title: payload.title,
                body: payload.body,
                data: payload.data,
              }),
            });

            if (response.ok) {
              sentCount++;
            } else {
              console.error(
                `[NotificationService] Expo Push failed: ${response.statusText}`
              );
            }
          }
        } catch (err) {
          console.error(
            `[NotificationService] Error sending to subscription ${sub.id}:`,
            err
          );
          // If subscription is expired/invalid, clean it up
          if (
            err &&
            (err as any).statusCode === 410 // GCM/FCM gone
          ) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(
              () => {}
            );
          }
        }
      })
    );

    return { sent: sentCount };
  }
}
