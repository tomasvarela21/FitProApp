import { prisma } from "../../db/prisma";
import { AppError } from "../../core/errors/app-error";
import { generateRawToken, hashToken } from "../../core/utils/token";
import { CreateStudentInput } from "./students.schema";

export class StudentsService {
  static async createStudent(data: CreateStudentInput) {
    const trainer = await prisma.trainer.findUnique({
      where: { id: data.trainerId },
    });

    if (!trainer) {
      throw new AppError("El entrenador no existe", 404);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new AppError("Ya existe un usuario con ese email", 409);
    }

    const user = await prisma.user.create({
      data: {
        email: data.email,
        role: "STUDENT",
        status: "INVITED",
      },
    });

    const student = await prisma.student.create({
      data: {
        trainerId: data.trainerId,
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

    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);

    const invitation = await prisma.accountInvitation.create({
      data: {
        studentId: student.id,
        email: data.email,
        tokenHash,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        createdByTrainerId: data.trainerId,
      },
    });

    return {
      student: {
        id: student.id,
        trainerId: student.trainerId,
        userId: student.userId,
        email: student.email,
        dni: student.dni,
        firstName: student.firstName,
        lastName: student.lastName,
        phone: student.phone,
        status: student.status,
        invitedAt: student.invitedAt,
        activatedAt: student.activatedAt,
        createdAt: student.createdAt,
        updatedAt: student.updatedAt,
      },
      invitation: {
        id: invitation.id,
        expiresAt: invitation.expiresAt,
      },
      invitationToken: rawToken
    };
  }
}