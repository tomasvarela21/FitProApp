import { Router } from "express";
import { validate } from "../../core/middlewares/validate";
import { StudentsController } from "./students.controller";
import { createStudentSchema } from "./students.schema";

export const studentsRouter = Router();

studentsRouter.post("/", validate(createStudentSchema), StudentsController.createStudent);