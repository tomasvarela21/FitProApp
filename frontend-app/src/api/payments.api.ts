import { apiClient } from "./client";
import type { ApiSuccess, PaginatedResponse } from "@/types";
import type { PaymentItem, PaymentStatusFilter } from "@/features/payments/types";

type ListSubscriptionsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: PaymentStatusFilter;
};

export const paymentsApi = {
  listSubscriptions: (query?: ListSubscriptionsQuery) =>
    apiClient.get<ApiSuccess<PaginatedResponse<PaymentItem>>>("/trainers/subscriptions", {
      params: query,
    }),
};
