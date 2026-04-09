"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdminSecret = void 0;
const app_error_1 = require("../errors/app-error");
const requireAdminSecret = (req, _res, next) => {
    const secret = req.headers["x-admin-secret"];
    const expected = process.env.ADMIN_SECRET;
    if (!expected) {
        return next(new app_error_1.AppError("ADMIN_SECRET no configurado en el servidor", 500));
    }
    if (!secret || secret !== expected) {
        return next(new app_error_1.AppError("No autorizado", 401));
    }
    next();
};
exports.requireAdminSecret = requireAdminSecret;
//# sourceMappingURL=require-admin-secret.js.map