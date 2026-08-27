import { apiClient } from "./client";
import type { ApiSuccess, PaginatedResponse, Student, StudentSummary, StudentNote, StudentInjury } from "@/types";

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
  status?: string;
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

  getSummary: (id: string) =>
    apiClient.get<ApiSuccess<StudentSummary>>(`/students/${id}/summary`),

  // Notes
  getNotes: (id: string) =>
    apiClient.get<ApiSuccess<StudentNote[]>>(`/students/${id}/notes`),
  createNote: (id: string, content: string) =>
    apiClient.post<ApiSuccess<StudentNote>>(`/students/${id}/notes`, { content }),
  deleteNote: (id: string, noteId: string) =>
    apiClient.delete<ApiSuccess<{ deleted: boolean }>>(`/students/${id}/notes/${noteId}`),

  // Injuries
  getInjuries: (id: string) =>
    apiClient.get<ApiSuccess<StudentInjury[]>>(`/students/${id}/injuries`),
  createInjury: (id: string, data: {
    bodyPart: string; description: string;
    severity: "MILD" | "MODERATE" | "SEVERE"; occurredAt: string; notes?: string;
  }) => apiClient.post<ApiSuccess<StudentInjury>>(`/students/${id}/injuries`, data),
  updateInjury: (id: string, injuryId: string, data: { resolvedAt?: string | null; notes?: string }) =>
    apiClient.patch<ApiSuccess<StudentInjury>>(`/students/${id}/injuries/${injuryId}`, data),
  deleteInjury: (id: string, injuryId: string) =>
    apiClient.delete<ApiSuccess<{ deleted: boolean }>>(`/students/${id}/injuries/${injuryId}`),
};