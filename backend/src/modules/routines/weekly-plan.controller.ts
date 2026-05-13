import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../../shared/errors/async-handler";
import { successResponse } from "../../shared/responses/api-response";
import { WeeklyPlanService } from "./weekly-plan.service";

const weekOverrideSchema = z.object({
  routineExerciseId: z.string().min(1),
  suggestedWeight: z.number().min(0).nullable().optional(),
  suggestedReps: z.string().nullable().optional(),
  suggestedRpe: z.number().min(0).max(10).nullable().optional(),
  notes: z.string().nullable().optional(),
});

const weekInputSchema = z.object({
  weekNumber: z.number().int().min(1).max(52),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  overrides: z.array(weekOverrideSchema).optional(),
});

const createWeeklyPlanSchema = z.object({
  routineId: z.string().min(1),
  weeks: z.array(weekInputSchema).min(1).max(52),
  notes: z.string().optional(),
});

const updateWeekOverridesSchema = z.object({
  overrides: z.array(weekOverrideSchema),
});

const copyWeekOverridesSchema = z.object({
  fromWeek: z.number().int().min(1).max(52),
  toWeek: z.number().int().min(1).max(52),
});

const setActiveWeekSchema = z.object({
  weekNumber: z.number().int().min(1).max(52),
});

export class WeeklyPlanController {
  static createWeeklyPlan = asyncHandler(async (req: Request, res: Response) => {
    const studentId = req.params.studentId as string;
    const body = createWeeklyPlanSchema.parse(req.body);
    const result = await WeeklyPlanService.createWeeklyPlan(req.user!.userId, studentId, body);
    return res.status(201).json(successResponse("Plan semanal creado", result));
  });

  static getWeeklyPlan = asyncHandler(async (req: Request, res: Response) => {
    const studentId = req.params.studentId as string;
    const result = await WeeklyPlanService.getWeeklyPlan(req.user!.userId, studentId);
    return res.json(successResponse("Plan semanal obtenido", result));
  });

  static updateWeekOverrides = asyncHandler(async (req: Request, res: Response) => {
    const studentId = req.params.studentId as string;
    const weekNumber = req.params.weekNumber as string;
    const { overrides } = updateWeekOverridesSchema.parse(req.body);
    const result = await WeeklyPlanService.updateWeekOverrides(
      req.user!.userId,
      studentId,
      parseInt(weekNumber, 10),
      overrides
    );
    return res.json(successResponse("Overrides de la semana actualizados", result));
  });

  static copyWeekOverrides = asyncHandler(async (req: Request, res: Response) => {
    const studentId = req.params.studentId as string;
    const { fromWeek, toWeek } = copyWeekOverridesSchema.parse(req.body);
    const result = await WeeklyPlanService.copyWeekOverrides(
      req.user!.userId,
      studentId,
      fromWeek,
      toWeek
    );
    return res.json(successResponse("Semana copiada", result));
  });

  static setActiveWeek = asyncHandler(async (req: Request, res: Response) => {
    const studentId = req.params.studentId as string;
    const { weekNumber } = setActiveWeekSchema.parse(req.body);
    const result = await WeeklyPlanService.setActiveWeek(req.user!.userId, studentId, weekNumber);
    return res.json(successResponse("Semana activa actualizada", result));
  });
}
