import { apiClient } from "./client";
import type { ApiSuccess, DashboardSummary } from "@/types";

export const trainersApi = {
  getDashboardSummary: () =>
    apiClient.get<ApiSuccess<DashboardSummary>>("/trainers/dashboard-summary"),
};