import { NextFunction, Request, Response } from "express";
import { prisma } from "../../infrastructure/db/prisma";
import { AppError } from "../errors/app-error";

export const requireActiveTrial = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== "TRAINER") return next();

  const trainer = await prisma.trainer.findUnique({
    where: { userId: req.user.userId },
    select: { id: true, subscriptionStatus: true, trialEndsAt: true },
  });

  if (!trainer) return next(new AppError("Entrenador no encontrado", 404));

  if (trainer.subscriptionStatus === "ACTIVE") return next();

  if (trainer.subscriptionStatus === "TRIAL") {
    const trialExpired = trainer.trialEndsAt && trainer.trialEndsAt < new Date();
    if (!trialExpired) return next();

    // Marcar como expirado automáticamente
    await prisma.trainer.update({
      where: { id: trainer.id },
      data: { subscriptionStatus: "EXPIRED" },
    });

    return next(new AppError("Tu período de prueba ha expirado. Contactá a soporte para activar tu cuenta.", 403));
  }

  // EXPIRED
  return next(new AppError("Tu suscripción ha expirado. Contactá a soporte para reactivar tu cuenta.", 403));
};
