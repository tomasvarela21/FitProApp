import { Router } from "express";
import { requireAuth } from "../../shared/middlewares/require-auth";
import { requireRole } from "../../shared/middlewares/require-role";
import { GymsController } from "./gyms.controller";

export const gymsRouter = Router();

const trainerAuth = [requireAuth, requireRole("TRAINER")];

gymsRouter.get("/", ...trainerAuth, GymsController.list);
gymsRouter.post("/", ...trainerAuth, GymsController.create);
gymsRouter.patch("/:id", ...trainerAuth, GymsController.update);
gymsRouter.delete("/:id", ...trainerAuth, GymsController.delete);
