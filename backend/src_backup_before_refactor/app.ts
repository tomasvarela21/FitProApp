import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import { router } from "./routes";
import { notFoundHandler } from "./core/middlewares/not-found";
import { errorHandler } from "./core/middlewares/error-handler";

export const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
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