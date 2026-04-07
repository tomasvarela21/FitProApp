import { Request, Response } from "express";
import { asyncHandler } from "../../shared/errors/async-handler";
import { successResponse } from "../../shared/responses/api-response";
import { AuthService } from "./auth.service";

export class AuthController {
  static activateAccount = asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.activateAccount(req.body);

    return res
      .status(200)
      .json(successResponse("Cuenta activada correctamente", result));
  });

  static login = asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.login(req.body);

    return res
      .status(200)
      .json(successResponse("Login correcto", result));
  });

  static me = asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.getMe(req.user!.userId);

    return res
      .status(200)
      .json(successResponse("Usuario autenticado", result));
  });

  static changePassword = asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.changePassword(req.user!.userId, req.body);

    return res
      .status(200)
      .json(successResponse("Contraseña actualizada correctamente", result));
  });
}