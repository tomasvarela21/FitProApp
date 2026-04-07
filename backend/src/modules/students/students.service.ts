import { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/db/prisma";
import { AppError } from "../../shared/errors/app-error";
import { generateRawToken, hashToken } from "../../shared/utils/token";
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

    const user = await prisma.user.create({
      data: {
        email: data.email,
        role: "STUDENT",
        status: "INVITED",
      },
    });

    const student = await prisma.student.create({
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

    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);

    const invitation = await prisma.accountInvitation.create({
      data: {
        studentId: student.id,
        email: data.email,
        tokenHash,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        createdByTrainerId: trainer.id,
      },
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
        orderBy: {
          createdAt: "desc",
        },
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
}