"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const express_1 = require("express");
const auth_routes_1 = require("../modules/auth/auth.routes");
const trainers_routes_1 = require("../modules/trainers/trainers.routes");
const students_routes_1 = require("../modules/students/students.routes");
exports.router = (0, express_1.Router)();
exports.router.get("/", (_req, res) => {
    res.status(200).json({
        ok: true,
        message: "Backend base OK",
    });
});
exports.router.use("/auth", auth_routes_1.authRouter);
exports.router.use("/trainers", trainers_routes_1.trainersRouter);
exports.router.use("/students", students_routes_1.studentsRouter);
//# sourceMappingURL=index.js.map