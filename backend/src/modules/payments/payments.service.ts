import { prisma } from "../../infrastructure/db/prisma";
import { AppError } from "../../shared/errors/app-error";

export class PaymentsService {
  static async getSubscriptionPayments(
    trainerUserId: string,
    subscriptionId: string
  ) {
    const trainer = await prisma.trainer.findUnique({
      where: { userId: trainerUserId },
    });
    if (!trainer) throw new AppError("Entrenador no encontrado", 404);

    const payments = await prisma.payment.findMany({
      where: { subscriptionId, trainerId: trainer.id },
      orderBy: { paidAt: "desc" },
    });

    return payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      paidAt: p.paidAt,
      periodLabel: p.periodLabel,
      notes: p.notes,
      createdAt: p.createdAt,
    }));
  }
}
