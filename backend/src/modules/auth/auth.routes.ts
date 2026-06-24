import { Router } from "express";
import { validate } from "../../shared/middlewares/validate";
import { requireAuth } from "../../shared/middlewares/require-auth";
import { AuthController } from "./auth.controller";
import {
  activateAccountSchema,
  changePasswordSchema,
  loginSchema,
  verifyEmailSchema,
} from "./auth.schema";
import { createTrainerSchema } from "../trainers/trainers.schema";

export const authRouter = Router();

authRouter.post(
  "/activate-account",
  validate(activateAccountSchema),
  AuthController.activateAccount
);

authRouter.post("/login", validate(loginSchema), AuthController.login);

authRouter.get("/me", requireAuth, AuthController.me);

authRouter.post(
  "/change-password",
  requireAuth,
  validate(changePasswordSchema),
  AuthController.changePassword
);

authRouter.post(
  "/register-trainer",
  validate(createTrainerSchema),
  AuthController.registerTrainer
);

authRouter.post(
  "/verify-email",
  validate(verifyEmailSchema),
  AuthController.verifyTrainerEmail
);