# Seguimiento de correcciones — FitProApp

Este documento registra el avance del plan de corrección, la evidencia de pruebas, los commits y los problemas nuevos o pendientes encontrados durante el trabajo.

## Alcance y reglas de actualización

- Alcance: backend y frontend web.
- Fuera de alcance: correcciones funcionales del chat y `mobile-app`.
- Los datos existentes deben conservarse.
- Una fase solo comienza después de su autorización.
- Cada entrega registra el problema, el cambio aplicado, las pruebas ejecutadas, las limitaciones y el commit local.
- Un control que no pudo ejecutarse se informa como pendiente; no se considera exitoso.
- El archivo `Presupuesto De La Rosa.pdf` permanece fuera de los commits.
- Publicaciones, despliegues, push y migraciones sobre bases reales requieren autorización independiente.

**Última actualización:** 10 de septiembre de 2026  
**Commit inicial del plan:** `8a9f261`

## Estado general

| Fase | Objetivo | Estado | Entregas |
|---|---|---|---:|
| 1 | Testing aislado y línea base | Completada con limitaciones registradas | 2/2 |
| 2 | Autorización y validación de entradas | Pendiente de autorización | 0/3 |
| 3 | Autenticación y aislamiento de sesiones | Pendiente | 0/4 |
| 4 | Cobros y suscripciones | Pendiente | 0/3 |
| 5 | Historial y migraciones | Pendiente | 0/2 |
| 6 | Planificación, entrenamientos y fechas | Pendiente | 0/4 |
| 7 | Comunicaciones y procesos programados | Pendiente | 0/2 |
| 8 | Rendimiento, regresiones y entrega | Pendiente | 0/3 |

## Registro de hallazgos pendientes

| ID | Detectado en | Severidad | Hallazgo | Estado | Fase prevista |
|---|---|---|---|---|---|
| `DEP-001` | Fase 1 | Alta | `npm audit --omit=dev` informa 21 vulnerabilidades en el árbol de producción: 13 altas, 5 medias y 3 bajas. Incluye dependencias como Axios, React Router y Vite. | Pendiente de análisis y actualización controlada | 2, 3 y 8 |
| `QA-001` | Fase 1 | Media | El lint global del frontend informa 19 errores y 15 advertencias preexistentes. | Pendiente; los archivos agregados en la Fase 1 pasan lint dirigido | 2 a 8, según módulo |
| `ENV-001` | Fase 1 | Media | Firefox de Playwright no inicia en el host por un error de activación `SideBySide` del ensamblado `mozglue`. | Limitación del entorno; Chromium y WebKit operativos | 8 |
| `PERF-001` | Fase 1 | Media | El bundle principal del frontend alcanza aproximadamente 1,22 MB sin comprimir. | Pendiente de medición y optimización | 8 |
| `PERF-002` | Fase 1 | Baja | `auth.api.ts` se importa de forma estática y dinámica, por lo que Vite no puede separarlo en otro chunk. | Pendiente | 8 |
| `QA-002` | Fase 1 | Baja | Vitest/Vite informa una advertencia futura de configuración y `node-cron` genera una advertencia de source map durante las pruebas del backend. | Pendiente de revisión | 8 |

Los hallazgos de dependencias se validarán contra su uso real antes de actualizar paquetes. No se ejecutará `npm audit fix` de forma indiscriminada.

## Fase 1 — Testing aislado y línea base

**Estado:** completada con una limitación de Firefox registrada.  
**Objetivo alcanzado:** las pruebas del backend no usan secretos, bases ni proveedores reales; el frontend dispone de pruebas unitarias y recorridos web repetibles.

### Entrega 1.1 — Aislamiento del backend

| Elemento | Evidencia |
|---|---|
| Problema | Las pruebas compartían carga de entorno y dependencias con la aplicación, sin una separación confiable entre pruebas unitarias e integración. |
| Cambio | Se separaron las configuraciones unitarias e integración. Se añadió PostgreSQL temporal y descartable, una protección que rechaza destinos no locales o sin marca de testing, fixtures multitenant y sustitutos de correo y Web Push. El cálculo de rachas se separó de Prisma y notificaciones. |
| Datos de prueba | Dos entrenadores, alumnos de ambos, ejercicios privados y globales, rutina, asignación, sesión histórica, plan, suscripción y cuota. |
| Pruebas | Unitarias: 25/25 exitosas en dos ejecuciones. Integración: 10/10 exitosas en dos ejecuciones, reconstruyendo PostgreSQL y aplicando las 20 migraciones cada vez. |
| Regresión | Compilación del backend exitosa. Las pruebas confirman que los proveedores externos están sustituidos y que destinos de base no autorizados son rechazados. |
| Datos reales | No se conectó ni escribió en Supabase o en otra base persistente. No se enviaron correos ni notificaciones. |
| Commit | `14b0ae8` — `test: aislar las pruebas del backend` |

### Entrega 1.2 — Pruebas del frontend y recorridos web

| Elemento | Evidencia |
|---|---|
| Problema | El frontend no tenía un entorno de pruebas de componentes ni recorridos de navegador reproducibles. |
| Cambio | Se incorporaron Vitest, React Testing Library y Playwright. Se añadieron pruebas del store de autenticación, del logo por tenant y del acceso público con validación del formulario. |
| Pruebas | Unitarias: 5/5 exitosas en dos ejecuciones. E2E estable: Chromium y WebKit exitosos. Lint dirigido de todos los archivos nuevos: exitoso. Compilación de producción: exitosa. |
| Defecto detectado durante testing | El primer selector E2E elegía un formulario responsivo oculto debido a IDs duplicados en el DOM. El caso se corrigió para trabajar dentro del formulario visible y pasó en los motores operativos. |
| Limitación | La matriz completa termina con 2 pruebas exitosas y 1 no ejecutable porque Windows no puede iniciar Firefox de Playwright; el registro del sistema confirma el error `SideBySide` de `mozglue`. |
| Línea base | El lint global conserva 19 errores y 15 advertencias anteriores. La auditoría de producción conserva 21 vulnerabilidades de dependencias. |
| Commit | `b5e58f0` — `test: preparar pruebas del frontend y recorridos web` |

## Fase 2 — Autorización y validación de entradas

**Estado:** pendiente de autorización.  
**Registro de entregas:** todavía no iniciado.

Se documentarán aquí los controles de propiedad, la matriz de permisos, la validación de relaciones y la normalización de respuestas HTTP.

## Fase 3 — Autenticación y aislamiento de sesiones

**Estado:** pendiente.  
**Registro de entregas:** todavía no iniciado.

Se documentarán aquí el consumo atómico de tokens, la revocación de sesiones y la separación de estado y caché entre cuentas.

## Fase 4 — Cobros y suscripciones

**Estado:** pendiente.  
**Registro de entregas:** todavía no iniciado.

Se documentarán aquí las transiciones concurrentes, la atomicidad de suscripciones, la precisión monetaria y la sincronización de vistas.

## Fase 5 — Historial y migraciones

**Estado:** pendiente.  
**Registro de entregas:** todavía no iniciado.

Se documentarán aquí el archivado, la conservación de relaciones históricas y las comprobaciones de migración sobre bases vacías y pobladas.

## Fase 6 — Planificación, entrenamientos y fechas

**Estado:** pendiente.  
**Registro de entregas:** todavía no iniciado.

Se documentarán aquí las semanas persistentes, conflictos de versión, idempotencia de sesiones, fechas de negocio y rachas.

## Fase 7 — Comunicaciones y procesos programados

**Estado:** pendiente.  
**Registro de entregas:** todavía no iniciado.

Se documentarán aquí la validación de contenidos y destinos, los timeouts, la outbox, los reintentos y la coordinación de procesos.

## Fase 8 — Rendimiento, regresiones y entrega

**Estado:** pendiente.  
**Registro de entregas:** todavía no iniciado.

Se documentarán aquí las mediciones antes y después, la paginación, los controles de integración continua, las pruebas completas y las limitaciones finales.

## Plantilla para próximas entregas

Cada nueva entrega deberá agregar un registro con esta información:

| Elemento | Contenido requerido |
|---|---|
| Problema | Caso reproducible, riesgo o advertencia que origina el cambio |
| Cambio | Comportamiento anterior y comportamiento corregido |
| Archivos | Archivos y migraciones incluidos |
| Pruebas | Comandos, entorno, cantidad de casos y resultado real |
| Regresión | Flujos relacionados que se comprobaron |
| Datos | Evidencia de conservación o transformación, cuando corresponda |
| Limitaciones | Pruebas omitidas, bloqueadas o fallidas y su causa |
| Nuevos hallazgos | ID, severidad, impacto, estado y fase prevista |
| Commit | Hash y descripción local |
