import { z } from "zod";

export const createStudentSchema = z.object({
  email: z.string().email("Email inválido"),
  dni: z.string().min(6, "El DNI es obligatorio"),
  firstName: z.string().min(2, "El nombre es obligatorio"),
  lastName: z.string().min(2, "El apellido es obligatorio"),
  phone: z.string().optional(),
});

export const listStudentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().trim().optional(),
});

export const updateStudentSchema = z.object({
  firstName: z.string().min(2, "El nombre es obligatorio").optional(),
  lastName: z.string().min(2, "El apellido es obligatorio").optional(),
  phone: z.string().optional(),
  status: z.enum(["INVITED", "ACTIVE", "PAUSED", "INACTIVE"]).optional(),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type ListStudentsQueryInput = z.infer<typeof listStudentsQuerySchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;