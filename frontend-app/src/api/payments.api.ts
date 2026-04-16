import { apiClient } from "./client";
import type { ApiSuccess, Payment } from "@/types";

export const paymentsApi = {
  getBySubscription: (subscriptionId: string) =>
    apiClient.get<ApiSuccess<Payment[]>>(
      `/payments/subscription/${subscriptionId}`
    ),
};
