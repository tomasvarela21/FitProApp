import { afterEach, describe, expect, it } from "vitest";
import type { AuthUser } from "@/types";
import { clearLocalSession, establishSession } from "@/api/client";
import { queryClient } from "@/lib/query-client";
import { useAuthStore } from "@/store/auth.store";

const trainer = (id: string): AuthUser => ({
  id,
  email: `${id}@fitpro.test`,
  role: "TRAINER",
  status: "ACTIVE",
  emailVerifiedAt: "2026-01-01T00:00:00.000Z",
  profile: { id: `${id}-profile`, firstName: id, lastName: "Trainer", phone: null },
});

afterEach(() => {
  queryClient.clear();
  useAuthStore.getState().logout();
});

describe("aislamiento de caché autenticada", () => {
  it("elimina datos privados al cerrar sesión", () => {
    useAuthStore.getState().setAuth("token-a", trainer("user-a"));
    queryClient.setQueryData(["student-summary", "student-a"], { private: "A" });

    clearLocalSession();

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it("elimina la caché de A antes de establecer la sesión de B", () => {
    useAuthStore.getState().setAuth("token-a", trainer("user-a"));
    queryClient.setQueryData(["dashboard-summary"], { owner: "A" });

    establishSession("token-b", trainer("user-b"));

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(useAuthStore.getState().user?.id).toBe("user-b");
  });

  it("cancela consultas privadas en curso durante el logout", async () => {
    useAuthStore.getState().setAuth("token-a", trainer("user-a"));
    let aborted = false;
    const pending = queryClient.fetchQuery({
      queryKey: ["slow-private-query"],
      queryFn: ({ signal }) =>
        new Promise<string>((resolve) => {
          signal.addEventListener("abort", () => {
            aborted = true;
            resolve("cancelled");
          });
        }),
    });
    void pending.catch(() => undefined);
    await Promise.resolve();

    clearLocalSession();

    expect(aborted).toBe(true);
  });

  it("genera espacios de caché distintos para identidades distintas", () => {
    useAuthStore.getState().setAuth("token-a", trainer("user-a"));
    queryClient.setQueryData(["dashboard-summary"], { owner: "A" });
    useAuthStore.getState().setAuth("token-b", trainer("user-b"));
    queryClient.setQueryData(["dashboard-summary"], { owner: "B" });

    expect(queryClient.getQueryCache().getAll()).toHaveLength(2);
    expect(queryClient.getQueryData(["dashboard-summary"])).toEqual({ owner: "B" });

    useAuthStore.getState().setAuth("token-a-2", trainer("user-a"));
    expect(queryClient.getQueryData(["dashboard-summary"])).toEqual({ owner: "A" });
  });
});
