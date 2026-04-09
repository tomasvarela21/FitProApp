"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrainersController = void 0;
const async_handler_1 = require("../../shared/errors/async-handler");
const api_response_1 = require("../../shared/responses/api-response");
const trainers_service_1 = require("./trainers.service");
class TrainersController {
    static createTrainer = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const trainer = await trainers_service_1.TrainersService.createTrainer(req.body);
        return res
            .status(201)
            .json((0, api_response_1.successResponse)("Entrenador creado correctamente", trainer));
    });
    static getDashboardSummary = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const result = await trainers_service_1.TrainersService.getDashboardSummary(req.user.userId);
        return res
            .status(200)
            .json((0, api_response_1.successResponse)("Dashboard obtenido correctamente", result));
    });
}
exports.TrainersController = TrainersController;
//# sourceMappingURL=trainers.controller.js.map