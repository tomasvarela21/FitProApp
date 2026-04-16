import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/errors/async-handler";
import { successResponse } from "../../shared/responses/api-response";
import { PlansService } from "./plans.service";

export class PlansController {
  static list = asyncHandler(async (req: Request, res: Response) => {
    const result = await PlansService.listPlans(req.user!.userId);
    return res.status(200).json(successResponse("Planes obtenidos", result));
  });

  static create = asyncHandler(async (req: Request, res: Response) => {
    const result = await PlansService.createPlan(req.user!.userId, req.body);
    return res.status(201).json(successResponse("Plan creado correctamente", result));
  });

  static update = asyncHandler(async (req: Request, res: Response) => {
    const planId = req.params.planId as string;
    const result = await PlansService.updatePlan(req.user!.userId, planId, req.body);
    return res.status(200).json(successResponse("Plan actualizado correctamente", result));
  });

  static delete = asyncHandler(async (req: Request, res: Response) => {
    const planId = req.params.planId as string;
    const result = await PlansService.deletePlan(req.user!.userId, planId);
    return res.status(200).json(successResponse("Plan eliminado correctamente", result));
  });
}
