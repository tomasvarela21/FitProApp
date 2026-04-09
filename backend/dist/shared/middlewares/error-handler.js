"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const app_error_1 = require("../errors/app-error");
const api_response_1 = require("../responses/api-response");
const errorHandler = (error, _req, res, _next) => {
    if (error instanceof app_error_1.AppError) {
        return res
            .status(error.statusCode)
            .json((0, api_response_1.errorResponse)(error.message, error.details));
    }
    if (error instanceof Error) {
        return res.status(500).json((0, api_response_1.errorResponse)(error.message));
    }
    return res.status(500).json((0, api_response_1.errorResponse)("Error interno del servidor"));
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=error-handler.js.map