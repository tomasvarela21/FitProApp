import { Request, Response } from "express";
import { asyncHandler } from "../../shared/errors/async-handler";
import { successResponse } from "../../shared/responses/api-response";
import { listStudentsQuerySchema } from "./students.schema";
import { StudentsService } from "./students.service";

export class StudentsController {
  static createStudent = asyncHandler(async (req: Request, res: Response) => {
    const result = await StudentsService.createStudent(req.user!.userId, req.body);

    return res
      .status(201)
      .json(successResponse("Alumno creado e invitación generada", result));
  });

  static listStudents = asyncHandler(async (req: Request, res: Response) => {
    const parsedQuery = listStudentsQuerySchema.parse(req.query);

    const result = await StudentsService.listStudentsWithSubscription(
      req.user!.userId,
      parsedQuery
    );

    return res
      .status(200)
      .json(successResponse("Alumnos obtenidos correctamente", result));
  });

  static getStudentById = asyncHandler(async (req: Request, res: Response) => {
    const studentId = Array.isArray(req.params.studentId)
      ? req.params.studentId[0]
      : req.params.studentId;

    const result = await StudentsService.getStudentById(
      req.user!.userId,
      studentId
    );

    return res
      .status(200)
      .json(successResponse("Alumno obtenido correctamente", result));
  });

  static updateStudent = asyncHandler(async (req: Request, res: Response) => {
    const studentId = Array.isArray(req.params.studentId)
      ? req.params.studentId[0]
      : req.params.studentId;

    const result = await StudentsService.updateStudent(
      req.user!.userId,
      studentId,
      req.body
    );

    return res
      .status(200)
      .json(successResponse("Alumno actualizado correctamente", result));
  });

  static resendInvitation = asyncHandler(async (req: Request, res: Response) => {
    const studentId = Array.isArray(req.params.studentId)
      ? req.params.studentId[0]
      : req.params.studentId;

    const result = await StudentsService.resendInvitation(
      req.user!.userId,
      studentId
    );

    return res
      .status(200)
      .json(successResponse("Invitación reenviada correctamente", result));
  });

  static deleteStudent = asyncHandler(async (req: Request, res: Response) => {
    const studentId = Array.isArray(req.params.studentId)
      ? req.params.studentId[0]
      : req.params.studentId;

    const result = await StudentsService.deleteStudent(
      req.user!.userId,
      studentId
    );

    return res
      .status(200)
      .json(successResponse("Alumno eliminado correctamente", result));
  });

  static resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const studentId = Array.isArray(req.params.studentId)
      ? req.params.studentId[0]
      : req.params.studentId;

    const result = await StudentsService.resetStudentPassword(
      req.user!.userId,
      studentId
    );

    return res
      .status(200)
      .json(successResponse("Contraseña reseteada y email enviado", result));
  });
}