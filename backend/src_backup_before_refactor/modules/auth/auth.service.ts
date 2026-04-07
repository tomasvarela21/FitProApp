import { prisma } from "../../db/prisma";
import { AppError } from "../../core/errors/app-error";
import { hashPassword } from "../../core/utils/hash";
import { hashToken } from "../../core/utils/token";
import { ActivateAccountInput } from "./auth.schema";

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
}