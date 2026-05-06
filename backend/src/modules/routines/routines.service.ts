import { DayOfWeek, Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/db/prisma";
import { AppError } from "../../shared/errors/app-error";

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

  private static async getOwnedRoutine(trainerId: string, routineId: string) {
    const routine = await prisma.routine.findUnique({ where: { id: routineId } });
    if (!routine) throw new AppError("Rutina no encontrada", 404);
    if (!routine.isGlobal && routine.trainerId !== trainerId) {
      throw new AppError("No tienes permisos para modificar esta rutina", 403);
    }
    return routine;
  }

  static async listRoutines(trainerUserId: string) {
    const trainer = await this.getTrainer(trainerUserId);

    const routines = await prisma.routine.findMany({
      where: { OR: [{ isGlobal: true }, { trainerId: trainer.id }] },
      include: routineInclude,
      orderBy: [{ isGlobal: "desc" }, { name: "asc" }],
    });

    return routines.map(toRoutineDto);
  }

  static async getRoutine(id: string) {
    const routine = await prisma.routine.findUnique({
      where: { id },
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
    const trainer = await this.getTrainer(trainerUserId);
    await this.getOwnedRoutine(trainer.id, id);

    const updated = await prisma.routine.update({
      where: { id },
      data,
      include: routineInclude,
    });

    return toRoutineDto(updated);
  }

  static async deleteRoutine(trainerUserId: string, id: string) {
    const trainer = await this.getTrainer(trainerUserId);
    await this.getOwnedRoutine(trainer.id, id);

    await prisma.routine.delete({ where: { id } });

    return { id };
  }

  static async addExerciseToRoutine(trainerUserId: string, routineId: string, data: AddExerciseData) {
    const trainer = await this.getTrainer(trainerUserId);
    await this.getOwnedRoutine(trainer.id, routineId);

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
    const trainer = await this.getTrainer(trainerUserId);
    await this.getOwnedRoutine(trainer.id, routineId);

    const routineExercise = await prisma.routineExercise.findFirst({
      where: { id: routineExerciseId, routineId },
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
    const trainer = await this.getTrainer(trainerUserId);
    await this.getOwnedRoutine(trainer.id, routineId);

    const routineExercise = await prisma.routineExercise.findFirst({
      where: { id: routineExerciseId, routineId },
    });
    if (!routineExercise) throw new AppError("Ejercicio de rutina no encontrado", 404);

    await prisma.routineExercise.delete({ where: { id: routineExerciseId } });

    return { id: routineExerciseId };
  }

  static async assignRoutineToStudent(
    trainerUserId: string,
    studentId: string,
    routineId: string,
    notes?: string
  ) {
    const trainer = await this.getTrainer(trainerUserId);

    const student = await prisma.student.findFirst({
      where: { id: studentId, trainerId: trainer.id },
    });
    if (!student) throw new AppError("Alumno no encontrado", 404);

    const routine = await prisma.routine.findUnique({ where: { id: routineId } });
    if (!routine) throw new AppError("Rutina no encontrada", 404);

    const studentRoutine = await prisma.$transaction(async (tx) => {
      await tx.studentRoutine.updateMany({
        where: { studentId, isActive: true },
        data: { isActive: false },
      });

      return tx.studentRoutine.create({
        data: { studentId, routineId, isActive: true, notes },
        include: {
          routine: { include: routineInclude },
        },
      });
    });

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
      where: { id: studentId, trainerId: trainer.id },
    });
    if (!student) throw new AppError("Alumno no encontrado", 404);

    const studentRoutine = await prisma.studentRoutine.findFirst({
      where: { studentId, isActive: true },
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
      where: { id: studentId, trainerId: trainer.id },
    });
    if (!student) throw new AppError("Alumno no encontrado", 404);

    const logs = await prisma.workoutLog.findMany({
      where: { studentRoutine: { studentId } },
      include: {
        workoutSets: {
          include: {
            routineExercise: {
              include: { exercise: true },
            },
          },
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
      sets: log.workoutSets.map((s) => ({
        id: s.id,
        setNumber: s.setNumber,
        reps: s.reps,
        weight: s.weight,
        rpe: s.rpe,
        notes: s.notes,
        exercise: {
          id: s.routineExercise.exercise.id,
          name: s.routineExercise.exercise.name,
          order: s.routineExercise.order,
        },
      })),
    }));
  }
}
