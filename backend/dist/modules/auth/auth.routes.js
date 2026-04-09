"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const validate_1 = require("../../shared/middlewares/validate");
const require_auth_1 = require("../../shared/middlewares/require-auth");
const auth_controller_1 = require("./auth.controller");
const auth_schema_1 = require("./auth.schema");
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post("/activate-account", (0, validate_1.validate)(auth_schema_1.activateAccountSchema), auth_controller_1.AuthController.activateAccount);
exports.authRouter.post("/login", (0, validate_1.validate)(auth_schema_1.loginSchema), auth_controller_1.AuthController.login);
exports.authRouter.get("/me", require_auth_1.requireAuth, auth_controller_1.AuthController.me);
exports.authRouter.post("/change-password", require_auth_1.requireAuth, (0, validate_1.validate)(auth_schema_1.changePasswordSchema), auth_controller_1.AuthController.changePassword);
//# sourceMappingURL=auth.routes.js.map