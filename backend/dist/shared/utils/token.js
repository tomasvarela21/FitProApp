"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashToken = exports.generateRawToken = void 0;
const crypto_1 = __importDefault(require("crypto"));
const generateRawToken = (size = 32) => {
    return crypto_1.default.randomBytes(size).toString("hex");
};
exports.generateRawToken = generateRawToken;
const hashToken = (token) => {
    return crypto_1.default.createHash("sha256").update(token).digest("hex");
};
exports.hashToken = hashToken;
//# sourceMappingURL=token.js.map