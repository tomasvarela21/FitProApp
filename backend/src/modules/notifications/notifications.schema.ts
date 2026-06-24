import { z } from "zod";

export const subscribeSchema = z.object({
  type: z.enum(["WEB", "EXPO"]),
  endpoint: z.string().optional(),
  p256dh: z.string().optional(),
  auth: z.string().optional(),
  token: z.string().optional(),
});

export const unsubscribeSchema = z.object({
  endpoint: z.string().optional(),
  token: z.string().optional(),
});

export type SubscribeInput = z.infer<typeof subscribeSchema>;
export type UnsubscribeInput = z.infer<typeof unsubscribeSchema>;
