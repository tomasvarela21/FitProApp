import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const secret = process.env.OUTBOX_ENCRYPTION_SECRET || process.env.JWT_ACCESS_SECRET;
if (!secret) throw new Error("OUTBOX_ENCRYPTION_SECRET o JWT_ACCESS_SECRET debe estar definido");

const key = createHash("sha256").update("fitpro-notification-outbox\0").update(secret).digest();

export function encryptOutboxPayload(payload: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptOutboxPayload(value: string): unknown {
  const [version, ivValue, tagValue, encryptedValue] = value.split(".");
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) {
    throw new Error("Payload de outbox inválido");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString("utf8"));
}
