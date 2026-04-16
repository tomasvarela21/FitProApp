import { prisma } from "../../infrastructure/db/prisma";
import { AppError } from "../../shared/errors/app-error";
import { hashPassword } from "../../shared/utils/hash";
import { TrainersMapper } from "./trainers.mapper";
import { CreateTrainerInput } from "./trainers.schema";

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

    const [total, active, invited, paused, inactive, recentStudents] =
      await Promise.all([
        prisma.student.count({ where: baseWhere }),
        prisma.student.count({ where: { ...baseWhere, status: "ACTIVE" } }),
        prisma.student.count({ where: { ...baseWhere, status: "INVITED" } }),
        prisma.student.count({ where: { ...baseWhere, status: "PAUSED" } }),
        prisma.student.count({ where: { ...baseWhere, status: "INACTIVE" } }),
        prisma.student.findMany({
          where: baseWhere,
          orderBy: { createdAt: "desc" },
          take: DASHBOARD_RECENT_LIMIT,
        }),
      ]);

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
        endDate: i.dueDate,
        daysUntilExpiry: Math.ceil(
          (i.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        ),
      }));

    return {
      stats: { total, active, invited, paused, inactive },
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
}