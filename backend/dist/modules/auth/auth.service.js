"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const prisma_1 = require("../../infrastructure/db/prisma");
const app_error_1 = require("../../shared/errors/app-error");
const hash_1 = require("../../shared/utils/hash");
const jwt_1 = require("../../shared/utils/jwt");
const token_1 = require("../../shared/utils/token");
const auth_mapper_1 = require("./auth.mapper");
class AuthService {
    static async activateAccount(data) {
        const tokenHash = (0, token_1.hashToken)(data.token);
        const invitation = await prisma_1.prisma.accountInvitation.findFirst({
            where: {
                tokenHash,
            },
            include: {
                student: {
                    include: {
                        user: true,
                    },
                },
            },
        });
        if (!invitation) {
            throw new app_error_1.AppError("Invitación inválida", 404);
        }
        if (invitation.usedAt) {
            throw new app_error_1.AppError("La invitación ya fue utilizada", 400);
        }
        if (invitation.expiresAt < new Date()) {
            throw new app_error_1.AppError("La invitación expiró", 400);
        }
        if (!invitation.student.userId || !invitation.student.user) {
            throw new app_error_1.AppError("El alumno no tiene una cuenta vinculada", 500);
        }
        const passwordHash = await (0, hash_1.hashPassword)(data.password);
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.user.update({
                where: { id: invitation.student.userId },
                data: {
                    passwordHash,
                    status: "ACTIVE",
                    emailVerifiedAt: new Date(),
                    mustChangePassword: false,
                },
            }),
            prisma_1.prisma.student.update({
                where: { id: invitation.student.id },
                data: {
                    status: "ACTIVE",
                    activatedAt: new Date(),
                },
            }),
            prisma_1.prisma.accountInvitation.update({
                where: { id: invitation.id },
                data: {
                    usedAt: new Date(),
                },
            }),
        ]);
        return {
            userId: invitation.student.userId,
            studentId: invitation.student.id,
            email: invitation.student.email,
            activated: true,
        };
    }
    static async login(data) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { email: data.email },
            include: {
                trainer: true,
                student: true,
            },
        });
        if (!user) {
            throw new app_error_1.AppError("Credenciales inválidas", 401);
        }
        if (!user.passwordHash) {
            throw new app_error_1.AppError("La cuenta aún no tiene contraseña configurada", 400);
        }
        if (user.status !== "ACTIVE") {
            throw new app_error_1.AppError("La cuenta no está activa", 403);
        }
        const isPasswordValid = await (0, hash_1.comparePassword)(data.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new app_error_1.AppError("Credenciales inválidas", 401);
        }
        const accessToken = (0, jwt_1.signAccessToken)({
            userId: user.id,
            email: user.email,
            role: user.role,
        });
        return {
            accessToken,
            user: auth_mapper_1.AuthMapper.toAuthProfile(user),
        };
    }
    static async getMe(userId) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            include: {
                trainer: true,
                student: true,
            },
        });
        if (!user) {
            throw new app_error_1.AppError("Usuario no encontrado", 404);
        }
        return auth_mapper_1.AuthMapper.toAuthProfile(user);
    }
    static async changePassword(userId, data) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new app_error_1.AppError("Usuario no encontrado", 404);
        }
        if (!user.passwordHash) {
            throw new app_error_1.AppError("La cuenta no tiene contraseña configurada", 400);
        }
        const isCurrentPasswordValid = await (0, hash_1.comparePassword)(data.currentPassword, user.passwordHash);
        if (!isCurrentPasswordValid) {
            throw new app_error_1.AppError("La contraseña actual es incorrecta", 401);
        }
        const newPasswordHash = await (0, hash_1.hashPassword)(data.newPassword);
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: {
                passwordHash: newPasswordHash,
                mustChangePassword: false,
            },
        });
        return {
            changed: true,
        };
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map