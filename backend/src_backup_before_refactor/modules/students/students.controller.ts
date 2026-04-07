import { Request, Response } from "express";
import { asyncHandler } from "../../core/errors/async-handler";
import { successResponse } from "../../core/responses/api-response";
import { StudentsService } from "./students.service";

export class StudentsController {
  static createStudent = asyncHandler(async (req: Request, res: Response) => {
    const result = await StudentsService.createStudent(req.body);

    return res
      .status(201)
      .json(successResponse("Alumno creado e invitación generada", result));
  });
}