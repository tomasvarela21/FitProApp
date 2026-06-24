import { Request, Response } from "express";
import { asyncHandler } from "../../shared/errors/async-handler";
import { successResponse } from "../../shared/responses/api-response";
import { NotificationService } from "./notifications.service";

export class NotificationsController {
  static subscribe = asyncHandler(async (req: Request, res: Response) => {
    const result = await NotificationService.subscribe(req.user!.userId, req.body);

    return res
      .status(200)
      .json(successResponse("Suscripción registrada correctamente", result));
  });

  static unsubscribe = asyncHandler(async (req: Request, res: Response) => {
    const result = await NotificationService.unsubscribe(req.user!.userId, req.body);

    return res
      .status(200)
      .json(successResponse("Suscripción eliminada correctamente", result));
  });
}
