import { apiClient } from "./client";
import type { ApiSuccess, BusinessAnalytics } from "@/types";

export const analyticsApi = {
  getBusinessAnalytics: () =>
    apiClient.get<ApiSuccess<BusinessAnalytics>>("/analytics/business"),
};
