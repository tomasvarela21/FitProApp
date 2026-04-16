import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/errors/async-handler";
import { successResponse } from "../../shared/responses/api-response";
import { SubscriptionsService } from "./subscriptions.service";

export class SubscriptionsController {
  static getStudentSubscription = asyncHandler(
    async (req: Request, res: Response) => {
      const result = await SubscriptionsService.getStudentSubscription(
        req.user!.userId,
        req.params.studentId as string
      );
      return res.status(200).json(successResponse("Suscripción obtenida", result));
    }
  );

  static create = asyncHandler(async (req: Request, res: Response) => {
    const result = await SubscriptionsService.createSubscription(
      req.user!.userId,
      req.body
    );
    return res.status(201).json(successResponse("Suscripción creada correctamente", result));
  });

  static payInstallment = asyncHandler(async (req: Request, res: Response) => {
    const result = await SubscriptionsService.payInstallment(
      req.user!.userId,
      req.params.installmentId as string,
      req.body
    );
    return res.status(200).json(successResponse("Pago registrado correctamente", result));
  });

  static cancel = asyncHandler(async (req: Request, res: Response) => {
    const result = await SubscriptionsService.cancelSubscription(
      req.user!.userId,
      req.params.subscriptionId as string
    );
    return res
      .status(200)
      .json(successResponse("Suscripción cancelada correctamente", result));
  });

  static getExpiring = asyncHandler(async (req: Request, res: Response) => {
    const result = await SubscriptionsService.getExpiringSubscriptions(
      req.user!.userId
    );
    return res.status(200).json(successResponse("Alertas de vencimiento obtenidas", result));
  });
}
