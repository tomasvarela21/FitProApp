import nodemailer from "nodemailer";

const APP_URL = process.env.APP_URL ?? "http://localhost:5173";
const APP_NAME = "FitPro";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export class EmailService {
  static async sendInvitation(params: {
    to: string;
    firstName: string;
    trainerName: string;
    invitationToken: string;
  }) {
    const activationUrl = `${APP_URL}/activate-account?token=${params.invitationToken}`;

    await transporter.sendMail({
      from: `"${APP_NAME}" <${process.env.GMAIL_USER}>`,
      to: params.to,
      subject: `${params.trainerName} te invitó a ${APP_NAME}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          </head>
          <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
              <tr>
                <td align="center">
                  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">

                    <tr>
                      <td align="center" style="padding-bottom:24px;">
                        <span style="font-size:22px;font-weight:700;color:#18181b;">💪 ${APP_NAME}</span>
                      </td>
                    </tr>

                    <tr>
                      <td style="background-color:#ffffff;border-radius:12px;padding:40px;border:1px solid #e4e4e7;">
                        <h1 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#18181b;">
                          ¡Hola, ${params.firstName}!
                        </h1>
                        <p style="margin:0 0 24px 0;font-size:15px;color:#71717a;line-height:1.6;">
                          <strong style="color:#18181b;">${params.trainerName}</strong> te invitó a unirte a ${APP_NAME}, tu plataforma de entrenamiento personalizado.
                        </p>
                        <p style="margin:0 0 24px 0;font-size:15px;color:#71717a;line-height:1.6;">
                          Hacé click en el botón para activar tu cuenta y empezar:
                        </p>
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center" style="padding-bottom:24px;">
                              <a href="${activationUrl}"
                                style="display:inline-block;background-color:#18181b;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 32px;border-radius:8px;">
                                Activar mi cuenta
                              </a>
                            </td>
                          </tr>
                        </table>
                        <div style="background-color:#fafafa;border:1px solid #e4e4e7;border-radius:8px;padding:16px;">
                          <p style="margin:0;font-size:13px;color:#71717a;line-height:1.5;">
                            ⏰ Este link expira en <strong>24 horas</strong>. Si no lo usás a tiempo, pedile a tu entrenador que te reenvíe la invitación.
                          </p>
                        </div>
                        <p style="margin:24px 0 0 0;font-size:12px;color:#a1a1aa;line-height:1.6;">
                          Si el botón no funciona, copiá este link en tu navegador:<br/>
                          <a href="${activationUrl}" style="color:#18181b;word-break:break-all;">${activationUrl}</a>
                        </p>
                      </td>
                    </tr>

                    <tr>
                      <td align="center" style="padding-top:24px;">
                        <p style="margin:0;font-size:12px;color:#a1a1aa;">
                          ${APP_NAME} · Este email fue enviado porque tu entrenador te registró en la plataforma.
                        </p>
                      </td>
                    </tr>

                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    return { sent: true };
  }
}
