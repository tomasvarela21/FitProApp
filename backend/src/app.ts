import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import { router } from "./routes";
import { notFoundHandler } from "./shared/middlewares/not-found";
import { errorHandler } from "./shared/middlewares/error-handler";

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

app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    message: "API running",
  });
});

app.use("/api", router);

app.use(notFoundHandler);
app.use(errorHandler);