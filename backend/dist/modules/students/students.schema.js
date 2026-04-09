"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStudentSchema = exports.listStudentsQuerySchema = exports.createStudentSchema = void 0;
const zod_1 = require("zod");
exports.createStudentSchema = zod_1.z.object({
    email: zod_1.z.string().email("Email inválido"),
    dni: zod_1.z.string().min(6, "El DNI es obligatorio"),
    firstName: zod_1.z.string().min(2, "El nombre es obligatorio"),
    lastName: zod_1.z.string().min(2, "El apellido es obligatorio"),
    phone: zod_1.z.string().optional(),
});
exports.listStudentsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(50).default(10),
    search: zod_1.z.string().trim().optional(),
});
exports.updateStudentSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(2, "El nombre es obligatorio").optional(),
    lastName: zod_1.z.string().min(2, "El apellido es obligatorio").optional(),
    phone: zod_1.z.string().optional(),
    status: zod_1.z.enum(["INVITED", "ACTIVE", "PAUSED", "INACTIVE"]).optional(),
});
//# sourceMappingURL=students.schema.js.map