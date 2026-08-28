import { prisma } from "../../infrastructure/db/prisma";

export class AnalyticsService {
  static async getBusinessAnalytics(trainerUserId: string) {
    const trainer = await prisma.trainer.findUniqueOrThrow({
      where: { userId: trainerUserId },
      select: { id: true },
    });
    const trainerId = trainer.id;

    const [
      installments,
      students,
      subscriptions,
      plans,
      gyms,
    ] = await Promise.all([
      prisma.installment.findMany({
        where: { trainerId },
        select: { amount: true, status: true, paidAt: true, dueDate: true },
      }),
      prisma.student.findMany({
        where: { trainerId, deletedAt: null },
        select: { id: true, status: true, createdAt: true, gymId: true },
      }),
      prisma.subscription.findMany({
        where: { trainerId },
        select: { status: true, studentId: true },
      }),
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
      prisma.gym.findMany({
        where: { trainerId },
        select: { id: true, name: true },
      }),
    ]);

    // ── Revenue totals ───────────────────────────────────────────────────────
    let totalCollected = 0;
    let totalPending = 0;
    let totalOverdue = 0;

    const monthlyMap: Record<string, number> = {};

    for (const inst of installments) {
      const amount = Number(inst.amount);
      if (inst.status === "PAID") {
        totalCollected += amount;
        // Group by paid month
        const key = inst.paidAt
          ? inst.paidAt.toISOString().slice(0, 7)
          : inst.dueDate.toISOString().slice(0, 7);
        monthlyMap[key] = (monthlyMap[key] ?? 0) + amount;
      } else if (inst.status === "OVERDUE") {
        totalOverdue += amount;
      } else if (inst.status === "PENDING") {
        totalPending += amount;
      }
    }

    // Last 12 months — fill gaps with 0
    const monthlyRevenue: { month: string; amount: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyRevenue.push({ month: key, amount: Math.round((monthlyMap[key] ?? 0) * 100) / 100 });
    }

    // ── Students by status ───────────────────────────────────────────────────
    const studentsByStatus: Record<string, number> = {
      ACTIVE: 0,
      INVITED: 0,
      PAUSED: 0,
      INACTIVE: 0,
    };
    for (const s of students) {
      studentsByStatus[s.status] = (studentsByStatus[s.status] ?? 0) + 1;
    }

    // New students last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newStudentsLast30 = students.filter(
      (s) => s.createdAt >= thirtyDaysAgo
    ).length;

    // ── Subscriptions by status ──────────────────────────────────────────────
    const subscriptionsByStatus: Record<string, number> = {
      ACTIVE: 0,
      EXPIRED: 0,
      CANCELLED: 0,
    };
    for (const sub of subscriptions) {
      subscriptionsByStatus[sub.status] =
        (subscriptionsByStatus[sub.status] ?? 0) + 1;
    }

    // ── Plans summary ────────────────────────────────────────────────────────
    const plansSummary = plans.map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      duration: p.duration,
      isActive: p.isActive,
      subscriberCount: p._count.subscriptions,
    }));

    // ── Gyms analytics ───────────────────────────────────────────────────────
    // Map studentId → gymId for revenue lookup
    const studentGymMap = new Map<string, string | null>(
      students.map((s) => [s.id, s.gymId ?? null])
    );

    // Revenue per gym (from PAID installments via subscription.studentId)
    const subscriptionsWithStudents = await prisma.subscription.findMany({
      where: { trainerId },
      select: {
        studentId: true,
        installments: {
          where: { status: "PAID" },
          select: { amount: true },
        },
      },
    });

    const gymRevenue = new Map<string, number>();
    for (const sub of subscriptionsWithStudents) {
      const gymId = studentGymMap.get(sub.studentId) ?? null;
      if (!gymId) continue;
      const subtotal = sub.installments.reduce((acc, i) => acc + Number(i.amount), 0);
      gymRevenue.set(gymId, (gymRevenue.get(gymId) ?? 0) + subtotal);
    }

    const gymStudentCount = new Map<string, number>();
    for (const s of students) {
      if (!s.gymId) continue;
      gymStudentCount.set(s.gymId, (gymStudentCount.get(s.gymId) ?? 0) + 1);
    }

    const gymsSummary = gyms.map((g) => ({
      id: g.id,
      name: g.name,
      studentCount: gymStudentCount.get(g.id) ?? 0,
      revenue: Math.round((gymRevenue.get(g.id) ?? 0) * 100) / 100,
    }));

    const unassignedStudents = students.filter((s) => !s.gymId).length;

    return {
      revenue: {
        totalCollected: Math.round(totalCollected * 100) / 100,
        totalPending: Math.round(totalPending * 100) / 100,
        totalOverdue: Math.round(totalOverdue * 100) / 100,
        monthlyRevenue,
      },
      students: {
        total: students.length,
        newLast30Days: newStudentsLast30,
        byStatus: studentsByStatus,
        unassignedToGym: unassignedStudents,
      },
      subscriptions: {
        total: subscriptions.length,
        byStatus: subscriptionsByStatus,
      },
      plans: plansSummary,
      gyms: gymsSummary,
    };
  }
}
