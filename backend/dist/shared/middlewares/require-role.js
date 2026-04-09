"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = void 0;
const app_error_1 = require("../errors/app-error");
const requireRole = (...allowedRoles) => (req, _res, next) => {
    if (!req.user) {
        return next(new app_error_1.AppError("No autorizado", 401));
    }
    if (!allowedRoles.includes(req.user.role)) {
        return next(new app_error_1.AppError("No tienes permisos para esta acción", 403));
    }
    next();
};
exports.requireRole = requireRole;
//# sourceMappingURL=require-role.js.map