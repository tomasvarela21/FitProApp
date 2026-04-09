import { Router } from "express";
import { validate } from "../../shared/middlewares/validate";
import { requireAuth } from "../../shared/middlewares/require-auth";
import { requireRole } from "../../shared/middlewares/require-role";
import { requireAdminSecret } from "../../shared/middlewares/require-admin-secret";
import { createTrainerSchema } from "./trainers.schema";
import { TrainersController } from "./trainers.controller";

export const trainersRouter = Router();

trainersRouter.post(
  "/",
  requireAdminSecret,
  validate(createTrainerSchema),
  TrainersController.createTrainer
);

trainersRouter.get(
  "/dashboard-summary",
  requireAuth,
  requireRole("TRAINER"),
  TrainersController.getDashboardSummary
);