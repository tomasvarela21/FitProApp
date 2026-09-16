import { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/db/prisma";
import { AppError } from "../../shared/errors/app-error";
import { hashPassword } from "../../shared/utils/hash";
import { TrainersMapper } from "./trainers.mapper";
import { CreateTrainerInput, ListSubscriptionsQueryInput } from "./trainers.schema";

const DASHBOARD_RECENT_LIMIT = 5;

type SubscriptionListRow = {
  subscriptionId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentStatus: string;
  planName: string;
  startDate: Date;
  endDate: Date;
  totalAmount: Prisma.Decimal;
  installmentCount: number;
  frequency: string;
  subscriptionStatus: string;
  paymentStatus: string;
  paidCount: number;
  overdueCount: number;
  pendingCount: number;
  nextDueDate: Date | null;
  nextAmount: Prisma.Decimal | null;
  totalRows: number;
};

type DashboardInstallmentRow = {
  subscriptionId: string;
  installmentId: string;
  studentId: string;
  studentFirstName: string;
  studentLastName: string;
  planName: string;
  installmentNumber: number;
  amount: Prisma.Decimal;
  dueDate: Date;
};

type DashboardInactiveRow = {
  category: "7" | "14";
  id: string;
  firstName: string;
  lastName: string;
  lastWorkoutDate: Date | null;
};

export class TrainersService {
  static async createTrainer(data: CreateTrainerInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new AppError("Ya existe un usuario con ese email", 409);
    }

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: "TRAINER",
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
        trainer: {
          create: {
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
          },
        },
      },
      include: {
        trainer: true,
      },
    });

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      trainer: user.trainer,
    };
  }

  static async getDashboardSummary(trainerUserId: string) {
    const trainer = await prisma.trainer.findUnique({
      where: { userId: trainerUserId },
    });

    if (!trainer) {
      throw new AppError("El entrenador autenticado no existe", 404);
    }

    const baseWhere = { trainerId: trainer.id, deletedAt: null };
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Todas las queries independientes en paralelo
    const [
      statusCounts,
      recentStudents,
      weeklySessionsCount,
      prevWeekSessionsCount,
      newStudentsThisMonth,
      overdueInstallments,
      expiringSoonInstallments,
      studentsWithoutRoutineRaw,
      studentsWithRoutine,
    ] = await Promise.all([
      prisma.student.groupBy({
        by: ["status"],
        where: baseWhere,
        _count: { id: true },
      }),
      prisma.student.findMany({
        where: baseWhere,
        orderBy: { createdAt: "desc" },
        take: DASHBOARD_RECENT_LIMIT,
      }),
      prisma.workoutLog.count({
        where: { date: { gte: weekAgo }, studentRoutine: { student: { trainerId: trainer.id } } },
      }),
      prisma.workoutLog.count({
        where: { date: { gte: twoWeeksAgo, lt: weekAgo }, studentRoutine: { student: { trainerId: trainer.id } } },
      }),
      prisma.student.count({ where: { ...baseWhere, createdAt: { gte: monthStart } } }),
      prisma.$queryRaw<DashboardInstallmentRow[]>(Prisma.sql`
        SELECT selected.*
        FROM (
          SELECT DISTINCT ON (subscription."studentId")
            subscription."id" AS "subscriptionId",
            installment."id" AS "installmentId",
            subscription."studentId",
            student."firstName" AS "studentFirstName",
            student."lastName" AS "studentLastName",
            subscription."planName",
            installment."number" AS "installmentNumber",
            installment."amount",
            installment."dueDate"
          FROM "Installment" installment
          INNER JOIN "Subscription" subscription ON subscription."id" = installment."subscriptionId"
          INNER JOIN "Student" student ON student."id" = subscription."studentId"
          WHERE installment."trainerId" = ${trainer.id}
            AND installment."status" IN ('OVERDUE', 'PENDING')
            AND installment."dueDate" < ${now}
          ORDER BY subscription."studentId", installment."dueDate" ASC, installment."id" ASC
        ) selected
        ORDER BY selected."dueDate" ASC, selected."installmentId" ASC
      `),
      prisma.$queryRaw<DashboardInstallmentRow[]>(Prisma.sql`
        SELECT selected.*
        FROM (
          SELECT DISTINCT ON (subscription."studentId")
            subscription."id" AS "subscriptionId",
            installment."id" AS "installmentId",
            subscription."studentId",
            student."firstName" AS "studentFirstName",
            student."lastName" AS "studentLastName",
            subscription."planName",
            installment."number" AS "installmentNumber",
            installment."amount",
            installment."dueDate"
          FROM "Installment" installment
          INNER JOIN "Subscription" subscription ON subscription."id" = installment."subscriptionId"
          INNER JOIN "Student" student ON student."id" = subscription."studentId"
          WHERE installment."trainerId" = ${trainer.id}
            AND installment."status" = 'PENDING'
            AND installment."dueDate" >= ${now}
            AND installment."dueDate" <= ${in7Days}
          ORDER BY subscription."studentId", installment."dueDate" ASC, installment."id" ASC
        ) selected
        ORDER BY selected."dueDate" ASC, selected."installmentId" ASC
      `),
      prisma.student.findMany({
        where: {
          trainerId: trainer.id,
          status: "ACTIVE",
          deletedAt: null,
          studentRoutines: { none: { isActive: true } },
        },
        select: { id: true, firstName: true, lastName: true },
        take: 5,
      }),
      prisma.$queryRaw<DashboardInactiveRow[]>(Prisma.sql`
        WITH candidates AS MATERIALIZED (
          SELECT
            student."id",
            student."firstName",
            student."lastName",
            latest_workout."date" AS "lastWorkoutDate"
          FROM "Student" student
          INNER JOIN "StudentRoutine" assignment
            ON assignment."studentId" = student."id" AND assignment."isActive" = true
          LEFT JOIN LATERAL (
            SELECT workout."date"
            FROM "WorkoutLog" workout
            WHERE workout."studentRoutineId" = assignment."id"
            ORDER BY workout."date" DESC
            LIMIT 1
          ) latest_workout ON true
          WHERE student."trainerId" = ${trainer.id}
            AND student."status" = 'ACTIVE'
            AND student."deletedAt" IS NULL
        ),
        categorized AS (
          SELECT '7'::text AS category, candidates.*
          FROM candidates
          WHERE candidates."lastWorkoutDate" IS NULL OR candidates."lastWorkoutDate" < ${weekAgo}
          UNION ALL
          SELECT '14'::text AS category, candidates.*
          FROM candidates
          WHERE candidates."lastWorkoutDate" IS NULL OR candidates."lastWorkoutDate" < ${twoWeeksAgo}
        ),
        ranked AS (
          SELECT categorized.*,
            ROW_NUMBER() OVER (PARTITION BY category ORDER BY "id" ASC) AS row_number
          FROM categorized
        )
        SELECT category, "id", "firstName", "lastName", "lastWorkoutDate"
        FROM ranked
        WHERE row_number <= 5
        ORDER BY category, row_number
      `),
    ]);

    const countByStatus = (status: string) =>
      statusCounts.find((s) => s.status === status)?._count.id ?? 0;
    const total = statusCounts.reduce((acc, s) => acc + s._count.id, 0);
    const active = countByStatus("ACTIVE");
    const invited = countByStatus("INVITED");
    const paused = countByStatus("PAUSED");
    const inactive = countByStatus("INACTIVE");

    const expiredAlerts = overdueInstallments.map((installment) => ({
        subscriptionId: installment.subscriptionId,
        installmentId: installment.installmentId,
        studentId: installment.studentId,
        studentName: `${installment.studentFirstName} ${installment.studentLastName}`,
        planName: installment.planName,
        installmentNumber: installment.installmentNumber,
        amount: Number(installment.amount),
        endDate: installment.dueDate,
        daysUntilExpiry: Math.floor(
          (installment.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        ),
      }));

    const expiringSoonAlerts = expiringSoonInstallments.map((installment) => ({
        subscriptionId: installment.subscriptionId,
        installmentId: installment.installmentId,
        studentId: installment.studentId,
        studentName: `${installment.studentFirstName} ${installment.studentLastName}`,
        planName: installment.planName,
        installmentNumber: installment.installmentNumber,
        amount: Number(installment.amount),
        endDate: installment.dueDate,
        daysUntilExpiry: Math.ceil(
          (installment.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        ),
      }));

    const noWorkoutLast7 = studentsWithRoutine.filter((student) => student.category === "7");
    const noWorkoutLast14 = studentsWithRoutine.filter((student) => student.category === "14");

    const retentionRate = total > 0 ? Math.round((active / total) * 100) : 0;
    const activePercentage = total > 0 ? Math.round((active / total) * 100) : 0;
    const weeklySessionsDelta = weeklySessionsCount - prevWeekSessionsCount;

    return {
      stats: {
        total, active, invited, paused, inactive, retentionRate,
        activePercentage,
        weeklySessionsCount,
        weeklySessionsDelta,
        newStudentsThisMonth,
      },
      recentStudents: recentStudents.map(TrainersMapper.toDashboardStudent),
      alerts: {
        expired: expiredAlerts,
        expiringSoon: expiringSoonAlerts,
      },
      inactivity: {
        withoutRoutine: studentsWithoutRoutineRaw.map((s) => ({
          id: s.id,
          name: `${s.firstName} ${s.lastName}`,
        })),
        noWorkoutLast7: noWorkoutLast7.map((s) => ({
          id: s.id,
          name: `${s.firstName} ${s.lastName}`,
          lastWorkoutDate: s.lastWorkoutDate,
        })),
        noWorkoutLast14: noWorkoutLast14.map((s) => ({
          id: s.id,
          name: `${s.firstName} ${s.lastName}`,
          lastWorkoutDate: s.lastWorkoutDate,
        })),
      },
    };
  }

  static async getProfile(trainerUserId: string) {
    const trainer = await prisma.trainer.findUnique({
      where: { userId: trainerUserId },
      include: { user: true },
    });

    if (!trainer) {
      throw new AppError("El entrenador autenticado no existe", 404);
    }

    return {
      id: trainer.id,
      firstName: trainer.firstName,
      lastName: trainer.lastName,
      phone: trainer.phone,
      email: trainer.user.email,
      createdAt: trainer.createdAt,
    };
  }

  static async updateProfile(
    trainerUserId: string,
    data: { firstName?: string; lastName?: string; phone?: string }
  ) {
    const trainer = await prisma.trainer.findUnique({
      where: { userId: trainerUserId },
    });

    if (!trainer) {
      throw new AppError("El entrenador autenticado no existe", 404);
    }

    const updated = await prisma.trainer.update({
      where: { id: trainer.id },
      data: {
        ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
        ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
      },
    });

    return {
      id: updated.id,
      firstName: updated.firstName,
      lastName: updated.lastName,
      phone: updated.phone,
    };
  }

  static async listSubscriptions(trainerUserId: string, query: ListSubscriptionsQueryInput) {
    const trainer = await prisma.trainer.findUnique({ where: { userId: trainerUserId } });
    if (!trainer) throw new AppError("Entrenador no encontrado", 404);

    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const search = query.search?.trim();

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const escapedSearch = search?.replace(/[\\%_]/g, "\\$&");
    const searchFilter = escapedSearch
      ? Prisma.sql`AND (
          student."firstName" ILIKE ${`%${escapedSearch}%`} ESCAPE '\\'
          OR student."lastName" ILIKE ${`%${escapedSearch}%`} ESCAPE '\\'
        )`
      : Prisma.empty;
    const statusFilter = query.status && query.status !== "ALL"
      ? Prisma.sql`WHERE metrics."paymentStatus" = ${query.status}`
      : Prisma.empty;

    const metricsQuery = Prisma.sql`
      SELECT
        subscription."id" AS "subscriptionId",
        student."id" AS "studentId",
        CONCAT(student."firstName", ' ', student."lastName") AS "studentName",
        student."email" AS "studentEmail",
        student."status"::text AS "studentStatus",
        subscription."planName",
        subscription."startDate",
        subscription."endDate",
        subscription."totalAmount",
        subscription."installmentCount",
        subscription."frequency"::text AS "frequency",
        CASE
          WHEN subscription."status" = 'ACTIVE' AND subscription."endDate" < ${now}
            THEN 'EXPIRED'
          ELSE subscription."status"::text
        END AS "subscriptionStatus",
        CASE
          WHEN installment_metrics."overdueCount" > 0 THEN 'OVERDUE'
          WHEN installment_metrics."expiringSoonCount" > 0 THEN 'EXPIRING_SOON'
          WHEN installment_metrics."installmentTotal" > 0
            AND installment_metrics."paidCount" = installment_metrics."installmentTotal" THEN 'PAID'
          ELSE 'ACTIVE'
        END AS "paymentStatus",
        installment_metrics."paidCount"::integer AS "paidCount",
        installment_metrics."overdueCount"::integer AS "overdueCount",
        installment_metrics."pendingCount"::integer AS "pendingCount",
        next_installment."dueDate" AS "nextDueDate",
        next_installment."amount" AS "nextAmount"
      FROM "Subscription" subscription
      INNER JOIN "Student" student ON student."id" = subscription."studentId"
      CROSS JOIN LATERAL (
        SELECT
          COUNT(*) AS "installmentTotal",
          COUNT(*) FILTER (WHERE installment."status" = 'PAID') AS "paidCount",
          COUNT(*) FILTER (
            WHERE installment."status" = 'OVERDUE'
              OR (installment."status" = 'PENDING' AND installment."dueDate" < ${now})
          ) AS "overdueCount",
          COUNT(*) FILTER (
            WHERE installment."status" = 'PENDING'
              AND installment."dueDate" >= ${now}
              AND installment."dueDate" <= ${in7Days}
          ) AS "expiringSoonCount",
          COUNT(*) FILTER (
            WHERE installment."status" = 'PENDING' AND installment."dueDate" >= ${now}
          ) AS "pendingCount"
        FROM "Installment" installment
        WHERE installment."subscriptionId" = subscription."id"
      ) installment_metrics
      LEFT JOIN LATERAL (
        SELECT installment."dueDate", installment."amount"
        FROM "Installment" installment
        WHERE installment."subscriptionId" = subscription."id"
          AND installment."status" = 'PENDING'
          AND installment."dueDate" >= ${now}
        ORDER BY installment."number" ASC
        LIMIT 1
      ) next_installment ON true
      WHERE subscription."trainerId" = ${trainer.id}
        AND subscription."status" IN ('ACTIVE', 'EXPIRED')
        AND student."deletedAt" IS NULL
        ${searchFilter}
    `;

    const rows = await prisma.$queryRaw<SubscriptionListRow[]>(Prisma.sql`
      WITH metrics AS (${metricsQuery}),
      filtered AS (
        SELECT metrics.*
        FROM metrics
        ${statusFilter}
      )
      SELECT filtered.*, (SELECT COUNT(*)::integer FROM filtered) AS "totalRows"
      FROM filtered
      ORDER BY filtered."endDate" ASC, filtered."subscriptionId" ASC
      LIMIT ${limit}
      OFFSET ${skip}
    `);

    let total = rows[0]?.totalRows ?? 0;
    if (rows.length === 0 && page > 1) {
      const countRows = await prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`
        WITH metrics AS (${metricsQuery})
        SELECT COUNT(*)::integer AS total
        FROM metrics
        ${statusFilter}
      `);
      total = countRows[0]?.total ?? 0;
    }

    return {
      items: rows.map(({ totalRows: _totalRows, ...row }) => ({
        ...row,
        totalAmount: Number(row.totalAmount),
        nextAmount: row.nextAmount === null ? null : Number(row.nextAmount),
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}
