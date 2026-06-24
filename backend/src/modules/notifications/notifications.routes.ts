import { Router } from "express";
import { validate } from "../../shared/middlewares/validate";
import { requireAuth } from "../../shared/middlewares/require-auth";
import { NotificationsController } from "./notifications.controller";
import { subscribeSchema, unsubscribeSchema } from "./notifications.schema";

export const notificationsRouter = Router();

notificationsRouter.post(
  "/subscribe",
  requireAuth,
  validate(subscribeSchema),
  NotificationsController.subscribe
);

notificationsRouter.post(
  "/unsubscribe",
  requireAuth,
  validate(unsubscribeSchema),
  NotificationsController.unsubscribe
);
