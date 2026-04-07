import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { errorResponse } from "../responses/api-response";

export const validate =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json(
        errorResponse("Datos inválidos", result.error.flatten())
      );
    }

    req.body = result.data;
    next();
  };