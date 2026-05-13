import { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/db/prisma";
import { AppError } from "../../shared/errors/app-error";

// ─── Mappers ──────────────────────────────────────────────────────────────────

type SubscriptionWithRelations = Prisma.SubscriptionGetPayload<{
  include: { plan: true; installments: { orderBy: { number: "asc" } } };
}>;

function mapSubscription(sub: SubscriptionWithRelations) {
  const now = new Date();
  const totalAmount = Number(sub.totalAmount);
  const paidAmount = sub.installments
    .filter((i) => i.status === "PAID")
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const nextInstallment =
    sub.installments.find((i) => i.status === "PENDING" || i.status === "OVERDUE") ?? null;

  return {
    id: sub.id,
    planName: sub.plan.name,
    planDuration: sub.plan.duration,
    frequency: sub.frequency,
    totalAmount,
    installmentCount: sub.installmentCount,
    paidAmount,
    pendingAmount: totalAmount - paidAmount,
    status: sub.status,
    startDate: sub.startDate,
    endDate: sub.endDate,
    daysUntilExpiry: Math.ceil(
      (sub.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    ),
    nextInstallment: nextInstallment
      ? {
          id: nextInstallment.id,
          number: nextInstallment.number,
          amount: Number(nextInstallment.amount),
          dueDate: nextInstallment.dueDate,
          status: nextInstallment.status,
        }
      : null,
    installments: sub.installments.map((i) => ({
      id: i.id,
      number: i.number,
      amount: Number(i.amount),
      dueDate: i.dueDate,
      paidAt: i.paidAt,
      status: i.status,
      notes: i.notes,
    })),
  };
}

const studentRoutineInclude = {
  routine: {
    include: {
      routineExercises: {
        include: {
          exercise: {
            include: { muscleGroup: true, equipment: true },
          },
        },
        orderBy: { order: "asc" as const },
      },
    },
  },
} satisfies Prisma.StudentRoutineInclude;

type StudentRoutineWithRoutine = Prisma.StudentRoutineGetPayload<{
  include: typeof studentRoutineInclude;
}>;

function mapStudentRoutine(sr: StudentRoutineWithRoutine) {
  return {
    id: sr.id,
    assignedAt: sr.assignedAt,
    notes: sr.notes,
    weekNumber: sr.weekNumber,
    startDate: sr.startDate,
    endDate: sr.endDate,
    routine: {
      id: sr.routine.id,
      name: sr.routine.name,
      description: sr.routine.description,
      isGlobal: sr.routine.isGlobal,
      routineExercises: sr.routine.routineExercises.map((re) => ({
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

const workoutLogInclude = {
  workoutSets: {
    include: {
      routineExercise: {
        include: { exercise: true },
      },
    },
    orderBy: [
      { routineExerciseId: "asc" as const },
      { setNumber: "asc" as const },
    ],
  },
} satisfies Prisma.WorkoutLogInclude;

type WorkoutLogWithSets = Prisma.WorkoutLogGetPayload<{
  include: typeof workoutLogInclude;
}>;

function mapWorkoutLog(log: WorkoutLogWithSets) {
  return {
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
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class StudentSummaryService {
  static async getStudentSummary(trainerUserId: string, studentId: string) {
    const [student, subscription, studentRoutine, workoutHistory, routineWithOverrides] =
      await Promise.all([
        prisma.student.findFirst({
          where: { id: studentId, trainer: { userId: trainerUserId } },
        }),
        prisma.subscription.findFirst({
          where: { studentId, status: { in: ["ACTIVE", "EXPIRED"] } },
          include: {
            plan: true,
            installments: { orderBy: { number: "asc" } },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.studentRoutine.findFirst({
          where: { studentId, isActive: true },
          include: studentRoutineInclude,
        }),
        prisma.workoutLog.findMany({
          where: { studentRoutine: { studentId } },
          include: workoutLogInclude,
          orderBy: { date: "desc" },
          take: 10,
        }),
        prisma.studentRoutine.findFirst({
          where: { studentId, isActive: true },
          include: { weeklyOverrides: { orderBy: [{ weekNumber: "asc" }] } },
        }),
      ]);

    if (!student) throw new AppError("Alumno no encontrado", 404);

    // Mark overdue installments inline (no extra round-trip)
    if (subscription) {
      const now = new Date();
      const overdueIds = subscription.installments
        .filter((i) => i.status === "PENDING" && i.dueDate < now)
        .map((i) => i.id);

      if (overdueIds.length > 0) {
        // Fire-and-forget — doesn't block the response
        prisma.installment
          .updateMany({ where: { id: { in: overdueIds } }, data: { status: "OVERDUE" } })
          .catch(() => undefined);
        overdueIds.forEach((id) => {
          const inst = subscription.installments.find((i) => i.id === id);
          if (inst) inst.status = "OVERDUE";
        });
      }
    }

    // Map weekly plan from the overrides query
    const weeklyPlan = routineWithOverrides
      ? (() => {
          const overrides = routineWithOverrides.weeklyOverrides;
          const weekNumbers = [...new Set(overrides.map((o) => o.weekNumber))].sort(
            (a, b) => a - b
          );
          return {
            studentRoutineId: routineWithOverrides.id,
            weekNumber: routineWithOverrides.weekNumber,
            startDate: routineWithOverrides.startDate,
            endDate: routineWithOverrides.endDate,
            weeks: weekNumbers.map((wn) => ({
              weekNumber: wn,
              overrides: overrides
                .filter((o) => o.weekNumber === wn)
                .map((o) => ({
                  id: o.id,
                  routineExerciseId: o.routineExerciseId,
                  weekNumber: o.weekNumber,
                  suggestedWeight: o.suggestedWeight,
                  suggestedReps: o.suggestedReps,
                  suggestedRpe: o.suggestedRpe,
                  notes: o.notes,
                })),
            })),
          };
        })()
      : null;

    return {
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        phone: student.phone,
        status: student.status,
        invitedAt: student.invitedAt,
        activatedAt: student.activatedAt,
        createdAt: student.createdAt,
      },
      subscription: subscription ? mapSubscription(subscription) : null,
      studentRoutine: studentRoutine ? mapStudentRoutine(studentRoutine) : null,
      workoutHistory: workoutHistory.map(mapWorkoutLog),
      weeklyPlan,
    };
  }
}
