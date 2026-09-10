import { describe, expect, it, vi } from "vitest";
import webpush from "web-push";
import { resend } from "../../infrastructure/email/resend";

describe("servicios externos en testing", () => {
  it("reemplaza Resend por un doble local", async () => {
    const result = await resend.emails.send({
      from: "test@fitpro.test",
      to: "recipient@fitpro.test",
      subject: "test",
      html: "<p>test</p>",
    });

    expect(result).toEqual({ data: { id: "test-email" }, error: null });
    expect(vi.mocked(resend.emails.send)).toHaveBeenCalledOnce();
  });

  it("reemplaza Web Push por un doble local", async () => {
    const result = await webpush.sendNotification(
      { endpoint: "https://push.fitpro.test", keys: { p256dh: "key", auth: "auth" } },
      "{}"
    );

    expect(result).toEqual({ statusCode: 201 });
    expect(vi.mocked(webpush.sendNotification)).toHaveBeenCalledOnce();
  });
});
