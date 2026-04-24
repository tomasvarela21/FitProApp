import { prisma } from "../../infrastructure/db/prisma";
import { AppError } from "../../shared/errors/app-error";

export class StudentPortalService {
  static async getMyProfile(userId: string) {
    const student = await prisma.student.findFirst({
      where: { userId },
      include: {
        trainer: {
          include: { user: true },
        },
      },
    });

    if (!student) throw new AppError("Alumno no encontrado", 404);

    return {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      phone: student.phone,
      status: student.status,
      activatedAt: student.activatedAt,
      trainer: {
        firstName: student.trainer.firstName,
        lastName: student.trainer.lastName,
        email: student.trainer.user.email,
        phone: student.trainer.phone,
      },
    };
  }

  static async updateMyProfile(
    userId: string,
    data: { firstName?: string; lastName?: string; phone?: string }
  ) {
    const student = await prisma.student.findFirst({
      where: { userId },
    });

    if (!student) throw new AppError("Alumno no encontrado", 404);

    const updated = await prisma.student.update({
      where: { id: student.id },
      data: {
        ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
        ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
      },
    });

    return {
      id: updated.id,
      firstName: updated.firstName,
      lastName: updated.lastName,
      email: updated.email,
      phone: updated.phone,
    };
  }

  static async getMySubscription(userId: string) {
    const student = await prisma.student.findFirst({
      where: { userId },
    });

    if (!student) throw new AppError("Alumno no encontrado", 404);

    const subscription = await prisma.subscription.findFirst({
      where: {
        studentId: student.id,
        status: { in: ["ACTIVE", "EXPIRED"] },
      },
      include: {
        plan: true,
        installments: { orderBy: { number: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!subscription) return null;

    const now = new Date();

    // Marcar vencidas
    const overdueIds = subscription.installments
      .filter((i) => i.status === "PENDING" && i.dueDate < now)
      .map((i) => i.id);

    if (overdueIds.length > 0) {
      await prisma.installment.updateMany({
        where: { id: { in: overdueIds } },
        data: { status: "OVERDUE" },
      });
      overdueIds.forEach((id) => {
        const inst = subscription.installments.find((i) => i.id === id);
        if (inst) inst.status = "OVERDUE";
      });
    }

    const totalAmount = Number(subscription.totalAmount);
    const paidAmount = subscription.installments
      .filter((i) => i.status === "PAID")
      .reduce((sum, i) => sum + Number(i.amount), 0);

    const nextInstallment = subscription.installments.find(
      (i) => i.status === "PENDING" || i.status === "OVERDUE"
    ) ?? null;

    return {
      id: subscription.id,
      planName: subscription.plan.name,
      planDuration: subscription.plan.duration,
      frequency: subscription.frequency,
      totalAmount,
      installmentCount: subscription.installmentCount,
      paidAmount,
      pendingAmount: totalAmount - paidAmount,
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      daysUntilExpiry: Math.ceil(
        (subscription.endDate.getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24)
      ),
      nextInstallment: nextInstallment
        ? {
            id: nextInstallment.id,
            number: nextInstallment.number,
            amount: Number(nextInstallment.amount),
            dueDate: nextInstallment.dueDate,
            status: nextInstallment.status,
          }
        : null,
      installments: subscription.installments.map((i) => ({
        id: i.id,
        number: i.number,
        amount: Number(i.amount),
        dueDate: i.dueDate,
        paidAt: i.paidAt,
        status: i.status,
        notes: i.notes,
      })),
    };
  }
}
