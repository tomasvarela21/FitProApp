import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "@/types";

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  sessionRevision: number;
  setAuth: (token: string, user: AuthUser) => void;
  setTokenForSession: (token: string, userId: string, revision: number) => boolean;
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
      sessionRevision: 0,
      setAuth: (token, user) =>
        set((state) => ({
          token,
          user,
          isAuthenticated: true,
          sessionRevision: state.sessionRevision + 1,
        })),
      setTokenForSession: (token, userId, revision) => {
        const state = useAuthStore.getState();
        if (
          !state.isAuthenticated ||
          state.user?.id !== userId ||
          state.sessionRevision !== revision
        ) {
          return false;
        }
        set({ token });
        return true;
      },
      setInitialized: () =>
        set({ isInitialized: true }),
      logout: () =>
        set((state) => ({
          token: null,
          user: null,
          isAuthenticated: false,
          sessionRevision: state.sessionRevision + 1,
        })),
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
