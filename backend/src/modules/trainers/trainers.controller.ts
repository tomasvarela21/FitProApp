import { Request, Response } from "express";
import { asyncHandler } from "../../shared/errors/async-handler";
import { successResponse } from "../../shared/responses/api-response";
import { TrainersService } from "./trainers.service";

export class TrainersController {
  static createTrainer = asyncHandler(async (req: Request, res: Response) => {
    const trainer = await TrainersService.createTrainer(req.body);

    return res
      .status(201)
      .json(successResponse("Entrenador creado correctamente", trainer));
  });

  static getDashboardSummary = asyncHandler(
    async (req: Request, res: Response) => {
      const result = await TrainersService.getDashboardSummary(
        req.user!.userId
      );

      return res
        .status(200)
        .json(successResponse("Dashboard obtenido correctamente", result));
    }
  );

  static getProfile = asyncHandler(async (req: Request, res: Response) => {
    const result = await TrainersService.getProfile(req.user!.userId);

    return res
      .status(200)
      .json(successResponse("Perfil obtenido correctamente", result));
  });

  static updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const result = await TrainersService.updateProfile(
      req.user!.userId,
      req.body
    );

    return res
      .status(200)
      .json(successResponse("Perfil actualizado correctamente", result));
  });
}