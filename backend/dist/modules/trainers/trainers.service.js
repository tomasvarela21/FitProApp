"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrainersService = void 0;
const prisma_1 = require("../../infrastructure/db/prisma");
const app_error_1 = require("../../shared/errors/app-error");
const hash_1 = require("../../shared/utils/hash");
const trainers_mapper_1 = require("./trainers.mapper");
const DASHBOARD_RECENT_LIMIT = 5;
class TrainersService {
    static async createTrainer(data) {
        const existingUser = await prisma_1.prisma.user.findUnique({
            where: { email: data.email },
        });
        if (existingUser) {
            throw new app_error_1.AppError("Ya existe un usuario con ese email", 409);
        }
        const passwordHash = await (0, hash_1.hashPassword)(data.password);
        const user = await prisma_1.prisma.user.create({
            data: {
                email: data.email,
                passwordHash,
                role: "TRAINER",
                status: "ACTIVE",
                emailVerifiedAt: new Date(),
                trainer: {
                    create: {
                        firstName: data.firstName,
                        lastName: data.lastName,
                        phone: data.phone,
                    },
                },
            },
            include: {
                trainer: true,
            },
        });
        return {
            id: user.id,
            email: user.email,
            role: user.role,
            status: user.status,
            emailVerifiedAt: user.emailVerifiedAt,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            trainer: user.trainer,
        };
    }
    static async getDashboardSummary(trainerUserId) {
        const trainer = await prisma_1.prisma.trainer.findUnique({
            where: { userId: trainerUserId },
        });
        if (!trainer) {
            throw new app_error_1.AppError("El entrenador autenticado no existe", 404);
        }
        const baseWhere = { trainerId: trainer.id };
        const [total, active, invited, paused, inactive, recentStudents] = await Promise.all([
            prisma_1.prisma.student.count({ where: baseWhere }),
            prisma_1.prisma.student.count({ where: { ...baseWhere, status: "ACTIVE" } }),
            prisma_1.prisma.student.count({ where: { ...baseWhere, status: "INVITED" } }),
            prisma_1.prisma.student.count({ where: { ...baseWhere, status: "PAUSED" } }),
            prisma_1.prisma.student.count({ where: { ...baseWhere, status: "INACTIVE" } }),
            prisma_1.prisma.student.findMany({
                where: baseWhere,
                orderBy: { createdAt: "desc" },
                take: DASHBOARD_RECENT_LIMIT,
            }),
        ]);
        return {
            stats: { total, active, invited, paused, inactive },
            recentStudents: recentStudents.map(trainers_mapper_1.TrainersMapper.toDashboardStudent),
        };
    }
}
exports.TrainersService = TrainersService;
//# sourceMappingURL=trainers.service.js.map