import { Router } from "express";
import { validate } from "../../shared/middlewares/validate";
import { createTrainerSchema } from "./trainers.schema";
import { TrainersController } from "./trainers.controller";

export const trainersRouter = Router();

trainersRouter.post("/", validate(createTrainerSchema), TrainersController.createTrainer);