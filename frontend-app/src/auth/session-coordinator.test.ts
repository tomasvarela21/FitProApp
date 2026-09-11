import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SessionChangedError,
  SessionCoordinator,
  SessionRefreshTimeoutError,
  type SessionChannel,
  type SessionSnapshot,
} from "./session-coordinator";

type MutableSession = SessionSnapshot & { token: string | null };

function createPort(initial: MutableSession) {
  const state = { ...initial };
  return {
    state,
    port: {
      snapshot: () => ({
        userId: state.userId,
        revision: state.revision,
        isAuthenticated: state.isAuthenticated,
      }),
      applyToken: (token: string, expected: SessionSnapshot) => {
        if (
          !state.isAuthenticated ||
          state.userId !== expected.userId ||
          state.revision !== expected.revision
        ) return false;
        state.token = token;
        return true;
      },
      clear: () => {
        state.token = null;
        state.userId = null;
        state.isAuthenticated = false;
        state.revision += 1;
      },
    },
  };
}

class ChannelHub {
  private listeners = new Map<string, Set<(event: { data: unknown }) => void>>();

  create(id: string): SessionChannel {
    const ownListeners = new Set<(event: { data: unknown }) => void>();
    this.listeners.set(id, ownListeners);
    return {
      postMessage: (message) => {
        for (const [targetId, listeners] of this.listeners) {
          if (targetId !== id) listeners.forEach((listener) => listener({ data: message }));
        }
      },
      addEventListener: (_type, listener) => ownListeners.add(listener),
      removeEventListener: (_type, listener) => ownListeners.delete(listener),
      close: () => { this.listeners.delete(id); },
    };
  }
}

const activeSession = (): MutableSession => ({
  userId: "user-a",
  revision: 1,
  isAuthenticated: true,
  token: "old-token",
});

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
});

describe("SessionCoordinator", () => {
  it("comparte una renovación entre solicitudes de la misma pestaña", async () => {
    const { state, port } = createPort(activeSession());
    const transport = vi.fn().mockResolvedValue("new-token");
    const coordinator = new SessionCoordinator({ port, refresh: transport });

    const [first, second] = await Promise.all([coordinator.refresh(), coordinator.refresh()]);

    expect([first, second]).toEqual(["new-token", "new-token"]);
    expect(transport).toHaveBeenCalledOnce();
    expect(state.token).toBe("new-token");
    coordinator.dispose();
  });

  it("descarta una respuesta posterior al logout", async () => {
    const { state, port } = createPort(activeSession());
    let resolveRefresh!: (token: string) => void;
    const coordinator = new SessionCoordinator({
      port,
      refresh: () => new Promise((resolve) => { resolveRefresh = resolve; }),
    });
    const refresh = coordinator.refresh();
    const rejection = expect(refresh).rejects.toBeInstanceOf(SessionChangedError);
    await Promise.resolve();
    await Promise.resolve();

    coordinator.clearSession();
    resolveRefresh("late-token");

    await rejection;
    expect(state.token).toBeNull();
    coordinator.dispose();
  });

  it("cierra la sesión al superar el timeout", async () => {
    vi.useFakeTimers();
    const { state, port } = createPort(activeSession());
    const coordinator = new SessionCoordinator({
      port,
      refresh: () => new Promise<string>(() => undefined),
      refreshTimeoutMs: 100,
    });
    const refresh = coordinator.refresh();
    const rejection = expect(refresh).rejects.toBeInstanceOf(SessionRefreshTimeoutError);

    await vi.advanceTimersByTimeAsync(101);

    await rejection;
    expect(state.isAuthenticated).toBe(false);
    coordinator.dispose();
  });

  it("coordina dos pestañas con una sola llamada de refresh", async () => {
    const hub = new ChannelHub();
    const first = createPort(activeSession());
    const second = createPort(activeSession());
    const transport = vi.fn().mockResolvedValue("shared-token");
    const firstCoordinator = new SessionCoordinator({
      port: first.port, refresh: transport, storage: window.localStorage,
      channel: hub.create("first"), lockSettleMs: 0, ownerId: "first",
    });
    const secondCoordinator = new SessionCoordinator({
      port: second.port, refresh: transport, storage: window.localStorage,
      channel: hub.create("second"), lockSettleMs: 0, ownerId: "second",
    });

    const [firstToken, secondToken] = await Promise.all([
      firstCoordinator.refresh(), secondCoordinator.refresh(),
    ]);

    expect([firstToken, secondToken]).toEqual(["shared-token", "shared-token"]);
    expect(transport).toHaveBeenCalledOnce();
    expect(first.state.token).toBe("shared-token");
    expect(second.state.token).toBe("shared-token");
    firstCoordinator.dispose();
    secondCoordinator.dispose();
  });

  it("propaga el logout a otra pestaña de la misma cuenta", () => {
    const hub = new ChannelHub();
    const first = createPort(activeSession());
    const second = createPort(activeSession());
    const firstCoordinator = new SessionCoordinator({
      port: first.port, refresh: vi.fn(), channel: hub.create("first"),
    });
    const secondCoordinator = new SessionCoordinator({
      port: second.port, refresh: vi.fn(), channel: hub.create("second"),
    });

    firstCoordinator.clearSession();

    expect(first.state.isAuthenticated).toBe(false);
    expect(second.state.isAuthenticated).toBe(false);
    firstCoordinator.dispose();
    secondCoordinator.dispose();
  });
});
