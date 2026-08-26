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
    const now = new Date();
    const eightMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 7, 1);

    const student = await prisma.student.findFirst({
      where: { id: studentId, trainer: { userId: trainerUserId } },
    });

    const subscription = await prisma.subscription.findFirst({
      where: { studentId, status: { in: ["ACTIVE", "EXPIRED"] } },
      include: { plan: true, installments: { orderBy: { number: "asc" } } },
      orderBy: { createdAt: "desc" },
    });

    const workoutHistory = await prisma.workoutLog.findMany({
      where: { studentRoutine: { studentId } },
      include: workoutLogInclude,
      orderBy: { date: "desc" },
      take: 10,
    });

    const allRecentLogs = await prisma.workoutLog.findMany({
      where: { studentRoutine: { studentId }, date: { gte: eightMonthsAgo } },
      select: { date: true },
      orderBy: { date: "asc" },
    });

    const totalSessionsCount = await prisma.workoutLog.count({
      where: { studentRoutine: { studentId } },
    });

    const firstWeightSet = await prisma.workoutSet.findFirst({
      where: { workoutLog: { studentRoutine: { studentId } }, weight: { not: null } },
      orderBy: { workoutLog: { date: "asc" } },
      select: { weight: true },
    });

    const latestWeightSets = await prisma.workoutSet.findMany({
      where: { workoutLog: { studentRoutine: { studentId } }, weight: { not: null } },
      orderBy: { workoutLog: { date: "desc" } },
      take: 30,
      select: { weight: true },
    });

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

    // Sessions by month
    const sessionsByMonth: Record<string, number> = {};
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      sessionsByMonth[key] = 0;
    }
    for (const log of allRecentLogs) {
      const key = `${log.date.getFullYear()}-${String(log.date.getMonth() + 1).padStart(2, "0")}`;
      if (key in sessionsByMonth) sessionsByMonth[key]++;
    }

    // Strength progress
    const firstWeight = firstWeightSet?.weight ?? null;
    const latestMaxWeight = latestWeightSets.length > 0
      ? Math.max(...latestWeightSets.map((s) => Number(s.weight)))
      : null;
    const strengthProgressPct =
      firstWeight && latestMaxWeight && firstWeight > 0
        ? Math.round(((latestMaxWeight - Number(firstWeight)) / Number(firstWeight)) * 100)
        : null;

    // Months active
    const activatedDate = student.activatedAt;
    const monthsActive = activatedDate
      ? Math.max(
          1,
          (now.getFullYear() - activatedDate.getFullYear()) * 12 +
            now.getMonth() - activatedDate.getMonth()
        )
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
      workoutHistory: workoutHistory.map(mapWorkoutLog),
      totalSessionsCount,
      sessionsByMonth,
      strengthProgressPct,
      monthsActive,
    };
  }
}
