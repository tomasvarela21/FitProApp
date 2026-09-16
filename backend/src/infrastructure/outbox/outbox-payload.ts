import { z } from "zod";

const emailBase = z.object({ to: z.string().email() });
const installment = z.object({
  studentName: z.string(),
  planName: z.string(),
  installmentNumber: z.number().int().positive(),
  amount: z.number().nonnegative(),
  dueDate: z.string().datetime(),
});

export const outboxPayloadSchema = z.union([
  z.object({
    channel: z.literal("PUSH"),
    userId: z.string().min(1),
    title: z.string().min(1).max(200),
    body: z.string().min(1).max(2000),
    data: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    channel: z.literal("EMAIL"),
    kind: z.literal("INVITATION"),
    params: emailBase.extend({
      firstName: z.string(),
      trainerName: z.string(),
      invitationToken: z.string().min(1),
    }),
  }),
  z.object({
    channel: z.literal("EMAIL"),
    kind: z.literal("TRAINER_VERIFICATION"),
    params: emailBase.extend({
      firstName: z.string(),
      verificationToken: z.string().min(1),
    }),
  }),
  z.object({
    channel: z.literal("EMAIL"),
    kind: z.literal("PASSWORD_RESET"),
    params: emailBase.extend({
      firstName: z.string(),
      trainerName: z.string(),
      invitationToken: z.string().min(1),
    }),
  }),
  z.object({
    channel: z.literal("EMAIL"),
    kind: z.literal("INSTALLMENT_REMINDER"),
    params: emailBase.extend({
      studentName: z.string(),
      trainerName: z.string(),
      planName: z.string(),
      installmentNumber: z.number().int().positive(),
      amount: z.number().nonnegative(),
      dueDate: z.string().datetime(),
      daysUntilDue: z.number().int().nonnegative(),
    }),
  }),
  z.object({
    channel: z.literal("EMAIL"),
    kind: z.literal("OVERDUE_REMINDER"),
    params: emailBase.extend({
      studentName: z.string(),
      trainerName: z.string(),
      planName: z.string(),
      installmentNumber: z.number().int().positive(),
      amount: z.number().nonnegative(),
      dueDate: z.string().datetime(),
      daysOverdue: z.number().int().positive(),
    }),
  }),
  z.object({
    channel: z.literal("EMAIL"),
    kind: z.literal("PAYMENT_ALERTS"),
    params: emailBase.extend({
      trainerName: z.string(),
      overdueInstallments: z.array(installment.extend({ daysOverdue: z.number().int().positive() })),
      expiringSoonInstallments: z.array(
        installment.extend({ daysUntilDue: z.number().int().nonnegative() })
      ),
    }),
  }),
]);

export type OutboxPayload = z.infer<typeof outboxPayloadSchema>;
