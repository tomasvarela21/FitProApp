"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePasswordSchema = exports.loginSchema = exports.activateAccountSchema = void 0;
const zod_1 = require("zod");
exports.activateAccountSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, "El token es obligatorio"),
    password: zod_1.z
        .string()
        .min(8, "La contraseña debe tener al menos 8 caracteres"),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email("Email inválido"),
    password: zod_1.z.string().min(8, "La contraseña es obligatoria"),
});
exports.changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(8, "La contraseña actual es obligatoria"),
    newPassword: zod_1.z
        .string()
        .min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
});
//# sourceMappingURL=auth.schema.js.map