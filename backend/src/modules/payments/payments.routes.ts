import { Router } from "express";
import { requireAuth } from "../../shared/middlewares/require-auth";
import { requireRole } from "../../shared/middlewares/require-role";
import { PaymentsController } from "./payments.controller";

export const paymentsRouter = Router();

paymentsRouter.use(requireAuth, requireRole("TRAINER"));

paymentsRouter.get(
  "/subscription/:subscriptionId",
  PaymentsController.getSubscriptionPayments
);
