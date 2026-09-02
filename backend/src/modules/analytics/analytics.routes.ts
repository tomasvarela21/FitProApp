import { Router } from "express";
import { requireAuth } from "../../shared/middlewares/require-auth";
import { requireRole } from "../../shared/middlewares/require-role";
import { AnalyticsController } from "./analytics.controller";

export const analyticsRouter = Router();

analyticsRouter.get(
  "/business",
  requireAuth,
  requireRole("TRAINER"),
  AnalyticsController.getBusinessAnalytics
);
