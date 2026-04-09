"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const async_handler_1 = require("../../shared/errors/async-handler");
const api_response_1 = require("../../shared/responses/api-response");
const auth_service_1 = require("./auth.service");
class AuthController {
    static activateAccount = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const result = await auth_service_1.AuthService.activateAccount(req.body);
        return res
            .status(200)
            .json((0, api_response_1.successResponse)("Cuenta activada correctamente", result));
    });
    static login = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const result = await auth_service_1.AuthService.login(req.body);
        return res
            .status(200)
            .json((0, api_response_1.successResponse)("Login correcto", result));
    });
    static me = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const result = await auth_service_1.AuthService.getMe(req.user.userId);
        return res
            .status(200)
            .json((0, api_response_1.successResponse)("Usuario autenticado", result));
    });
    static changePassword = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const result = await auth_service_1.AuthService.changePassword(req.user.userId, req.body);
        return res
            .status(200)
            .json((0, api_response_1.successResponse)("Contraseña actualizada correctamente", result));
    });
}
exports.AuthController = AuthController;
//# sourceMappingURL=auth.controller.js.map