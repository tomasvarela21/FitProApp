import { Request, Response } from "express";
import { z } from "zod/v4";
import { asyncHandler } from "../../shared/errors/async-handler";
import { successResponse } from "../../shared/responses/api-response";
import { GymsService } from "./gyms.service";

const createGymSchema = z.object({
  name: z.string().min(1).max(100),
  address: z.string().max(200).optional(),
});

const updateGymSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  address: z.string().max(200).nullable().optional(),
});

export class GymsController {
  static list = asyncHandler(async (req: Request, res: Response) => {
    const gyms = await GymsService.listGyms(req.user!.userId);
    return res.json(successResponse("Gimnasios obtenidos", gyms));
  });

  static create = asyncHandler(async (req: Request, res: Response) => {
    const data = createGymSchema.parse(req.body);
    const gym = await GymsService.createGym(req.user!.userId, data);
    return res.status(201).json(successResponse("Gimnasio creado", gym));
  });

  static update = asyncHandler(async (req: Request, res: Response) => {
    const data = updateGymSchema.parse(req.body);
    const gym = await GymsService.updateGym(req.user!.userId, req.params.id as string, data);
    return res.json(successResponse("Gimnasio actualizado", gym));
  });

  static delete = asyncHandler(async (req: Request, res: Response) => {
    await GymsService.deleteGym(req.user!.userId, req.params.id as string);
    return res.json(successResponse("Gimnasio eliminado", null));
  });
}
