"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTrainerSchema = void 0;
const zod_1 = require("zod");
exports.createTrainerSchema = zod_1.z.object({
    email: zod_1.z.string().email("Email inválido"),
    password: zod_1.z
        .string()
        .min(8, "La contraseña debe tener al menos 8 caracteres"),
    firstName: zod_1.z.string().min(2, "El nombre es obligatorio"),
    lastName: zod_1.z.string().min(2, "El apellido es obligatorio"),
    phone: zod_1.z.string().optional(),
});
//# sourceMappingURL=trainers.schema.js.map