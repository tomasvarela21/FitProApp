import { z } from "zod";

export const createSubscriptionSchema = z.object({
  studentId: z.string().min(1),
  planId: z.string().min(1),
  startDate: z.string().datetime(),
  totalAmount: z.number().positive("El monto total debe ser mayor a 0"),
  installmentCount: z.number().int().min(1).max(24),
  frequency: z.enum(["BIWEEKLY", "MONTHLY"]),
});

export const payInstallmentSchema = z.object({
  paidAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type PayInstallmentInput = z.infer<typeof payInstallmentSchema>;
