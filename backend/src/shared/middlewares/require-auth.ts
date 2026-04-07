import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error";
import { verifyAccessToken } from "../utils/jwt";

export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("No autorizado", 401));
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return next(new AppError("Token no proporcionado", 401));
  }

  const payload = verifyAccessToken(token);

  req.user = {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
  };

  next();
};