import axios, { CanceledError } from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import type { AuthUser } from "@/types";
import { useAuthStore } from "@/store/auth.store";
import { clearPrivateQueryState } from "@/lib/query-client";
import {
  SessionChangedError,
  SessionCoordinator,
  type SessionSnapshot,
} from "@/auth/session-coordinator";

const BASE_URL = import.meta.env.PROD
  ? "/api"
  : import.meta.env.VITE_API_URL ?? "/api";

type AuthContext = { userId: string; revision: number };
type AuthRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _authContext?: AuthContext;
};

const snapshot = (): SessionSnapshot => {
  const state = useAuthStore.getState();
  return {
    userId: state.user?.id ?? null,
    revision: state.sessionRevision,
    isAuthenticated: state.isAuthenticated,
  };
};

const channel =
  typeof BroadcastChannel === "undefined"
    ? undefined
    : new BroadcastChannel("fitpro:auth-session");

const sessionCoordinator = new SessionCoordinator({
  port: {
    snapshot,
    applyToken: (token, expected) =>
      expected.userId !== null &&
      useAuthStore
        .getState()
        .setTokenForSession(token, expected.userId, expected.revision),
    clear: () => {
      clearPrivateQueryState();
      useAuthStore.getState().logout();
    },
  },
  refresh: async (signal) => {
    const response = await axios.post<{ data: { accessToken: string } }>(
      `${BASE_URL}/auth/refresh`,
      {},
      { withCredentials: true, signal }
    );
    return response.data.data.accessToken;
  },
  storage: typeof window === "undefined" ? undefined : window.localStorage,
  channel,
});

export const refreshSession = () => sessionCoordinator.refresh();
export const clearLocalSession = () => sessionCoordinator.clearSession();

export const establishSession = (token: string, user: AuthUser) => {
  sessionCoordinator.clearSession();
  useAuthStore.getState().setAuth(token, user);
};

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

const isCurrentContext = (context: AuthContext | undefined) => {
  if (!context) return true;
  const current = snapshot();
  return (
    current.isAuthenticated &&
    current.userId === context.userId &&
    current.revision === context.revision
  );
};

apiClient.interceptors.request.use((config) => {
  const authConfig = config as AuthRequestConfig;
  const state = useAuthStore.getState();
  if (state.token && state.user) {
    authConfig.headers.Authorization = `Bearer ${state.token}`;
    authConfig._authContext = {
      userId: state.user.id,
      revision: state.sessionRevision,
    };
  }
  return authConfig;
});

apiClient.interceptors.response.use(
  (response) => {
    const config = response.config as AuthRequestConfig;
    if (!isCurrentContext(config._authContext)) {
      return Promise.reject(new CanceledError("La sesión cambió durante la solicitud"));
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config as AuthRequestConfig | undefined;
    if (!originalRequest || !isCurrentContext(originalRequest._authContext)) {
      return Promise.reject(new SessionChangedError());
    }

    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes("/auth/refresh") ||
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/logout")
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    try {
      const accessToken = await refreshSession();
      if (!isCurrentContext(originalRequest._authContext)) {
        throw new SessionChangedError();
      }
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      if (!useAuthStore.getState().isAuthenticated && window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
      return Promise.reject(refreshError);
    }
  }
);
