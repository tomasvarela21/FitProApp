import { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/db/prisma";
import { AppError } from "../../shared/errors/app-error";
import { NotificationService } from "../notifications/notifications.service";
import type {
  CreateSubscriptionInput,
  PayInstallmentInput,
} from "./subscriptions.schema";
import {
  daysUntilExpiry,
  effectiveInstallmentStatus,
  effectiveSubscriptionStatus,
} from "./billing-status";

const DURATION_DAYS: Record<string, number> = {
  MONTHLY: 30,
  QUARTERLY: 90,
  SEMIANNUAL: 180,
  ANNUAL: 365,
};

const FREQUENCY_DAYS: Record<string, number> = {
  BIWEEKLY: 15,
  MONTHLY: 30,
};

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export class SubscriptionsService {
  static async getStudentSubscription(
    trainerUserId: string,
    studentId: string
  ) {
    const trainer = await prisma.trainer.findUnique({
      where: { userId: trainerUserId },
    });
    if (!trainer) throw new AppError("Entrenador no encontrado", 404);

    const subscription = await prisma.subscription.findFirst({
      where: {
        studentId,
        trainerId: trainer.id,
        status: { in: ["ACTIVE", "EXPIRED"] },
      },
      include: {
        plan: true,
        student: true,
        installments: {
          orderBy: { number: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!subscription) return null;

    const now = new Date();
    const totalAmount = Number(subscription.totalAmount);
    const paidAmount = subscription.installments
      .filter((i) => i.status === "PAID")
      .reduce((sum, i) => sum + Number(i.amount), 0);

    return {
      id: subscription.id,
      studentId: subscription.studentId,
      studentName: `${subscription.student.firstName} ${subscription.student.lastName}`,
      planId: subscription.planId,
      planName: subscription.plan.name,
      planDuration: subscription.plan.duration,
      frequency: subscription.frequency,
      totalAmount,
      installmentCount: subscription.installmentCount,
      paidAmount,
      pendingAmount: totalAmount - paidAmount,
      status: effectiveSubscriptionStatus(subscription.status, subscription.endDate, now),
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      daysUntilExpiry: daysUntilExpiry(subscription.endDate, now),
      createdAt: subscription.createdAt,
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

  static async createSubscription(
    trainerUserId: string,
    data: CreateSubscriptionInput
  ) {
    const trainer = await prisma.trainer.findUnique({
      where: { userId: trainerUserId },
    });
    if (!trainer) throw new AppError("Entrenador no encontrado", 404);

    const startDate = new Date(data.startDate);
    const freqDays = FREQUENCY_DAYS[data.frequency] ?? 30;

    // Aritmética entera en centavos para evitar errores de punto flotante.
    // La última cuota absorbe el centavo de diferencia si el total no es divisible exactamente.
    const totalCents = Math.round(data.totalAmount * 100);
    const baseCents = Math.floor(totalCents / data.installmentCount);
    const remainderCents = totalCents - baseCents * data.installmentCount;

    try {
      await prisma.$transaction(async (tx) => {
        const [student, plan] = await Promise.all([
          tx.student.findFirst({
            where: { id: data.studentId, trainerId: trainer.id, deletedAt: null },
            select: { id: true },
          }),
          tx.plan.findFirst({
            where: { id: data.planId, trainerId: trainer.id, isActive: true },
          }),
        ]);
        if (!student) throw new AppError("Alumno no encontrado", 404);
        if (!plan) throw new AppError("Plan no encontrado o inactivo", 404);

        const activeSubscriptions = await tx.subscription.findMany({
          where: {
            studentId: data.studentId,
            trainerId: trainer.id,
            status: "ACTIVE",
          },
          select: { id: true },
        });
        const activeIds = activeSubscriptions.map(({ id }) => id);
        const currentActiveId = activeIds[0];

        if (
          (currentActiveId && data.replacesSubscriptionId !== currentActiveId) ||
          (!currentActiveId && data.replacesSubscriptionId)
        ) {
          throw new AppError("La suscripción cambió durante la operación", 409);
        }

        if (activeIds.length > 0) {
          await tx.installment.updateMany({
            where: {
              subscriptionId: { in: activeIds },
              status: { in: ["PENDING", "OVERDUE"] },
            },
            data: { status: "CANCELLED" },
          });
          await tx.subscription.updateMany({
            where: { id: { in: activeIds }, status: "ACTIVE" },
            data: { status: "CANCELLED" },
          });
        }

        const days = DURATION_DAYS[plan.duration] ?? 30;
        const endDate = addDays(startDate, days);
        const sub = await tx.subscription.create({
          data: {
            studentId: data.studentId,
            planId: data.planId,
            trainerId: trainer.id,
            startDate,
            endDate,
            status: "ACTIVE",
            totalAmount: data.totalAmount,
            installmentCount: data.installmentCount,
            frequency: data.frequency,
          },
        });

        const installments = Array.from(
          { length: data.installmentCount },
          (_, i) => {
            const isLast = i === data.installmentCount - 1;
            const amountCents = isLast ? baseCents + remainderCents : baseCents;
            return {
              subscriptionId: sub.id,
              trainerId: trainer.id,
              number: i + 1,
              amount: amountCents / 100,
              dueDate: addDays(startDate, freqDays * i),
              status: "PENDING" as const,
            };
          }
        );

        await tx.installment.createMany({ data: installments });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2002" || error.code === "P2034")
      ) {
        throw new AppError("La suscripción cambió durante la operación", 409);
      }
      throw error;
    }

    return this.getStudentSubscription(trainerUserId, data.studentId);
  }

  static async payInstallment(
    trainerUserId: string,
    installmentId: string,
    data: PayInstallmentInput
  ) {
    const trainer = await prisma.trainer.findUnique({
      where: { userId: trainerUserId },
    });
    if (!trainer) throw new AppError("Entrenador no encontrado", 404);

    const installment = await prisma.installment.findFirst({
      where: { id: installmentId, trainerId: trainer.id },
      include: {
        subscription: {
          include: {
            student: true,
            plan: true,
          },
        },
      },
    });
    if (!installment) throw new AppError("Cuota no encontrada", 404);

    if (installment.status === "PAID") {
      throw new AppError("Esta cuota ya fue pagada", 400);
    }

    if (installment.subscription.status !== "ACTIVE") {
      throw new AppError(
        "No se puede registrar un pago en una suscripción inactiva",
        400
      );
    }

    const updated = await prisma.installment.update({
      where: { id: installmentId },
      data: {
        status: "PAID",
        paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
        notes: data.notes,
      },
    });

    // Notify student
    if (installment.subscription.student.userId) {
      NotificationService.sendNotification(installment.subscription.student.userId, {
        title: "Pago registrado 💳",
        body: `Tu entrenador registró el pago de la cuota Nº ${installment.number} de ${installment.subscription.plan.name}.`,
        data: { type: "PAYMENT_RECORDED", installmentId: installment.id },
      }).catch((err) => {
        console.error("[SubscriptionsService] Error enviando notificación push:", err);
      });
    }

    return {
      id: updated.id,
      number: updated.number,
      amount: Number(updated.amount),
      dueDate: updated.dueDate,
      paidAt: updated.paidAt,
      status: updated.status,
      notes: updated.notes,
    };
  }

  static async getExpiringSubscriptions(trainerUserId: string) {
    const trainer = await prisma.trainer.findUnique({
      where: { userId: trainerUserId },
    });
    if (!trainer) throw new AppError("Entrenador no encontrado", 404);

    const now = new Date();
    const in7Days = addDays(now, 7);

    const [expiringSoon, expired] = await Promise.all([
      prisma.subscription.findMany({
        where: {
          trainerId: trainer.id,
          status: "ACTIVE",
          endDate: { gte: now, lte: in7Days },
        },
        include: { student: true, plan: true },
        orderBy: { endDate: "asc" },
      }),
      prisma.subscription.findMany({
        where: {
          trainerId: trainer.id,
          status: { in: ["ACTIVE", "EXPIRED"] },
          endDate: { lt: now },
        },
        include: { student: true, plan: true },
        orderBy: { endDate: "desc" },
        take: 10,
      }),
    ]);

    return {
      expiringSoon: expiringSoon.map((s) => ({
        subscriptionId: s.id,
        studentId: s.studentId,
        studentName: `${s.student.firstName} ${s.student.lastName}`,
        planName: s.plan.name,
        endDate: s.endDate,
        daysUntilExpiry: daysUntilExpiry(s.endDate, now),
      })),
      expired: expired.map((s) => ({
        subscriptionId: s.id,
        studentId: s.studentId,
        studentName: `${s.student.firstName} ${s.student.lastName}`,
        planName: s.plan.name,
        endDate: s.endDate,
        daysUntilExpiry: daysUntilExpiry(s.endDate, now),
      })),
    };
  }

  static async cancelSubscription(
    trainerUserId: string,
    subscriptionId: string
  ) {
    const trainer = await prisma.trainer.findUnique({
      where: { userId: trainerUserId },
    });
    if (!trainer) throw new AppError("Entrenador no encontrado", 404);

    const subscription = await prisma.subscription.findFirst({
      where: { id: subscriptionId, trainerId: trainer.id },
    });
    if (!subscription) throw new AppError("Suscripción no encontrada", 404);

    await prisma.$transaction([
      prisma.installment.updateMany({
        where: {
          subscriptionId,
          status: { in: ["PENDING", "OVERDUE"] },
        },
        data: { status: "CANCELLED" },
      }),
      prisma.subscription.update({
        where: { id: subscriptionId },
        data: { status: "CANCELLED" },
      }),
    ]);

    return { cancelled: true };
  }
}
