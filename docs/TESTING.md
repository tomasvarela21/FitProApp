# Estrategia de testing

## Capas

| Capa | Herramienta | Propósito |
|---|---|---|
| Backend unitario | Vitest | Fechas, rachas, estados, seguridad de plantillas y utilidades sin infraestructura |
| Backend integración/HTTP | Vitest, Supertest y PostgreSQL real | Autorización, transacciones, concurrencia, migraciones y contratos REST |
| Frontend unitario | Vitest, jsdom y React Testing Library | Sesión, caché, formularios y estados de error |
| E2E web | Playwright | Acceso público y recorridos críticos en navegadores reales |

Los mocks no sustituyen las pruebas de concurrencia o restricciones de base. Correo y push sí se sustituyen para impedir entregas reales.

## Backend

```bash
cd backend
npm ci
npm run build
npm run test:unit
npm run test:integration
```

La suite de integración levanta PostgreSQL temporal cuando `TEST_DATABASE_URL` no está definida. Requiere `initdb`, `pg_ctl` y `createdb`; `PG_BIN` puede apuntar a su directorio.

Si se proporciona `TEST_DATABASE_URL`, debe usar `localhost` o `127.0.0.1` y el nombre de la base debe contener `test`. La suite aborta ante cualquier otro destino. Nunca se debe apuntar a Supabase ni a una base compartida.

La base se migra con `prisma migrate deploy` y se vacía entre casos con `TRUNCATE ... CASCADE`. Una ejecución válida debe ser repetible dos veces consecutivas.

## Frontend

```bash
cd frontend-app
npm ci
npm run lint
npm run test:unit
npm run build
npm run test:e2e
```

Para los tres motores:

```bash
npx playwright install chromium firefox webkit
npm run test:e2e:all
```

En el host Windows auditado, Chromium y WebKit pasan y Firefox falla durante `browserType.launch` con `spawn UNKNOWN`; no llega a ejecutar el caso. CI usa Ubuntu y ejecuta los tres proyectos.

## Resultado de cierre de la auditoría

| Control | Resultado |
|---|---|
| Backend unitario | 38/38 |
| Backend integración | 145/145 en 29 archivos |
| Frontend unitario | 27/27 en 8 archivos |
| Frontend lint | 0 errores, 11 advertencias de dependencias de hooks |
| Build backend/frontend | Exitoso |
| E2E local | Chromium y WebKit exitosos; Firefox bloqueado por el host |
| Audit frontend producción | 0 vulnerabilidades |
| Audit backend producción | Sin hallazgos altos fuera de la excepción Prisma CLI documentada |

## Qué debe cubrir cada cambio

- Reproducción que falle antes del cambio cuando exista un defecto observable.
- Caso permitido y caso rechazado.
- Aislamiento entre dos entrenadores cuando intervengan recursos privados.
- IDs principales y anidados manipulados.
- Ausencia de escrituras parciales en errores.
- Concurrencia con conexiones independientes para cobros, tokens, versiones e idempotencia.
- Conservación de registros para migraciones y operaciones históricas.
- Estado visible y rollback de caché para mutaciones web.

No se considera validado un cambio si solo compila o si se omitió una prueba necesaria.
