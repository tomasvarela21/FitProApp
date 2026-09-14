import { Difficulty, MediaType, MovementType, Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/db/prisma";
import { AppError } from "../../shared/errors/app-error";
import { ResourceAccessService } from "../../shared/services/resource-access.service";

type ExerciseFilters = {
  muscleGroupId?: string;
  difficulty?: Difficulty;
  search?: string;
  isGlobal?: boolean;
};

type CreateExerciseData = {
  name: string;
  description?: string;
  muscleGroupId: string;
  difficulty: Difficulty;
  movementType: MovementType;
  equipmentId?: string;
  mediaUrl?: string;
  mediaType?: MediaType;
};

type UpdateExerciseData = Partial<CreateExerciseData>;

const exerciseInclude = {
  muscleGroup: true,
  equipment: true,
} satisfies Prisma.ExerciseInclude;

type ExerciseWithRelations = Prisma.ExerciseGetPayload<{
  include: typeof exerciseInclude;
}>;

function toDto(exercise: ExerciseWithRelations) {
  return {
    id: exercise.id,
    name: exercise.name,
    description: exercise.description,
    difficulty: exercise.difficulty,
    movementType: exercise.movementType,
    mediaUrl: exercise.mediaUrl,
    mediaType: exercise.mediaType,
    isGlobal: exercise.isGlobal,
    trainerId: exercise.trainerId,
    createdAt: exercise.createdAt,
    updatedAt: exercise.updatedAt,
    muscleGroup: exercise.muscleGroup
      ? { id: exercise.muscleGroup.id, name: exercise.muscleGroup.name, slug: exercise.muscleGroup.slug }
      : null,
    equipment: exercise.equipment
      ? { id: exercise.equipment.id, name: exercise.equipment.name }
      : null,
  };
}

export class ExercisesService {
  private static async getTrainer(userId: string) {
    const trainer = await prisma.trainer.findUnique({ where: { userId } });
    if (!trainer) throw new AppError("Trainer no encontrado", 404);
    return trainer;
  }

  static async listExercises(
    userId: string,
    role: string,
    filters: { muscleGroupId?: string; difficulty?: string; search?: string; isGlobal?: boolean }
  ) {
    if (role === "STUDENT") {
      const exercises = await prisma.exercise.findMany({
        where: {
          isGlobal: true,
          archivedAt: null,
          ...(filters.muscleGroupId ? { muscleGroupId: filters.muscleGroupId } : {}),
          ...(filters.difficulty ? { difficulty: filters.difficulty as Difficulty } : {}),
          ...(filters.search ? { name: { contains: filters.search, mode: "insensitive" } } : {}),
        },
        include: exerciseInclude,
        orderBy: { name: "asc" },
      });
      return exercises.map(toDto);
    }

    const trainer = await this.getTrainer(userId);

    let scopeFilter: Prisma.ExerciseWhereInput;
    if (filters.isGlobal === true) {
      scopeFilter = { isGlobal: true };
    } else if (filters.isGlobal === false) {
      scopeFilter = { trainerId: trainer.id, isGlobal: false };
    } else {
      scopeFilter = { OR: [{ isGlobal: true }, { trainerId: trainer.id }] };
    }

    const where: Prisma.ExerciseWhereInput = {
      AND: [
        { archivedAt: null },
        scopeFilter,
        ...(filters.muscleGroupId ? [{ muscleGroupId: filters.muscleGroupId }] : []),
        ...(filters.difficulty ? [{ difficulty: filters.difficulty as Difficulty }] : []),
        ...(filters.search
          ? [{ name: { contains: filters.search, mode: "insensitive" as const } }]
          : []),
      ],
    };

    const exercises = await prisma.exercise.findMany({
      where,
      include: exerciseInclude,
      orderBy: [{ isGlobal: "desc" }, { name: "asc" }],
    });

    return exercises.map(toDto);
  }

  static async getExercise(userId: string, role: string, id: string) {
    const where = await ResourceAccessService.readableExerciseWhere(userId, role, id);
    const exercise = await prisma.exercise.findFirst({
      where,
      include: exerciseInclude,
    });

    if (!exercise) throw new AppError("Ejercicio no encontrado", 404);

    return toDto(exercise);
  }

  static async createExercise(trainerUserId: string, data: CreateExerciseData) {
    const trainer = await this.getTrainer(trainerUserId);

    const exercise = await prisma.exercise.create({
      data: { ...data, trainerId: trainer.id, isGlobal: false },
      include: exerciseInclude,
    });

    return toDto(exercise);
  }

  static async updateExercise(trainerUserId: string, id: string, data: UpdateExerciseData) {
    const where = await ResourceAccessService.trainerOwnedExerciseWhere(trainerUserId, id);
    const exercise = await prisma.exercise.findFirst({ where, select: { id: true } });
    if (!exercise) throw new AppError("Ejercicio no encontrado", 404);

    const updated = await prisma.exercise.update({
      where: { id },
      data,
      include: exerciseInclude,
    });

    return toDto(updated);
  }

  static async deleteExercise(trainerUserId: string, id: string) {
    const where = await ResourceAccessService.trainerOwnedExerciseWhere(trainerUserId, id);
    const exercise = await prisma.exercise.findFirst({ where, select: { id: true } });
    if (!exercise) throw new AppError("Ejercicio no encontrado", 404);

    const relationCount = await prisma.routineExercise.count({
      where: { exerciseId: id },
    });

    if (relationCount > 0) {
      await prisma.exercise.update({
        where: { id },
        data: { archivedAt: new Date() },
      });
      return { id, archived: true, deleted: false };
    }

    await prisma.exercise.delete({ where: { id } });

    return { id, archived: false, deleted: true };
  }

  static async listMuscleGroups() {
    return prisma.muscleGroup.findMany({ orderBy: { name: "asc" } });
  }

  static async listEquipment() {
    return prisma.equipment.findMany({ orderBy: { name: "asc" } });
  }
}
