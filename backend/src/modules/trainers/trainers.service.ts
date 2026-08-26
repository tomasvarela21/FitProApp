import { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/db/prisma";
import { AppError } from "../../shared/errors/app-error";
import { hashPassword } from "../../shared/utils/hash";
import { TrainersMapper } from "./trainers.mapper";
import { CreateTrainerInput, ListSubscriptionsQueryInput } from "./trainers.schema";

const DASHBOARD_RECENT_LIMIT = 5;

export class TrainersService {
  static async createTrainer(data: CreateTrainerInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new AppError("Ya existe un usuario con ese email", 409);
    }

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: "TRAINER",
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
        trainer: {
          create: {
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
          },
        },
      },
      include: {
        trainer: true,
      },
    });

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      trainer: user.trainer,
    };
  }

  static async getDashboardSummary(trainerUserId: string) {
    const trainer = await prisma.trainer.findUnique({
      where: { userId: trainerUserId },
    });

    if (!trainer) {
      throw new AppError("El entrenador autenticado no existe", 404);
    }

    const baseWhere = { trainerId: trainer.id };
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const total = await prisma.student.count({ where: baseWhere });
    const active = await prisma.student.count({ where: { ...baseWhere, status: "ACTIVE" } });
    const invited = await prisma.student.count({ where: { ...baseWhere, status: "INVITED" } });
    const paused = await prisma.student.count({ where: { ...baseWhere, status: "PAUSED" } });
    const inactive = await prisma.student.count({ where: { ...baseWhere, status: "INACTIVE" } });
    const recentStudents = await prisma.student.findMany({
      where: baseWhere,
      orderBy: { createdAt: "desc" },
      take: DASHBOARD_RECENT_LIMIT,
    });
    const weeklySessionsCount = await prisma.workoutLog.count({
      where: { date: { gte: weekAgo }, studentRoutine: { student: { trainerId: trainer.id } } },
    });
    const prevWeekSessionsCount = await prisma.workoutLog.count({
      where: { date: { gte: twoWeeksAgo, lt: weekAgo }, studentRoutine: { student: { trainerId: trainer.id } } },
    });
    const newStudentsThisMonth = await prisma.student.count({
      where: { ...baseWhere, createdAt: { gte: monthStart } },
    });

    // Cuotas vencidas
    const overdueInstallments = await prisma.installment.findMany({
      where: {
        trainerId: trainer.id,
        status: { in: ["OVERDUE", "PENDING"] },
        dueDate: { lt: now },
      },
      include: {
        subscription: {
          include: {
            student: true,
            plan: true,
          },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    // Cuotas por vencer en 7 días
    const expiringSoonInstallments = await prisma.installment.findMany({
      where: {
        trainerId: trainer.id,
        status: "PENDING",
        dueDate: { gte: now, lte: in7Days },
      },
      include: {
        subscription: {
          include: {
            student: true,
            plan: true,
          },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    // Marcar cuotas pendientes vencidas como OVERDUE
    const pendingOverdueIds = overdueInstallments
      .filter((i) => i.status === "PENDING")
      .map((i) => i.id);

    if (pendingOverdueIds.length > 0) {
      await prisma.installment.updateMany({
        where: { id: { in: pendingOverdueIds } },
        data: { status: "OVERDUE" },
      });
    }

    // Deduplicar por alumno
    const seenStudentsOverdue = new Set<string>();
    const expiredAlerts = overdueInstallments
      .filter((i) => {
        if (seenStudentsOverdue.has(i.subscription.studentId)) return false;
        seenStudentsOverdue.add(i.subscription.studentId);
        return true;
      })
      .map((i) => ({
        subscriptionId: i.subscriptionId,
        installmentId: i.id,
        studentId: i.subscription.studentId,
        studentName: `${i.subscription.student.firstName} ${i.subscription.student.lastName}`,
        planName: i.subscription.plan.name,
        installmentNumber: i.number,
        amount: Number(i.amount),
        endDate: i.dueDate,
        daysUntilExpiry: Math.floor(
          (i.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        ),
      }));

    const seenStudentsExpiring = new Set<string>();
    const expiringSoonAlerts = expiringSoonInstallments
      .filter((i) => {
        if (seenStudentsExpiring.has(i.subscription.studentId)) return false;
        seenStudentsExpiring.add(i.subscription.studentId);
        return true;
      })
      .map((i) => ({
        subscriptionId: i.subscriptionId,
        installmentId: i.id,
        studentId: i.subscription.studentId,
        studentName: `${i.subscription.student.firstName} ${i.subscription.student.lastName}`,
        planName: i.subscription.plan.name,
        installmentNumber: i.number,
        amount: Number(i.amount),
        endDate: i.dueDate,
        daysUntilExpiry: Math.ceil(
          (i.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        ),
      }));

    const retentionRate = total > 0 ? Math.round((active / total) * 100) : 0;
    const activePercentage = total > 0 ? Math.round((active / total) * 100) : 0;
    const weeklySessionsDelta = weeklySessionsCount - prevWeekSessionsCount;

    return {
      stats: {
        total, active, invited, paused, inactive, retentionRate,
        activePercentage,
        weeklySessionsCount,
        weeklySessionsDelta,
        newStudentsThisMonth,
      },
      recentStudents: recentStudents.map(TrainersMapper.toDashboardStudent),
      alerts: {
        expired: expiredAlerts,
        expiringSoon: expiringSoonAlerts,
      },
    };
  }

  static async getProfile(trainerUserId: string) {
    const trainer = await prisma.trainer.findUnique({
      where: { userId: trainerUserId },
      include: { user: true },
    });

    if (!trainer) {
      throw new AppError("El entrenador autenticado no existe", 404);
    }

    return {
      id: trainer.id,
      firstName: trainer.firstName,
      lastName: trainer.lastName,
      phone: trainer.phone,
      email: trainer.user.email,
      createdAt: trainer.createdAt,
    };
  }

  static async updateProfile(
    trainerUserId: string,
    data: { firstName?: string; lastName?: string; phone?: string }
  ) {
    const trainer = await prisma.trainer.findUnique({
      where: { userId: trainerUserId },
    });

    if (!trainer) {
      throw new AppError("El entrenador autenticado no existe", 404);
    }

    const updated = await prisma.trainer.update({
      where: { id: trainer.id },
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
      phone: updated.phone,
    };
  }

  static async listSubscriptions(trainerUserId: string, query: ListSubscriptionsQueryInput) {
    const trainer = await prisma.trainer.findUnique({ where: { userId: trainerUserId } });
    if (!trainer) throw new AppError("Entrenador no encontrado", 404);

    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const search = query.search?.trim();

    const where: Prisma.SubscriptionWhereInput = {
      trainerId: trainer.id,
      status: { in: ["ACTIVE", "EXPIRED"] },
      ...(search ? {
        student: {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
          ],
        },
      } : {}),
    };

    const allSubs = await prisma.subscription.findMany({
      where,
      orderBy: { endDate: "asc" },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, email: true, status: true, deletedAt: true },
        },
        plan: { select: { name: true } },
        installments: { orderBy: { number: "asc" } },
      },
    });

    const withStatus = allSubs
      .filter((s) => !s.student.deletedAt)
      .map((sub) => {
        const installments = sub.installments;
        const hasOverdue = installments.some(
          (i) => i.status === "OVERDUE" || (i.status === "PENDING" && i.dueDate < now)
        );
        const hasExpiringSoon = installments.some(
          (i) => i.status === "PENDING" && i.dueDate >= now && i.dueDate <= in7Days
        );
        const allPaid = installments.length > 0 && installments.every((i) => i.status === "PAID");

        let paymentStatus: string;
        if (hasOverdue) paymentStatus = "OVERDUE";
        else if (hasExpiringSoon) paymentStatus = "EXPIRING_SOON";
        else if (allPaid) paymentStatus = "PAID";
        else paymentStatus = "ACTIVE";

        const paidCount = installments.filter((i) => i.status === "PAID").length;
        const overdueCount = installments.filter(
          (i) => i.status === "OVERDUE" || (i.status === "PENDING" && i.dueDate < now)
        ).length;
        const pendingFuture = installments.filter(
          (i) => i.status === "PENDING" && i.dueDate >= now
        );
        const nextPending = pendingFuture[0] ?? null;

        return {
          subscriptionId: sub.id,
          studentId: sub.student.id,
          studentName: `${sub.student.firstName} ${sub.student.lastName}`,
          studentEmail: sub.student.email,
          studentStatus: sub.student.status,
          planName: sub.plan.name,
          startDate: sub.startDate,
          endDate: sub.endDate,
          totalAmount: Number(sub.totalAmount),
          installmentCount: sub.installmentCount,
          frequency: sub.frequency,
          subscriptionStatus: sub.status,
          paymentStatus,
          paidCount,
          overdueCount,
          pendingCount: pendingFuture.length,
          nextDueDate: nextPending?.dueDate ?? null,
          nextAmount: nextPending ? Number(nextPending.amount) : null,
        };
      });

    const filtered =
      query.status && query.status !== "ALL"
        ? withStatus.filter((s) => s.paymentStatus === query.status)
        : withStatus;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    return {
      items: filtered.slice(skip, skip + limit),
      meta: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit) || 1,
      },
    };
  }
}