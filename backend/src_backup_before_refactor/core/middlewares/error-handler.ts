import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error";
import { errorResponse } from "../responses/api-response";

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (error instanceof AppError) {
    return res
      .status(error.statusCode)
      .json(errorResponse(error.message, error.details));
  }

  if (error instanceof Error) {
    return res.status(500).json(errorResponse(error.message));
  }

  return res.status(500).json(errorResponse("Error interno del servidor"));
};