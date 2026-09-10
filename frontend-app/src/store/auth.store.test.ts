import { afterEach, describe, expect, it } from "vitest";
import type { AuthUser } from "@/types";
import { useAuthStore } from "./auth.store";

const trainer: AuthUser = {
  id: "trainer-user-id",
  email: "trainer@fitpro.test",
  role: "TRAINER",
  status: "ACTIVE",
  emailVerifiedAt: "2026-01-01T00:00:00.000Z",
  profile: {
    id: "trainer-id",
    firstName: "Ana",
    lastName: "Trainer",
    phone: null,
  },
};

afterEach(() => {
  useAuthStore.getState().logout();
});

describe("auth.store", () => {
  it("guarda la sesión autenticada en memoria", () => {
    useAuthStore.getState().setAuth("access-token", trainer);

    expect(useAuthStore.getState()).toMatchObject({
      token: "access-token",
      user: trainer,
      isAuthenticated: true,
    });
  });

  it("elimina credenciales al cerrar sesión", () => {
    useAuthStore.getState().setAuth("access-token", trainer);
    useAuthStore.getState().logout();

    expect(useAuthStore.getState()).toMatchObject({
      token: null,
      user: null,
      isAuthenticated: false,
    });
  });

  it("no persiste el access token", () => {
    useAuthStore.getState().setAuth("access-token", trainer);
    const persisted = JSON.parse(window.localStorage.getItem("auth-storage") ?? "{}");

    expect(persisted.state.token).toBeUndefined();
    expect(persisted.state.user).toEqual(trainer);
  });
});
