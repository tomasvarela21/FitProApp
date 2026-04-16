import { prisma } from "../../infrastructure/db/prisma";
import { AppError } from "../../shared/errors/app-error";
import { PlansMapper } from "./plans.mapper";
import type { CreatePlanInput, UpdatePlanInput } from "./plans.schema";

export class PlansService {
  static async listPlans(trainerUserId: string) {
    const trainer = await prisma.trainer.findUnique({
      where: { userId: trainerUserId },
    });
    if (!trainer) throw new AppError("Entrenador no encontrado", 404);

    const plans = await prisma.plan.findMany({
      where: { trainerId: trainer.id },
      orderBy: { createdAt: "desc" },
    });

    return plans.map(PlansMapper.toDto);
  }

  static async createPlan(trainerUserId: string, data: CreatePlanInput) {
    const trainer = await prisma.trainer.findUnique({
      where: { userId: trainerUserId },
    });
    if (!trainer) throw new AppError("Entrenador no encontrado", 404);

    const plan = await prisma.plan.create({
      data: {
        trainerId: trainer.id,
        name: data.name,
        description: data.description,
        price: data.price,
        duration: data.duration,
      },
    });

    return PlansMapper.toDto(plan);
  }

  static async updatePlan(
    trainerUserId: string,
    planId: string,
    data: UpdatePlanInput
  ) {
    const trainer = await prisma.trainer.findUnique({
      where: { userId: trainerUserId },
    });
    if (!trainer) throw new AppError("Entrenador no encontrado", 404);

    const existing = await prisma.plan.findFirst({
      where: { id: planId, trainerId: trainer.id },
    });
    if (!existing) throw new AppError("Plan no encontrado", 404);

    const updated = await prisma.plan.update({
      where: { id: planId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.price !== undefined ? { price: data.price } : {}),
        ...(data.duration !== undefined ? { duration: data.duration } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });

    return PlansMapper.toDto(updated);
  }

  static async deletePlan(trainerUserId: string, planId: string) {
    const trainer = await prisma.trainer.findUnique({
      where: { userId: trainerUserId },
    });
    if (!trainer) throw new AppError("Entrenador no encontrado", 404);

    const existing = await prisma.plan.findFirst({
      where: { id: planId, trainerId: trainer.id },
    });
    if (!existing) throw new AppError("Plan no encontrado", 404);

    const hasSubscriptions = await prisma.subscription.count({
      where: { planId },
    });
    if (hasSubscriptions > 0) {
      throw new AppError(
        "No se puede eliminar un plan con suscripciones activas",
        400
      );
    }

    await prisma.plan.delete({ where: { id: planId } });
    return { deleted: true };
  }
}
