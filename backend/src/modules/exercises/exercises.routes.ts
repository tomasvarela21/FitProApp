import { Router } from "express";
import { requireAuth } from "../../shared/middlewares/require-auth";
import { requireRole } from "../../shared/middlewares/require-role";
import { requireActiveTrial } from "../../shared/middlewares/require-active-trial";
import { ExercisesController } from "./exercises.controller";

export const exercisesRouter = Router();

// Rutas de solo lectura — permitir TRAINER y STUDENT
exercisesRouter.get("/", requireAuth, requireRole("TRAINER", "STUDENT"), ExercisesController.list);
exercisesRouter.get("/muscle-groups", requireAuth, requireRole("TRAINER", "STUDENT"), ExercisesController.getMuscleGroups);
exercisesRouter.get("/equipment", requireAuth, requireRole("TRAINER", "STUDENT"), ExercisesController.getEquipment);
exercisesRouter.get("/:id", requireAuth, requireRole("TRAINER", "STUDENT"), ExercisesController.getOne);

// Rutas de escritura — solo TRAINER
exercisesRouter.post("/", requireAuth, requireRole("TRAINER"), requireActiveTrial, ExercisesController.create);
exercisesRouter.patch("/:id", requireAuth, requireRole("TRAINER"), requireActiveTrial, ExercisesController.update);
exercisesRouter.delete("/:id", requireAuth, requireRole("TRAINER"), requireActiveTrial, ExercisesController.delete);
