import { z } from "zod";

export const activateAccountSchema = z.object({
  token: z.string().min(1, "El token es obligatorio"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export type ActivateAccountInput = z.infer<typeof activateAccountSchema>;