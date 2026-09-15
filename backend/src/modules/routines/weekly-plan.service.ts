import { Prisma, WeeklyExerciseOverride } from "@prisma/client";
import { prisma } from "../../infrastructure/db/prisma";
import { AppError } from "../../shared/errors/app-error";
import { ResourceAccessService } from "../../shared/services/resource-access.service";

type WeekOverrideInput = {
  routineExerciseId: string;
  suggestedWeight?: number | null;
  suggestedReps?: string | null;
  suggestedRpe?: number | null;
  notes?: string | null;
};

type WeekInput = {
  weekNumber: number;
  startDate?: string;
  endDate?: string;
  overrides?: WeekOverrideInput[];
};

type CreateWeeklyPlanInput = {
  routineId: string;
  weeks: WeekInput[];
  notes?: string;
};

function toOverrideDto(o: WeeklyExerciseOverride) {
  return {
    id: o.id,
    routineExerciseId: o.routineExerciseId,
    weekNumber: o.weekNumber,
    suggestedWeight: o.suggestedWeight,
    suggestedReps: o.suggestedReps,
    suggestedRpe: o.suggestedRpe,
    notes: o.notes,
  };
}

export class WeeklyPlanService {
  private static async getTrainer(userId: string) {
    const trainer = await prisma.trainer.findUnique({ where: { userId } });
    if (!trainer) throw new AppError("Trainer no encontrado", 404);
    return trainer;
  }

  private static async getOwnedStudent(trainerId: string, studentId: string) {
    const student = await prisma.student.findFirst({
      where: { id: studentId, trainerId, deletedAt: null },
    });
    if (!student) throw new AppError("Alumno no encontrado", 404);
    return student;
  }

  private static async getActiveStudentRoutine(studentId: string) {
    const studentRoutine = await prisma.studentRoutine.findFirst({
      where: { studentId, isActive: true, routine: { archivedAt: null } },
    });
    if (!studentRoutine) throw new AppError("El alumno no tiene una rutina activa", 404);
    return studentRoutine;
  }

  private static async assertRoutineExercises(
    routineId: string,
    overrides: WeekOverrideInput[],
  ) {
    const exerciseIds = [...new Set(overrides.map((override) => override.routineExerciseId))];
    if (exerciseIds.length === 0) return;

    const count = await prisma.routineExercise.count({
      where: {
        id: { in: exerciseIds },
        routineId,
        archivedAt: null,
        exercise: { archivedAt: null },
      },
    });
    if (count !== exerciseIds.length) {
      throw new AppError("Ejercicio de rutina no encontrado", 404);
    }
  }

  static async createWeeklyPlan(
    trainerUserId: string,
    studentId: string,
    data: CreateWeeklyPlanInput
  ) {
    const trainer = await this.getTrainer(trainerUserId);
    await this.getOwnedStudent(trainer.id, studentId);

    const routineWhere = await ResourceAccessService.trainerReadableRoutineWhere(
      trainerUserId,
      data.routineId,
    );
    const routine = await prisma.routine.findFirst({ where: routineWhere });
    if (!routine) throw new AppError("Rutina no encontrada", 404);

    await this.assertRoutineExercises(
      data.routineId,
      data.weeks.flatMap((week) => week.overrides ?? []),
    );

    const week1 = data.weeks.find((w) => w.weekNumber === 1);

    let studentRoutine;
    try {
      studentRoutine = await prisma.$transaction(async (tx) => {
        await tx.studentRoutine.updateMany({
          where: { studentId, isActive: true },
          data: { isActive: false },
        });

        const sr = await tx.studentRoutine.create({
          data: {
            studentId,
            routineId: data.routineId,
            isActive: true,
            notes: data.notes,
            weekNumber: 1,
            startDate: week1?.startDate ? new Date(week1.startDate) : undefined,
            endDate: week1?.endDate ? new Date(week1.endDate) : undefined,
            weeklyPlanWeeks: {
              create: data.weeks.map((week) => ({
                weekNumber: week.weekNumber,
                startDate: week.startDate ? new Date(week.startDate) : null,
                endDate: week.endDate ? new Date(week.endDate) : null,
              })),
            },
          },
        });

        for (const week of data.weeks) {
          if (!week.overrides?.length) continue;
          await tx.weeklyExerciseOverride.createMany({
            data: week.overrides.map((o) => ({
              studentRoutineId: sr.id,
              routineExerciseId: o.routineExerciseId,
              weekNumber: week.weekNumber,
              suggestedWeight: o.suggestedWeight ?? null,
              suggestedReps: o.suggestedReps ?? null,
              suggestedRpe: o.suggestedRpe ?? null,
              notes: o.notes ?? null,
            })),
          });
        }

        return sr;
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

    const allOverrides = await prisma.weeklyExerciseOverride.findMany({
      where: { studentRoutineId: studentRoutine.id },
      orderBy: [{ weekNumber: "asc" }],
    });
    const persistedWeeks = await prisma.weeklyPlanWeek.findMany({
      where: { studentRoutineId: studentRoutine.id },
      orderBy: { weekNumber: "asc" },
    });

    return {
      studentRoutine: {
        id: studentRoutine.id,
        studentId: studentRoutine.studentId,
        isActive: studentRoutine.isActive,
        assignedAt: studentRoutine.assignedAt,
        weekNumber: studentRoutine.weekNumber,
        startDate: studentRoutine.startDate,
        endDate: studentRoutine.endDate,
        notes: studentRoutine.notes,
      },
      weeks: persistedWeeks.map((week) => ({
        weekNumber: week.weekNumber,
        version: week.version,
        startDate: week.startDate,
        endDate: week.endDate,
        overrides: allOverrides
          .filter((o) => o.weekNumber === week.weekNumber)
          .map(toOverrideDto),
      })),
    };
  }

  static async getWeeklyPlan(trainerUserId: string, studentId: string) {
    const trainer = await this.getTrainer(trainerUserId);
    await this.getOwnedStudent(trainer.id, studentId);

    const studentRoutine = await prisma.studentRoutine.findFirst({
      where: { studentId, isActive: true, routine: { archivedAt: null } },
      include: {
        routine: {
          include: {
            routineExercises: {
              where: { archivedAt: null, exercise: { archivedAt: null } },
              include: { exercise: { include: { muscleGroup: true, equipment: true } } },
              orderBy: { order: "asc" },
            },
          },
        },
        weeklyOverrides: { orderBy: [{ weekNumber: "asc" }] },
        weeklyPlanWeeks: { orderBy: { weekNumber: "asc" } },
      },
    });

    if (!studentRoutine) throw new AppError("El alumno no tiene una rutina activa", 404);

    return {
      studentRoutine: {
        id: studentRoutine.id,
        studentId: studentRoutine.studentId,
        isActive: studentRoutine.isActive,
        assignedAt: studentRoutine.assignedAt,
        weekNumber: studentRoutine.weekNumber,
        startDate: studentRoutine.startDate,
        endDate: studentRoutine.endDate,
        notes: studentRoutine.notes,
        routine: {
          id: studentRoutine.routine.id,
          name: studentRoutine.routine.name,
          description: studentRoutine.routine.description,
          routineExercises: studentRoutine.routine.routineExercises.map((re) => ({
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
              muscleGroup: re.exercise.muscleGroup
                ? { id: re.exercise.muscleGroup.id, name: re.exercise.muscleGroup.name }
                : null,
              equipment: re.exercise.equipment
                ? { id: re.exercise.equipment.id, name: re.exercise.equipment.name }
                : null,
            },
          })),
        },
      },
      weeks: studentRoutine.weeklyPlanWeeks.map((week) => ({
        weekNumber: week.weekNumber,
        version: week.version,
        startDate: week.startDate,
        endDate: week.endDate,
        overrides: studentRoutine.weeklyOverrides
          .filter((o) => o.weekNumber === week.weekNumber)
          .map(toOverrideDto),
      })),
    };
  }

  static async updateWeekOverrides(
    trainerUserId: string,
    studentId: string,
    weekNumber: number,
    version: number,
    overrides: WeekOverrideInput[]
  ) {
    const trainer = await this.getTrainer(trainerUserId);
    await this.getOwnedStudent(trainer.id, studentId);

    const studentRoutine = await this.getActiveStudentRoutine(studentId);

    await this.assertRoutineExercises(studentRoutine.routineId, overrides);

    const updated = await prisma.$transaction(async (tx) => {
      const claimed = await tx.weeklyPlanWeek.updateMany({
        where: {
          studentRoutineId: studentRoutine.id,
          weekNumber,
          version,
          studentRoutine: { isActive: true },
        },
        data: { version: { increment: 1 } },
      });
      if (claimed.count !== 1) {
        const exists = await tx.weeklyPlanWeek.findUnique({
          where: {
            studentRoutineId_weekNumber: { studentRoutineId: studentRoutine.id, weekNumber },
          },
          select: { id: true },
        });
        if (!exists) throw new AppError("Semana no encontrada", 404);
        throw new AppError("La semana fue modificada por otra sesión", 409);
      }

      await tx.weeklyExerciseOverride.deleteMany({
        where: { studentRoutineId: studentRoutine.id, weekNumber },
      });

      if (overrides.length > 0) {
        await tx.weeklyExerciseOverride.createMany({
          data: overrides.map((o) => ({
            studentRoutineId: studentRoutine.id,
            routineExerciseId: o.routineExerciseId,
            weekNumber,
            suggestedWeight: o.suggestedWeight ?? null,
            suggestedReps: o.suggestedReps ?? null,
            suggestedRpe: o.suggestedRpe ?? null,
            notes: o.notes ?? null,
          })),
        });
      }

      const [week, savedOverrides] = await Promise.all([
        tx.weeklyPlanWeek.findUniqueOrThrow({
          where: {
            studentRoutineId_weekNumber: { studentRoutineId: studentRoutine.id, weekNumber },
          },
        }),
        tx.weeklyExerciseOverride.findMany({
          where: { studentRoutineId: studentRoutine.id, weekNumber },
        }),
      ]);
      return { week, savedOverrides };
    });

    return {
      weekNumber,
      version: updated.week.version,
      overrides: updated.savedOverrides.map(toOverrideDto),
    };
  }

  static async copyWeekOverrides(
    trainerUserId: string,
    studentId: string,
    fromWeek: number,
    toWeek: number,
    version: number
  ) {
    const trainer = await this.getTrainer(trainerUserId);
    await this.getOwnedStudent(trainer.id, studentId);

    const studentRoutine = await this.getActiveStudentRoutine(studentId);

    const persistedWeeks = await prisma.weeklyPlanWeek.findMany({
      where: { studentRoutineId: studentRoutine.id, weekNumber: { in: [fromWeek, toWeek] } },
      select: { weekNumber: true },
    });
    const persistedWeekNumbers = new Set(persistedWeeks.map((week) => week.weekNumber));
    if (!persistedWeekNumbers.has(fromWeek) || !persistedWeekNumbers.has(toWeek)) {
      throw new AppError("Semana no encontrada", 404);
    }

    const sourceOverrides = await prisma.weeklyExerciseOverride.findMany({
      where: { studentRoutineId: studentRoutine.id, weekNumber: fromWeek },
    });

    const result = await prisma.$transaction(async (tx) => {
      const claimed = await tx.weeklyPlanWeek.updateMany({
        where: {
          studentRoutineId: studentRoutine.id,
          weekNumber: toWeek,
          version,
          studentRoutine: { isActive: true },
        },
        data: { version: { increment: 1 } },
      });
      if (claimed.count !== 1) {
        throw new AppError("La semana fue modificada por otra sesión", 409);
      }

      await tx.weeklyExerciseOverride.deleteMany({
        where: { studentRoutineId: studentRoutine.id, weekNumber: toWeek },
      });

      if (sourceOverrides.length > 0) {
        await tx.weeklyExerciseOverride.createMany({
          data: sourceOverrides.map((o) => ({
            studentRoutineId: studentRoutine.id,
            routineExerciseId: o.routineExerciseId,
            weekNumber: toWeek,
            suggestedWeight: o.suggestedWeight,
            suggestedReps: o.suggestedReps,
            suggestedRpe: o.suggestedRpe,
            notes: o.notes,
          })),
        });
      }

      const [week, savedOverrides] = await Promise.all([
        tx.weeklyPlanWeek.findUniqueOrThrow({
          where: {
            studentRoutineId_weekNumber: {
              studentRoutineId: studentRoutine.id,
              weekNumber: toWeek,
            },
          },
        }),
        tx.weeklyExerciseOverride.findMany({
          where: { studentRoutineId: studentRoutine.id, weekNumber: toWeek },
        }),
      ]);
      return { week, savedOverrides };
    });

    return {
      weekNumber: toWeek,
      version: result.week.version,
      overrides: result.savedOverrides.map(toOverrideDto),
    };
  }

  static async setActiveWeek(
    trainerUserId: string,
    studentId: string,
    weekNumber: number
  ) {
    const trainer = await this.getTrainer(trainerUserId);
    await this.getOwnedStudent(trainer.id, studentId);

    const studentRoutine = await this.getActiveStudentRoutine(studentId);

    const week = await prisma.weeklyPlanWeek.findUnique({
      where: {
        studentRoutineId_weekNumber: { studentRoutineId: studentRoutine.id, weekNumber },
      },
    });
    if (!week) throw new AppError("Semana no encontrada", 404);

    const updated = await prisma.studentRoutine.update({
      where: { id: studentRoutine.id },
      data: { weekNumber, startDate: week.startDate, endDate: week.endDate },
    });

    return {
      id: updated.id,
      studentId: updated.studentId,
      weekNumber: updated.weekNumber,
      isActive: updated.isActive,
    };
  }
}
