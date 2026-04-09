"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const routes_1 = require("./routes");
const not_found_1 = require("./shared/middlewares/not-found");
const error_handler_1 = require("./shared/middlewares/error-handler");
exports.app = (0, express_1.default)();
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : ["http://localhost:5173", "http://localhost:3000"];
exports.app.use((0, cors_1.default)({
    origin: allowedOrigins,
    credentials: true,
}));
exports.app.use((0, helmet_1.default)());
exports.app.use((0, morgan_1.default)("dev"));
exports.app.use(express_1.default.json());
exports.app.use((0, cookie_parser_1.default)());
exports.app.get("/health", (_req, res) => {
    res.status(200).json({
        ok: true,
        message: "API running",
    });
});
exports.app.use("/api", routes_1.router);
exports.app.use(not_found_1.notFoundHandler);
exports.app.use(error_handler_1.errorHandler);
//# sourceMappingURL=app.js.map