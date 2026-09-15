import { prisma } from "../../infrastructure/db/prisma";
import { AppError } from "../../shared/errors/app-error";
import {
  daysUntilExpiry,
  effectiveInstallmentStatus,
  effectiveSubscriptionStatus,
} from "../subscriptions/billing-status";

export class StudentPortalService {
  static async getMyProfile(userId: string) {
    const student = await prisma.student.findFirst({
      where: { userId, deletedAt: null },
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
      where: { userId, deletedAt: null },
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
      where: { userId, deletedAt: null },
      select: { id: true },
    });
    if (!student) throw new AppError("Alumno no encontrado", 404);

    const subscription = await prisma.subscription.findFirst({
      where: {
        studentId: student.id,
        status: { in: ["ACTIVE", "EXPIRED"] },
      },
      include: {
        installments: { orderBy: { number: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!subscription) return null;

    const now = new Date();

    const totalAmount = Number(subscription.totalAmount);
    const paidAmount = subscription.installments
      .filter((i) => i.status === "PAID")
      .reduce((sum, i) => sum + Number(i.amount), 0);

    const nextInstallment = subscription.installments.find((i) => {
      const status = effectiveInstallmentStatus(i.status, i.dueDate, now);
      return status === "PENDING" || status === "OVERDUE";
    }) ?? null;

    return {
      id: subscription.id,
      planName: subscription.planName,
      planDuration: subscription.planDuration,
      frequency: subscription.frequency,
      totalAmount,
      installmentCount: subscription.installmentCount,
      paidAmount,
      pendingAmount: totalAmount - paidAmount,
      status: effectiveSubscriptionStatus(subscription.status, subscription.endDate, now),
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      daysUntilExpiry: daysUntilExpiry(subscription.endDate, now),
      nextInstallment: nextInstallment
        ? {
            id: nextInstallment.id,
            number: nextInstallment.number,
            amount: Number(nextInstallment.amount),
            dueDate: nextInstallment.dueDate,
            status: effectiveInstallmentStatus(
              nextInstallment.status,
              nextInstallment.dueDate,
              now
            ),
          }
        : null,
      installments: subscription.installments.map((i) => ({
        id: i.id,
        number: i.number,
        amount: Number(i.amount),
        dueDate: i.dueDate,
        paidAt: i.paidAt,
        status: effectiveInstallmentStatus(i.status, i.dueDate, now),
        notes: i.notes,
      })),
    };
  }
}
