"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.studentsRouter = void 0;
const express_1 = require("express");
const validate_1 = require("../../shared/middlewares/validate");
const require_auth_1 = require("../../shared/middlewares/require-auth");
const require_role_1 = require("../../shared/middlewares/require-role");
const students_controller_1 = require("./students.controller");
const students_schema_1 = require("./students.schema");
exports.studentsRouter = (0, express_1.Router)();
exports.studentsRouter.use(require_auth_1.requireAuth, (0, require_role_1.requireRole)("TRAINER"));
exports.studentsRouter.get("/", students_controller_1.StudentsController.listStudents);
exports.studentsRouter.get("/:studentId", students_controller_1.StudentsController.getStudentById);
exports.studentsRouter.post("/", (0, validate_1.validate)(students_schema_1.createStudentSchema), students_controller_1.StudentsController.createStudent);
exports.studentsRouter.patch("/:studentId", (0, validate_1.validate)(students_schema_1.updateStudentSchema), students_controller_1.StudentsController.updateStudent);
exports.studentsRouter.post("/:studentId/resend-invitation", students_controller_1.StudentsController.resendInvitation);
exports.studentsRouter.delete("/:studentId", students_controller_1.StudentsController.deleteStudent);
//# sourceMappingURL=students.routes.js.map