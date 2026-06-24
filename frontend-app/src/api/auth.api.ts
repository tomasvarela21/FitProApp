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

type RegisterTrainerPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
};

type RegisterTrainerResponse = {
  userId: string;
  email: string;
  role: string;
  status: string;
  trialEndsAt: string;
  verificationToken?: string;
};

type VerifyEmailPayload = {
  token: string;
};

type VerifyEmailResponse = {
  emailVerified: boolean;
  email: string;
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

  registerTrainer: (payload: RegisterTrainerPayload) =>
    apiClient.post<ApiSuccess<RegisterTrainerResponse>>(
      "/auth/register-trainer",
      payload
    ),

  verifyEmail: (payload: VerifyEmailPayload) =>
    apiClient.post<ApiSuccess<VerifyEmailResponse>>(
      "/auth/verify-email",
      payload
    ),
};

