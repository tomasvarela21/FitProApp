import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../../shared/errors/async-handler";
import { successResponse } from "../../shared/responses/api-response";
import { ExercisesService } from "./exercises.service";

const createExerciseSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  description: z.string().optional(),
  muscleGroupId: z.string().min(1, "El grupo muscular es obligatorio"),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  movementType: z.enum(["PUSH", "PULL", "HINGE", "SQUAT", "CARRY", "CORE", "CARDIO", "OLYMPIC"]),
  equipmentId: z.string().min(1).optional(),
  mediaUrl: z.string().url("URL inválida").optional(),
  mediaType: z.enum(["GIF", "YOUTUBE"]).optional(),
});

const updateExerciseSchema = createExerciseSchema.partial();

const listQuerySchema = z.object({
  muscleGroupId: z.string().optional(),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
  search: z.string().optional(),
  isGlobal: z
    .string()
    .transform((v) => (v === "true" ? true : v === "false" ? false : undefined))
    .optional(),
});

export class ExercisesController {
  static list = asyncHandler(async (req: Request, res: Response) => {
    const { muscleGroupId, difficulty, search, isGlobal } = req.query;
    const result = await ExercisesService.listExercises(
      req.user!.userId,
      req.user!.role,
      {
        muscleGroupId: muscleGroupId as string,
        difficulty: difficulty as string,
        search: search as string,
        isGlobal: isGlobal === "true" ? true : isGlobal === "false" ? false : undefined,
      }
    );
    return res.status(200).json(successResponse("Ejercicios obtenidos", result));
  });

  static getOne = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await ExercisesService.getExercise(id);
    return res.status(200).json(successResponse("Ejercicio obtenido", result));
  });

  static create = asyncHandler(async (req: Request, res: Response) => {
    const data = createExerciseSchema.parse(req.body);
    const result = await ExercisesService.createExercise(req.user!.userId, data);
    return res.status(201).json(successResponse("Ejercicio creado", result));
  });

  static update = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const data = updateExerciseSchema.parse(req.body);
    const result = await ExercisesService.updateExercise(req.user!.userId, id, data);
    return res.status(200).json(successResponse("Ejercicio actualizado", result));
  });

  static delete = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
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
