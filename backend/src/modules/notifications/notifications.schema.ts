import { z } from "zod";

const DEFAULT_WEB_PUSH_HOSTS = [
  "fcm.googleapis.com",
  "push.services.mozilla.com",
  "notify.windows.com",
  "web.push.apple.com",
];

function allowedPushHosts(): string[] {
  const configured = process.env.WEB_PUSH_ALLOWED_HOSTS?.split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  return configured?.length ? configured : DEFAULT_WEB_PUSH_HOSTS;
}

function isAllowedPushEndpoint(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.hash) return false;

    const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
    return allowedPushHosts().some(
      (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
    );
  } catch {
    return false;
  }
}

const base64UrlKey = z.string().regex(/^[A-Za-z0-9_-]+$/, "Clave Web Push inválida");

export const webPushEndpointSchema = z
  .string()
  .max(2048)
  .refine(isAllowedPushEndpoint, "Endpoint Web Push no autorizado");

const webSubscribeSchema = z
  .object({
    type: z.literal("WEB"),
    endpoint: webPushEndpointSchema,
    p256dh: base64UrlKey.min(80).max(128),
    auth: base64UrlKey.min(16).max(64),
  })
  .strict();

const expoSubscribeSchema = z
  .object({
    type: z.literal("EXPO"),
    token: z.string().min(1).max(512),
  })
  .strict();

export const subscribeSchema = z.discriminatedUnion("type", [
  webSubscribeSchema,
  expoSubscribeSchema,
]);

export const unsubscribeSchema = z.union([
  z.object({ endpoint: webPushEndpointSchema }).strict(),
  z.object({ token: z.string().min(1).max(512) }).strict(),
]);

export type SubscribeInput = z.infer<typeof subscribeSchema>;
export type UnsubscribeInput = z.infer<typeof unsubscribeSchema>;
