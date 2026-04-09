import { Student } from "@prisma/client";
import { DashboardStudentSummaryDto } from "./trainers.dto";

export class TrainersMapper {
  static toDashboardStudent(student: Student): DashboardStudentSummaryDto {
    return {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      status: student.status,
      invitedAt: student.invitedAt,
      activatedAt: student.activatedAt,
      createdAt: student.createdAt,
    };
  }
}