import { apiClient } from "./client";
import type { ApiSuccess } from "@/types";

export type PushSubscribePayload = {
  type: "WEB" | "EXPO";
  endpoint?: string;
  p256dh?: string;
  auth?: string;
  token?: string;
};

export const notificationsApi = {
  subscribe: (payload: PushSubscribePayload) =>
    apiClient.post<ApiSuccess<any>>("/notifications/subscribe", payload),

  unsubscribe: (payload: { endpoint?: string; token?: string }) =>
    apiClient.post<ApiSuccess<any>>("/notifications/unsubscribe", payload),
};
