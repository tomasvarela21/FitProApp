import cron from "node-cron";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { OutboxService } from "../outbox/outbox.service";
import { businessDateString, businessDayOfWeek } from "../../shared/utils/business-date";

const JOB_LOCK_KEY = "fitpro:daily-payment-alerts";
const configuredTransactionTimeout = Number(process.env.PAYMENT_ALERTS_TRANSACTION_TIMEOUT_MS);
const TRANSACTION_TIMEOUT_MS =
  Number.isInteger(configuredTransactionTimeout) && configuredTransactionTimeout >= 5_000
    ? Math.min(configuredTransactionTimeout, 600_000)
    : 120_000;

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function businessDayRange(date: string) {
  return {
    gte: new Date(`${date}T00:00:00.000Z`),
    lt: new Date(`${addDays(date, 1)}T00:00:00.000Z`),
  };
}

function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T12:00:00.000Z`) - Date.parse(`${from}T12:00:00.000Z`)) /
      86_400_000
  );
}

type JobTx = Prisma.TransactionClient;
type InstallmentAlert = Prisma.InstallmentGetPayload<{
  include: { subscription: { include: { student: { include: { user: true } }; plan: true } } };
}>;

async function enqueueStudentAlert(
  tx: JobTx,
  installment: InstallmentAlert,
  trainer: { firstName: string; lastName: string },
  alertType: string,
  sentDate: string,
  title: string,
  body: string,
  dataType: string,
  emailKind: "INSTALLMENT_REMINDER" | "OVERDUE_REMINDER",
  dayCount: number
) {
  const student = installment.subscription.student;
  const baseKey = `payment-alert:${installment.id}:${alertType}:${sentDate}`;
  if (student.userId) {
    await OutboxService.enqueue(
      `${baseKey}:push`,
      {
        channel: "PUSH",
        userId: student.userId,
        title,
        body,
        data: { type: dataType, installmentId: installment.id },
      },
      tx
    );
  }
  if (!student.user?.email) return;

  const common = {
    to: student.user.email,
    studentName: student.firstName,
    trainerName: `${trainer.firstName} ${trainer.lastName}`,
    planName: installment.subscription.plan.name,
    installmentNumber: installment.number,
    amount: Number(installment.amount),
    dueDate: installment.dueDate.toISOString(),
  };
  await OutboxService.enqueue(
    `${baseKey}:email`,
    emailKind === "INSTALLMENT_REMINDER"
      ? {
          channel: "EMAIL",
          kind: "INSTALLMENT_REMINDER",
          params: { ...common, daysUntilDue: dayCount },
        }
      : {
          channel: "EMAIL",
          kind: "OVERDUE_REMINDER",
          params: { ...common, daysOverdue: dayCount },
        },
    tx
  );
}

async function enqueueDailyPaymentAlerts(now: Date) {
  const sentDate = businessDateString(now);
  return prisma.$transaction(async (tx) => {
    const [lock] = await tx.$queryRaw<Array<{ acquired: boolean }>>`
      SELECT pg_try_advisory_xact_lock(hashtext(${JOB_LOCK_KEY})) AS acquired
    `;
    if (!lock?.acquired) return { skipped: true, queued: 0 };

    const trainers = await tx.trainer.findMany({ include: { user: true } });
    let queued = 0;
    for (const trainer of trainers) {
      const dueGroups = [
        { days: 7, type: "7d", title: "Cuota por vencer 📅" },
        { days: 1, type: "1d", title: "Cuota vence mañana ⚠️" },
        { days: 0, type: "today", title: "Cuota vence hoy 💳" },
      ];
      for (const group of dueGroups) {
        const targetDate = addDays(sentDate, group.days);
        const installments = await tx.installment.findMany({
          where: {
            trainerId: trainer.id,
            status: "PENDING",
            dueDate: businessDayRange(targetDate),
          },
          include: {
            subscription: { include: { student: { include: { user: true } }, plan: true } },
          },
        });
        for (const installment of installments) {
          const planName = installment.subscription.plan.name;
          const body = group.days === 7
            ? `Tu cuota del plan ${planName} vence en 7 días.`
            : group.days === 1
              ? `Tu cuota del plan ${planName} vence mañana.`
              : `Tu cuota del plan ${planName} vence hoy.`;
          await enqueueStudentAlert(
            tx,
            installment,
            trainer,
            group.type,
            sentDate,
            group.title,
            body,
            "INSTALLMENT_EXPIRING_SOON",
            "INSTALLMENT_REMINDER",
            group.days
          );
          queued += 1;
        }
      }

      const overdue = await tx.installment.findMany({
        where: {
          trainerId: trainer.id,
          status: { in: ["OVERDUE", "PENDING"] },
          dueDate: { lt: businessDayRange(sentDate).gte },
        },
        include: {
          subscription: { include: { student: { include: { user: true } }, plan: true } },
        },
      });
      for (const installment of overdue) {
        const dueBusinessDate = installment.dueDate.toISOString().slice(0, 10);
        const daysOverdue = daysBetween(dueBusinessDate, sentDate);
        if (daysOverdue === 1) {
          await OutboxService.enqueue(
            `payment-alert:${installment.id}:overdue-trainer:${sentDate}:push`,
            {
              channel: "PUSH",
              userId: trainer.userId,
              title: "Cuota vencida ❌",
              body: `La cuota de ${installment.subscription.student.firstName} ${installment.subscription.student.lastName} venció ayer.`,
              data: { type: "STUDENT_INSTALLMENT_OVERDUE", installmentId: installment.id },
            },
            tx
          );
          queued += 1;
        }
        if (daysOverdue > 0 && daysOverdue % 3 === 0) {
          await enqueueStudentAlert(
            tx,
            installment,
            trainer,
            `overdue-${daysOverdue}d`,
            sentDate,
            "Cuota vencida ❌",
            `Tu cuota del plan ${installment.subscription.plan.name} está vencida hace ${daysOverdue} días.`,
            "INSTALLMENT_OVERDUE",
            "OVERDUE_REMINDER",
            daysOverdue
          );
          queued += 1;
        }
      }

      const weekday = businessDayOfWeek(new Date(`${sentDate}T12:00:00.000Z`));
      if (weekday === "MONDAY" || weekday === "FRIDAY") {
        const [allOverdue, allExpiringSoon] = await Promise.all([
          tx.installment.findMany({
            where: {
              trainerId: trainer.id,
              status: { in: ["OVERDUE", "PENDING"] },
              dueDate: { lt: businessDayRange(sentDate).gte },
            },
            include: { subscription: { include: { student: true, plan: true } } },
            orderBy: { dueDate: "asc" },
          }),
          tx.installment.findMany({
            where: {
              trainerId: trainer.id,
              status: "PENDING",
              dueDate: {
                gte: businessDayRange(sentDate).gte,
                lt: businessDayRange(addDays(sentDate, 8)).gte,
              },
            },
            include: { subscription: { include: { student: true, plan: true } } },
            orderBy: { dueDate: "asc" },
          }),
        ]);
        if (allOverdue.length || allExpiringSoon.length) {
          await OutboxService.enqueue(
            `payment-alert:trainer:${trainer.id}:summary:${sentDate}:email`,
            {
              channel: "EMAIL",
              kind: "PAYMENT_ALERTS",
              params: {
                to: trainer.user.email,
                trainerName: trainer.firstName,
                overdueInstallments: allOverdue.map((item) => ({
                  studentName: `${item.subscription.student.firstName} ${item.subscription.student.lastName}`,
                  planName: item.subscription.plan.name,
                  installmentNumber: item.number,
                  amount: Number(item.amount),
                  dueDate: item.dueDate.toISOString(),
                  daysOverdue: daysBetween(item.dueDate.toISOString().slice(0, 10), sentDate),
                })),
                expiringSoonInstallments: allExpiringSoon.map((item) => ({
                  studentName: `${item.subscription.student.firstName} ${item.subscription.student.lastName}`,
                  planName: item.subscription.plan.name,
                  installmentNumber: item.number,
                  amount: Number(item.amount),
                  dueDate: item.dueDate.toISOString(),
                  daysUntilDue: daysBetween(sentDate, item.dueDate.toISOString().slice(0, 10)),
                })),
              },
            },
            tx
          );
          queued += 1;
        }
      }
    }
    return { skipped: false, queued };
  }, { timeout: TRANSACTION_TIMEOUT_MS });
}

let activeJob: Promise<{ skipped: boolean; queued: number }> | undefined;
let scheduledTask: ReturnType<typeof cron.schedule> | undefined;

export function sendDailyPaymentAlerts(now = new Date()) {
  if (activeJob) return activeJob;
  activeJob = enqueueDailyPaymentAlerts(now).finally(() => {
    activeJob = undefined;
  });
  return activeJob;
}

export function startPaymentAlertsJob() {
  if (scheduledTask) return;
  scheduledTask = cron.schedule(
    "0 8 * * *",
    () => {
      void sendDailyPaymentAlerts().catch((error) => {
        console.error("[PaymentAlertsJob] Error preparando alertas:", error);
      });
    },
    {
      timezone: "America/Argentina/Buenos_Aires",
      noOverlap: true,
    }
  );
}

export async function stopPaymentAlertsJob() {
  scheduledTask?.stop();
  scheduledTask = undefined;
  await activeJob;
}
