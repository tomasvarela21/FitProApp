"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = void 0;
const api_response_1 = require("../responses/api-response");
const notFoundHandler = (_req, res) => {
    return res.status(404).json((0, api_response_1.errorResponse)("Ruta no encontrada"));
};
exports.notFoundHandler = notFoundHandler;
//# sourceMappingURL=not-found.js.map