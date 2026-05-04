import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../../shared/errors/async-handler";
import { successResponse } from "../../shared/responses/api-response";
import { RoutinesService } from "./routines.service";

const dayOfWeekEnum = z.enum([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]);

const createRoutineSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  description: z.string().optional(),
  daysOfWeek: z.array(dayOfWeekEnum).min(1, "Debe seleccionar al menos un día"),
});

const updateRoutineSchema = createRoutineSchema.partial();

const addExerciseSchema = z.object({
  exerciseId: z.string().min(1, "El ejercicio es obligatorio"),
  order: z.number().int().min(1),
  sets: z.number().int().min(1),
  reps: z.string().min(1),
  suggestedWeight: z.number().positive().optional(),
  suggestedRpe: z.number().min(1).max(10).optional(),
  restSeconds: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

const updateRoutineExerciseSchema = addExerciseSchema.omit({ exerciseId: true }).partial();

const assignRoutineSchema = z.object({
  routineId: z.string().min(1, "La rutina es obligatoria"),
  notes: z.string().optional(),
});

export class RoutinesController {
  static list = asyncHandler(async (req: Request, res: Response) => {
    const result = await RoutinesService.listRoutines(req.user!.userId);
    return res.status(200).json(successResponse("Rutinas obtenidas", result));
  });

  static getOne = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await RoutinesService.getRoutine(id);
    return res.status(200).json(successResponse("Rutina obtenida", result));
  });

  static create = asyncHandler(async (req: Request, res: Response) => {
    const data = createRoutineSchema.parse(req.body);
    const result = await RoutinesService.createRoutine(req.user!.userId, data);
    return res.status(201).json(successResponse("Rutina creada", result));
  });

  static update = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const data = updateRoutineSchema.parse(req.body);
    const result = await RoutinesService.updateRoutine(req.user!.userId, id, data);
    return res.status(200).json(successResponse("Rutina actualizada", result));
  });

  static delete = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await RoutinesService.deleteRoutine(req.user!.userId, id);
    return res.status(200).json(successResponse("Rutina eliminada", result));
  });

  static addExercise = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const data = addExerciseSchema.parse(req.body);
    const result = await RoutinesService.addExerciseToRoutine(
      req.user!.userId,
      id,
      data
    );
    return res.status(201).json(successResponse("Ejercicio agregado a la rutina", result));
  });

  static updateExercise = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const routineExerciseId = req.params.routineExerciseId as string;
    const data = updateRoutineExerciseSchema.parse(req.body);
    const result = await RoutinesService.updateRoutineExercise(
      req.user!.userId,
      id,
      routineExerciseId,
      data
    );
    return res.status(200).json(successResponse("Ejercicio actualizado", result));
  });

  static removeExercise = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const routineExerciseId = req.params.routineExerciseId as string;
    const result = await RoutinesService.removeExerciseFromRoutine(
      req.user!.userId,
      id,
      routineExerciseId
    );
    return res.status(200).json(successResponse("Ejercicio eliminado de la rutina", result));
  });

  static assignRoutine = asyncHandler(async (req: Request, res: Response) => {
    const studentId = req.params.studentId as string;
    const { routineId, notes } = assignRoutineSchema.parse(req.body);
    const result = await RoutinesService.assignRoutineToStudent(
      req.user!.userId,
      studentId,
      routineId,
      notes
    );
    return res.status(200).json(successResponse("Rutina asignada al alumno", result));
  });

  static getStudentRoutine = asyncHandler(async (req: Request, res: Response) => {
    const studentId = req.params.studentId as string;
    const result = await RoutinesService.getStudentRoutine(
      req.user!.userId,
      studentId
    );
    return res.status(200).json(successResponse("Rutina activa del alumno", result));
  });

  static getWorkoutHistory = asyncHandler(async (req: Request, res: Response) => {
    const studentId = req.params.studentId as string;
    const result = await RoutinesService.getStudentWorkoutHistory(
      req.user!.userId,
      studentId
    );
    return res.status(200).json(successResponse("Historial de entrenamientos", result));
  });
}
