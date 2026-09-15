import { Prisma, DayOfWeek } from "@prisma/client";
import { createHash } from "node:crypto";
import { prisma } from "../../infrastructure/db/prisma";
import { AppError } from "../../shared/errors/app-error";
import { NotificationService } from "../notifications/notifications.service";
import { computeStreak } from "../../shared/utils/streak";

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
        where: { archivedAt: null, exercise: { archivedAt: null } },
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

type LastSet = { setNumber: number; reps: number; weight: number | null; rpe: number | null };

function toRoutineDto(
  sr: StudentRoutineWithRelations,
  overrideMap: Map<string, {
    suggestedWeight: number | null;
    suggestedReps: string | null;
    suggestedRpe: number | null;
    notes: string | null;
  }>,
  lastSetsMap?: Map<string, LastSet[]>
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
          notes: override?.notes ?? re.notes,
          lastSets: lastSetsMap?.get(re.id) ?? null,
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
    const student = await prisma.student.findFirst({ where: { userId, deletedAt: null } });
    if (!student) throw new AppError("Alumno no encontrado", 404);
    return student;
  }

  static async getMyRoutine(userId: string) {
    const student = await this.getStudent(userId);

    const studentRoutine = await prisma.studentRoutine.findFirst({
      where: { studentId: student.id, isActive: true, routine: { archivedAt: null } },
      include: studentRoutineInclude,
    });

    if (!studentRoutine) return null;

    const overrideMap = await applyWeekOverrides(studentRoutine);
    return toRoutineDto(studentRoutine, overrideMap);
  }

  static async getTodayWorkout(userId: string) {
    const student = await this.getStudent(userId);

    const studentRoutine = await prisma.studentRoutine.findFirst({
      where: { studentId: student.id, isActive: true, routine: { archivedAt: null } },
      include: {
        routine: {
          include: {
            routineExercises: {
              where: {
                dayOfWeek: getTodayDayOfWeek(),
                archivedAt: null,
                exercise: { archivedAt: null },
              },
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

    const todayExerciseIds = todayExercises.map((re) => re.id);
    const lastLog = await prisma.workoutLog.findFirst({
      where: {
        studentRoutine: { studentId: student.id },
        workoutSets: { some: { routineExerciseId: { in: todayExerciseIds } } },
      },
      orderBy: { date: "desc" },
      include: {
        workoutSets: {
          where: { routineExerciseId: { in: todayExerciseIds } },
          orderBy: { setNumber: "asc" },
          select: { routineExerciseId: true, setNumber: true, reps: true, weight: true, rpe: true },
        },
      },
    });

    const lastSetsMap = new Map<string, LastSet[]>();
    if (lastLog) {
      for (const set of lastLog.workoutSets) {
        if (!lastSetsMap.has(set.routineExerciseId)) {
          lastSetsMap.set(set.routineExerciseId, []);
        }
        lastSetsMap.get(set.routineExerciseId)!.push({
          setNumber: set.setNumber,
          reps: set.reps,
          weight: set.weight,
          rpe: set.rpe,
        });
      }
    }

    const overrideMap = await applyWeekOverrides(studentRoutine);
    return toRoutineDto(studentRoutine, overrideMap, lastSetsMap);
  }

  static async logWorkout(userId: string, idempotencyKey: string, data: LogWorkoutData) {
    const student = await prisma.student.findFirst({
      where: { userId, deletedAt: null },
      include: {
        trainer: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!student) throw new AppError("Alumno no encontrado", 404);

    const idempotencyHash = createHash("sha256")
      .update(JSON.stringify(data))
      .digest("hex");
    const existingLog = await prisma.workoutLog.findFirst({
      where: { studentId: student.id, idempotencyKey },
      select: { id: true, date: true, idempotencyHash: true },
    });
    if (existingLog) {
      if (existingLog.idempotencyHash !== idempotencyHash) {
        throw new AppError("La clave de idempotencia ya fue utilizada con otros datos", 409);
      }
      return { id: existingLog.id, date: existingLog.date };
    }

    const studentRoutine = await prisma.studentRoutine.findFirst({
      where: { studentId: student.id, isActive: true, routine: { archivedAt: null } },
      include: { routine: { select: { id: true, name: true } } },
    });
    if (!studentRoutine) throw new AppError("No tienes una rutina activa asignada", 404);

    let workoutLog: { id: string; date: Date };
    let created = false;
    try {
      workoutLog = await prisma.$transaction(async (tx) => {
        const routineExerciseIds = [
          ...new Set(data.routineExercises.map((exercise) => exercise.routineExerciseId)),
        ];
        const validExercises = await tx.routineExercise.findMany({
          where: {
            id: { in: routineExerciseIds },
            routineId: studentRoutine.routineId,
            archivedAt: null,
            exercise: { archivedAt: null },
          },
          include: { exercise: { include: { muscleGroup: true } } },
        });
        if (validExercises.length !== routineExerciseIds.length) {
          throw new AppError("Ejercicio de rutina no encontrado", 404);
        }
        const exerciseById = new Map(validExercises.map((exercise) => [exercise.id, exercise]));

        const log = await tx.workoutLog.create({
          data: {
            studentId: student.id,
            studentRoutineId: studentRoutine.id,
            routineId: studentRoutine.routine.id,
            routineName: studentRoutine.routine.name,
            idempotencyKey,
            idempotencyHash,
            date: data.date ? new Date(data.date) : new Date(),
            notes: data.notes,
          },
        });

        for (const exerciseData of data.routineExercises) {
          const routineExercise = exerciseById.get(exerciseData.routineExerciseId)!;
          await tx.workoutSet.createMany({
            data: exerciseData.sets.map((s) => ({
              workoutLogId: log.id,
              routineExerciseId: exerciseData.routineExerciseId,
              exerciseId: routineExercise.exercise.id,
              exerciseName: routineExercise.exercise.name,
              exerciseOrder: routineExercise.order,
              exerciseMuscleGroupName: routineExercise.exercise.muscleGroup?.name ?? null,
              routineDayOfWeek: routineExercise.dayOfWeek,
              prescribedSets: routineExercise.sets,
              prescribedReps: routineExercise.reps,
              prescribedWeight: routineExercise.suggestedWeight,
              prescribedRpe: routineExercise.suggestedRpe,
              prescribedRestSeconds: routineExercise.restSeconds,
              prescribedNotes: routineExercise.notes,
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
      created = true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const replay = await prisma.workoutLog.findFirst({
          where: { studentId: student.id, idempotencyKey },
          select: { id: true, date: true, idempotencyHash: true },
        });
        if (replay) {
          if (replay.idempotencyHash !== idempotencyHash) {
            throw new AppError("La clave de idempotencia ya fue utilizada con otros datos", 409);
          }
          workoutLog = replay;
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }

    // Notify trainer
    if (created && student.trainer?.user) {
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

  static async getMyStreak(userId: string, todayStr?: string) {
    const student = await this.getStudent(userId);

    const logs = await prisma.workoutLog.findMany({
      where: { studentRoutine: { studentId: student.id } },
      select: { date: true },
      orderBy: { date: "desc" },
      take: 90,
    });

    const today = todayStr ?? new Date().toISOString().split("T")[0];
    const datestrs = logs.map((l) => l.date.toISOString().split("T")[0]);
    return computeStreak(datestrs, today);
  }

  static async getMyProgress(userId: string, exerciseId: string) {
    const student = await this.getStudent(userId);

    const workoutSets = await prisma.workoutSet.findMany({
      where: {
        workoutLog: { studentRoutine: { studentId: student.id } },
        exerciseId,
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
