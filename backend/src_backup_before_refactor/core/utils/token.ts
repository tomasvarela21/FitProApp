import crypto from "crypto";

export const generateRawToken = (size = 32) => {
  return crypto.randomBytes(size).toString("hex");
};

export const hashToken = (token: string) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};