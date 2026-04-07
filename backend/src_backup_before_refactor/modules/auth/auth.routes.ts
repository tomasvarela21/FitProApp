import { Router } from "express";
import { validate } from "../../core/middlewares/validate";
import { AuthController } from "./auth.controller";
import { activateAccountSchema } from "./auth.schema";

export const authRouter = Router();

authRouter.post("/activate-account", validate(activateAccountSchema), AuthController.activateAccount);