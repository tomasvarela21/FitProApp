const REQUIRED_VARS = [
  "DATABASE_URL",
  "DIRECT_URL",
  "JWT_ACCESS_SECRET",
  "RESEND_API_KEY",
  "ADMIN_SECRET",
  "CRON_SECRET",
  "APP_URL",
] as const;

export function validateEnv(): void {
  const missing = REQUIRED_VARS.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    console.error("[ENV] Variables de entorno requeridas faltantes:");
    missing.forEach((v) => console.error(`  - ${v}`));
    process.exit(1);
  }

  // Advertencias para vars opcionales importantes
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn("[ENV] VAPID_PUBLIC_KEY/PRIVATE_KEY no configuradas — push notifications deshabilitadas");
  }
}
