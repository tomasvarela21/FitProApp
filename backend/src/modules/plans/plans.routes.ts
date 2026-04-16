import { Router } from "express";
import { requireAuth } from "../../shared/middlewares/require-auth";
import { requireRole } from "../../shared/middlewares/require-role";
import { validate } from "../../shared/middlewares/validate";
import { PlansController } from "./plans.controller";
import { createPlanSchema, updatePlanSchema } from "./plans.schema";

export const plansRouter = Router();

plansRouter.use(requireAuth, requireRole("TRAINER"));

plansRouter.get("/", PlansController.list);
plansRouter.post("/", validate(createPlanSchema), PlansController.create);
plansRouter.patch("/:planId", validate(updatePlanSchema), PlansController.update);
plansRouter.delete("/:planId", PlansController.delete);
