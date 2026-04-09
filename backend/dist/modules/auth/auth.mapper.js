"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthMapper = void 0;
class AuthMapper {
    static toAuthProfile(user) {
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
exports.AuthMapper = AuthMapper;
//# sourceMappingURL=auth.mapper.js.map