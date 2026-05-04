import { Router } from "express";
import { requireAuth } from "../../shared/middlewares/require-auth";
import { requireRole } from "../../shared/middlewares/require-role";
import { ExercisesController } from "./exercises.controller";

export const exercisesRouter = Router();

exercisesRouter.use(requireAuth, requireRole("TRAINER"));

exercisesRouter.get("/muscle-groups", ExercisesController.getMuscleGroups);
exercisesRouter.get("/equipment", ExercisesController.getEquipment);
exercisesRouter.get("/", ExercisesController.list);
exercisesRouter.get("/:id", ExercisesController.getOne);
exercisesRouter.post("/", ExercisesController.create);
exercisesRouter.patch("/:id", ExercisesController.update);
exercisesRouter.delete("/:id", ExercisesController.delete);
