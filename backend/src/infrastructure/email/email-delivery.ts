import { z } from "zod";
import { resend } from "./resend";

const recipientSchema = z.string().email().max(254);
const DEFAULT_EMAIL_TIMEOUT_MS = 10_000;

type EmailRequest = {
  from: string;
  to: string;
  subject: string;
  html: string;
};

function emailTimeoutMs(): number {
  const configured = Number(process.env.EMAIL_TIMEOUT_MS);
  return Number.isInteger(configured) && configured > 0
    ? configured
    : DEFAULT_EMAIL_TIMEOUT_MS;
}

function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`El proveedor de correo excedió ${timeoutMs} ms`)),
      timeoutMs
    );

    operation.then(
      (result) => {
        clearTimeout(timeout);
        resolve(result);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      }
    );
  });
}

export async function deliverEmail(request: EmailRequest) {
  recipientSchema.parse(request.to);

  const result = await withTimeout(resend.emails.send(request), emailTimeoutMs());
  if (result.error) {
    throw new Error(`El proveedor rechazó el correo: ${result.error.message}`);
  }
  if (!result.data?.id) {
    throw new Error("El proveedor no confirmó la aceptación del correo");
  }

  return result;
}
