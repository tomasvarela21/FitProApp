import { Router } from "express";
import { authRouter } from "../modules/auth/auth.routes";
import { trainersRouter } from "../modules/trainers/trainers.routes";
import { studentsRouter } from "../modules/students/students.routes";

export const router = Router();

router.get("/", (_req, res) => {
  res.status(200).json({
    ok: true,
    message: "Backend base OK",
  });
});

router.use("/auth", authRouter);
router.use("/trainers", trainersRouter);
router.use("/students", studentsRouter);