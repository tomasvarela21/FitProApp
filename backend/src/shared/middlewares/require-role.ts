import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error";

export const requireRole =
  (...allowedRoles: string[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("No autorizado", 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError("No tienes permisos para esta acción", 403));
    }

    next();
  };