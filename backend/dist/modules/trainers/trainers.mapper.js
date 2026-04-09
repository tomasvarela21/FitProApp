"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrainersMapper = void 0;
class TrainersMapper {
    static toDashboardStudent(student) {
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
exports.TrainersMapper = TrainersMapper;
//# sourceMappingURL=trainers.mapper.js.map