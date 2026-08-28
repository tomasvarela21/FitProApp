import { Student, Gym } from "@prisma/client";
import { StudentDetailDto, StudentListItemDto } from "./students.dto";

type StudentWithGym = Student & { gym?: Gym | null };

export class StudentsMapper {
  static toListItem(student: StudentWithGym): StudentListItemDto {
    return {
      id: student.id,
      email: student.email,
      firstName: student.firstName,
      lastName: student.lastName,
      phone: student.phone,
      status: student.status,
      gym: student.gym ? { id: student.gym.id, name: student.gym.name } : null,
      invitedAt: student.invitedAt,
      activatedAt: student.activatedAt,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
    };
  }

  static toDetail(student: StudentWithGym): StudentDetailDto {
    return {
      id: student.id,
      email: student.email,
      firstName: student.firstName,
      lastName: student.lastName,
      phone: student.phone,
      status: student.status,
      gym: student.gym ? { id: student.gym.id, name: student.gym.name } : null,
      invitedAt: student.invitedAt,
      activatedAt: student.activatedAt,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
    };
  }
}
