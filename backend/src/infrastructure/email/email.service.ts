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

  static async sendPaymentAlerts(params: {
    to: string;
    trainerName: string;
    overdueInstallments: Array<{
      studentName: string;
      planName: string;
      installmentNumber: number;
      amount: number;
      dueDate: Date;
      daysOverdue: number;
    }>;
    expiringSoonInstallments: Array<{
      studentName: string;
      planName: string;
      installmentNumber: number;
      amount: number;
      dueDate: Date;
      daysUntilDue: number;
    }>;
  }) {
    const overdueRows = params.overdueInstallments
      .map(
        (i) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">${i.studentName}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">${i.planName} · Cuota ${i.installmentNumber}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">$${i.amount.toLocaleString("es-AR")}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;color:#dc2626;">Hace ${i.daysOverdue} día${i.daysOverdue !== 1 ? "s" : ""}</td>
        </tr>
      `
      )
      .join("");

    const expiringSoonRows = params.expiringSoonInstallments
      .map(
        (i) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">${i.studentName}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">${i.planName} · Cuota ${i.installmentNumber}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">$${i.amount.toLocaleString("es-AR")}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;color:#d97706;">En ${i.daysUntilDue} día${i.daysUntilDue !== 1 ? "s" : ""}</td>
        </tr>
      `
      )
      .join("");

    const hasOverdue = params.overdueInstallments.length > 0;
    const hasExpiringSoon = params.expiringSoonInstallments.length > 0;

    if (!hasOverdue && !hasExpiringSoon) return { sent: false };

    await transporter.sendMail({
      from: `"${APP_NAME}" <${process.env.GMAIL_USER}>`,
      to: params.to,
      subject: `💪 ${APP_NAME} — Resumen de pagos pendientes`,
      html: `
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8" /></head>
          <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
              <tr>
                <td align="center">
                  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

                    <tr>
                      <td align="center" style="padding-bottom:24px;">
                        <span style="font-size:22px;font-weight:700;color:#18181b;">💪 ${APP_NAME}</span>
                      </td>
                    </tr>

                    <tr>
                      <td style="background-color:#ffffff;border-radius:12px;padding:32px;border:1px solid #e4e4e7;">
                        <h1 style="margin:0 0 8px 0;font-size:20px;font-weight:700;color:#18181b;">
                          Hola, ${params.trainerName}
                        </h1>
                        <p style="margin:0 0 24px 0;font-size:14px;color:#71717a;">
                          Acá te dejamos el resumen de pagos pendientes de tus alumnos al día de hoy.
                        </p>

                        ${
                          hasOverdue
                            ? `
                          <h2 style="margin:0 0 12px 0;font-size:15px;font-weight:600;color:#dc2626;">
                            ❌ Cuotas vencidas (${params.overdueInstallments.length})
                          </h2>
                          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fee2e2;border-radius:8px;overflow:hidden;margin-bottom:24px;">
                            <thead>
                              <tr style="background-color:#fef2f2;">
                                <th style="padding:10px 12px;text-align:left;font-size:12px;color:#dc2626;font-weight:600;">Alumno</th>
                                <th style="padding:10px 12px;text-align:left;font-size:12px;color:#dc2626;font-weight:600;">Plan</th>
                                <th style="padding:10px 12px;text-align:left;font-size:12px;color:#dc2626;font-weight:600;">Monto</th>
                                <th style="padding:10px 12px;text-align:left;font-size:12px;color:#dc2626;font-weight:600;">Venció</th>
                              </tr>
                            </thead>
                            <tbody>${overdueRows}</tbody>
                          </table>
                        `
                            : ""
                        }

                        ${
                          hasExpiringSoon
                            ? `
                          <h2 style="margin:0 0 12px 0;font-size:15px;font-weight:600;color:#d97706;">
                            ⚠️ Cuotas por vencer en 7 días (${params.expiringSoonInstallments.length})
                          </h2>
                          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fef3c7;border-radius:8px;overflow:hidden;margin-bottom:24px;">
                            <thead>
                              <tr style="background-color:#fffbeb;">
                                <th style="padding:10px 12px;text-align:left;font-size:12px;color:#d97706;font-weight:600;">Alumno</th>
                                <th style="padding:10px 12px;text-align:left;font-size:12px;color:#d97706;font-weight:600;">Plan</th>
                                <th style="padding:10px 12px;text-align:left;font-size:12px;color:#d97706;font-weight:600;">Monto</th>
                                <th style="padding:10px 12px;text-align:left;font-size:12px;color:#d97706;font-weight:600;">Vence</th>
                              </tr>
                            </thead>
                            <tbody>${expiringSoonRows}</tbody>
                          </table>
                        `
                            : ""
                        }

                        <div style="background-color:#fafafa;border:1px solid #e4e4e7;border-radius:8px;padding:16px;text-align:center;">
                          <a href="${process.env.APP_URL}/app/dashboard"
                            style="display:inline-block;background-color:#18181b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 24px;border-radius:8px;">
                            Ver dashboard
                          </a>
                        </div>

                      </td>
                    </tr>

                    <tr>
                      <td align="center" style="padding-top:24px;">
                        <p style="margin:0;font-size:12px;color:#a1a1aa;">
                          ${APP_NAME} · Resumen diario automático
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

  static async sendInstallmentReminder(params: {
    to: string;
    studentName: string;
    trainerName: string;
    planName: string;
    installmentNumber: number;
    amount: number;
    dueDate: Date;
    daysUntilDue: number;
  }) {
    let subject = "";
    let urgencyText = "";
    let urgencyColor = "#d97706";

    if (params.daysUntilDue === 0) {
      subject = `💳 Tu cuota vence hoy — ${params.planName}`;
      urgencyText = "Tu cuota vence <strong>hoy</strong>.";
      urgencyColor = "#dc2626";
    } else if (params.daysUntilDue === 1) {
      subject = `⚠️ Tu cuota vence mañana — ${params.planName}`;
      urgencyText = "Tu cuota vence <strong>mañana</strong>.";
      urgencyColor = "#d97706";
    } else {
      subject = `📅 Recordatorio de pago — ${params.planName}`;
      urgencyText = `Tu cuota vence en <strong>${params.daysUntilDue} días</strong>.`;
      urgencyColor = "#2563eb";
    }

    await transporter.sendMail({
      from: `"${APP_NAME}" <${process.env.GMAIL_USER}>`,
      to: params.to,
      subject,
      html: `
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8" /></head>
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
                        <h1 style="margin:0 0 8px 0;font-size:20px;font-weight:700;color:#18181b;">
                          Hola, ${params.studentName} 👋
                        </h1>
                        <p style="margin:0 0 24px 0;font-size:15px;color:#71717a;line-height:1.6;">
                          Tu entrenador <strong style="color:#18181b;">${params.trainerName}</strong> te recuerda que tenés un pago pendiente.
                        </p>

                        <div style="background-color:#fafafa;border:1px solid #e4e4e7;border-radius:10px;padding:20px;margin-bottom:24px;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding:6px 0;">
                                <span style="font-size:13px;color:#71717a;">Plan</span>
                                <p style="margin:2px 0 0 0;font-size:15px;font-weight:600;color:#18181b;">${params.planName}</p>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:6px 0;border-top:1px solid #e4e4e7;">
                                <span style="font-size:13px;color:#71717a;">Cuota</span>
                                <p style="margin:2px 0 0 0;font-size:15px;font-weight:600;color:#18181b;">Nº ${params.installmentNumber}</p>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:6px 0;border-top:1px solid #e4e4e7;">
                                <span style="font-size:13px;color:#71717a;">Monto</span>
                                <p style="margin:2px 0 0 0;font-size:24px;font-weight:700;color:#18181b;">$${params.amount.toLocaleString("es-AR")}</p>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:6px 0;border-top:1px solid #e4e4e7;">
                                <span style="font-size:13px;color:#71717a;">Fecha de vencimiento</span>
                                <p style="margin:2px 0 0 0;font-size:15px;font-weight:600;color:${urgencyColor};">
                                  ${params.dueDate.toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}
                                </p>
                              </td>
                            </tr>
                          </table>
                        </div>

                        <div style="background-color:#fef9ec;border:1px solid #fde68a;border-radius:8px;padding:14px;">
                          <p style="margin:0;font-size:14px;color:#92400e;line-height:1.5;">
                            ⏰ ${urgencyText} Coordiná el pago con tu entrenador.
                          </p>
                        </div>
                      </td>
                    </tr>

                    <tr>
                      <td align="center" style="padding-top:24px;">
                        <p style="margin:0;font-size:12px;color:#a1a1aa;">
                          ${APP_NAME} · Este recordatorio fue enviado por tu entrenador ${params.trainerName}.
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

  static async sendOverdueReminder(params: {
    to: string;
    studentName: string;
    trainerName: string;
    planName: string;
    installmentNumber: number;
    amount: number;
    dueDate: Date;
    daysOverdue: number;
  }) {
    await transporter.sendMail({
      from: `"${APP_NAME}" <${process.env.GMAIL_USER}>`,
      to: params.to,
      subject: `❌ Cuota vencida — ${params.planName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8" /></head>
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
                        <h1 style="margin:0 0 8px 0;font-size:20px;font-weight:700;color:#18181b;">
                          Hola, ${params.studentName} 👋
                        </h1>
                        <p style="margin:0 0 24px 0;font-size:15px;color:#71717a;line-height:1.6;">
                          Tenés una cuota vencida con tu entrenador <strong style="color:#18181b;">${params.trainerName}</strong>.
                        </p>

                        <div style="background-color:#fafafa;border:1px solid #e4e4e7;border-radius:10px;padding:20px;margin-bottom:24px;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding:6px 0;">
                                <span style="font-size:13px;color:#71717a;">Plan</span>
                                <p style="margin:2px 0 0 0;font-size:15px;font-weight:600;color:#18181b;">${params.planName}</p>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:6px 0;border-top:1px solid #e4e4e7;">
                                <span style="font-size:13px;color:#71717a;">Cuota</span>
                                <p style="margin:2px 0 0 0;font-size:15px;font-weight:600;color:#18181b;">Nº ${params.installmentNumber}</p>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:6px 0;border-top:1px solid #e4e4e7;">
                                <span style="font-size:13px;color:#71717a;">Monto</span>
                                <p style="margin:2px 0 0 0;font-size:24px;font-weight:700;color:#dc2626;">$${params.amount.toLocaleString("es-AR")}</p>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:6px 0;border-top:1px solid #e4e4e7;">
                                <span style="font-size:13px;color:#71717a;">Venció</span>
                                <p style="margin:2px 0 0 0;font-size:15px;font-weight:600;color:#dc2626;">
                                  Hace ${params.daysOverdue} día${params.daysOverdue !== 1 ? "s" : ""} (${params.dueDate.toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })})
                                </p>
                              </td>
                            </tr>
                          </table>
                        </div>

                        <div style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px;">
                          <p style="margin:0;font-size:14px;color:#991b1b;line-height:1.5;">
                            ❌ Tu cuota está vencida. Por favor coordiná el pago con tu entrenador a la brevedad.
                          </p>
                        </div>
                      </td>
                    </tr>

                    <tr>
                      <td align="center" style="padding-top:24px;">
                        <p style="margin:0;font-size:12px;color:#a1a1aa;">
                          ${APP_NAME} · Este recordatorio fue enviado por tu entrenador ${params.trainerName}.
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
