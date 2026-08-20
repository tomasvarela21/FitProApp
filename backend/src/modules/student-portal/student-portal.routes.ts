import { Router } from "express";
import { requireAuth } from "../../shared/middlewares/require-auth";
import { requireRole } from "../../shared/middlewares/require-role";
import { StudentPortalController } from "./student-portal.controller";
import { WorkoutController } from "./workout.controller";

export const studentPortalRouter = Router();

studentPortalRouter.use(requireAuth, requireRole("STUDENT"));

studentPortalRouter.get("/profile", StudentPortalController.getMyProfile);
studentPortalRouter.patch("/profile", StudentPortalController.updateMyProfile);
studentPortalRouter.get("/subscription", StudentPortalController.getMySubscription);

studentPortalRouter.get("/routine", WorkoutController.getMyRoutine);
studentPortalRouter.get("/today", WorkoutController.getTodayWorkout);
studentPortalRouter.post("/workout-log", WorkoutController.logWorkout);
studentPortalRouter.get("/workout-history", WorkoutController.getMyWorkoutHistory);
studentPortalRouter.get("/progress/:exerciseId", WorkoutController.getMyProgress);
studentPortalRouter.get("/streak", WorkoutController.getMyStreak);
