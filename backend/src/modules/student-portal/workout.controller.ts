import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../../shared/errors/async-handler";
import { successResponse } from "../../shared/responses/api-response";
import { WorkoutService } from "./workout.service";

const workoutSetSchema = z.object({
  setNumber: z.number().int().min(1),
  reps: z.number().int().min(0),
  weight: z.number().min(0).nullable().optional(),
  rpe: z.number().min(0).max(10).nullable().optional(),
  notes: z.string().optional(),
});

const logWorkoutSchema = z.object({
  routineExercises: z
    .array(
      z.object({
        routineExerciseId: z.string().min(1),
        sets: z.array(workoutSetSchema).min(1),
      })
    )
    .min(1),
  notes: z.string().optional(),
  date: z.string().optional(),
});

export class WorkoutController {
  static getMyRoutine = asyncHandler(async (req: Request, res: Response) => {
    const result = await WorkoutService.getMyRoutine(req.user!.userId);
    return res.status(200).json(successResponse("Rutina activa obtenida", result));
  });

  static getTodayWorkout = asyncHandler(async (req: Request, res: Response) => {
    const result = await WorkoutService.getTodayWorkout(req.user!.userId);
    return res.status(200).json(successResponse("Entrenamiento de hoy obtenido", result));
  });

  static logWorkout = asyncHandler(async (req: Request, res: Response) => {
    const data = logWorkoutSchema.parse(req.body);
    const result = await WorkoutService.logWorkout(req.user!.userId, data);
    return res.status(201).json(successResponse("Entrenamiento registrado", result));
  });

  static getMyWorkoutHistory = asyncHandler(async (req: Request, res: Response) => {
    const result = await WorkoutService.getMyWorkoutHistory(req.user!.userId);
    return res.status(200).json(successResponse("Historial de entrenamientos obtenido", result));
  });

  static getMyProgress = asyncHandler(async (req: Request, res: Response) => {
    const exerciseId = req.params.exerciseId as string;
    const result = await WorkoutService.getMyProgress(req.user!.userId, exerciseId);
    return res.status(200).json(successResponse("Progreso obtenido", result));
  });

  static getMyStreak = asyncHandler(async (req: Request, res: Response) => {
    const today = typeof req.query.today === "string" ? req.query.today : undefined;
    const result = await WorkoutService.getMyStreak(req.user!.userId, today);
    return res.status(200).json(successResponse("Racha obtenida", result));
  });
}
