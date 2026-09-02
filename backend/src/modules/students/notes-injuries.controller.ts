import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../../shared/errors/async-handler";
import { successResponse } from "../../shared/responses/api-response";
import { NotesInjuriesService } from "./notes-injuries.service";

const createNoteSchema = z.object({ content: z.string().min(1).max(2000) });

const createInjurySchema = z.object({
  bodyPart: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  severity: z.enum(["MILD", "MODERATE", "SEVERE"]),
  occurredAt: z.string().min(1),
  notes: z.string().max(1000).optional(),
});

const updateInjurySchema = z.object({
  resolvedAt: z.string().nullable().optional(),
  notes: z.string().max(1000).optional(),
});

export class NotesInjuriesController {
  static listNotes = asyncHandler(async (req: Request, res: Response) => {
    const studentId = req.params.studentId as string;
    const result = await NotesInjuriesService.listNotes(req.user!.userId, studentId);
    return res.json(successResponse("Notas obtenidas", result));
  });

  static createNote = asyncHandler(async (req: Request, res: Response) => {
    const studentId = req.params.studentId as string;
    const { content } = createNoteSchema.parse(req.body);
    const result = await NotesInjuriesService.createNote(req.user!.userId, studentId, content);
    return res.status(201).json(successResponse("Nota creada", result));
  });

  static deleteNote = asyncHandler(async (req: Request, res: Response) => {
    const studentId = req.params.studentId as string;
    const noteId = req.params.noteId as string;
    const result = await NotesInjuriesService.deleteNote(req.user!.userId, studentId, noteId);
    return res.json(successResponse("Nota eliminada", result));
  });

  static listInjuries = asyncHandler(async (req: Request, res: Response) => {
    const studentId = req.params.studentId as string;
    const result = await NotesInjuriesService.listInjuries(req.user!.userId, studentId);
    return res.json(successResponse("Lesiones obtenidas", result));
  });

  static createInjury = asyncHandler(async (req: Request, res: Response) => {
    const studentId = req.params.studentId as string;
    const data = createInjurySchema.parse(req.body);
    const result = await NotesInjuriesService.createInjury(req.user!.userId, studentId, data);
    return res.status(201).json(successResponse("Lesión registrada", result));
  });

  static updateInjury = asyncHandler(async (req: Request, res: Response) => {
    const studentId = req.params.studentId as string;
    const injuryId = req.params.injuryId as string;
    const data = updateInjurySchema.parse(req.body);
    const result = await NotesInjuriesService.updateInjury(req.user!.userId, studentId, injuryId, data);
    return res.json(successResponse("Lesión actualizada", result));
  });

  static deleteInjury = asyncHandler(async (req: Request, res: Response) => {
    const studentId = req.params.studentId as string;
    const injuryId = req.params.injuryId as string;
    const result = await NotesInjuriesService.deleteInjury(req.user!.userId, studentId, injuryId);
    return res.json(successResponse("Lesión eliminada", result));
  });
}
