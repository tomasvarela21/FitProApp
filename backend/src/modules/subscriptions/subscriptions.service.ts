import { prisma } from "../../infrastructure/db/prisma";
import { AppError } from "../../shared/errors/app-error";
import type {
  CreateSubscriptionInput,
  PayInstallmentInput,
} from "./subscriptions.schema";

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

function getDaysUntilExpiry(endDate: Date): number {
  const now = new Date();
  const diff = endDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
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

    // Actualizar cuotas vencidas
    const now = new Date();
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
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      daysUntilExpiry: getDaysUntilExpiry(subscription.endDate),
      createdAt: subscription.createdAt,
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

  static async createSubscription(
    trainerUserId: string,
    data: CreateSubscriptionInput
  ) {
    const trainer = await prisma.trainer.findUnique({
      where: { userId: trainerUserId },
    });
    if (!trainer) throw new AppError("Entrenador no encontrado", 404);

    const student = await prisma.student.findFirst({
      where: { id: data.studentId, trainerId: trainer.id },
    });
    if (!student) throw new AppError("Alumno no encontrado", 404);

    const plan = await prisma.plan.findFirst({
      where: { id: data.planId, trainerId: trainer.id, isActive: true },
    });
    if (!plan) throw new AppError("Plan no encontrado o inactivo", 404);

    // Cancelar suscripción activa anterior
    await prisma.subscription.updateMany({
      where: {
        studentId: data.studentId,
        trainerId: trainer.id,
        status: "ACTIVE",
      },
      data: { status: "CANCELLED" },
    });

    const startDate = new Date(data.startDate);
    const days = DURATION_DAYS[plan.duration] ?? 30;
    const endDate = addDays(startDate, days);
    const amountPerInstallment = data.totalAmount / data.installmentCount;
    const freqDays = FREQUENCY_DAYS[data.frequency] ?? 30;

    const subscription = await prisma.$transaction(async (tx) => {
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
        include: { plan: true, student: true },
      });

      // Generar cuotas
      const installments = Array.from(
        { length: data.installmentCount },
        (_, i) => ({
          subscriptionId: sub.id,
          trainerId: trainer.id,
          number: i + 1,
          amount: amountPerInstallment,
          dueDate: addDays(startDate, freqDays * i),
          status: "PENDING" as const,
        })
      );

      await tx.installment.createMany({ data: installments });

      return sub;
    });

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
    });
    if (!installment) throw new AppError("Cuota no encontrada", 404);

    if (installment.status === "PAID") {
      throw new AppError("Esta cuota ya fue pagada", 400);
    }

    const updated = await prisma.installment.update({
      where: { id: installmentId },
      data: {
        status: "PAID",
        paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
        notes: data.notes,
      },
    });

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
          status: "ACTIVE",
          endDate: { lt: now },
        },
        include: { student: true, plan: true },
        orderBy: { endDate: "desc" },
        take: 10,
      }),
    ]);

    if (expired.length > 0) {
      await prisma.subscription.updateMany({
        where: { id: { in: expired.map((s) => s.id) } },
        data: { status: "EXPIRED" },
      });
    }

    return {
      expiringSoon: expiringSoon.map((s) => ({
        subscriptionId: s.id,
        studentId: s.studentId,
        studentName: `${s.student.firstName} ${s.student.lastName}`,
        planName: s.plan.name,
        endDate: s.endDate,
        daysUntilExpiry: getDaysUntilExpiry(s.endDate),
      })),
      expired: expired.map((s) => ({
        subscriptionId: s.id,
        studentId: s.studentId,
        studentName: `${s.student.firstName} ${s.student.lastName}`,
        planName: s.plan.name,
        endDate: s.endDate,
        daysUntilExpiry: getDaysUntilExpiry(s.endDate),
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
        data: { status: "OVERDUE" },
      }),
      prisma.subscription.update({
        where: { id: subscriptionId },
        data: { status: "CANCELLED" },
      }),
    ]);

    return { cancelled: true };
  }
}
