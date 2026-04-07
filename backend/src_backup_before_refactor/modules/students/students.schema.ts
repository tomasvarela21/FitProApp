import { z } from "zod";

export const createStudentSchema = z.object({
  trainerId: z.string().min(1, "El trainerId es obligatorio"),
  email: z.string().email("Email inválido"),
  dni: z.string().min(6, "El DNI es obligatorio"),
  firstName: z.string().min(2, "El nombre es obligatorio"),
  lastName: z.string().min(2, "El apellido es obligatorio"),
  phone: z.string().optional(),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;