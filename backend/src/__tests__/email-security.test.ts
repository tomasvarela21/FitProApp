import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EmailService } from "../infrastructure/email/email.service";
import { resend } from "../infrastructure/email/resend";

const sendEmail = vi.mocked(resend.emails.send);

describe("seguridad del correo", () => {
  beforeEach(() => {
    sendEmail.mockReset();
    sendEmail.mockResolvedValue({
      data: { id: "test-email" },
      error: null,
      headers: null,
    });
  });

  afterEach(() => {
    delete process.env.EMAIL_TIMEOUT_MS;
  });

  it("escapa contenido variable antes de insertarlo en HTML", async () => {
    const maliciousName = '<img src=x onerror="alert(1)">';

    await EmailService.sendInvitation({
      to: "student@fitpro.test",
      firstName: maliciousName,
      trainerName: maliciousName,
      invitationToken: "safe-token",
    });

    const request = sendEmail.mock.calls[0]?.[0];
    expect(request?.html).not.toContain(maliciousName);
    expect(request?.html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });

  it("rechaza errores devueltos por el proveedor", async () => {
    sendEmail.mockResolvedValueOnce({
      data: null,
      error: {
        message: "provider rejected message",
        name: "validation_error",
        statusCode: 422,
      },
      headers: null,
    });

    await expect(
      EmailService.sendTrainerVerification({
        to: "trainer@fitpro.test",
        firstName: "Trainer",
        verificationToken: "safe-token",
      })
    ).rejects.toThrow(/provider rejected message/i);
  });

  it("interrumpe la espera cuando el proveedor no responde", async () => {
    process.env.EMAIL_TIMEOUT_MS = "5";
    sendEmail.mockImplementationOnce(() => new Promise(() => undefined));

    await expect(
      EmailService.sendPasswordReset({
        to: "student@fitpro.test",
        firstName: "Student",
        trainerName: "Trainer",
        invitationToken: "safe-token",
      })
    ).rejects.toThrow(/excedió 5 ms/i);
  });

  it("rechaza un destinatario inválido antes de llamar al proveedor", async () => {
    await expect(
      EmailService.sendTrainerVerification({
        to: "invalid-address",
        firstName: "Trainer",
        verificationToken: "safe-token",
      })
    ).rejects.toThrow();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("escapa nombres de alumnos y planes en el resumen de cobros", async () => {
    const injected = "<script>alert(1)</script>";
    await EmailService.sendPaymentAlerts({
      to: "trainer@fitpro.test",
      trainerName: injected,
      overdueInstallments: [
        {
          studentName: injected,
          planName: injected,
          installmentNumber: 1,
          amount: 100,
          dueDate: new Date("2026-09-01T12:00:00.000Z"),
          daysOverdue: 2,
        },
      ],
      expiringSoonInstallments: [],
    });

    const html = sendEmail.mock.calls[0]?.[0].html;
    expect(html).not.toContain(injected);
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });
});
