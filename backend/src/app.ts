import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import { router } from "./routes";
import { notFoundHandler } from "./shared/middlewares/not-found";
import { errorHandler } from "./shared/middlewares/error-handler";
import { errorResponse } from "./shared/responses/api-response";

export const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:5173", "http://localhost:3000"];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json(errorResponse("Demasiadas solicitudes, intentá de nuevo en un minuto"));
  },
});

app.use(globalLimiter);

app.get("/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    message: "API running",
  });
});

app.use("/api", router);

app.use(notFoundHandler);
app.use(errorHandler);