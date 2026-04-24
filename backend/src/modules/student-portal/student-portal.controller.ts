import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/errors/async-handler";
import { successResponse } from "../../shared/responses/api-response";
import { StudentPortalService } from "./student-portal.service";
import { z } from "zod";

const updateProfileSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  phone: z.string().optional(),
});

export class StudentPortalController {
  static getMyProfile = asyncHandler(async (req: Request, res: Response) => {
    const result = await StudentPortalService.getMyProfile(req.user!.userId);
    return res.status(200).json(successResponse("Perfil obtenido", result));
  });

  static updateMyProfile = asyncHandler(async (req: Request, res: Response) => {
    const data = updateProfileSchema.parse(req.body);
    const result = await StudentPortalService.updateMyProfile(
      req.user!.userId,
      data
    );
    return res
      .status(200)
      .json(successResponse("Perfil actualizado correctamente", result));
  });

  static getMySubscription = asyncHandler(
    async (req: Request, res: Response) => {
      const result = await StudentPortalService.getMySubscription(
        req.user!.userId
      );
      return res
        .status(200)
        .json(successResponse("Suscripción obtenida", result));
    }
  );
}
