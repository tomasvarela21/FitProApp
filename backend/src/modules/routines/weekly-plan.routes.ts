import { Router } from "express";
import { requireAuth } from "../../shared/middlewares/require-auth";
import { requireRole } from "../../shared/middlewares/require-role";
import { requireActiveTrial } from "../../shared/middlewares/require-active-trial";
import { WeeklyPlanController } from "./weekly-plan.controller";

export const weeklyPlanRouter = Router();

const trainerAuth = [requireAuth, requireRole("TRAINER"), requireActiveTrial];

weeklyPlanRouter.post(
  "/students/:studentId/weekly-plan",
  trainerAuth,
  WeeklyPlanController.createWeeklyPlan
);
weeklyPlanRouter.get(
  "/students/:studentId/weekly-plan",
  trainerAuth,
  WeeklyPlanController.getWeeklyPlan
);
weeklyPlanRouter.patch(
  "/students/:studentId/weekly-plan/:weekNumber",
  trainerAuth,
  WeeklyPlanController.updateWeekOverrides
);
weeklyPlanRouter.post(
  "/students/:studentId/weekly-plan/copy",
  trainerAuth,
  WeeklyPlanController.copyWeekOverrides
);
weeklyPlanRouter.patch(
  "/students/:studentId/active-week",
  trainerAuth,
  WeeklyPlanController.setActiveWeek
);
