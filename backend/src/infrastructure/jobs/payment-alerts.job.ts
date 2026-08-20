import cron from "node-cron";
import { prisma } from "../db/prisma";
import { EmailService } from "../email/email.service";
import { NotificationService } from "../../modules/notifications/notifications.service";

// Devuelve la fecha en formato YYYY-MM-DD en la zona horaria de Argentina
function todayDateString(): string {
  return new Date().toLocaleDateString("sv-SE", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

// Registra el alerta en AlertLog. Devuelve false si ya se envió hoy (duplicado).
async function logAlert(installmentId: string, alertType: string, sentDate: string): Promise<boolean> {
  try {
    await prisma.alertLog.create({ data: { installmentId, alertType, sentDate } });
    return true;
  } catch {
    // Violación del unique → ya se envió hoy
    return false;
  }
}

export async function sendDailyPaymentAlerts() {
  console.log("[PaymentAlertsJob] Iniciando job de alertas...");

  const sentDate = todayDateString();

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
        // ── 7 días antes ────────────────────────────────────
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
          const shouldSend = await logAlert(i.id, "7d", sentDate);
          if (!shouldSend) continue;

          if (i.subscription.student.userId) {
            NotificationService.sendNotification(i.subscription.student.userId, {
              title: "Cuota por vencer 📅",
              body: `Tu cuota del plan ${i.subscription.plan.name} vence en 7 días (${i.dueDate.toLocaleDateString("es-AR")}).`,
              data: { type: "INSTALLMENT_EXPIRING_SOON", installmentId: i.id },
            }).catch(console.error);
          }
          if (!i.subscription.student.user?.email) continue;
          await EmailService.sendInstallmentReminder({
            to: i.subscription.student.user.email,
            studentName: i.subscription.student.firstName,
            trainerName: `${trainer.firstName} ${trainer.lastName}`,
            planName: i.subscription.plan.name,
            installmentNumber: i.number,
            amount: Number(i.amount),
            dueDate: i.dueDate,
            daysUntilDue: 7,
          }).catch((err) => console.error(`[PaymentAlertsJob] Error email 7d:`, err));
        }

        // ── 1 día antes ──────────────────────────────────────
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
          const shouldSend = await logAlert(i.id, "1d", sentDate);
          if (!shouldSend) continue;

          if (i.subscription.student.userId) {
            NotificationService.sendNotification(i.subscription.student.userId, {
              title: "Cuota vence mañana ⚠️",
              body: `Tu cuota del plan ${i.subscription.plan.name} vence mañana.`,
              data: { type: "INSTALLMENT_EXPIRING_SOON", installmentId: i.id },
            }).catch(console.error);
          }
          if (!i.subscription.student.user?.email) continue;
          await EmailService.sendInstallmentReminder({
            to: i.subscription.student.user.email,
            studentName: i.subscription.student.firstName,
            trainerName: `${trainer.firstName} ${trainer.lastName}`,
            planName: i.subscription.plan.name,
            installmentNumber: i.number,
            amount: Number(i.amount),
            dueDate: i.dueDate,
            daysUntilDue: 1,
          }).catch((err) => console.error(`[PaymentAlertsJob] Error email 1d:`, err));
        }

        // ── El día del vencimiento ────────────────────────────
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
          const shouldSend = await logAlert(i.id, "today", sentDate);
          if (!shouldSend) continue;

          if (i.subscription.student.userId) {
            NotificationService.sendNotification(i.subscription.student.userId, {
              title: "Cuota vence hoy 💳",
              body: `Tu cuota del plan ${i.subscription.plan.name} vence hoy.`,
              data: { type: "INSTALLMENT_EXPIRING_SOON", installmentId: i.id },
            }).catch(console.error);
          }
          if (!i.subscription.student.user?.email) continue;
          await EmailService.sendInstallmentReminder({
            to: i.subscription.student.user.email,
            studentName: i.subscription.student.firstName,
            trainerName: `${trainer.firstName} ${trainer.lastName}`,
            planName: i.subscription.plan.name,
            installmentNumber: i.number,
            amount: Number(i.amount),
            dueDate: i.dueDate,
            daysUntilDue: 0,
          }).catch((err) => console.error(`[PaymentAlertsJob] Error email hoy:`, err));
        }

        // ── Vencidas: notificar cada 3 días ─────────────────
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
          const daysOverdue = Math.floor(
            (now.getTime() - i.dueDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          // Notificar al entrenador el día después del vencimiento (daysOverdue === 1)
          if (daysOverdue === 1) {
            const shouldSend = await logAlert(i.id, "overdue_trainer", sentDate);
            if (shouldSend) {
              NotificationService.sendNotification(trainer.userId, {
                title: "Cuota vencida ❌",
                body: `La cuota de ${i.subscription.student.firstName} ${i.subscription.student.lastName} venció ayer.`,
                data: { type: "STUDENT_INSTALLMENT_OVERDUE", installmentId: i.id },
              }).catch(console.error);
            }
          }

          // Notificar al alumno cada 3 días (3, 6, 9...)
          if (daysOverdue > 0 && daysOverdue % 3 === 0) {
            const alertType = `overdue_${daysOverdue}d`;
            const shouldSend = await logAlert(i.id, alertType, sentDate);
            if (!shouldSend) continue;

            if (i.subscription.student.userId) {
              NotificationService.sendNotification(i.subscription.student.userId, {
                title: "Cuota vencida ❌",
                body: `Tu cuota del plan ${i.subscription.plan.name} está vencida hace ${daysOverdue} días.`,
                data: { type: "INSTALLMENT_OVERDUE", installmentId: i.id },
              }).catch(console.error);
            }
            if (!i.subscription.student.user?.email) continue;
            await EmailService.sendOverdueReminder({
              to: i.subscription.student.user.email,
              studentName: i.subscription.student.firstName,
              trainerName: `${trainer.firstName} ${trainer.lastName}`,
              planName: i.subscription.plan.name,
              installmentNumber: i.number,
              amount: Number(i.amount),
              dueDate: i.dueDate,
              daysOverdue,
            }).catch((err) => console.error(`[PaymentAlertsJob] Error email vencido:`, err));
          }
        }

        // ── Email resumen al trainer (lunes y viernes) ───────
        const dayOfWeek = now.getDay();
        const isTrainerAlertDay = dayOfWeek === 1 || dayOfWeek === 5;

        if (isTrainerAlertDay) {
          const trainerAlertType = "trainer_weekly";
          const shouldSend = await logAlert(`trainer_${trainer.id}`, trainerAlertType, sentDate);

          if (shouldSend) {
            const [allOverdue, allExpiringSoon] = await Promise.all([
              prisma.installment.findMany({
                where: {
                  trainerId: trainer.id,
                  status: { in: ["OVERDUE", "PENDING"] },
                  dueDate: { lt: now },
                },
                include: { subscription: { include: { student: true, plan: true } } },
                orderBy: { dueDate: "asc" },
              }),
              prisma.installment.findMany({
                where: {
                  trainerId: trainer.id,
                  status: "PENDING",
                  dueDate: { gte: now, lte: in7Days },
                },
                include: { subscription: { include: { student: true, plan: true } } },
                orderBy: { dueDate: "asc" },
              }),
            ]);

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
                  daysOverdue: Math.floor(
                    (now.getTime() - i.dueDate.getTime()) / (1000 * 60 * 60 * 24)
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
              }).catch((err) => console.error(`[PaymentAlertsJob] Error email trainer:`, err));

              console.log(`[PaymentAlertsJob] Email resumen enviado a ${trainer.user.email}`);
            }
          }
        }
      } catch (err) {
        console.error(`[PaymentAlertsJob] Error procesando trainer ${trainer.id}:`, err);
      }
    }

    console.log("[PaymentAlertsJob] Job completado.");
  } catch (err) {
    console.error("[PaymentAlertsJob] Error general:", err);
  }
}

// Corre todos los días a las 8:00 AM (ARG)
export const startPaymentAlertsJob = () => {
  cron.schedule("0 8 * * *", sendDailyPaymentAlerts, {
    timezone: "America/Argentina/Buenos_Aires",
  });

  console.log("[PaymentAlertsJob] Job programado — corre diariamente a las 8:00 AM (ARG)");
};
