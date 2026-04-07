import jwt from "jsonwebtoken";
import { AppError } from "../errors/app-error";

type JwtPayload = {
  userId: string;
  email: string;
  role: string;
};

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;

if (!ACCESS_SECRET) {
  throw new Error("JWT_ACCESS_SECRET no está definido");
}

export const signAccessToken = (payload: JwtPayload) => {
  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: "1d",
  });
};

export const verifyAccessToken = (token: string) => {
  try {
    return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
  } catch {
    throw new AppError("Token inválido o expirado", 401);
  }
};