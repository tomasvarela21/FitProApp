# Frontend web de FitProApp

SPA de entrenadores y alumnos construida con React, Vite, TypeScript, React Query y Zustand.

## Comandos

```bash
npm ci
npm run dev
npm run lint
npm run test:unit
npm run build
npm run test:e2e
npm run test:e2e:all
```

`test:e2e` ejecuta Chromium y WebKit, los motores operativos en el host de desarrollo actual. `test:e2e:all` agrega Firefox y es el comando usado por CI.

La sesión guarda el access token solo en memoria. La renovación usa una cookie HttpOnly emitida por el backend. `VITE_API_URL` debe apuntar a la raíz `/api` del backend.

La arquitectura y los procedimientos completos están en la raíz del repositorio.
