import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/errors/async-handler";
import { successResponse } from "../../shared/responses/api-response";
import { PaymentsService } from "./payments.service";

export class PaymentsController {
  static getSubscriptionPayments = asyncHandler(
    async (req: Request, res: Response) => {
      const result = await PaymentsService.getSubscriptionPayments(
        req.user!.userId,
        req.params.subscriptionId as string
      );
      return res
        .status(200)
        .json(successResponse("Pagos obtenidos", result));
    }
  );
}
