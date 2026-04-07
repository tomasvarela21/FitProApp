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
}