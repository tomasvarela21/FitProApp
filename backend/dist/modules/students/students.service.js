"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentsService = void 0;
const prisma_1 = require("../../infrastructure/db/prisma");
const app_error_1 = require("../../shared/errors/app-error");
const token_1 = require("../../shared/utils/token");
const email_service_1 = require("../../infrastructure/email/email.service");
const students_mapper_1 = require("./students.mapper");
class StudentsService {
    static async createStudent(trainerUserId, data) {
        const trainer = await prisma_1.prisma.trainer.findUnique({
            where: { userId: trainerUserId },
        });
        if (!trainer) {
            throw new app_error_1.AppError("El entrenador autenticado no existe", 404);
        }
        const existingUser = await prisma_1.prisma.user.findUnique({
            where: { email: data.email },
        });
        if (existingUser) {
            throw new app_error_1.AppError("Ya existe un usuario con ese email", 409);
        }
        const rawToken = (0, token_1.generateRawToken)();
        const tokenHash = (0, token_1.hashToken)(rawToken);
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
        const { student, invitation } = await prisma_1.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email: data.email,
                    role: "STUDENT",
                    status: "INVITED",
                },
            });
            const student = await tx.student.create({
                data: {
                    trainerId: trainer.id,
                    userId: user.id,
                    email: data.email,
                    dni: data.dni,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    phone: data.phone,
                    status: "INVITED",
                    invitedAt: new Date(),
                },
            });
            const invitation = await tx.accountInvitation.create({
                data: {
                    studentId: student.id,
                    email: data.email,
                    tokenHash,
                    expiresAt,
                    createdByTrainerId: trainer.id,
                },
            });
            return { student, invitation };
        });
        // Enviar email de invitación (no bloqueante)
        email_service_1.EmailService.sendInvitation({
            to: data.email,
            firstName: data.firstName,
            trainerName: `${trainer.firstName} ${trainer.lastName}`,
            invitationToken: rawToken,
        }).catch((err) => {
            console.error("[StudentsService] Error enviando email de invitación:", err);
        });
        return {
            student: students_mapper_1.StudentsMapper.toDetail(student),
            invitation: {
                id: invitation.id,
                expiresAt: invitation.expiresAt,
            },
            ...(process.env.NODE_ENV === "development"
                ? { invitationToken: rawToken }
                : {}),
        };
    }
    static async listStudents(trainerUserId, query) {
        const trainer = await prisma_1.prisma.trainer.findUnique({
            where: { userId: trainerUserId },
        });
        if (!trainer) {
            throw new app_error_1.AppError("El entrenador autenticado no existe", 404);
        }
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;
        const skip = (page - 1) * limit;
        const search = query.search?.trim();
        const where = {
            trainerId: trainer.id,
            ...(search
                ? {
                    OR: [
                        { firstName: { contains: search, mode: "insensitive" } },
                        { lastName: { contains: search, mode: "insensitive" } },
                        { email: { contains: search, mode: "insensitive" } },
                    ],
                }
                : {}),
        };
        const [students, total] = await Promise.all([
            prisma_1.prisma.student.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma_1.prisma.student.count({ where }),
        ]);
        return {
            items: students.map(students_mapper_1.StudentsMapper.toListItem),
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit) || 1,
            },
        };
    }
    static async getStudentById(trainerUserId, studentId) {
        const trainer = await prisma_1.prisma.trainer.findUnique({
            where: { userId: trainerUserId },
        });
        if (!trainer) {
            throw new app_error_1.AppError("El entrenador autenticado no existe", 404);
        }
        const student = await prisma_1.prisma.student.findFirst({
            where: {
                id: studentId,
                trainerId: trainer.id,
            },
        });
        if (!student) {
            throw new app_error_1.AppError("Alumno no encontrado", 404);
        }
        return students_mapper_1.StudentsMapper.toDetail(student);
    }
    static async updateStudent(trainerUserId, studentId, data) {
        const trainer = await prisma_1.prisma.trainer.findUnique({
            where: { userId: trainerUserId },
        });
        if (!trainer) {
            throw new app_error_1.AppError("El entrenador autenticado no existe", 404);
        }
        const existingStudent = await prisma_1.prisma.student.findFirst({
            where: {
                id: studentId,
                trainerId: trainer.id,
            },
        });
        if (!existingStudent) {
            throw new app_error_1.AppError("Alumno no encontrado", 404);
        }
        const updatedStudent = await prisma_1.prisma.student.update({
            where: { id: studentId },
            data: {
                ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
                ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
                ...(data.phone !== undefined ? { phone: data.phone } : {}),
                ...(data.status !== undefined ? { status: data.status } : {}),
            },
        });
        return students_mapper_1.StudentsMapper.toDetail(updatedStudent);
    }
    static async deleteStudent(trainerUserId, studentId) {
        const trainer = await prisma_1.prisma.trainer.findUnique({
            where: { userId: trainerUserId },
        });
        if (!trainer) {
            throw new app_error_1.AppError("El entrenador autenticado no existe", 404);
        }
        const student = await prisma_1.prisma.student.findFirst({
            where: {
                id: studentId,
                trainerId: trainer.id,
            },
        });
        if (!student) {
            throw new app_error_1.AppError("Alumno no encontrado", 404);
        }
        await prisma_1.prisma.$transaction(async (tx) => {
            await tx.student.delete({
                where: { id: studentId },
            });
            if (student.userId) {
                await tx.user.delete({
                    where: { id: student.userId },
                });
            }
        });
        return { deleted: true };
    }
    static async resendInvitation(trainerUserId, studentId) {
        const trainer = await prisma_1.prisma.trainer.findUnique({
            where: { userId: trainerUserId },
        });
        if (!trainer) {
            throw new app_error_1.AppError("El entrenador autenticado no existe", 404);
        }
        const student = await prisma_1.prisma.student.findFirst({
            where: {
                id: studentId,
                trainerId: trainer.id,
            },
        });
        if (!student) {
            throw new app_error_1.AppError("Alumno no encontrado", 404);
        }
        if (student.status !== "INVITED") {
            throw new app_error_1.AppError("Solo se puede reenviar la invitación a alumnos con estado INVITED", 400);
        }
        const rawToken = (0, token_1.generateRawToken)();
        const tokenHash = (0, token_1.hashToken)(rawToken);
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
        await prisma_1.prisma.$transaction(async (tx) => {
            // Invalidar invitaciones anteriores
            await tx.accountInvitation.updateMany({
                where: {
                    studentId: student.id,
                    usedAt: null,
                },
                data: {
                    usedAt: new Date(),
                },
            });
            // Crear nueva invitación
            await tx.accountInvitation.create({
                data: {
                    studentId: student.id,
                    email: student.email,
                    tokenHash,
                    expiresAt,
                    createdByTrainerId: trainer.id,
                },
            });
        });
        // Enviar email (no bloqueante)
        email_service_1.EmailService.sendInvitation({
            to: student.email,
            firstName: student.firstName,
            trainerName: `${trainer.firstName} ${trainer.lastName}`,
            invitationToken: rawToken,
        }).catch((err) => {
            console.error("[StudentsService] Error reenviando invitación:", err);
        });
        return {
            sent: true,
            ...(process.env.NODE_ENV === "development"
                ? { invitationToken: rawToken }
                : {}),
        };
    }
}
exports.StudentsService = StudentsService;
//# sourceMappingURL=students.service.js.map