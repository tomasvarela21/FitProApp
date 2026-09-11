export type SessionSnapshot = {
  userId: string | null;
  revision: number;
  isAuthenticated: boolean;
};

type SessionPort = {
  snapshot: () => SessionSnapshot;
  applyToken: (token: string, snapshot: SessionSnapshot) => boolean;
  clear: () => void;
};

type RefreshTransport = (signal: AbortSignal) => Promise<string>;

type SessionMessage =
  | { type: "token"; userId: string; token: string }
  | { type: "logout"; userId: string };

type MessageEventLike = { data: unknown };

export type SessionChannel = {
  postMessage: (message: SessionMessage) => void;
  addEventListener: (
    type: "message",
    listener: (event: MessageEventLike) => void
  ) => void;
  removeEventListener: (
    type: "message",
    listener: (event: MessageEventLike) => void
  ) => void;
  close?: () => void;
};

type LockRecord = { owner: string; userId: string; expiresAt: number };

type SessionCoordinatorOptions = {
  port: SessionPort;
  refresh: RefreshTransport;
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  channel?: SessionChannel;
  refreshTimeoutMs?: number;
  lockLeaseMs?: number;
  lockSettleMs?: number;
  now?: () => number;
  ownerId?: string;
};

export class SessionChangedError extends Error {
  constructor() {
    super("La sesión cambió durante la renovación");
    this.name = "SessionChangedError";
  }
}

export class SessionRefreshTimeoutError extends Error {
  constructor() {
    super("La renovación de sesión superó el tiempo límite");
    this.name = "SessionRefreshTimeoutError";
  }
}

const LOCK_KEY = "fitpro:auth-refresh-lock";

export class SessionCoordinator {
  private readonly port: SessionPort;
  private readonly refreshTransport: RefreshTransport;
  private readonly storage?: SessionCoordinatorOptions["storage"];
  private readonly channel?: SessionChannel;
  private readonly refreshTimeoutMs: number;
  private readonly lockLeaseMs: number;
  private readonly lockSettleMs: number;
  private readonly now: () => number;
  private readonly ownerId: string;
  private readonly inFlight = new Map<string, Promise<string>>();
  private readonly controllers = new Set<AbortController>();
  private readonly waiters = new Set<{
    userId: string;
    resolve: (token: string) => void;
    reject: (error: unknown) => void;
    timer: ReturnType<typeof setTimeout>;
  }>();

  constructor(options: SessionCoordinatorOptions) {
    this.port = options.port;
    this.refreshTransport = options.refresh;
    this.storage = options.storage;
    this.channel = options.channel;
    this.refreshTimeoutMs = options.refreshTimeoutMs ?? 8_000;
    this.lockLeaseMs = options.lockLeaseMs ?? 10_000;
    this.lockSettleMs = options.lockSettleMs ?? 25;
    this.now = options.now ?? Date.now;
    this.ownerId =
      options.ownerId ??
      globalThis.crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random()}`;
    this.channel?.addEventListener("message", this.handleMessage);
  }

  refresh(): Promise<string> {
    const snapshot = this.port.snapshot();
    if (!snapshot.isAuthenticated || !snapshot.userId) {
      return Promise.reject(new SessionChangedError());
    }

    const key = `${snapshot.userId}:${snapshot.revision}`;
    const existing = this.inFlight.get(key);
    if (existing) return existing;

    const operation = this.refreshCoordinated(snapshot).finally(() => {
      if (this.inFlight.get(key) === operation) this.inFlight.delete(key);
    });
    this.inFlight.set(key, operation);
    return operation;
  }

  clearSession() {
    const snapshot = this.port.snapshot();
    this.controllers.forEach((controller) => controller.abort());
    this.controllers.clear();
    this.rejectWaiters(new SessionChangedError());
    this.releaseLock();
    this.port.clear();
    if (snapshot.userId) {
      this.channel?.postMessage({ type: "logout", userId: snapshot.userId });
    }
  }

  dispose() {
    this.controllers.forEach((controller) => controller.abort());
    this.rejectWaiters(new SessionChangedError());
    this.channel?.removeEventListener("message", this.handleMessage);
    this.channel?.close?.();
  }

  private readonly handleMessage = (event: MessageEventLike) => {
    const message = event.data as Partial<SessionMessage>;
    const current = this.port.snapshot();
    if (!current.userId || message.userId !== current.userId) return;

    if (message.type === "token" && typeof message.token === "string") {
      if (this.port.applyToken(message.token, current)) {
        this.resolveWaiters(current.userId, message.token);
      }
    } else if (message.type === "logout") {
      this.controllers.forEach((controller) => controller.abort());
      this.port.clear();
      this.rejectWaiters(new SessionChangedError());
    }
  };

  private async refreshCoordinated(snapshot: SessionSnapshot): Promise<string> {
    if (!(await this.acquireLock(snapshot.userId!))) {
      return this.waitForPeer(snapshot);
    }

    try {
      const token = await this.runWithTimeout();
      if (!this.port.applyToken(token, snapshot)) throw new SessionChangedError();
      this.channel?.postMessage({ type: "token", userId: snapshot.userId!, token });
      return token;
    } catch (error) {
      if (this.isCurrent(snapshot)) {
        this.port.clear();
        this.channel?.postMessage({ type: "logout", userId: snapshot.userId! });
      }
      throw error;
    } finally {
      this.releaseLock();
    }
  }

  private async runWithTimeout(): Promise<string> {
    const controller = new AbortController();
    this.controllers.add(controller);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeoutPromise = new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(new SessionRefreshTimeoutError());
        }, this.refreshTimeoutMs);
      });
      return await Promise.race([
        this.refreshTransport(controller.signal),
        timeoutPromise,
      ]);
    } finally {
      if (timeout) clearTimeout(timeout);
      this.controllers.delete(controller);
    }
  }

  private async acquireLock(userId: string): Promise<boolean> {
    if (!this.storage) return true;
    const existing = this.readLock();
    if (
      existing &&
      existing.owner !== this.ownerId &&
      existing.expiresAt > this.now()
    ) {
      return false;
    }

    const candidate: LockRecord = {
      owner: this.ownerId,
      userId,
      expiresAt: this.now() + this.lockLeaseMs,
    };
    this.storage.setItem(LOCK_KEY, JSON.stringify(candidate));
    if (this.lockSettleMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.lockSettleMs));
    } else {
      await Promise.resolve();
    }
    return this.readLock()?.owner === this.ownerId;
  }

  private waitForPeer(snapshot: SessionSnapshot): Promise<string> {
    return new Promise((resolve, reject) => {
      const waiter = {
        userId: snapshot.userId!,
        resolve,
        reject,
        timer: setTimeout(async () => {
          this.waiters.delete(waiter);
          if (!this.isCurrent(snapshot)) return reject(new SessionChangedError());
          try {
            resolve(await this.refreshCoordinated(snapshot));
          } catch (error) {
            reject(error);
          }
        }, this.lockLeaseMs + this.lockSettleMs),
      };
      this.waiters.add(waiter);
    });
  }

  private resolveWaiters(userId: string, token: string) {
    for (const waiter of this.waiters) {
      if (waiter.userId !== userId) continue;
      clearTimeout(waiter.timer);
      this.waiters.delete(waiter);
      waiter.resolve(token);
    }
  }

  private rejectWaiters(error: unknown) {
    for (const waiter of this.waiters) {
      clearTimeout(waiter.timer);
      waiter.reject(error);
    }
    this.waiters.clear();
  }

  private readLock(): LockRecord | null {
    if (!this.storage) return null;
    try {
      return JSON.parse(this.storage.getItem(LOCK_KEY) ?? "null") as LockRecord | null;
    } catch {
      return null;
    }
  }

  private releaseLock() {
    if (this.readLock()?.owner === this.ownerId) {
      this.storage?.removeItem(LOCK_KEY);
    }
  }

  private isCurrent(snapshot: SessionSnapshot) {
    const current = this.port.snapshot();
    return (
      current.isAuthenticated &&
      current.userId === snapshot.userId &&
      current.revision === snapshot.revision
    );
  }
}
