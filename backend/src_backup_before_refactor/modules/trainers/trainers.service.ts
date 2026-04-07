import { prisma } from "../../db/prisma";
import { AppError } from "../../core/errors/app-error";
import { hashPassword } from "../../core/utils/hash";
import { CreateTrainerInput } from "./trainers.schema";

export class TrainersService {
  static async createTrainer(data: CreateTrainerInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new AppError("Ya existe un usuario con ese email", 409);
    }

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
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
}