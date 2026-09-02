import { Request, Response } from "express";
import { asyncHandler } from "../../shared/errors/async-handler";
import { successResponse } from "../../shared/responses/api-response";
import { AnalyticsService } from "./analytics.service";

export class AnalyticsController {
  static getBusinessAnalytics = asyncHandler(
    async (req: Request, res: Response) => {
      const result = await AnalyticsService.getBusinessAnalytics(req.user!.userId);
      return res.json(successResponse("Analytics obtenidos", result));
    }
  );
}
