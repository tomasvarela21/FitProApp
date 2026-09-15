import { DayOfWeek, Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/db/prisma";
import { AppError } from "../../shared/errors/app-error";
import { ResourceAccessService } from "../../shared/services/resource-access.service";
import { NotificationService } from "../notifications/notifications.service";

type CreateRoutineData = {
  name: string;
  description?: string;
};

type UpdateRoutineData = Partial<CreateRoutineData>;

type AddExerciseData = {
  exerciseId: string;
  dayOfWeek: DayOfWeek;
  order: number;
  sets: number;
  reps: string;
  suggestedWeight?: number;
  suggestedRpe?: number;
  restSeconds?: number;
  notes?: string;
};

type UpdateRoutineExerciseData = Partial<Omit<AddExerciseData, "exerciseId">>;

const routineExerciseInclude = {
  exercise: {
    include: {
      muscleGroup: true,
      equipment: true,
    },
  },
} satisfies Prisma.RoutineExerciseInclude;

const routineInclude = {
  routineExercises: {
    where: { archivedAt: null, exercise: { archivedAt: null } },
    include: routineExerciseInclude,
    orderBy: { order: "asc" as const },
  },
} satisfies Prisma.RoutineInclude;

type RoutineWithRelations = Prisma.RoutineGetPayload<{
  include: typeof routineInclude;
}>;

function toRoutineDto(routine: RoutineWithRelations) {
  return {
    id: routine.id,
    name: routine.name,
    description: routine.description,
    isGlobal: routine.isGlobal,
    isTemplate: routine.isTemplate,
    trainerId: routine.trainerId,
    createdAt: routine.createdAt,
    updatedAt: routine.updatedAt,
    routineExercises: routine.routineExercises.map((re) => ({
      id: re.id,
      dayOfWeek: re.dayOfWeek,
      order: re.order,
      sets: re.sets,
      reps: re.reps,
      suggestedWeight: re.suggestedWeight,
      suggestedRpe: re.suggestedRpe,
      restSeconds: re.restSeconds,
      notes: re.notes,
      exercise: {
        id: re.exercise.id,
        name: re.exercise.name,
        description: re.exercise.description,
        difficulty: re.exercise.difficulty,
        movementType: re.exercise.movementType,
        mediaUrl: re.exercise.mediaUrl,
        mediaType: re.exercise.mediaType,
        muscleGroup: re.exercise.muscleGroup
          ? { id: re.exercise.muscleGroup.id, name: re.exercise.muscleGroup.name, slug: re.exercise.muscleGroup.slug }
          : null,
        equipment: re.exercise.equipment
          ? { id: re.exercise.equipment.id, name: re.exercise.equipment.name }
          : null,
      },
    })),
  };
}

export class RoutinesService {
  private static async getTrainer(userId: string) {
    const trainer = await prisma.trainer.findUnique({ where: { userId } });
    if (!trainer) throw new AppError("Trainer no encontrado", 404);
    return trainer;
  }

  private static async getOwnedRoutine(trainerUserId: string, routineId: string) {
    const where = await ResourceAccessService.trainerOwnedRoutineWhere(
      trainerUserId,
      routineId,
    );
    const routine = await prisma.routine.findFirst({ where });
    if (!routine) throw new AppError("Rutina no encontrada", 404);
    return routine;
  }

  static async listRoutines(trainerUserId: string) {
    const trainer = await this.getTrainer(trainerUserId);

    const routines = await prisma.routine.findMany({
      where: {
        archivedAt: null,
        OR: [{ isGlobal: true }, { trainerId: trainer.id }],
      },
      include: routineInclude,
      orderBy: [{ isGlobal: "desc" }, { name: "asc" }],
    });

    return routines.map(toRoutineDto);
  }

  static async getRoutine(trainerUserId: string, id: string) {
    const where = await ResourceAccessService.trainerReadableRoutineWhere(trainerUserId, id);
    const routine = await prisma.routine.findFirst({
      where,
      include: routineInclude,
    });

    if (!routine) throw new AppError("Rutina no encontrada", 404);

    return toRoutineDto(routine);
  }

  static async createRoutine(trainerUserId: string, data: CreateRoutineData) {
    const trainer = await this.getTrainer(trainerUserId);

    const routine = await prisma.routine.create({
      data: { ...data, trainerId: trainer.id, isGlobal: false },
      include: routineInclude,
    });

    return toRoutineDto(routine);
  }

  static async updateRoutine(trainerUserId: string, id: string, data: UpdateRoutineData) {
    await this.getOwnedRoutine(trainerUserId, id);

    const updated = await prisma.routine.update({
      where: { id },
      data,
      include: routineInclude,
    });

    return toRoutineDto(updated);
  }

  static async deleteRoutine(trainerUserId: string, id: string) {
    await this.getOwnedRoutine(trainerUserId, id);

    const [assignmentCount, historicalExerciseCount] = await Promise.all([
      prisma.studentRoutine.count({ where: { routineId: id } }),
      prisma.routineExercise.count({
        where: {
          routineId: id,
          OR: [{ workoutSets: { some: {} } }, { weeklyOverrides: { some: {} } }],
        },
      }),
    ]);

    if (assignmentCount > 0 || historicalExerciseCount > 0) {
      await prisma.$transaction([
        prisma.studentRoutine.updateMany({
          where: { routineId: id, isActive: true },
          data: { isActive: false },
        }),
        prisma.routine.update({
          where: { id },
          data: { archivedAt: new Date(), isTemplate: false },
        }),
      ]);
      return { id, archived: true, deleted: false };
    }

    await prisma.routine.delete({ where: { id } });

    return { id, archived: false, deleted: true };
  }

  static async addExerciseToRoutine(trainerUserId: string, routineId: string, data: AddExerciseData) {
    await this.getOwnedRoutine(trainerUserId, routineId);

    const exerciseWhere = await ResourceAccessService.trainerReadableExerciseWhere(
      trainerUserId,
      data.exerciseId,
    );
    const exercise = await prisma.exercise.findFirst({
      where: exerciseWhere,
      select: { id: true },
    });
    if (!exercise) throw new AppError("Ejercicio no encontrado", 404);

    const routineExercise = await prisma.routineExercise.create({
      data: { routineId, ...data },
      include: routineExerciseInclude,
    });

    return {
      id: routineExercise.id,
      order: routineExercise.order,
      sets: routineExercise.sets,
      reps: routineExercise.reps,
      suggestedWeight: routineExercise.suggestedWeight,
      suggestedRpe: routineExercise.suggestedRpe,
      restSeconds: routineExercise.restSeconds,
      notes: routineExercise.notes,
      exercise: {
        id: routineExercise.exercise.id,
        name: routineExercise.exercise.name,
        difficulty: routineExercise.exercise.difficulty,
        movementType: routineExercise.exercise.movementType,
        muscleGroup: routineExercise.exercise.muscleGroup
          ? { id: routineExercise.exercise.muscleGroup.id, name: routineExercise.exercise.muscleGroup.name }
          : null,
        equipment: routineExercise.exercise.equipment
          ? { id: routineExercise.exercise.equipment.id, name: routineExercise.exercise.equipment.name }
          : null,
      },
    };
  }

  static async updateRoutineExercise(
    trainerUserId: string,
    routineId: string,
    routineExerciseId: string,
    data: UpdateRoutineExerciseData
  ) {
    await this.getOwnedRoutine(trainerUserId, routineId);

    const routineExercise = await prisma.routineExercise.findFirst({
      where: { id: routineExerciseId, routineId, archivedAt: null },
    });
    if (!routineExercise) throw new AppError("Ejercicio de rutina no encontrado", 404);

    return prisma.routineExercise.update({
      where: { id: routineExerciseId },
      data,
    });
  }

  static async removeExerciseFromRoutine(
    trainerUserId: string,
    routineId: string,
    routineExerciseId: string
  ) {
    await this.getOwnedRoutine(trainerUserId, routineId);

    const routineExercise = await prisma.routineExercise.findFirst({
      where: { id: routineExerciseId, routineId, archivedAt: null },
    });
    if (!routineExercise) throw new AppError("Ejercicio de rutina no encontrado", 404);

    const [setCount, overrideCount] = await Promise.all([
      prisma.workoutSet.count({ where: { routineExerciseId } }),
      prisma.weeklyExerciseOverride.count({ where: { routineExerciseId } }),
    ]);

    if (setCount > 0 || overrideCount > 0) {
      await prisma.routineExercise.update({
        where: { id: routineExerciseId },
        data: { archivedAt: new Date() },
      });
      return { id: routineExerciseId, archived: true, deleted: false };
    }

    await prisma.routineExercise.delete({ where: { id: routineExerciseId } });

    return { id: routineExerciseId, archived: false, deleted: true };
  }

  static async toggleTemplate(trainerUserId: string, routineId: string) {
    const routine = await this.getOwnedRoutine(trainerUserId, routineId);

    const updated = await prisma.routine.update({
      where: { id: routineId },
      data: { isTemplate: !routine.isTemplate },
      include: routineInclude,
    });

    return toRoutineDto(updated);
  }

  static async cloneTemplate(trainerUserId: string, routineId: string) {
    const trainer = await this.getTrainer(trainerUserId);

    const where = await ResourceAccessService.trainerReadableRoutineWhere(
      trainerUserId,
      routineId,
    );
    const source = await prisma.routine.findFirst({
      where,
      include: routineInclude,
    });
    if (!source) throw new AppError("Rutina no encontrada", 404);

    const cloned = await prisma.$transaction(async (tx) => {
      const newRoutine = await tx.routine.create({
        data: {
          name: `${source.name} (copia)`,
          description: source.description,
          trainerId: trainer.id,
          isGlobal: false,
          isTemplate: false,
        },
      });

      if (source.routineExercises.length > 0) {
        await tx.routineExercise.createMany({
          data: source.routineExercises.map((re) => ({
            routineId: newRoutine.id,
            exerciseId: re.exerciseId,
            dayOfWeek: re.dayOfWeek,
            order: re.order,
            sets: re.sets,
            reps: re.reps,
            suggestedWeight: re.suggestedWeight,
            suggestedRpe: re.suggestedRpe,
            restSeconds: re.restSeconds,
            notes: re.notes,
          })),
        });
      }

      return tx.routine.findUniqueOrThrow({
        where: { id: newRoutine.id },
        include: routineInclude,
      });
    });

    return toRoutineDto(cloned);
  }

  static async assignRoutineToStudent(
    trainerUserId: string,
    studentId: string,
    routineId: string,
    notes?: string
  ) {
    const trainer = await this.getTrainer(trainerUserId);

    const student = await prisma.student.findFirst({
      where: { id: studentId, trainerId: trainer.id, deletedAt: null },
    });
    if (!student) throw new AppError("Alumno no encontrado", 404);

    const routineWhere = await ResourceAccessService.trainerReadableRoutineWhere(
      trainerUserId,
      routineId,
    );
    const routine = await prisma.routine.findFirst({ where: routineWhere });
    if (!routine) throw new AppError("Rutina no encontrada", 404);

    let studentRoutine;
    try {
      studentRoutine = await prisma.$transaction(async (tx) => {
        await tx.studentRoutine.updateMany({
          where: { studentId, isActive: true },
          data: { isActive: false },
        });

        return tx.studentRoutine.create({
          data: {
            studentId,
            routineId,
            isActive: true,
            notes,
            weeklyPlanWeeks: { create: { weekNumber: 1 } },
          },
          include: {
            routine: { include: routineInclude },
          },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2002" || error.code === "P2034")
      ) {
        throw new AppError("La rutina activa cambió durante la asignación", 409);
      }
      throw error;
    }

    if (student.userId) {
      NotificationService.sendNotification(student.userId, {
        title: "Nueva rutina asignada 🏋️",
        body: `Tu entrenador te asignó la rutina: ${routine.name}`,
        data: { type: "ROUTINE_ASSIGNED", routineId: routine.id },
      }).catch((err) => {
        console.error("[RoutinesService] Error enviando notificación push:", err);
      });
    }

    return {
      id: studentRoutine.id,
      studentId: studentRoutine.studentId,
      isActive: studentRoutine.isActive,
      assignedAt: studentRoutine.assignedAt,
      notes: studentRoutine.notes,
      routine: toRoutineDto(studentRoutine.routine as RoutineWithRelations),
    };
  }

  static async getStudentRoutine(trainerUserId: string, studentId: string) {
    const trainer = await this.getTrainer(trainerUserId);

    const student = await prisma.student.findFirst({
      where: { id: studentId, trainerId: trainer.id, deletedAt: null },
    });
    if (!student) throw new AppError("Alumno no encontrado", 404);

    const studentRoutine = await prisma.studentRoutine.findFirst({
      where: { studentId, isActive: true, routine: { archivedAt: null } },
      include: {
        routine: { include: routineInclude },
      },
    });

    if (!studentRoutine) return null;

    return {
      id: studentRoutine.id,
      studentId: studentRoutine.studentId,
      isActive: studentRoutine.isActive,
      assignedAt: studentRoutine.assignedAt,
      notes: studentRoutine.notes,
      routine: toRoutineDto(studentRoutine.routine as RoutineWithRelations),
    };
  }

  static async getStudentWorkoutHistory(trainerUserId: string, studentId: string) {
    const trainer = await this.getTrainer(trainerUserId);

    const student = await prisma.student.findFirst({
      where: { id: studentId, trainerId: trainer.id, deletedAt: null },
    });
    if (!student) throw new AppError("Alumno no encontrado", 404);

    const logs = await prisma.workoutLog.findMany({
      where: { studentRoutine: { studentId } },
      include: {
        workoutSets: {
          orderBy: [{ routineExerciseId: "asc" }, { setNumber: "asc" }],
        },
      },
      orderBy: { date: "desc" },
      take: 30,
    });

    return logs.map((log) => ({
      id: log.id,
      date: log.date,
      notes: log.notes,
      createdAt: log.createdAt,
      routine: { id: log.routineId, name: log.routineName },
      sets: log.workoutSets.map((s) => ({
        id: s.id,
        setNumber: s.setNumber,
        reps: s.reps,
        weight: s.weight,
        rpe: s.rpe,
        notes: s.notes,
        exercise: {
          id: s.exerciseId,
          name: s.exerciseName,
          order: s.exerciseOrder,
          muscleGroup: s.exerciseMuscleGroupName
            ? { name: s.exerciseMuscleGroupName }
            : null,
        },
      })),
    }));
  }
}
