import rateLimit from "express-rate-limit";
import { errorResponse } from "../responses/api-response";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json(errorResponse("Demasiados intentos, intentá de nuevo en 15 minutos"));
  },
});
