import { z } from "zod";
import {
  cuidSchema,
  dateInputSchema,
} from "../../shared/schemas/request.schema";

export const createSubscriptionSchema = z.object({
  studentId: cuidSchema,
  planId: cuidSchema,
  replacesSubscriptionId: cuidSchema.optional(),
  startDate: dateInputSchema,
  totalAmount: z.number().positive("El monto total debe ser mayor a 0"),
  installmentCount: z.number().int().min(1).max(24),
  frequency: z.enum(["BIWEEKLY", "MONTHLY"]),
});

export const payInstallmentSchema = z.object({
  paidAt: dateInputSchema.optional(),
  notes: z.string().optional(),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type PayInstallmentInput = z.infer<typeof payInstallmentSchema>;
