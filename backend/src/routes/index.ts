import { Router } from "express";
import { authRouter } from "../modules/auth/auth.routes";
import { trainersRouter } from "../modules/trainers/trainers.routes";
import { studentsRouter } from "../modules/students/students.routes";
import { plansRouter } from "../modules/plans/plans.routes";
import { subscriptionsRouter } from "../modules/subscriptions/subscriptions.routes";
import { studentPortalRouter } from "../modules/student-portal/student-portal.routes";
import { exercisesRouter } from "../modules/exercises/exercises.routes";
import { routinesRouter, studentRoutinesRouter } from "../modules/routines/routines.routes";
import { weeklyPlanRouter } from "../modules/routines/weekly-plan.routes";
import { notificationsRouter } from "../modules/notifications/notifications.routes";
import { chatRouter } from "../modules/chat/chat.routes";
import { sendDailyPaymentAlerts } from "../infrastructure/jobs/payment-alerts.job";

export const router = Router();

router.get("/", (_req, res) => {
  res.status(200).json({ ok: true, message: "Backend base OK" });
});

router.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, timestamp: new Date().toISOString() });
});

router.use("/auth", authRouter);
router.use("/trainers", trainersRouter);
router.use("/students", studentsRouter);
router.use("/students", studentRoutinesRouter);
router.use("/plans", plansRouter);
router.use("/subscriptions", subscriptionsRouter);
router.use("/student", studentPortalRouter);
router.use("/notifications", notificationsRouter);
router.use("/chat", chatRouter);

router.use("/exercises", exercisesRouter);
router.use("/routines", routinesRouter);
router.use("/", weeklyPlanRouter);

router.post("/run-alerts", async (req, res) => {
  const secret = req.headers["x-cron-secret"];
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ ok: false, message: "No autorizado" });
  }
  sendDailyPaymentAlerts().catch(console.error);
  return res.status(200).json({ ok: true, message: "Job iniciado" });
});
