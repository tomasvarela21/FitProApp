import { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/db/prisma";

type RevenueRow = {
  totalCollected: Prisma.Decimal | null;
  totalPending: Prisma.Decimal | null;
  totalOverdue: Prisma.Decimal | null;
  month: string | null;
  monthlyAmount: Prisma.Decimal | null;
};

type StudentStatusRow = {
  status: string | null;
  statusCount: number;
  total: number;
  newLast30Days: number;
  unassignedToGym: number;
};

type SubscriptionStatusRow = { status: string; statusCount: number; total: number };
type GymSummaryRow = {
  id: string;
  name: string;
  studentCount: number;
  revenue: Prisma.Decimal;
};

export class AnalyticsService {
  static async getBusinessAnalytics(trainerUserId: string) {
    const trainer = await prisma.trainer.findUniqueOrThrow({
      where: { userId: trainerUserId },
      select: { id: true },
    });
    const trainerId = trainer.id;
    const now = new Date();
    const revenueCutoff = new Date(now);
    revenueCutoff.setMonth(revenueCutoff.getMonth() - 13);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [revenueRows, studentRows, subscriptionRows, plans, gyms] = await Promise.all([
      prisma.$queryRaw<RevenueRow[]>(Prisma.sql`
        WITH eligible_installments AS MATERIALIZED (
          SELECT installment.*
          FROM "Installment" installment
          WHERE installment."trainerId" = ${trainerId}
            AND (
              installment."paidAt" >= ${revenueCutoff}
              OR (installment."paidAt" IS NULL AND installment."dueDate" >= ${revenueCutoff})
            )
        ),
        totals AS (
          SELECT
            COALESCE(SUM("amount") FILTER (WHERE "status" = 'PAID'), 0) AS "totalCollected",
            COALESCE(SUM("amount") FILTER (
              WHERE "status" = 'PENDING' AND "dueDate" >= ${now}
            ), 0) AS "totalPending",
            COALESCE(SUM("amount") FILTER (
              WHERE "status" = 'OVERDUE'
                OR ("status" = 'PENDING' AND "dueDate" < ${now})
            ), 0) AS "totalOverdue"
          FROM eligible_installments
        ),
        monthly AS (
          SELECT
            TO_CHAR(COALESCE("paidAt", "dueDate") AT TIME ZONE 'UTC', 'YYYY-MM') AS month,
            SUM("amount") AS amount
          FROM eligible_installments
          WHERE "status" = 'PAID'
          GROUP BY month
        )
        SELECT
          totals."totalCollected",
          totals."totalPending",
          totals."totalOverdue",
          monthly.month,
          monthly.amount AS "monthlyAmount"
        FROM totals
        LEFT JOIN monthly ON true
        ORDER BY monthly.month ASC
      `),
      prisma.$queryRaw<StudentStatusRow[]>(Prisma.sql`
        WITH eligible_students AS MATERIALIZED (
          SELECT student."status", student."createdAt", student."gymId"
          FROM "Student" student
          WHERE student."trainerId" = ${trainerId} AND student."deletedAt" IS NULL
        ),
        totals AS (
          SELECT
            COUNT(*)::integer AS total,
            COUNT(*) FILTER (WHERE "createdAt" >= ${thirtyDaysAgo})::integer AS "newLast30Days",
            COUNT(*) FILTER (WHERE "gymId" IS NULL)::integer AS "unassignedToGym"
          FROM eligible_students
        ),
        statuses AS (
          SELECT "status"::text AS status, COUNT(*)::integer AS count
          FROM eligible_students
          GROUP BY "status"
        )
        SELECT
          statuses.status,
          COALESCE(statuses.count, 0)::integer AS "statusCount",
          totals.total,
          totals."newLast30Days",
          totals."unassignedToGym"
        FROM totals
        LEFT JOIN statuses ON true
      `),
      prisma.$queryRaw<SubscriptionStatusRow[]>(Prisma.sql`
        WITH classified AS (
          SELECT CASE
            WHEN subscription."status" = 'ACTIVE' AND subscription."endDate" < ${now}
              THEN 'EXPIRED'
            ELSE subscription."status"::text
          END AS status
          FROM "Subscription" subscription
          WHERE subscription."trainerId" = ${trainerId}
        ),
        totals AS (SELECT COUNT(*)::integer AS total FROM classified)
        SELECT classified.status, COUNT(*)::integer AS "statusCount", totals.total
        FROM classified
        CROSS JOIN totals
        GROUP BY classified.status, totals.total
      `),
      prisma.plan.findMany({
        where: { trainerId },
        select: {
          id: true,
          name: true,
          price: true,
          duration: true,
          isActive: true,
          _count: { select: { subscriptions: true } },
        },
      }),
      prisma.$queryRaw<GymSummaryRow[]>(Prisma.sql`
        WITH student_counts AS (
          SELECT student."gymId", COUNT(*)::integer AS count
          FROM "Student" student
          WHERE student."trainerId" = ${trainerId}
            AND student."deletedAt" IS NULL
            AND student."gymId" IS NOT NULL
          GROUP BY student."gymId"
        ),
        gym_revenue AS (
          SELECT student."gymId", SUM(installment."amount") AS amount
          FROM "Installment" installment
          INNER JOIN "Subscription" subscription ON subscription."id" = installment."subscriptionId"
          INNER JOIN "Student" student ON student."id" = subscription."studentId"
          WHERE installment."trainerId" = ${trainerId}
            AND installment."status" = 'PAID'
            AND (
              installment."paidAt" >= ${revenueCutoff}
              OR (installment."paidAt" IS NULL AND installment."dueDate" >= ${revenueCutoff})
            )
            AND student."deletedAt" IS NULL
            AND student."gymId" IS NOT NULL
          GROUP BY student."gymId"
        )
        SELECT
          gym."id",
          gym."name",
          COALESCE(student_counts.count, 0)::integer AS "studentCount",
          COALESCE(gym_revenue.amount, 0) AS revenue
        FROM "Gym" gym
        LEFT JOIN student_counts ON student_counts."gymId" = gym."id"
        LEFT JOIN gym_revenue ON gym_revenue."gymId" = gym."id"
        WHERE gym."trainerId" = ${trainerId}
        ORDER BY gym."name" ASC, gym."id" ASC
      `),
    ]);

    const revenueTotals = revenueRows[0] ?? {
      totalCollected: new Prisma.Decimal(0),
      totalPending: new Prisma.Decimal(0),
      totalOverdue: new Prisma.Decimal(0),
      month: null,
      monthlyAmount: null,
    };
    const monthlyMap = new Map(
      revenueRows
        .filter((row) => row.month !== null)
        .map((row) => [row.month!, Number(row.monthlyAmount ?? 0)])
    );
    const monthlyRevenue: { month: string; amount: number }[] = [];
    for (let index = 11; index >= 0; index -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthlyRevenue.push({ month: key, amount: Math.round((monthlyMap.get(key) ?? 0) * 100) / 100 });
    }

    const studentsByStatus: Record<string, number> = {
      ACTIVE: 0,
      INVITED: 0,
      PAUSED: 0,
      INACTIVE: 0,
    };
    for (const row of studentRows) {
      if (row.status) studentsByStatus[row.status] = row.statusCount;
    }
    const studentTotals = studentRows[0] ?? {
      status: null,
      statusCount: 0,
      total: 0,
      newLast30Days: 0,
      unassignedToGym: 0,
    };

    const subscriptionsByStatus: Record<string, number> = {
      ACTIVE: 0,
      EXPIRED: 0,
      CANCELLED: 0,
    };
    for (const row of subscriptionRows) subscriptionsByStatus[row.status] = row.statusCount;

    return {
      revenue: {
        totalCollected: Math.round(Number(revenueTotals.totalCollected ?? 0) * 100) / 100,
        totalPending: Math.round(Number(revenueTotals.totalPending ?? 0) * 100) / 100,
        totalOverdue: Math.round(Number(revenueTotals.totalOverdue ?? 0) * 100) / 100,
        monthlyRevenue,
      },
      students: {
        total: studentTotals.total,
        newLast30Days: studentTotals.newLast30Days,
        byStatus: studentsByStatus,
        unassignedToGym: studentTotals.unassignedToGym,
      },
      subscriptions: {
        total: subscriptionRows[0]?.total ?? 0,
        byStatus: subscriptionsByStatus,
      },
      plans: plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        price: Number(plan.price),
        duration: plan.duration,
        isActive: plan.isActive,
        subscriberCount: plan._count.subscriptions,
      })),
      gyms: gyms.map((gym) => ({
        id: gym.id,
        name: gym.name,
        studentCount: gym.studentCount,
        revenue: Math.round(Number(gym.revenue) * 100) / 100,
      })),
    };
  }
}
