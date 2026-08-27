import { prisma } from "../../infrastructure/db/prisma";
import { AppError } from "../../shared/errors/app-error";

async function resolveTrainer(trainerUserId: string) {
  const trainer = await prisma.trainer.findUnique({ where: { userId: trainerUserId } });
  if (!trainer) throw new AppError("Entrenador no encontrado", 404);
  return trainer;
}

async function resolveStudent(trainerId: string, studentId: string) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, trainerId, deletedAt: null },
  });
  if (!student) throw new AppError("Alumno no encontrado", 404);
  return student;
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export class NotesInjuriesService {
  static async listNotes(trainerUserId: string, studentId: string) {
    const trainer = await resolveTrainer(trainerUserId);
    await resolveStudent(trainer.id, studentId);

    return prisma.studentNote.findMany({
      where: { studentId, trainerId: trainer.id },
      orderBy: { createdAt: "desc" },
    });
  }

  static async createNote(trainerUserId: string, studentId: string, content: string) {
    const trainer = await resolveTrainer(trainerUserId);
    await resolveStudent(trainer.id, studentId);

    return prisma.studentNote.create({
      data: { studentId, trainerId: trainer.id, content },
    });
  }

  static async deleteNote(trainerUserId: string, studentId: string, noteId: string) {
    const trainer = await resolveTrainer(trainerUserId);
    await resolveStudent(trainer.id, studentId);

    const note = await prisma.studentNote.findFirst({
      where: { id: noteId, studentId, trainerId: trainer.id },
    });
    if (!note) throw new AppError("Nota no encontrada", 404);

    await prisma.studentNote.delete({ where: { id: noteId } });
    return { deleted: true };
  }

  // ─── Injuries ───────────────────────────────────────────────────────────────

  static async listInjuries(trainerUserId: string, studentId: string) {
    const trainer = await resolveTrainer(trainerUserId);
    await resolveStudent(trainer.id, studentId);

    return prisma.studentInjury.findMany({
      where: { studentId, trainerId: trainer.id },
      orderBy: { occurredAt: "desc" },
    });
  }

  static async createInjury(
    trainerUserId: string,
    studentId: string,
    data: {
      bodyPart: string;
      description: string;
      severity: "MILD" | "MODERATE" | "SEVERE";
      occurredAt: string;
      notes?: string;
    }
  ) {
    const trainer = await resolveTrainer(trainerUserId);
    await resolveStudent(trainer.id, studentId);

    return prisma.studentInjury.create({
      data: {
        studentId,
        trainerId: trainer.id,
        bodyPart: data.bodyPart,
        description: data.description,
        severity: data.severity,
        occurredAt: new Date(data.occurredAt),
        notes: data.notes,
      },
    });
  }

  static async updateInjury(
    trainerUserId: string,
    studentId: string,
    injuryId: string,
    data: { resolvedAt?: string | null; notes?: string }
  ) {
    const trainer = await resolveTrainer(trainerUserId);
    await resolveStudent(trainer.id, studentId);

    const injury = await prisma.studentInjury.findFirst({
      where: { id: injuryId, studentId, trainerId: trainer.id },
    });
    if (!injury) throw new AppError("Lesión no encontrada", 404);

    return prisma.studentInjury.update({
      where: { id: injuryId },
      data: {
        resolvedAt: data.resolvedAt !== undefined ? (data.resolvedAt ? new Date(data.resolvedAt) : null) : undefined,
        notes: data.notes !== undefined ? data.notes : undefined,
      },
    });
  }

  static async deleteInjury(trainerUserId: string, studentId: string, injuryId: string) {
    const trainer = await resolveTrainer(trainerUserId);
    await resolveStudent(trainer.id, studentId);

    const injury = await prisma.studentInjury.findFirst({
      where: { id: injuryId, studentId, trainerId: trainer.id },
    });
    if (!injury) throw new AppError("Lesión no encontrada", 404);

    await prisma.studentInjury.delete({ where: { id: injuryId } });
    return { deleted: true };
  }
}
