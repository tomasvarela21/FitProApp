import { WeeklyExerciseOverride } from "@prisma/client";
import { prisma } from "../../infrastructure/db/prisma";
import { AppError } from "../../shared/errors/app-error";

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
      where: { id: studentId, trainerId },
    });
    if (!student) throw new AppError("Alumno no encontrado", 404);
    return student;
  }

  private static async getActiveStudentRoutine(studentId: string) {
    const studentRoutine = await prisma.studentRoutine.findFirst({
      where: { studentId, isActive: true },
    });
    if (!studentRoutine) throw new AppError("El alumno no tiene una rutina activa", 404);
    return studentRoutine;
  }

  static async createWeeklyPlan(
    trainerUserId: string,
    studentId: string,
    data: CreateWeeklyPlanInput
  ) {
    const trainer = await this.getTrainer(trainerUserId);
    await this.getOwnedStudent(trainer.id, studentId);

    const routine = await prisma.routine.findUnique({ where: { id: data.routineId } });
    if (!routine) throw new AppError("Rutina no encontrada", 404);

    const week1 = data.weeks.find((w) => w.weekNumber === 1);

    const studentRoutine = await prisma.$transaction(async (tx) => {
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

    const allOverrides = await prisma.weeklyExerciseOverride.findMany({
      where: { studentRoutineId: studentRoutine.id },
      orderBy: [{ weekNumber: "asc" }],
    });

    const weekNumbers = [...new Set(allOverrides.map((o) => o.weekNumber))].sort((a, b) => a - b);

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
      weeks: weekNumbers.map((wn) => ({
        weekNumber: wn,
        overrides: allOverrides.filter((o) => o.weekNumber === wn).map(toOverrideDto),
      })),
    };
  }

  static async getWeeklyPlan(trainerUserId: string, studentId: string) {
    const trainer = await this.getTrainer(trainerUserId);
    await this.getOwnedStudent(trainer.id, studentId);

    const studentRoutine = await prisma.studentRoutine.findFirst({
      where: { studentId, isActive: true },
      include: {
        routine: {
          include: {
            routineExercises: {
              include: { exercise: { include: { muscleGroup: true, equipment: true } } },
              orderBy: { order: "asc" },
            },
          },
        },
        weeklyOverrides: { orderBy: [{ weekNumber: "asc" }] },
      },
    });

    if (!studentRoutine) throw new AppError("El alumno no tiene una rutina activa", 404);

    const weekNumbers = [
      ...new Set(studentRoutine.weeklyOverrides.map((o) => o.weekNumber)),
    ].sort((a, b) => a - b);

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
      weeks: weekNumbers.map((wn) => ({
        weekNumber: wn,
        startDate: wn === studentRoutine.weekNumber ? studentRoutine.startDate : null,
        endDate: wn === studentRoutine.weekNumber ? studentRoutine.endDate : null,
        overrides: studentRoutine.weeklyOverrides
          .filter((o) => o.weekNumber === wn)
          .map(toOverrideDto),
      })),
    };
  }

  static async updateWeekOverrides(
    trainerUserId: string,
    studentId: string,
    weekNumber: number,
    overrides: WeekOverrideInput[]
  ) {
    const trainer = await this.getTrainer(trainerUserId);
    await this.getOwnedStudent(trainer.id, studentId);

    const studentRoutine = await this.getActiveStudentRoutine(studentId);

    const updated = await prisma.$transaction(async (tx) => {
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

      return tx.weeklyExerciseOverride.findMany({
        where: { studentRoutineId: studentRoutine.id, weekNumber },
      });
    });

    return updated.map(toOverrideDto);
  }

  static async copyWeekOverrides(
    trainerUserId: string,
    studentId: string,
    fromWeek: number,
    toWeek: number
  ) {
    const trainer = await this.getTrainer(trainerUserId);
    await this.getOwnedStudent(trainer.id, studentId);

    const studentRoutine = await this.getActiveStudentRoutine(studentId);

    const sourceOverrides = await prisma.weeklyExerciseOverride.findMany({
      where: { studentRoutineId: studentRoutine.id, weekNumber: fromWeek },
    });

    const result = await prisma.$transaction(async (tx) => {
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

      return tx.weeklyExerciseOverride.findMany({
        where: { studentRoutineId: studentRoutine.id, weekNumber: toWeek },
      });
    });

    return result.map(toOverrideDto);
  }

  static async setActiveWeek(
    trainerUserId: string,
    studentId: string,
    weekNumber: number
  ) {
    const trainer = await this.getTrainer(trainerUserId);
    await this.getOwnedStudent(trainer.id, studentId);

    const studentRoutine = await this.getActiveStudentRoutine(studentId);

    const updated = await prisma.studentRoutine.update({
      where: { id: studentRoutine.id },
      data: { weekNumber },
    });

    return {
      id: updated.id,
      studentId: updated.studentId,
      weekNumber: updated.weekNumber,
      isActive: updated.isActive,
    };
  }
}
