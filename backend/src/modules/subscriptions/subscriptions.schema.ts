import { z } from "zod";
import {
  cuidSchema,
  dateInputSchema,
} from "../../shared/schemas/request.schema";

export const MAX_MONEY_AMOUNT = 99_999_999.99;

const moneySchema = z
  .number()
  .positive("El monto total debe ser mayor a 0")
  .max(MAX_MONEY_AMOUNT, "El monto total excede el límite permitido")
  .refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-7,
    "El monto total admite hasta 2 decimales"
  );

export const createSubscriptionSchema = z
  .object({
    studentId: cuidSchema,
    planId: cuidSchema,
    replacesSubscriptionId: cuidSchema.optional(),
    startDate: dateInputSchema,
    totalAmount: moneySchema,
    installmentCount: z.number().int().min(1).max(24),
    frequency: z.enum(["BIWEEKLY", "MONTHLY"]),
  })
  .superRefine(({ totalAmount, installmentCount }, context) => {
    if (Math.round(totalAmount * 100) < installmentCount) {
      context.addIssue({
        code: "custom",
        path: ["totalAmount"],
        message: "Cada cuota debe tener un valor mínimo de 0,01",
      });
    }
  });

export const payInstallmentSchema = z.object({
  paidAt: dateInputSchema.optional(),
  notes: z.string().max(1000, "Las notas no pueden superar 1000 caracteres").optional(),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type PayInstallmentInput = z.infer<typeof payInstallmentSchema>;
