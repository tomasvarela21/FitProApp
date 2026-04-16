import { Router } from "express";
import { requireAuth } from "../../shared/middlewares/require-auth";
import { requireRole } from "../../shared/middlewares/require-role";
import { validate } from "../../shared/middlewares/validate";
import { SubscriptionsController } from "./subscriptions.controller";
import {
  createSubscriptionSchema,
  payInstallmentSchema,
} from "./subscriptions.schema";

export const subscriptionsRouter = Router();

subscriptionsRouter.use(requireAuth, requireRole("TRAINER"));

subscriptionsRouter.get("/student/:studentId", SubscriptionsController.getStudentSubscription);
subscriptionsRouter.get("/expiring", SubscriptionsController.getExpiring);
subscriptionsRouter.post("/", validate(createSubscriptionSchema), SubscriptionsController.create);
subscriptionsRouter.post(
  "/installments/:installmentId/pay",
  validate(payInstallmentSchema),
  SubscriptionsController.payInstallment
);
subscriptionsRouter.delete(
  "/:subscriptionId",
  SubscriptionsController.cancel
);
