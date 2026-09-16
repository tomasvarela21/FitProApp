import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/app-error";
import { errorResponse } from "../responses/api-response";

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (error instanceof ZodError) {
    return res
      .status(400)
      .json(errorResponse("Datos inválidos", error.flatten()));
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 413 &&
    "type" in error &&
    error.type === "entity.too.large"
  ) {
    return res.status(413).json(errorResponse("El cuerpo de la solicitud es demasiado grande"));
  }

  if (
    error instanceof SyntaxError &&
    "status" in error &&
    error.status === 400 &&
    "type" in error &&
    error.type === "entity.parse.failed"
  ) {
    return res.status(400).json(errorResponse("Datos inválidos"));
  }

  if (error instanceof AppError) {
    return res
      .status(error.statusCode)
      .json(errorResponse(error.message, error.details));
  }

  if (error instanceof Error) {
    if (process.env.NODE_ENV !== "production") {
      return res.status(500).json(errorResponse(error.message));
    }
    return res.status(500).json(errorResponse("Error interno del servidor"));
  }

  return res.status(500).json(errorResponse("Error interno del servidor"));
};
