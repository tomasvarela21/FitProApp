import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "@/types";

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setAuth: (token: string, user: AuthUser) => void;
  setToken: (token: string) => void;
  setInitialized: () => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isInitialized: false,
      setAuth: (token, user) =>
        set({ token, user, isAuthenticated: true }),
      setToken: (token) =>
        set({ token }),
      setInitialized: () =>
        set({ isInitialized: true }),
      logout: () =>
        set({ token: null, user: null, isAuthenticated: false }),
    }),
    {
      name: "auth-storage",
      // Token nunca va a localStorage — vive en memoria y se renueva vía cookie HttpOnly
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
