import { Request, Response } from "express";
import { asyncHandler } from "../../shared/errors/async-handler";
import { successResponse } from "../../shared/responses/api-response";
import { AuthService } from "./auth.service";

const REFRESH_COOKIE = "refreshToken";
const IS_PROD = process.env.NODE_ENV === "production";

const setRefreshCookie = (res: Response, token: string) => {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? "strict" : "lax",
    path: "/api/auth",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
};

const clearRefreshCookie = (res: Response) => {
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
};

export class AuthController {
  static activateAccount = asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.activateAccount(req.body);

    return res
      .status(200)
      .json(successResponse("Cuenta activada correctamente", result));
  });

  static login = asyncHandler(async (req: Request, res: Response) => {
    const { accessToken, refreshToken, user } = await AuthService.login(req.body);

    setRefreshCookie(res, refreshToken);

    // refreshToken también en el body para clientes mobile que no pueden usar cookies
    return res.status(200).json(successResponse("Login correcto", { accessToken, refreshToken, user }));
  });

  static refresh = asyncHandler(async (req: Request, res: Response) => {
    // Acepta cookie (web) o body.refreshToken (mobile)
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE] ?? req.body?.refreshToken;
    if (!rawRefreshToken) {
      return res.status(401).json({ ok: false, message: "No autenticado" });
    }

    const { accessToken, refreshToken } = await AuthService.refreshAccessToken(rawRefreshToken);

    setRefreshCookie(res, refreshToken);

    return res.status(200).json(successResponse("Token renovado", { accessToken, refreshToken }));
  });

  static logout = asyncHandler(async (req: Request, res: Response) => {
    // Acepta cookie (web) o body.refreshToken (mobile)
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE] ?? req.body?.refreshToken;

    if (rawRefreshToken) {
      await AuthService.logout(rawRefreshToken);
    }

    clearRefreshCookie(res);

    return res.status(200).json(successResponse("Sesión cerrada", { loggedOut: true }));
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

  static registerTrainer = asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.registerTrainer(req.body);

    return res
      .status(201)
      .json(successResponse("Entrenador registrado. Verifique su email.", result));
  });

  static verifyTrainerEmail = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;
    const result = await AuthService.verifyTrainerEmail(token);

    return res
      .status(200)
      .json(successResponse("Email verificado correctamente.", result));
  });
}
