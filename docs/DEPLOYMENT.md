# Preparación y despliegue

Este documento prepara una entrega; no autoriza desplegar ni ejecutar migraciones reales.

## Variables obligatorias

Usa [backend/.env.example](../backend/.env.example) como inventario. Antes de producción verifica además:

- `DATABASE_URL` para tráfico normal y `DIRECT_URL` para migraciones.
- secretos JWT, admin y cron largos, distintos y rotados.
- `OUTBOX_ENCRYPTION_SECRET` estable e independiente.
- `ALLOWED_ORIGINS` con orígenes exactos, sin comodines con credenciales.
- `APP_URL` definitivo. El frontend usa `VITE_API_URL=/api` y Vercel reenvía esa ruta al backend configurado en `frontend-app/vercel.json`.
- `TRUST_PROXY_HOPS` con la cantidad exacta de proxies.
- claves Resend y VAPID.

Las credenciales locales registradas como `SEC-001` deben rotarse antes del despliegue.

## Comprobaciones previas

```bash
cd backend
npm ci
npm run audit:production
npx prisma validate
npm run build
npm run test:unit
npm run test:integration
```

```bash
cd frontend-app
npm ci
npm audit --omit=dev --audit-level=high
npm run lint
npm run test:unit
npm run build
npm run test:e2e:all
```

Verifica dominios reales en navegador: proxy `/api`, login, cookie de refresh de primera parte, renovación, logout y cuenta A → cuenta B.

## Secuencia

1. Confirmar backup y procedimiento de recuperación.
2. Ensayar migraciones según [MIGRATIONS.md](MIGRATIONS.md).
3. Detener temporalmente cron y workers si el cambio afecta sus tablas.
4. Aplicar `npx prisma migrate deploy` con autorización explícita.
5. Desplegar backend y comprobar `/health`.
6. Desplegar frontend.
7. Reanudar procesos y observar outbox, errores HTTP y conexiones.
8. Ejecutar el smoke test completo: registro, activación, alumno, plan, pago, rutina, entrenamiento, progreso y logout.

## Escalado

El limitador global usa memoria del proceso. Antes de agregar réplicas, configura un store compartido compatible con `express-rate-limit`; de lo contrario cada instancia contará solicitudes por separado. La coordinación crítica de cobros, outbox y cron permanece respaldada por PostgreSQL.

## Criterio de recuperación

Si fallan autenticación, aislamiento de tenants, cobros o escritura histórica, detener la entrega. Mantener el esquema, revertir la aplicación si es compatible y corregir hacia adelante. Restaurar backup cuando haya pérdida o transformación inválida de datos.
