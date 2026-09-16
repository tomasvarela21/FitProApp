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
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
  : ["http://localhost:5173", "http://localhost:3000"];

function integerSetting(name: string, fallback: number, minimum: number): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < minimum) {
    throw new Error(`[ENV] ${name} debe ser un entero mayor o igual a ${minimum}`);
  }
  return parsed;
}

const trustProxyHops = integerSetting("TRUST_PROXY_HOPS", 0, 0);
const rateLimitWindowMs = integerSetting("RATE_LIMIT_WINDOW_MS", 60_000, 1_000);
const rateLimitMax = integerSetting("RATE_LIMIT_MAX", 100, 1);

if (trustProxyHops > 0) {
  app.set("trust proxy", trustProxyHops);
}

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
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

const globalLimiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: rateLimitMax,
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
