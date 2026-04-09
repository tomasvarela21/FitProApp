"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const api_response_1 = require("../responses/api-response");
const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json((0, api_response_1.errorResponse)("Datos inválidos", result.error.flatten()));
    }
    req.body = result.data;
    next();
};
exports.validate = validate;
//# sourceMappingURL=validate.js.map