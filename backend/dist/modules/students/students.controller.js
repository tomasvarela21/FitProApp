"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentsController = void 0;
const async_handler_1 = require("../../shared/errors/async-handler");
const api_response_1 = require("../../shared/responses/api-response");
const students_schema_1 = require("./students.schema");
const students_service_1 = require("./students.service");
class StudentsController {
    static createStudent = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const result = await students_service_1.StudentsService.createStudent(req.user.userId, req.body);
        return res
            .status(201)
            .json((0, api_response_1.successResponse)("Alumno creado e invitación generada", result));
    });
    static listStudents = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const parsedQuery = students_schema_1.listStudentsQuerySchema.parse(req.query);
        const result = await students_service_1.StudentsService.listStudents(req.user.userId, parsedQuery);
        return res
            .status(200)
            .json((0, api_response_1.successResponse)("Alumnos obtenidos correctamente", result));
    });
    static getStudentById = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const studentId = Array.isArray(req.params.studentId)
            ? req.params.studentId[0]
            : req.params.studentId;
        const result = await students_service_1.StudentsService.getStudentById(req.user.userId, studentId);
        return res
            .status(200)
            .json((0, api_response_1.successResponse)("Alumno obtenido correctamente", result));
    });
    static updateStudent = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const studentId = Array.isArray(req.params.studentId)
            ? req.params.studentId[0]
            : req.params.studentId;
        const result = await students_service_1.StudentsService.updateStudent(req.user.userId, studentId, req.body);
        return res
            .status(200)
            .json((0, api_response_1.successResponse)("Alumno actualizado correctamente", result));
    });
    static resendInvitation = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const studentId = Array.isArray(req.params.studentId)
            ? req.params.studentId[0]
            : req.params.studentId;
        const result = await students_service_1.StudentsService.resendInvitation(req.user.userId, studentId);
        return res
            .status(200)
            .json((0, api_response_1.successResponse)("Invitación reenviada correctamente", result));
    });
    static deleteStudent = (0, async_handler_1.asyncHandler)(async (req, res) => {
        const studentId = Array.isArray(req.params.studentId)
            ? req.params.studentId[0]
            : req.params.studentId;
        const result = await students_service_1.StudentsService.deleteStudent(req.user.userId, studentId);
        return res
            .status(200)
            .json((0, api_response_1.successResponse)("Alumno eliminado correctamente", result));
    });
}
exports.StudentsController = StudentsController;
//# sourceMappingURL=students.controller.js.map