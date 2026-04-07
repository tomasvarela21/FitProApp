import { z } from "zod";

export const activateAccountSchema = z.object({
  token: z.string().min(1, "El token es obligatorio"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "La contraseña es obligatoria"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8, "La contraseña actual es obligatoria"),
  newPassword: z
    .string()
    .min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
});

export type ActivateAccountInput = z.infer<typeof activateAccountSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;