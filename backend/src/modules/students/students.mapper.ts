import { Student } from "@prisma/client";
import {
  StudentDetailDto,
  StudentListItemDto,
} from "./students.dto";

export class StudentsMapper {
  static toListItem(student: Student): StudentListItemDto {
    return {
      id: student.id,
      email: student.email,
      firstName: student.firstName,
      lastName: student.lastName,
      phone: student.phone,
      status: student.status,
      invitedAt: student.invitedAt,
      activatedAt: student.activatedAt,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
    };
  }

  static toDetail(student: Student): StudentDetailDto {
    return {
      id: student.id,
      email: student.email,
      firstName: student.firstName,
      lastName: student.lastName,
      phone: student.phone,
      status: student.status,
      invitedAt: student.invitedAt,
      activatedAt: student.activatedAt,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
    };
  }
}