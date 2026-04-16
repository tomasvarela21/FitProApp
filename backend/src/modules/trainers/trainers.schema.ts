import { z } from "zod";

export const createTrainerSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres"),
  firstName: z.string().min(2, "El nombre es obligatorio"),
  lastName: z.string().min(2, "El apellido es obligatorio"),
  phone: z.string().optional(),
});

export type CreateTrainerInput = z.infer<typeof createTrainerSchema>;

export const updateProfileSchema = z.object({
  firstName: z.string().min(2, "El nombre es obligatorio").optional(),
  lastName: z.string().min(2, "El apellido es obligatorio").optional(),
  phone: z.string().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;