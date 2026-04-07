import { User, Trainer, Student } from "@prisma/client";
import { AuthProfileDto } from "./auth.dto";

type UserWithProfile = User & {
  trainer?: Trainer | null;
  student?: Student | null;
};

export class AuthMapper {
  static toAuthProfile(user: UserWithProfile): AuthProfileDto {
    const profile = user.trainer
      ? {
          id: user.trainer.id,
          firstName: user.trainer.firstName,
          lastName: user.trainer.lastName,
          phone: user.trainer.phone,
        }
      : user.student
      ? {
          id: user.student.id,
          firstName: user.student.firstName,
          lastName: user.student.lastName,
          phone: user.student.phone,
        }
      : null;

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      profile,
    };
  }
}