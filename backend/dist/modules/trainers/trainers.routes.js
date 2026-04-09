"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trainersRouter = void 0;
const express_1 = require("express");
const validate_1 = require("../../shared/middlewares/validate");
const require_auth_1 = require("../../shared/middlewares/require-auth");
const require_role_1 = require("../../shared/middlewares/require-role");
const require_admin_secret_1 = require("../../shared/middlewares/require-admin-secret");
const trainers_schema_1 = require("./trainers.schema");
const trainers_controller_1 = require("./trainers.controller");
exports.trainersRouter = (0, express_1.Router)();
exports.trainersRouter.post("/", require_admin_secret_1.requireAdminSecret, (0, validate_1.validate)(trainers_schema_1.createTrainerSchema), trainers_controller_1.TrainersController.createTrainer);
exports.trainersRouter.get("/dashboard-summary", require_auth_1.requireAuth, (0, require_role_1.requireRole)("TRAINER"), trainers_controller_1.TrainersController.getDashboardSummary);
//# sourceMappingURL=trainers.routes.js.map