import { prisma } from "../../infrastructure/db/prisma";
import { AppError } from "../../shared/errors/app-error";
import { comparePassword, hashPassword } from "../../shared/utils/hash";
import { signAccessToken } from "../../shared/utils/jwt";
import { generateRawToken, hashToken } from "../../shared/utils/token";
import { EmailService } from "../../infrastructure/email/email.service";
import { CreateTrainerInput } from "../trainers/trainers.schema";
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

    const rawRefreshToken = generateRawToken(48);
    const refreshTokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await prisma.refreshToken.create({
      data: { userId: user.id, tokenHash: refreshTokenHash, expiresAt },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: AuthMapper.toAuthProfile(user),
    };
  }

  static async refreshAccessToken(rawRefreshToken: string) {
    const tokenHash = hashToken(rawRefreshToken);

    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { trainer: true, student: true } } },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new AppError("Refresh token inválido o expirado", 401);
    }

    if (stored.user.status !== "ACTIVE") {
      throw new AppError("La cuenta no está activa", 403);
    }

    // Rotación: revoca el token actual y emite uno nuevo
    const newRawToken = generateRawToken(48);
    const newTokenHash = hashToken(newRawToken);
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 30);

    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      }),
      prisma.refreshToken.create({
        data: { userId: stored.userId, tokenHash: newTokenHash, expiresAt: newExpiresAt },
      }),
    ]);

    const accessToken = signAccessToken({
      userId: stored.user.id,
      email: stored.user.email,
      role: stored.user.role,
    });

    return {
      accessToken,
      refreshToken: newRawToken,
    };
  }

  static async logout(rawRefreshToken: string) {
    const tokenHash = hashToken(rawRefreshToken);

    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (stored && !stored.revokedAt) {
      await prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });
    }

    return { loggedOut: true };
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

  static async registerTrainer(data: CreateTrainerInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new AppError("Ya existe un usuario con ese email", 409);
    }

    const passwordHash = await hashPassword(data.password);
    const trialDays = 14;
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1); // 24 horas

    const { user, verification } = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          role: "TRAINER",
          status: "INVITED", // bloqueado para login hasta verificar
        },
      });

      const trainer = await tx.trainer.create({
        data: {
          userId: newUser.id,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          subscriptionStatus: "TRIAL",
          trialEndsAt,
        },
      });

      const verification = await tx.trainerVerification.create({
        data: {
          trainerId: trainer.id,
          tokenHash,
          expiresAt,
        },
      });

      return { user: newUser, verification };
    });

    // Enviar email de verificación (no bloqueante)
    EmailService.sendTrainerVerification({
      to: user.email,
      firstName: data.firstName,
      verificationToken: rawToken,
    }).catch((err) => {
      console.error("[AuthService] Error enviando email de verificación:", err);
    });

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      trialEndsAt,
      ...(process.env.NODE_ENV === "development" ? { verificationToken: rawToken } : {}),
    };
  }

  static async verifyTrainerEmail(token: string) {
    const tokenHash = hashToken(token);

    const verification = await prisma.trainerVerification.findUnique({
      where: {
        tokenHash,
      },
      include: {
        trainer: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!verification) {
      throw new AppError("Token de verificación inválido", 404);
    }

    if (verification.usedAt) {
      throw new AppError("El email ya fue verificado", 400);
    }

    if (verification.expiresAt < new Date()) {
      throw new AppError("El token de verificación expiró", 400);
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: verification.trainer.userId },
        data: {
          status: "ACTIVE",
          emailVerifiedAt: new Date(),
        },
      }),
      prisma.trainerVerification.update({
        where: { id: verification.id },
        data: {
          usedAt: new Date(),
        },
      }),
    ]);

    return {
      emailVerified: true,
      email: verification.trainer.user.email,
    };
  }
}