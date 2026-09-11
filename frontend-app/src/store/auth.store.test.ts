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

  it("descarta un token tardío después del logout", () => {
    useAuthStore.getState().setAuth("access-token", trainer);
    const revision = useAuthStore.getState().sessionRevision;
    useAuthStore.getState().logout();

    const applied = useAuthStore
      .getState()
      .setTokenForSession("refresh-tardío", trainer.id, revision);

    expect(applied).toBe(false);
    expect(useAuthStore.getState().token).toBeNull();
  });

  it("no sobrescribe la cuenta nueva con un refresh de la cuenta anterior", () => {
    const secondTrainer = {
      ...trainer,
      id: "second-trainer-user-id",
      email: "second-trainer@fitpro.test",
    };
    useAuthStore.getState().setAuth("token-a", trainer);
    const revisionA = useAuthStore.getState().sessionRevision;
    useAuthStore.getState().logout();
    useAuthStore.getState().setAuth("token-b", secondTrainer);

    const applied = useAuthStore
      .getState()
      .setTokenForSession("refresh-tardío-a", trainer.id, revisionA);

    expect(applied).toBe(false);
    expect(useAuthStore.getState().token).toBe("token-b");
    expect(useAuthStore.getState().user).toEqual(secondTrainer);
  });
});
