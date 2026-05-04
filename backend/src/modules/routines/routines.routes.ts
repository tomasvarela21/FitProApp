import { Router } from "express";
import { requireAuth } from "../../shared/middlewares/require-auth";
import { requireRole } from "../../shared/middlewares/require-role";
import { RoutinesController } from "./routines.controller";

export const routinesRouter = Router();
export const studentRoutinesRouter = Router();

const trainerAuth = [requireAuth, requireRole("TRAINER")];

// ─── Routine CRUD ─────────────────────────────────────────
routinesRouter.use(trainerAuth);

routinesRouter.get("/", RoutinesController.list);
routinesRouter.get("/:id", RoutinesController.getOne);
routinesRouter.post("/", RoutinesController.create);
routinesRouter.patch("/:id", RoutinesController.update);
routinesRouter.delete("/:id", RoutinesController.delete);

// ─── Routine exercises ────────────────────────────────────
routinesRouter.post("/:id/exercises", RoutinesController.addExercise);
routinesRouter.patch("/:id/exercises/:routineExerciseId", RoutinesController.updateExercise);
routinesRouter.delete("/:id/exercises/:routineExerciseId", RoutinesController.removeExercise);

// ─── Student-scoped routes (mounted at /students) ─────────
studentRoutinesRouter.use(trainerAuth);

studentRoutinesRouter.post("/:studentId/assign-routine", RoutinesController.assignRoutine);
studentRoutinesRouter.get("/:studentId/active-routine", RoutinesController.getStudentRoutine);
studentRoutinesRouter.get("/:studentId/workout-history", RoutinesController.getWorkoutHistory);
