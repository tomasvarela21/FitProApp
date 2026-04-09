"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resend = void 0;
const resend_1 = require("resend");
if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY no está definido");
}
exports.resend = new resend_1.Resend(process.env.RESEND_API_KEY);
//# sourceMappingURL=resend.js.map