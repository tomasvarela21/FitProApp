import { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/db/prisma";
import { AppError } from "../../shared/errors/app-error";
import { generateRawToken, hashToken } from "../../shared/utils/token";
import { EmailService } from "../../infrastructure/email/email.service";
import { StudentsMapper } from "./students.mapper";
import {
  CreateStudentInput,
  ListStudentsQueryInput,
  UpdateStudentInput,
} from "./students.schema";

export class StudentsService {
  static async createStudent(trainerUserId: string, data: CreateStudentInput) {
    const trainer = await prisma.trainer.findUnique({
      where: { userId: trainerUserId },
    });

    if (!trainer) {
      throw new AppError("El entrenador autenticado no existe", 404);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new AppError("Ya existe un usuario con ese email", 409);
    }

    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

    const { student, invitation } = await prisma.$transaction(async (tx) => {
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
    EmailService.sendInvitation({
      to: data.email,
      firstName: data.firstName,
      trainerName: `${trainer.firstName} ${trainer.lastName}`,
      invitationToken: rawToken,
    }).catch((err) => {
      console.error("[StudentsService] Error enviando email de invitación:", err);
    });

    return {
      student: StudentsMapper.toDetail(student),
      invitation: {
        id: invitation.id,
        expiresAt: invitation.expiresAt,
      },
      ...(process.env.NODE_ENV === "development"
        ? { invitationToken: rawToken }
        : {}),
    };
  }

  static async listStudents(
    trainerUserId: string,
    query: ListStudentsQueryInput
  ) {
    const trainer = await prisma.trainer.findUnique({
      where: { userId: trainerUserId },
    });

    if (!trainer) {
      throw new AppError("El entrenador autenticado no existe", 404);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    const where: Prisma.StudentWhereInput = {
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
      prisma.student.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.student.count({ where }),
    ]);

    return {
      items: students.map(StudentsMapper.toListItem),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  static async getStudentById(trainerUserId: string, studentId: string) {
    const trainer = await prisma.trainer.findUnique({
      where: { userId: trainerUserId },
    });

    if (!trainer) {
      throw new AppError("El entrenador autenticado no existe", 404);
    }

    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        trainerId: trainer.id,
      },
    });

    if (!student) {
      throw new AppError("Alumno no encontrado", 404);
    }

    return StudentsMapper.toDetail(student);
  }

  static async updateStudent(
    trainerUserId: string,
    studentId: string,
    data: UpdateStudentInput
  ) {
    const trainer = await prisma.trainer.findUnique({
      where: { userId: trainerUserId },
    });

    if (!trainer) {
      throw new AppError("El entrenador autenticado no existe", 404);
    }

    const existingStudent = await prisma.student.findFirst({
      where: {
        id: studentId,
        trainerId: trainer.id,
      },
    });

    if (!existingStudent) {
      throw new AppError("Alumno no encontrado", 404);
    }

    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: {
        ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
        ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
    });

    return StudentsMapper.toDetail(updatedStudent);
  }

  static async deleteStudent(trainerUserId: string, studentId: string) {
    const trainer = await prisma.trainer.findUnique({
      where: { userId: trainerUserId },
    });

    if (!trainer) {
      throw new AppError("El entrenador autenticado no existe", 404);
    }

    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        trainerId: trainer.id,
      },
    });

    if (!student) {
      throw new AppError("Alumno no encontrado", 404);
    }

    await prisma.$transaction(async (tx) => {
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

  static async resendInvitation(trainerUserId: string, studentId: string) {
    const trainer = await prisma.trainer.findUnique({
      where: { userId: trainerUserId },
    });

    if (!trainer) {
      throw new AppError("El entrenador autenticado no existe", 404);
    }

    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        trainerId: trainer.id,
      },
    });

    if (!student) {
      throw new AppError("Alumno no encontrado", 404);
    }

    if (student.status !== "INVITED") {
      throw new AppError("Solo se puede reenviar la invitación a alumnos con estado INVITED", 400);
    }

    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

    await prisma.$transaction(async (tx) => {
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
    EmailService.sendInvitation({
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

  static async listStudentsWithSubscription(
    trainerUserId: string,
    query: ListStudentsQueryInput
  ) {
    const trainer = await prisma.trainer.findUnique({
      where: { userId: trainerUserId },
    });

    if (!trainer) {
      throw new AppError("El entrenador autenticado no existe", 404);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    const where: Prisma.StudentWhereInput = {
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

    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          subscriptions: {
            where: { status: { in: ["ACTIVE", "EXPIRED"] } },
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              plan: true,
              installments: {
                orderBy: { number: "asc" },
              },
            },
          },
        },
      }),
      prisma.student.count({ where }),
    ]);

    return {
      items: students.map((s) => {
        const sub = s.subscriptions[0] ?? null;
        let subscriptionStatus: string | null = null;

        if (sub) {
          const hasOverdue = sub.installments.some(
            (i) => i.status === "OVERDUE" ||
            (i.status === "PENDING" && i.dueDate < now)
          );
          const hasExpiringSoon = sub.installments.some(
            (i) =>
              i.status === "PENDING" &&
              i.dueDate >= now &&
              i.dueDate <= in7Days
          );
          const allPaid = sub.installments.every((i) => i.status === "PAID");

          if (hasOverdue) subscriptionStatus = "OVERDUE";
          else if (hasExpiringSoon) subscriptionStatus = "EXPIRING_SOON";
          else if (allPaid) subscriptionStatus = "PAID";
          else subscriptionStatus = "ACTIVE";
        }

        return {
          ...StudentsMapper.toListItem(s),
          subscription: sub
            ? {
                id: sub.id,
                planName: sub.plan.name,
                endDate: sub.endDate,
                subscriptionStatus,
              }
            : null,
        };
      }),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}