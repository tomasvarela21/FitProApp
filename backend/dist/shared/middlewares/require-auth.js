"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const app_error_1 = require("../errors/app-error");
const jwt_1 = require("../utils/jwt");
const requireAuth = (req, _res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next(new app_error_1.AppError("No autorizado", 401));
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
        return next(new app_error_1.AppError("Token no proporcionado", 401));
    }
    const payload = (0, jwt_1.verifyAccessToken)(token);
    req.user = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
    };
    next();
};
exports.requireAuth = requireAuth;
//# sourceMappingURL=require-auth.js.map