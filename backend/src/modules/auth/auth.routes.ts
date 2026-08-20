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
import { authLimiter } from "../../app";

export const authRouter = Router();

authRouter.post(
  "/activate-account",
  authLimiter,
  validate(activateAccountSchema),
  AuthController.activateAccount
);

authRouter.post("/login", authLimiter, validate(loginSchema), AuthController.login);

authRouter.get("/me", requireAuth, AuthController.me);

authRouter.post("/refresh", AuthController.refresh);

authRouter.post("/logout", AuthController.logout);

authRouter.post(
  "/change-password",
  requireAuth,
  validate(changePasswordSchema),
  AuthController.changePassword
);

authRouter.post(
  "/register-trainer",
  authLimiter,
  validate(createTrainerSchema),
  AuthController.registerTrainer
);

authRouter.post(
  "/verify-email",
  authLimiter,
  validate(verifyEmailSchema),
  AuthController.verifyTrainerEmail
);