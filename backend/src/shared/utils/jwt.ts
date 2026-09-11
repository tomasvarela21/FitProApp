import jwt from "jsonwebtoken";
import { AppError } from "../errors/app-error";

type JwtPayload = {
  userId: string;
  email: string;
  role: string;
  authVersion: number;
};

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;

if (!ACCESS_SECRET) {
  throw new Error("JWT_ACCESS_SECRET no está definido");
}

export const signAccessToken = (payload: JwtPayload) => {
  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: "15m",
  });
};

export const verifyAccessToken = (token: string) => {
  try {
    const payload = jwt.verify(token, ACCESS_SECRET);
    if (
      typeof payload === "string" ||
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.role !== "string" ||
      !Number.isInteger(payload.authVersion) ||
      payload.authVersion < 1
    ) {
      throw new Error("Invalid access token payload");
    }
    return payload as JwtPayload;
  } catch {
    throw new AppError("Token inválido o expirado", 401);
  }
};
