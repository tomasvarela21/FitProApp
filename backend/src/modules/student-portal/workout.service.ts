import { Prisma, DayOfWeek } from "@prisma/client";
import { prisma } from "../../infrastructure/db/prisma";
import { AppError } from "../../shared/errors/app-error";

type WorkoutSetInput = {
  setNumber: number;
  reps: number;
  weight?: number | null;
  rpe?: number | null;
  notes?: string;
};

type RoutineExerciseLogInput = {
  routineExerciseId: string;
  sets: WorkoutSetInput[];
};

type LogWorkoutData = {
  routineExercises: RoutineExerciseLogInput[];
  notes?: string;
  date?: string;
};

const DAY_MAP: Record<number, string> = {
  0: "SUNDAY",
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY",
};

function getTodayDayOfWeek(): DayOfWeek {
  const days: DayOfWeek[] = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  return days[new Date().getDay()];
}

const routineExerciseInclude = {
  exercise: {
    include: {
      muscleGroup: true,
      equipment: true,
    },
  },
} satisfies Prisma.RoutineExerciseInclude;

const studentRoutineInclude = {
  routine: {
    include: {
      routineExercises: {
        include: {
          exercise: {
            include: {
              muscleGroup: true,
              equipment: true,
            },
          },
        },
        orderBy: { order: "asc" as const },
      },
    },
  },
} satisfies Prisma.StudentRoutineInclude;

type StudentRoutineWithRelations = Prisma.StudentRoutineGetPayload<{
  include: typeof studentRoutineInclude;
}>;

function toRoutineDto(sr: StudentRoutineWithRelations) {
  const routine = sr.routine;
  return {
    studentRoutineId: sr.id,
    assignedAt: sr.assignedAt,
    notes: sr.notes,
    routine: {
      id: routine.id,
      name: routine.name,
      description: routine.description,
      daysOfWeek: [...new Set(routine.routineExercises.map(re => re.dayOfWeek))],
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
    },
  };
}

export class WorkoutService {
  private static async getStudent(userId: string) {
    const student = await prisma.student.findFirst({ where: { userId } });
    if (!student) throw new AppError("Alumno no encontrado", 404);
    return student;
  }

  static async getMyRoutine(userId: string) {
    const student = await this.getStudent(userId);

    const studentRoutine = await prisma.studentRoutine.findFirst({
      where: { studentId: student.id, isActive: true },
      include: studentRoutineInclude,
    });

    if (!studentRoutine) return null;

    return toRoutineDto(studentRoutine);
  }

  static async getTodayWorkout(userId: string) {
    const student = await this.getStudent(userId);

    const studentRoutine = await prisma.studentRoutine.findFirst({
      where: { studentId: student.id, isActive: true },
      include: {
        routine: {
          include: {
            routineExercises: {
              where: { dayOfWeek: getTodayDayOfWeek() },
              include: routineExerciseInclude,
              orderBy: { order: "asc" },
            },
          },
        },
      },
    }) as StudentRoutineWithRelations | null;

    if (!studentRoutine) return null;

    const todayExercises = studentRoutine.routine.routineExercises;
    if (todayExercises.length === 0) return null;

    return toRoutineDto(studentRoutine);
  }

  static async logWorkout(userId: string, data: LogWorkoutData) {
    const student = await this.getStudent(userId);

    const studentRoutine = await prisma.studentRoutine.findFirst({
      where: { studentId: student.id, isActive: true },
    });
    if (!studentRoutine) throw new AppError("No tienes una rutina activa asignada", 404);

    const workoutLog = await prisma.$transaction(async (tx) => {
      const log = await tx.workoutLog.create({
        data: {
          studentRoutineId: studentRoutine.id,
          date: data.date ? new Date(data.date) : new Date(),
          notes: data.notes,
        },
      });

      for (const exerciseData of data.routineExercises) {
        await tx.workoutSet.createMany({
          data: exerciseData.sets.map((s) => ({
            workoutLogId: log.id,
            routineExerciseId: exerciseData.routineExerciseId,
            setNumber: s.setNumber,
            reps: s.reps,
            weight: s.weight ?? null,
            rpe: s.rpe ?? null,
            notes: s.notes,
          })),
        });
      }

      return log;
    });

    return { id: workoutLog.id, date: workoutLog.date };
  }

  static async getMyWorkoutHistory(userId: string) {
    const student = await this.getStudent(userId);

    const logs = await prisma.workoutLog.findMany({
      where: { studentRoutine: { studentId: student.id } },
      include: {
        workoutSets: {
          include: {
            routineExercise: {
              include: { exercise: { include: { muscleGroup: true } } },
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
          muscleGroup: s.routineExercise.exercise.muscleGroup
            ? { name: s.routineExercise.exercise.muscleGroup.name }
            : null,
        },
      })),
    }));
  }

  static async getMyProgress(userId: string, exerciseId: string) {
    const student = await this.getStudent(userId);

    const workoutSets = await prisma.workoutSet.findMany({
      where: {
        workoutLog: { studentRoutine: { studentId: student.id } },
        routineExercise: { exerciseId },
      },
      include: {
        workoutLog: { select: { date: true } },
      },
      orderBy: { workoutLog: { date: "asc" } },
    });

    const sessionMap = new Map<
      string,
      { date: Date; maxWeight: number | null; rpeValues: number[]; totalSets: number }
    >();

    for (const set of workoutSets) {
      const dateKey = set.workoutLog.date.toISOString().split("T")[0];
      if (!sessionMap.has(dateKey)) {
        sessionMap.set(dateKey, { date: set.workoutLog.date, maxWeight: null, rpeValues: [], totalSets: 0 });
      }
      const session = sessionMap.get(dateKey)!;
      session.totalSets++;
      if (set.weight !== null && (session.maxWeight === null || set.weight > session.maxWeight)) {
        session.maxWeight = set.weight;
      }
      if (set.rpe !== null) {
        session.rpeValues.push(set.rpe);
      }
    }

    return Array.from(sessionMap.values()).map((session) => ({
      date: session.date,
      maxWeight: session.maxWeight,
      avgRpe:
        session.rpeValues.length > 0
          ? Math.round((session.rpeValues.reduce((a, b) => a + b, 0) / session.rpeValues.length) * 10) / 10
          : null,
      totalSets: session.totalSets,
    }));
  }
}
