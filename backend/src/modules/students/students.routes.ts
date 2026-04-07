import { Router } from "express";
import { validate } from "../../shared/middlewares/validate";
import { requireAuth } from "../../shared/middlewares/require-auth";
import { requireRole } from "../../shared/middlewares/require-role";
import { StudentsController } from "./students.controller";
import {
  createStudentSchema,
  updateStudentSchema,
} from "./students.schema";

export const studentsRouter = Router();

studentsRouter.use(requireAuth, requireRole("TRAINER"));

studentsRouter.get("/", StudentsController.listStudents);

studentsRouter.get("/:studentId", StudentsController.getStudentById);

studentsRouter.post(
  "/",
  validate(createStudentSchema),
  StudentsController.createStudent
);

studentsRouter.patch(
  "/:studentId",
  validate(updateStudentSchema),
  StudentsController.updateStudent
);