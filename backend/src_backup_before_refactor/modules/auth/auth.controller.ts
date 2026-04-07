import { Request, Response } from "express";
import { asyncHandler } from "../../core/errors/async-handler";
import { successResponse } from "../../core/responses/api-response";
import { AuthService } from "./auth.service";

export class AuthController {
  static activateAccount = asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.activateAccount(req.body);

    return res
      .status(200)
      .json(successResponse("Cuenta activada correctamente", result));
  });
}