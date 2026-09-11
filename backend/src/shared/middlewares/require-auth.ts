import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error";
import { verifyAccessToken } from "../utils/jwt";
import { prisma } from "../../infrastructure/db/prisma";

export const requireAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(new AppError("No autorizado", 401));
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return next(new AppError("Token no proporcionado", 401));
    }

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        email: true,
        role: true,
        status: true,
        authVersion: true,
        student: { select: { deletedAt: true } },
      },
    });

    if (
      !user ||
      user.status !== "ACTIVE" ||
      user.student?.deletedAt ||
      user.authVersion !== payload.authVersion ||
      user.email !== payload.email ||
      user.role !== payload.role
    ) {
      return next(new AppError("Sesión inválida o revocada", 401));
    }

    req.user = {
      userId: payload.userId,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};
