import { apiClient } from "./client";
import type { ApiSuccess, AuthUser } from "@/types";

type LoginPayload = {
  email: string;
  password: string;
};

type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};

type ActivateAccountPayload = {
  token: string;
  password: string;
};

type ActivateAccountResponse = {
  userId: string;
  studentId: string;
  email: string;
  activated: boolean;
};

export const authApi = {
  login: (payload: LoginPayload) =>
    apiClient.post<ApiSuccess<LoginResponse>>("/auth/login", payload),

  me: () =>
    apiClient.get<ApiSuccess<AuthUser>>("/auth/me"),

  activateAccount: (payload: ActivateAccountPayload) =>
    apiClient.post<ApiSuccess<ActivateAccountResponse>>(
      "/auth/activate-account",
      payload
    ),
};
