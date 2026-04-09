import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error";

export const requireAdminSecret = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const secret = req.headers["x-admin-secret"];
  const expected = process.env.ADMIN_SECRET;

  if (!expected) {
    return next(
      new AppError("ADMIN_SECRET no configurado en el servidor", 500)
    );
  }

  if (!secret || secret !== expected) {
    return next(new AppError("No autorizado", 401));
  }

  next();
};