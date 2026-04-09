"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorResponse = exports.successResponse = void 0;
const successResponse = (message, data) => ({
    ok: true,
    message,
    data,
});
exports.successResponse = successResponse;
const errorResponse = (message, errors) => ({
    ok: false,
    message,
    errors,
});
exports.errorResponse = errorResponse;
//# sourceMappingURL=api-response.js.map