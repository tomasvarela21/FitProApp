# FitProApp

SaaS web para que entrenadores personales administren alumnos, cobros, rutinas y progreso. Este repositorio contiene una API Express/PostgreSQL y una SPA React. La aplicación móvil y el chat están fuera del alcance de la corrección actual.

## Inicio local

Requisitos: Node.js 22 y PostgreSQL para desarrollo. Las pruebas de integración pueden levantar una instancia PostgreSQL temporal si los binarios están disponibles.

```bash
cd backend
npm ci
cp .env.example .env
npm run dev
```

```bash
cd frontend-app
npm ci
npm run dev
```

No uses credenciales productivas en archivos versionados. Completa las variables de [backend/.env.example](backend/.env.example) y configura `VITE_API_URL` en el frontend.

## Controles de calidad

```bash
cd backend
npm run audit:production
npm run build
npm run test:unit
npm run test:integration
```

```bash
cd frontend-app
npm audit --omit=dev --audit-level=high
npm run lint
npm run test:unit
npm run build
npm run test:e2e:all
```

Consulta [ARCHITECTURE.md](ARCHITECTURE.md), [docs/TESTING.md](docs/TESTING.md), [docs/MIGRATIONS.md](docs/MIGRATIONS.md), [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) y [SEGUIMIENTO_CORRECCIONES.md](SEGUIMIENTO_CORRECCIONES.md).
