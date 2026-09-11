import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../../shared/errors/async-handler";
import { successResponse } from "../../shared/responses/api-response";
import { cuidSchema } from "../../shared/schemas/request.schema";
import { ExercisesService } from "./exercises.service";

const createExerciseSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  description: z.string().optional(),
  muscleGroupId: cuidSchema,
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  movementType: z.enum(["PUSH", "PULL", "HINGE", "SQUAT", "CARRY", "CORE", "CARDIO", "OLYMPIC"]),
  equipmentId: cuidSchema.optional(),
  mediaUrl: z.string().url("URL inválida").optional(),
  mediaType: z.enum(["GIF", "YOUTUBE"]).optional(),
});

const updateExerciseSchema = createExerciseSchema.partial();

const listQuerySchema = z.object({
  muscleGroupId: cuidSchema.optional(),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
  search: z.string().optional(),
  isGlobal: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
});

export class ExercisesController {
  static list = asyncHandler(async (req: Request, res: Response) => {
    const filters = listQuerySchema.parse(req.query);
    const result = await ExercisesService.listExercises(
      req.user!.userId,
      req.user!.role,
      filters
    );
    return res.status(200).json(successResponse("Ejercicios obtenidos", result));
  });

  static getOne = asyncHandler(async (req: Request, res: Response) => {
    const id = cuidSchema.parse(req.params.id);
    const result = await ExercisesService.getExercise(
      req.user!.userId,
      req.user!.role,
      id,
    );
    return res.status(200).json(successResponse("Ejercicio obtenido", result));
  });

  static create = asyncHandler(async (req: Request, res: Response) => {
    const data = createExerciseSchema.parse(req.body);
    const result = await ExercisesService.createExercise(req.user!.userId, data);
    return res.status(201).json(successResponse("Ejercicio creado", result));
  });

  static update = asyncHandler(async (req: Request, res: Response) => {
    const id = cuidSchema.parse(req.params.id);
    const data = updateExerciseSchema.parse(req.body);
    const result = await ExercisesService.updateExercise(req.user!.userId, id, data);
    return res.status(200).json(successResponse("Ejercicio actualizado", result));
  });

  static delete = asyncHandler(async (req: Request, res: Response) => {
    const id = cuidSchema.parse(req.params.id);
    const result = await ExercisesService.deleteExercise(req.user!.userId, id);
    return res.status(200).json(successResponse("Ejercicio eliminado", result));
  });

  static getMuscleGroups = asyncHandler(async (_req: Request, res: Response) => {
    const result = await ExercisesService.listMuscleGroups();
    return res.status(200).json(successResponse("Grupos musculares obtenidos", result));
  });

  static getEquipment = asyncHandler(async (_req: Request, res: Response) => {
    const result = await ExercisesService.listEquipment();
    return res.status(200).json(successResponse("Equipamiento obtenido", result));
  });
}
