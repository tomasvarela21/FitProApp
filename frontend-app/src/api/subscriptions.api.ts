import { apiClient } from "./client";
import type { ApiSuccess, Subscription, Installment } from "@/types";

type CreateSubscriptionPayload = {
  studentId: string;
  planId: string;
  startDate: string;
  totalAmount: number;
  installmentCount: number;
  frequency: "BIWEEKLY" | "MONTHLY";
};

type PayInstallmentPayload = {
  paidAt?: string;
  notes?: string;
};

export const subscriptionsApi = {
  getByStudent: (studentId: string) =>
    apiClient.get<ApiSuccess<Subscription | null>>(
      `/subscriptions/student/${studentId}`
    ),

  create: (payload: CreateSubscriptionPayload) =>
    apiClient.post<ApiSuccess<Subscription>>("/subscriptions", payload),

  payInstallment: (installmentId: string, payload: PayInstallmentPayload) =>
    apiClient.post<ApiSuccess<Installment>>(
      `/subscriptions/installments/${installmentId}/pay`,
      payload
    ),

  cancel: (subscriptionId: string) =>
    apiClient.delete<ApiSuccess<{ cancelled: boolean }>>(
      `/subscriptions/${subscriptionId}`
    ),
};
