import { prisma } from "../../infrastructure/db/prisma";
import { AppError } from "../../shared/errors/app-error";
import { comparePassword, hashPassword } from "../../shared/utils/hash";
import { signAccessToken } from "../../shared/utils/jwt";
import { hashToken } from "../../shared/utils/token";
import { AuthMapper } from "./auth.mapper";
import {
  ActivateAccountInput,
  ChangePasswordInput,
  LoginInput,
} from "./auth.schema";

export class AuthService {
  static async activateAccount(data: ActivateAccountInput) {
    const tokenHash = hashToken(data.token);

    const invitation = await prisma.accountInvitation.findFirst({
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
      throw new AppError("Invitación inválida", 404);
    }

    if (invitation.usedAt) {
      throw new AppError("La invitación ya fue utilizada", 400);
    }

    if (invitation.expiresAt < new Date()) {
      throw new AppError("La invitación expiró", 400);
    }

    if (!invitation.student.userId || !invitation.student.user) {
      throw new AppError("El alumno no tiene una cuenta vinculada", 500);
    }

    const passwordHash = await hashPassword(data.password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: invitation.student.userId },
        data: {
          passwordHash,
          status: "ACTIVE",
          emailVerifiedAt: new Date(),
          mustChangePassword: false,
        },
      }),
      prisma.student.update({
        where: { id: invitation.student.id },
        data: {
          status: "ACTIVE",
          activatedAt: new Date(),
        },
      }),
      prisma.accountInvitation.update({
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

  static async login(data: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: {
        trainer: true,
        student: true,
      },
    });

    if (!user) {
      throw new AppError("Credenciales inválidas", 401);
    }

    if (!user.passwordHash) {
      throw new AppError("La cuenta aún no tiene contraseña configurada", 400);
    }

    if (user.status !== "ACTIVE") {
      throw new AppError("La cuenta no está activa", 403);
    }

    const isPasswordValid = await comparePassword(
      data.password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new AppError("Credenciales inválidas", 401);
    }

    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      user: AuthMapper.toAuthProfile(user),
    };
  }

  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        trainer: true,
        student: true,
      },
    });

    if (!user) {
      throw new AppError("Usuario no encontrado", 404);
    }

    return AuthMapper.toAuthProfile(user);
  }

  static async changePassword(userId: string, data: ChangePasswordInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("Usuario no encontrado", 404);
    }

    if (!user.passwordHash) {
      throw new AppError("La cuenta no tiene contraseña configurada", 400);
    }

    const isCurrentPasswordValid = await comparePassword(
      data.currentPassword,
      user.passwordHash
    );

    if (!isCurrentPasswordValid) {
      throw new AppError("La contraseña actual es incorrecta", 401);
    }

    const newPasswordHash = await hashPassword(data.newPassword);

    await prisma.user.update({
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