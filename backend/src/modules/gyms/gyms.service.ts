import { prisma } from "../../infrastructure/db/prisma";
import { AppError } from "../../shared/errors/app-error";

export class GymsService {
  private static async getTrainerId(trainerUserId: string) {
    const trainer = await prisma.trainer.findUniqueOrThrow({
      where: { userId: trainerUserId },
      select: { id: true },
    });
    return trainer.id;
  }

  static async listGyms(trainerUserId: string) {
    const trainerId = await this.getTrainerId(trainerUserId);
    return prisma.gym.findMany({
      where: { trainerId },
      orderBy: { name: "asc" },
      include: { _count: { select: { students: true } } },
    });
  }

  static async createGym(trainerUserId: string, data: { name: string; address?: string }) {
    const trainerId = await this.getTrainerId(trainerUserId);
    const existing = await prisma.gym.findFirst({
      where: { trainerId, name: { equals: data.name, mode: "insensitive" } },
    });
    if (existing) throw new AppError("Ya existe un gimnasio con ese nombre", 409);
    return prisma.gym.create({
      data: { trainerId, name: data.name, address: data.address },
    });
  }

  static async updateGym(
    trainerUserId: string,
    gymId: string,
    data: { name?: string; address?: string | null }
  ) {
    const trainerId = await this.getTrainerId(trainerUserId);
    const gym = await prisma.gym.findFirst({ where: { id: gymId, trainerId } });
    if (!gym) throw new AppError("Gimnasio no encontrado", 404);
    return prisma.gym.update({ where: { id: gymId }, data });
  }

  static async deleteGym(trainerUserId: string, gymId: string) {
    const trainerId = await this.getTrainerId(trainerUserId);
    const gym = await prisma.gym.findFirst({ where: { id: gymId, trainerId } });
    if (!gym) throw new AppError("Gimnasio no encontrado", 404);
    // Unassign students before deleting
    await prisma.student.updateMany({ where: { gymId }, data: { gymId: null } });
    await prisma.gym.delete({ where: { id: gymId } });
  }
}
