import { Request, Response } from "express";
import { errorResponse } from "../responses/api-response";

export const notFoundHandler = (_req: Request, res: Response) => {
  return res.status(404).json(errorResponse("Ruta no encontrada"));
};