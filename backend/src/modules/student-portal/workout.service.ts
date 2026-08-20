import { Prisma, DayOfWeek } from "@prisma/client";
import { prisma } from "../../infrastructure/db/prisma";
import { AppError } from "../../shared/errors/app-error";
import { NotificationService } from "../notifications/notifications.service";

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

async function applyWeekOverrides(sr: StudentRoutineWithRelations) {
  const overrides = await prisma.weeklyExerciseOverride.findMany({
    where: { studentRoutineId: sr.id, weekNumber: sr.weekNumber },
  });
  const overrideMap = new Map(overrides.map((o) => [o.routineExerciseId, o]));
  return overrideMap;
}

function toRoutineDto(
  sr: StudentRoutineWithRelations,
  overrideMap: Map<string, { suggestedWeight: number | null; suggestedReps: string | null; suggestedRpe: number | null }>
) {
  const routine = sr.routine;
  return {
    studentRoutineId: sr.id,
    assignedAt: sr.assignedAt,
    notes: sr.notes,
    weekNumber: sr.weekNumber,
    routine: {
      id: routine.id,
      name: routine.name,
      description: routine.description,
      daysOfWeek: [...new Set(routine.routineExercises.map(re => re.dayOfWeek))],
      routineExercises: routine.routineExercises.map((re) => {
        const override = overrideMap.get(re.id);
        return {
          id: re.id,
          dayOfWeek: re.dayOfWeek,
          order: re.order,
          sets: re.sets,
          reps: override?.suggestedReps ?? re.reps,
          suggestedWeight: override?.suggestedWeight ?? re.suggestedWeight,
          suggestedRpe: override?.suggestedRpe ?? re.suggestedRpe,
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
        };
      }),
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

    const overrideMap = await applyWeekOverrides(studentRoutine);
    return toRoutineDto(studentRoutine, overrideMap);
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

    const overrideMap = await applyWeekOverrides(studentRoutine);
    return toRoutineDto(studentRoutine, overrideMap);
  }

  static async logWorkout(userId: string, data: LogWorkoutData) {
    const student = await prisma.student.findFirst({
      where: { userId },
      include: {
        trainer: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!student) throw new AppError("Alumno no encontrado", 404);

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

    // Notify trainer
    if (student.trainer?.user) {
      NotificationService.sendNotification(student.trainer.userId, {
        title: "Rutina completada 🏃‍♂️",
        body: `${student.firstName} ${student.lastName} completó su entrenamiento de hoy.`,
        data: { type: "ROUTINE_COMPLETED", studentId: student.id },
      }).catch((err) => {
        console.error("[WorkoutService] Error enviando notificación push:", err);
      });
    }

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

  static async getMyStreak(userId: string, todayStr?: string) {
    const student = await this.getStudent(userId);

    const logs = await prisma.workoutLog.findMany({
      where: { studentRoutine: { studentId: student.id } },
      select: { date: true },
      orderBy: { date: "desc" },
    });

    const today = todayStr ?? new Date().toISOString().split("T")[0];

    if (logs.length === 0) {
      return { streak: 0, lastWorkoutDate: null, trainedToday: false };
    }

    const uniqueDates = [
      ...new Set(logs.map((l) => l.date.toISOString().split("T")[0])),
    ].sort((a, b) => b.localeCompare(a));

    const mostRecent = uniqueDates[0];
    const trainedToday = mostRecent === today;

    // Compute yesterday string
    const d = new Date(today + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() - 1);
    const yesterday = d.toISOString().split("T")[0];

    // Streak is broken if the most recent workout is older than yesterday
    if (mostRecent !== today && mostRecent !== yesterday) {
      return { streak: 0, lastWorkoutDate: mostRecent, trainedToday: false };
    }

    let streak = 0;
    let expected = mostRecent;

    for (const dateStr of uniqueDates) {
      if (dateStr === expected) {
        streak++;
        const next = new Date(expected + "T12:00:00Z");
        next.setUTCDate(next.getUTCDate() - 1);
        expected = next.toISOString().split("T")[0];
      } else {
        break;
      }
    }

    return { streak, lastWorkoutDate: mostRecent, trainedToday };
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
