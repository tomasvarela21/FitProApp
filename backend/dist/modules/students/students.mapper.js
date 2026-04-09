"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentsMapper = void 0;
class StudentsMapper {
    static toListItem(student) {
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
    static toDetail(student) {
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
exports.StudentsMapper = StudentsMapper;
//# sourceMappingURL=students.mapper.js.map