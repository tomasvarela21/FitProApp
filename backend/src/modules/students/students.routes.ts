import { Router } from "express";
import { validate } from "../../shared/middlewares/validate";
import { requireAuth } from "../../shared/middlewares/require-auth";
import { requireRole } from "../../shared/middlewares/require-role";
import { requireActiveTrial } from "../../shared/middlewares/require-active-trial";
import { StudentsController } from "./students.controller";
import { NotesInjuriesController } from "./notes-injuries.controller";
import {
  createStudentSchema,
  updateStudentSchema,
} from "./students.schema";

export const studentsRouter = Router();

studentsRouter.use(requireAuth, requireRole("TRAINER"), requireActiveTrial);

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

studentsRouter.post(
  "/:studentId/resend-invitation",
  StudentsController.resendInvitation
);

studentsRouter.post(
  "/:studentId/reset-password",
  StudentsController.resetPassword
);

studentsRouter.delete(
  "/:studentId",
  StudentsController.deleteStudent
);

studentsRouter.get("/:studentId/summary", StudentsController.getSummary);

// Notes
studentsRouter.get("/:studentId/notes", NotesInjuriesController.listNotes);
studentsRouter.post("/:studentId/notes", NotesInjuriesController.createNote);
studentsRouter.delete("/:studentId/notes/:noteId", NotesInjuriesController.deleteNote);

// Injuries
studentsRouter.get("/:studentId/injuries", NotesInjuriesController.listInjuries);
studentsRouter.post("/:studentId/injuries", NotesInjuriesController.createInjury);
studentsRouter.patch("/:studentId/injuries/:injuryId", NotesInjuriesController.updateInjury);
studentsRouter.delete("/:studentId/injuries/:injuryId", NotesInjuriesController.deleteInjury);