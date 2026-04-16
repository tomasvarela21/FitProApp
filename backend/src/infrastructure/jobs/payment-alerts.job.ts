import cron from "node-cron";
import { prisma } from "../db/prisma";
import { EmailService } from "../email/email.service";

export async function sendDailyPaymentAlerts() {
  console.log("[PaymentAlertsJob] Iniciando job de alertas...");

  try {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in1Day = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const trainers = await prisma.trainer.findMany({
      include: { user: true },
    });

    for (const trainer of trainers) {
      try {
        // ── Emails a alumnos ──────────────────────────────

        // 7 días antes
        const in7DaysStart = new Date(in7Days);
        in7DaysStart.setHours(0, 0, 0, 0);
        const in7DaysEnd = new Date(in7Days);
        in7DaysEnd.setHours(23, 59, 59, 999);

        const installmentsDue7Days = await prisma.installment.findMany({
          where: {
            trainerId: trainer.id,
            status: "PENDING",
            dueDate: { gte: in7DaysStart, lte: in7DaysEnd },
          },
          include: {
            subscription: {
              include: { student: { include: { user: true } }, plan: true },
            },
          },
        });

        for (const i of installmentsDue7Days) {
          if (!i.subscription.student.user?.email) continue;
          await EmailService.sendInstallmentReminder({
            to: i.subscription.student.user.email,
            studentName: `${i.subscription.student.firstName}`,
            trainerName: `${trainer.firstName} ${trainer.lastName}`,
            planName: i.subscription.plan.name,
            installmentNumber: i.number,
            amount: Number(i.amount),
            dueDate: i.dueDate,
            daysUntilDue: 7,
          }).catch((err) =>
            console.error(`[PaymentAlertsJob] Error email alumno 7d:`, err)
          );
        }

        // 1 día antes
        const in1DayStart = new Date(in1Day);
        in1DayStart.setHours(0, 0, 0, 0);
        const in1DayEnd = new Date(in1Day);
        in1DayEnd.setHours(23, 59, 59, 999);

        const installmentsDue1Day = await prisma.installment.findMany({
          where: {
            trainerId: trainer.id,
            status: "PENDING",
            dueDate: { gte: in1DayStart, lte: in1DayEnd },
          },
          include: {
            subscription: {
              include: { student: { include: { user: true } }, plan: true },
            },
          },
        });

        for (const i of installmentsDue1Day) {
          if (!i.subscription.student.user?.email) continue;
          await EmailService.sendInstallmentReminder({
            to: i.subscription.student.user.email,
            studentName: `${i.subscription.student.firstName}`,
            trainerName: `${trainer.firstName} ${trainer.lastName}`,
            planName: i.subscription.plan.name,
            installmentNumber: i.number,
            amount: Number(i.amount),
            dueDate: i.dueDate,
            daysUntilDue: 1,
          }).catch((err) =>
            console.error(`[PaymentAlertsJob] Error email alumno 1d:`, err)
          );
        }

        // El día del vencimiento
        const installmentsDueToday = await prisma.installment.findMany({
          where: {
            trainerId: trainer.id,
            status: "PENDING",
            dueDate: { gte: todayStart, lte: todayEnd },
          },
          include: {
            subscription: {
              include: { student: { include: { user: true } }, plan: true },
            },
          },
        });

        for (const i of installmentsDueToday) {
          if (!i.subscription.student.user?.email) continue;
          await EmailService.sendInstallmentReminder({
            to: i.subscription.student.user.email,
            studentName: `${i.subscription.student.firstName}`,
            trainerName: `${trainer.firstName} ${trainer.lastName}`,
            planName: i.subscription.plan.name,
            installmentNumber: i.number,
            amount: Number(i.amount),
            dueDate: i.dueDate,
            daysUntilDue: 0,
          }).catch((err) =>
            console.error(`[PaymentAlertsJob] Error email alumno hoy:`, err)
          );
        }

        // Cada 3 días post vencimiento
        const overdueInstallments = await prisma.installment.findMany({
          where: {
            trainerId: trainer.id,
            status: { in: ["OVERDUE", "PENDING"] },
            dueDate: { lt: todayStart },
          },
          include: {
            subscription: {
              include: { student: { include: { user: true } }, plan: true },
            },
          },
        });

        for (const i of overdueInstallments) {
          if (!i.subscription.student.user?.email) continue;
          const daysOverdue = Math.abs(
            Math.floor(
              (i.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            )
          );
          // Solo enviar cada 3 días (1, 4, 7, 10...) && daysOverdue % 3 === 0
          if (daysOverdue > 0 && daysOverdue % 3 === 0) {
            await EmailService.sendOverdueReminder({
              to: i.subscription.student.user.email,
              studentName: `${i.subscription.student.firstName}`,
              trainerName: `${trainer.firstName} ${trainer.lastName}`,
              planName: i.subscription.plan.name,
              installmentNumber: i.number,
              amount: Number(i.amount),
              dueDate: i.dueDate,
              daysOverdue,
            }).catch((err) =>
              console.error(`[PaymentAlertsJob] Error email alumno vencido:`, err)
            );
          }
        }

        // ── Email al trainer (solo lunes y viernes) ─────── 
        const dayOfWeek = now.getDay(); // 0=dom, 1=lun, 5=vie
        const isTrainerAlertDay = dayOfWeek === 1 || dayOfWeek === 5;

        if (isTrainerAlertDay) {
          const allOverdue = await prisma.installment.findMany({
            where: {
              trainerId: trainer.id,
              status: { in: ["OVERDUE", "PENDING"] },
              dueDate: { lt: now },
            },
            include: {
              subscription: {
                include: { student: true, plan: true },
              },
            },
            orderBy: { dueDate: "asc" },
          });

          const allExpiringSoon = await prisma.installment.findMany({
            where: {
              trainerId: trainer.id,
              status: "PENDING",
              dueDate: { gte: now, lte: in7Days },
            },
            include: {
              subscription: {
                include: { student: true, plan: true },
              },
            },
            orderBy: { dueDate: "asc" },
          });

          if (allOverdue.length > 0 || allExpiringSoon.length > 0) {
            await EmailService.sendPaymentAlerts({
              to: trainer.user.email,
              trainerName: trainer.firstName,
              overdueInstallments: allOverdue.map((i) => ({
                studentName: `${i.subscription.student.firstName} ${i.subscription.student.lastName}`,
                planName: i.subscription.plan.name,
                installmentNumber: i.number,
                amount: Number(i.amount),
                dueDate: i.dueDate,
                daysOverdue: Math.abs(
                  Math.floor(
                    (i.dueDate.getTime() - now.getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                ),
              })),
              expiringSoonInstallments: allExpiringSoon.map((i) => ({
                studentName: `${i.subscription.student.firstName} ${i.subscription.student.lastName}`,
                planName: i.subscription.plan.name,
                installmentNumber: i.number,
                amount: Number(i.amount),
                dueDate: i.dueDate,
                daysUntilDue: Math.ceil(
                  (i.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                ),
              })),
            }).catch((err) =>
              console.error(`[PaymentAlertsJob] Error email trainer:`, err)
            );

            console.log(
              `[PaymentAlertsJob] Email trainer enviado a ${trainer.user.email}`
            );
          }
        }
      } catch (err) {
        console.error(
          `[PaymentAlertsJob] Error procesando trainer ${trainer.id}:`,
          err
        );
      }
    }

    console.log("[PaymentAlertsJob] Job completado.");
  } catch (err) {
    console.error("[PaymentAlertsJob] Error general:", err);
  }
}

// Corre todos los días a las 8:00 AM
export const startPaymentAlertsJob = () => {
  cron.schedule("0 8 * * *", sendDailyPaymentAlerts, {
    timezone: "America/Argentina/Buenos_Aires",
  });

  console.log(
    "[PaymentAlertsJob] Job programado — corre diariamente a las 8:00 AM (ARG)"
  );
};
