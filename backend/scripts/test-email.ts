import { EmailService } from "../src/infrastructure/email/email.service";
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env") });

async function main() {
  console.log("📧 Probando envío de email...");
  console.log("GMAIL_USER:", process.env.GMAIL_USER);
  console.log("GMAIL_APP_PASSWORD:", process.env.GMAIL_APP_PASSWORD ? "✅ configurada" : "❌ no configurada");

  try {
    await EmailService.sendInvitation({
      to: "tomasgastos8@gmail.com",
      firstName: "Test",
      trainerName: "Trainer Test",
      invitationToken: "test123",
    });
    console.log("✅ Email enviado correctamente");
  } catch (e: unknown) {
    console.error("❌ Error:", (e as Error).message);
  }
}

main();