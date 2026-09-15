import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../../shared/errors/async-handler";
import { successResponse } from "../../shared/responses/api-response";
import {
  cuidSchema,
  dateInputSchema,
  weekNumberParamSchema,
} from "../../shared/schemas/request.schema";
import { WeeklyPlanService } from "./weekly-plan.service";

const weekOverrideSchema = z.object({
  routineExerciseId: cuidSchema,
  suggestedWeight: z.number().min(0).nullable().optional(),
  suggestedReps: z.string().nullable().optional(),
  suggestedRpe: z.number().min(0).max(10).nullable().optional(),
  notes: z.string().nullable().optional(),
});

const weekInputSchema = z.object({
  weekNumber: z.number().int().min(1).max(52),
  startDate: dateInputSchema.optional(),
  endDate: dateInputSchema.optional(),
  overrides: z.array(weekOverrideSchema).optional(),
});

const createWeeklyPlanSchema = z.object({
  routineId: cuidSchema,
  weeks: z.array(weekInputSchema).min(1).max(52),
  notes: z.string().optional(),
}).superRefine(({ weeks }, ctx) => {
  const weekNumbers = new Set<number>();
  for (const [index, week] of weeks.entries()) {
    if (weekNumbers.has(week.weekNumber)) {
      ctx.addIssue({
        code: "custom",
        path: ["weeks", index, "weekNumber"],
        message: "El número de semana está duplicado",
      });
    }
    weekNumbers.add(week.weekNumber);

    if (Boolean(week.startDate) !== Boolean(week.endDate)) {
      ctx.addIssue({
        code: "custom",
        path: ["weeks", index],
        message: "La semana debe indicar fecha de inicio y fin",
      });
    } else if (week.startDate && week.endDate && week.startDate > week.endDate) {
      ctx.addIssue({
        code: "custom",
        path: ["weeks", index, "endDate"],
        message: "La fecha de fin debe ser igual o posterior al inicio",
      });
    }
  }

  const datedWeeks = weeks
    .filter((week): week is typeof week & { startDate: string; endDate: string } =>
      Boolean(week.startDate && week.endDate)
    )
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  for (let index = 1; index < datedWeeks.length; index++) {
    if (datedWeeks[index].startDate <= datedWeeks[index - 1].endDate) {
      ctx.addIssue({
        code: "custom",
        path: ["weeks"],
        message: "Los intervalos de semanas no pueden superponerse",
      });
      break;
    }
  }

  if (!weekNumbers.has(1)) {
    ctx.addIssue({
      code: "custom",
      path: ["weeks"],
      message: "El plan debe incluir la semana 1",
    });
  }
});

const updateWeekOverridesSchema = z.object({
  version: z.number().int().positive(),
  overrides: z.array(weekOverrideSchema),
});

const copyWeekOverridesSchema = z.object({
  fromWeek: z.number().int().min(1).max(52),
  toWeek: z.number().int().min(1).max(52),
  version: z.number().int().positive(),
});

const setActiveWeekSchema = z.object({
  weekNumber: z.number().int().min(1).max(52),
});

export class WeeklyPlanController {
  static createWeeklyPlan = asyncHandler(async (req: Request, res: Response) => {
    const studentId = cuidSchema.parse(req.params.studentId);
    const body = createWeeklyPlanSchema.parse(req.body);
    const result = await WeeklyPlanService.createWeeklyPlan(req.user!.userId, studentId, body);
    return res.status(201).json(successResponse("Plan semanal creado", result));
  });

  static getWeeklyPlan = asyncHandler(async (req: Request, res: Response) => {
    const studentId = cuidSchema.parse(req.params.studentId);
    const result = await WeeklyPlanService.getWeeklyPlan(req.user!.userId, studentId);
    return res.json(successResponse("Plan semanal obtenido", result));
  });

  static updateWeekOverrides = asyncHandler(async (req: Request, res: Response) => {
    const studentId = cuidSchema.parse(req.params.studentId);
    const weekNumber = weekNumberParamSchema.parse(req.params.weekNumber);
    const { version, overrides } = updateWeekOverridesSchema.parse(req.body);
    const result = await WeeklyPlanService.updateWeekOverrides(
      req.user!.userId,
      studentId,
      weekNumber,
      version,
      overrides
    );
    return res.json(successResponse("Overrides de la semana actualizados", result));
  });

  static copyWeekOverrides = asyncHandler(async (req: Request, res: Response) => {
    const studentId = cuidSchema.parse(req.params.studentId);
    const { fromWeek, toWeek, version } = copyWeekOverridesSchema.parse(req.body);
    const result = await WeeklyPlanService.copyWeekOverrides(
      req.user!.userId,
      studentId,
      fromWeek,
      toWeek,
      version
    );
    return res.json(successResponse("Semana copiada", result));
  });

  static setActiveWeek = asyncHandler(async (req: Request, res: Response) => {
    const studentId = cuidSchema.parse(req.params.studentId);
    const { weekNumber } = setActiveWeekSchema.parse(req.body);
    const result = await WeeklyPlanService.setActiveWeek(req.user!.userId, studentId, weekNumber);
    return res.json(successResponse("Semana activa actualizada", result));
  });
}
