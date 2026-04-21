import { Router } from "express";
import { authRouter } from "../modules/auth/auth.routes";
import { trainersRouter } from "../modules/trainers/trainers.routes";
import { studentsRouter } from "../modules/students/students.routes";
import { plansRouter } from "../modules/plans/plans.routes";
import { subscriptionsRouter } from "../modules/subscriptions/subscriptions.routes";
import { paymentsRouter } from "../modules/payments/payments.routes";
import { sendDailyPaymentAlerts } from "../infrastructure/jobs/payment-alerts.job";

export const router = Router();

router.get("/", (_req, res) => {
  res.status(200).json({ ok: true, message: "Backend base OK" });
});

router.use("/auth", authRouter);
router.use("/trainers", trainersRouter);
router.use("/students", studentsRouter);
router.use("/plans", plansRouter);
router.use("/subscriptions", subscriptionsRouter);
router.use("/payments", paymentsRouter);

router.post("/run-alerts", async (req, res) => {
  const secret = req.headers["x-cron-secret"];
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ ok: false, message: "No autorizado" });
  }
  sendDailyPaymentAlerts().catch(console.error);
  return res.status(200).json({ ok: true, message: "Job iniciado" });
});
