import { apiClient } from "./client";
import type { ApiSuccess, PaginatedResponse, Student } from "@/types";

type CreateStudentPayload = {
  email: string;
  dni: string;
  firstName: string;
  lastName: string;
  phone?: string;
};

type UpdateStudentPayload = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  status?: Student["status"];
};

type ListStudentsQuery = {
  page?: number;
  limit?: number;
  search?: string;
};

export const studentsApi = {
  list: (query?: ListStudentsQuery) =>
    apiClient.get<ApiSuccess<PaginatedResponse<Student>>>("/students", {
      params: query,
    }),

  getById: (id: string) =>
    apiClient.get<ApiSuccess<Student>>(`/students/${id}`),

  create: (payload: CreateStudentPayload) =>
    apiClient.post<ApiSuccess<{ student: Student }>>("/students", payload),

  update: (id: string, payload: UpdateStudentPayload) =>
    apiClient.patch<ApiSuccess<Student>>(`/students/${id}`, payload),

  delete: (id: string) =>
    apiClient.delete<ApiSuccess<{ deleted: boolean }>>(`/students/${id}`),

  resendInvitation: (id: string) =>
    apiClient.post<ApiSuccess<{ sent: boolean }>>(
      `/students/${id}/resend-invitation`
    ),

  resetPassword: (id: string) =>
    apiClient.post<ApiSuccess<{ sent: boolean }>>(
      `/students/${id}/reset-password`
    ),
};