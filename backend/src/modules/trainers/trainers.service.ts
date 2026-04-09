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

    return {
      stats: { total, active, invited, paused, inactive },
      recentStudents: recentStudents.map(TrainersMapper.toDashboardStudent),
    };
  }
}