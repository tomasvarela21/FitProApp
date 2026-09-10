import { vi } from "vitest";

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET ??= "test-access-secret-at-least-32-characters";
process.env.ADMIN_SECRET ??= "test-admin-secret";
process.env.CRON_SECRET ??= "test-cron-secret";
process.env.APP_URL ??= "http://localhost:5173";
process.env.RESEND_API_KEY ??= "re_test_disabled";

vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: vi.fn().mockResolvedValue({
        data: { id: "test-email" },
        error: null,
      }),
    };
  },
}));

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn().mockResolvedValue({ statusCode: 201 }),
  },
}));
