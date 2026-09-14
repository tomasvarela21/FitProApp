import { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/db/prisma";
import { AppError } from "../errors/app-error";

export class ResourceAccessService {
  static async getTrainerId(userId: string) {
    const trainer = await prisma.trainer.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!trainer) throw new AppError("Entrenador no encontrado", 404);
    return trainer.id;
  }

  static async getActiveStudentId(userId: string) {
    const student = await prisma.student.findFirst({
      where: { userId, deletedAt: null },
      select: { id: true },
    });

    if (!student) throw new AppError("Alumno no encontrado", 404);
    return student.id;
  }

  static async readableExerciseWhere(
    userId: string,
    role: string,
    exerciseId: string,
  ): Promise<Prisma.ExerciseWhereInput> {
    if (role === "TRAINER") {
      const trainerId = await this.getTrainerId(userId);
      return {
        id: exerciseId,
        archivedAt: null,
        OR: [{ isGlobal: true }, { trainerId }],
      };
    }

    if (role !== "STUDENT") {
      throw new AppError("Rol no autorizado", 404);
    }

    const studentId = await this.getActiveStudentId(userId);
    return {
      id: exerciseId,
      archivedAt: null,
      OR: [
        { isGlobal: true },
        {
          routineExercises: {
            some: {
              archivedAt: null,
              routine: {
                archivedAt: null,
                studentRoutines: { some: { studentId, isActive: true } },
              },
            },
          },
        },
      ],
    };
  }

  static async trainerReadableExerciseWhere(
    trainerUserId: string,
    exerciseId: string,
  ): Promise<Prisma.ExerciseWhereInput> {
    const trainerId = await this.getTrainerId(trainerUserId);
    return {
      id: exerciseId,
      archivedAt: null,
      OR: [{ isGlobal: true }, { trainerId }],
    };
  }

  static async trainerOwnedExerciseWhere(
    trainerUserId: string,
    exerciseId: string,
  ): Promise<Prisma.ExerciseWhereInput> {
    const trainerId = await this.getTrainerId(trainerUserId);
    return { id: exerciseId, trainerId, isGlobal: false, archivedAt: null };
  }

  static async trainerReadableRoutineWhere(
    trainerUserId: string,
    routineId: string,
  ): Promise<Prisma.RoutineWhereInput> {
    const trainerId = await this.getTrainerId(trainerUserId);
    return {
      id: routineId,
      archivedAt: null,
      OR: [{ isGlobal: true }, { trainerId }],
    };
  }

  static async trainerOwnedRoutineWhere(
    trainerUserId: string,
    routineId: string,
  ): Promise<Prisma.RoutineWhereInput> {
    const trainerId = await this.getTrainerId(trainerUserId);
    return { id: routineId, trainerId, isGlobal: false, archivedAt: null };
  }
}
