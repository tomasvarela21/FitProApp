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

**Última actualización:** 14 de septiembre de 2026
**Commit inicial del plan:** `8a9f261`

## Estado general

| Fase | Objetivo | Estado | Entregas |
|---|---|---|---:|
| 1 | Testing aislado y línea base | Completada con limitaciones registradas | 2/2 |
| 2 | Autorización y validación de entradas | Completada | 3/3 |
| 3 | Autenticación y aislamiento de sesiones | Completada | 4/4 |
| 4 | Cobros y suscripciones | Completada | 3/3 |
| 5 | Historial y migraciones | Completada | 2/2 |
| 6 | Planificación, entrenamientos y fechas | En progreso | 1/4 |
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
| `QA-003` | Fase 3 | Baja | Prisma 6 advierte que `package.json#prisma` será retirado en Prisma 7 y recomienda `prisma.config.ts`. | Pendiente; no afecta la generación actual | 8 |
| `SEC-001` | Fase 3 | Alta | El archivo local ignorado `backend/.env` contiene credenciales de base de datos con apariencia activa en texto plano. | Pendiente de rotación por el propietario y revisión del almacenamiento local; no se versionó ni expuso su contenido | Acción operativa / 8 |
| `AUTH-001` | Fase 3 | Media | La política productiva de cookies no puede validarse sin conocer los dominios reales del frontend y la API. | Se conservó `SameSite=Strict`, `Secure` y la ruta existente; verificar antes del despliegue | 8 |
| `MIG-001` | Fase 5 | Media | Reemplazar claves foráneas por restricciones `RESTRICT` requiere bloqueos de esquema cuya duración dependerá del volumen real. | Ensayar con una copia representativa y definir ventana y timeout antes del despliegue | 8 |

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

**Estado:** completada.
**Objetivo alcanzado:** los recursos y relaciones incluidos aplican el alcance del usuario autenticado, los alumnos eliminados quedan excluidos y las entradas inválidas se rechazan antes de consultar o modificar datos.

### Entrega 2.1 — Acceso autorizado a ejercicios y rutinas

| Elemento | Evidencia |
|---|---|
| Problema | Las lecturas individuales resolvían ejercicios y rutinas solo por ID. Un entrenador o alumno podía consultar recursos privados de otro entrenador. También era posible asociar a una rutina propia un ejercicio privado ajeno. |
| Reproducción | La primera matriz de integración produjo 6 fallos de 20 casos: cuatro accesos o asociaciones ajenas respondieron `200/201` y dos mutaciones ajenas respondieron `403`, revelando la existencia del recurso. |
| Cambio | Se centralizó la construcción del alcance de recursos. Los entrenadores leen recursos propios y globales; las escrituras requieren propiedad privada. Los alumnos leen ejercicios globales y privados incluidos en alguna de sus asignaciones. Los recursos fuera del alcance responden 404. |
| Protección de datos | La asociación comprueba el ejercicio antes de escribir. Las pruebas verifican que un rechazo no modifica nombres, no crea ejercicios de rutina y no clona rutinas. |
| Infraestructura de prueba | Cada archivo de integración limpia únicamente una base local cuyo nombre contiene `test`; la comprobación aborta para cualquier otro destino. Las migraciones permanecen aplicadas. |
| Pruebas | Integración: 23/23 exitosas. Unitarias: 25/25 exitosas. Compilación TypeScript: exitosa. La integración final se ejecutó sobre PostgreSQL temporal reconstruido. |
| Regresión | Se comprobaron acceso sin sesión, ambos entrenadores como propietarios, recursos globales, dos alumnos con asignaciones distintas, edición rechazada, asociación propia/global permitida y clonación ajena rechazada. |
| Limitaciones | Continúan las advertencias ya registradas de configuración futura de Vitest/Vite y source map de `node-cron`; no afectan el resultado. |
| Commit | `3a3466e` — `fix: restringir recursos al usuario autorizado` |

### Entrega 2.2 — Validación de relaciones de rutinas y alumnos

| Elemento | Evidencia |
|---|---|
| Problema | IDs válidos pero ajenos podían asociarse entre tenants o entre rutinas: asignaciones, planes semanales, overrides, registros de entrenamiento y gimnasios. Varias rutas seguían operando sobre alumnos con `deletedAt`. |
| Reproducción | La nueva suite produjo 8 fallos de 33 casos. Las operaciones vulnerables respondían `200/201` y llegaban a crear o reemplazar relaciones incorrectas. |
| Cambio | Se validó el alcance propio/global de la rutina, la pertenencia de todos los ejercicios anidados a la rutina elegida o activa, la propiedad del gimnasio y el estado no eliminado del alumno. El portal resuelve primero un alumno activo. |
| Atomicidad | La sesión valida la lista completa dentro de la transacción antes de crear el log. Los casos mezclan IDs válidos y ajenos y comprueban que los conteos de sesiones, series, overrides y asignaciones no cambian tras un rechazo. |
| Pruebas | Integración: 34/34 exitosas. Unitarias: 25/25 exitosas. Compilación TypeScript: exitosa. PostgreSQL fue temporal y reconstruido. |
| Regresión | Pasaron asignación de rutina propia y global, override válido, entrenamiento válido, gimnasio propio y consultas del portal para alumnos activos. Los alumnos eliminados reciben 404 en asignaciones, planes, resumen, perfil, suscripción, rutina y nuevos entrenamientos. |
| Migraciones | No se modificó el esquema ni se ejecutaron migraciones sobre bases reales. |
| Limitaciones | Permanecen las advertencias de tooling registradas en `QA-002`. |
| Commit | `a3da01b` — `fix: validar relaciones de rutinas y alumnos` |

### Entrega 2.3 — Errores de validación consistentes

| Elemento | Evidencia |
|---|---|
| Problema | Los errores de Zod lanzados desde controladores y el JSON malformado terminaban como HTTP 500. Varios parámetros no se validaban, un filtro booleano desconocido se aceptaba y semanas o fechas inválidas llegaban hasta Prisma. |
| Reproducción | La prueba focalizada inicial produjo 11 fallos de 12 casos: entradas inválidas respondían 500 o 404 y `isGlobal=quizas` respondía 200. El único caso correcto era el 404 de un recurso con ID válido pero inaccesible. |
| Cambio | El manejador global convierte Zod y JSON malformado en `400 Datos inválidos`. Se añadieron esquemas compartidos para CUID, semanas y fechas, y se aplicaron a rutas, queries y relaciones de ejercicios, rutinas, alumnos, gimnasios, planes, suscripciones, lesiones y entrenamientos. |
| Seguridad | Los errores de sintaxis JSON no reflejan el texto interno del parser. Los IDs y fechas se rechazan antes de llegar a Prisma, y un recurso con identificador válido fuera del alcance continúa ocultándose con 404. |
| Pruebas | Integración final: 48/48 exitosas. Unitarias: 25/25 exitosas. Compilación TypeScript: exitosa. `git diff --check`: sin errores. |
| Regresión | Se repitió toda la matriz de autenticación, autorización multitenant, relaciones anidadas, alumnos eliminados y flujos válidos sobre PostgreSQL temporal. |
| Datos y migraciones | No se modificó el esquema, no se ejecutaron migraciones sobre bases reales y los casos inválidos no generan escrituras. |
| Limitaciones | El primer intento focalizado posterior al cambio fue bloqueado por `spawn EPERM`; se repitió mediante el comando autorizado y la suite completa pasó. Permanecen las advertencias de tooling registradas en `QA-002`. |
| Nuevos hallazgos | No se detectaron nuevos defectos funcionales ni de seguridad durante esta entrega. |
| Commit | `c9d35e8` — `fix: devolver errores de validación consistentes` |

**Cierre de la fase:** los escenarios cubiertos de acceso cruzado, relaciones inválidas y entradas malformadas se rechazan con la política HTTP acordada, mientras los recorridos permitidos continúan operativos.

## Fase 3 — Autenticación y aislamiento de sesiones

**Estado:** completada.
**Objetivo alcanzado:** las credenciales de un solo uso se consumen atómicamente, los cambios de credenciales revocan sesiones y el frontend coordina refresh, logout y caché sin aceptar datos de una identidad anterior.

### Entrega 3.1 — Consumo atómico de tokens

| Elemento | Evidencia |
|---|---|
| Problema | Refresh tokens, invitaciones de alumnos y verificaciones de entrenadores seguían un patrón de lectura, comprobación y actualización separado. Dos solicitudes simultáneas podían superar la comprobación antes de que alguna marcara el token como usado. |
| Reproducción | La matriz concurrente inicial falló 2 de 3 casos: activación de alumno y verificación de email respondieron `200/200` al usar dos veces el mismo token. La rotación de refresh produjo un solo éxito por orden incidental, aunque conservaba el mismo patrón no atómico. |
| Cambio | Cada token se reclama con `updateMany` condicionado a `usedAt/revokedAt = null` y vigencia dentro de la misma transacción que aplica sus efectos. Solo la solicitud que actualiza una fila continúa. Logout utiliza una actualización condicional idempotente. |
| Pruebas | Integración: 51/51 exitosas sobre PostgreSQL temporal. Unitarias: 25/25 exitosas. Compilación TypeScript: exitosa. La matriz concurrente se repitió después de corregir un error de tipado detectado por el compilador. |
| Regresión | Se repitieron autenticación básica, rotación, activación, verificación, autorización multitenant, relaciones y validación de entradas. Cada prueba concurrente usa peticiones HTTP independientes. |
| Datos y migraciones | No se modificó el esquema ni se ejecutaron migraciones sobre bases reales. Una transacción perdedora se revierte sin cambiar cuenta ni emitir una credencial sucesora. |
| Limitaciones | La concurrencia puede variar el orden del ganador, por lo que se valida el conjunto de estados HTTP y la cantidad final de tokens activos. Permanecen las advertencias de tooling de `QA-002`. |
| Nuevos hallazgos | El compilador detectó que el estrechamiento nullable de `student.userId` no sobrevivía al callback transaccional; se corrigió antes de validar la entrega. |
| Commit | `916f079` — `fix(auth): consumir tokens una sola vez` |

### Entrega 3.2 — Revocación por cambio de credenciales

| Elemento | Evidencia |
|---|---|
| Problema | Los access tokens solo validaban firma y vencimiento. Una cuenta suspendida o reseteada conservaba acceso; cambiar contraseña no revocaba refresh tokens; se confiaba en rol y email del JWT sin contrastarlos con la base; la nueva invitación de reset se creaba después de confirmar los cambios de cuenta. |
| Reproducción | Los 6 controles nuevos fallaron inicialmente: suspensión, cambio de contraseña, reset administrativo, JWT sin versión, rol inconsistente y fallo al insertar la invitación. Este último dejó la cuenta y el alumno en `INVITED` aunque no existía un enlace nuevo. |
| Cambio | Se agregó `User.authVersion`, se incluye en nuevos JWT y se contrasta con estado, rol, email y alumno actual en cada solicitud autenticada. Cambio y reset de contraseña incrementan la versión y revocan refresh tokens. El reset incorpora cuenta, alumno, revocación e invitación en una única transacción. |
| Migración | Se añadió la migración `20260911093000_add_user_auth_version`, que agrega una columna `INTEGER NOT NULL DEFAULT 1`. Las cuentas creadas sin indicar versión recibieron 1 y las 21 migraciones se aplicaron desde cero en PostgreSQL temporal. No se ejecutó sobre una base real. |
| Pruebas | Integración: 57/57 exitosas. Unitarias: 25/25 exitosas. Compilación TypeScript: exitosa. Los 6 casos que fallaban pasaron después del cambio. |
| Atomicidad | Un trigger temporal provoca el fallo de inserción de la invitación. Tras el 500 controlado, usuario, alumno, contraseña y refresh token mantienen el estado anterior y el access token continúa válido. |
| Compatibilidad | Los JWT emitidos antes de esta migración no contienen `authVersion` y reciben 401. Es el cierre de sesión controlado previsto por el plan. Los alumnos eliminados también reciben 401 desde autenticación. |
| Limitaciones | `requireAuth` agrega una lectura de usuario por solicitud; su costo se medirá y optimizará en la Fase 8 sin reducir la garantía de revocación. Prisma informó que la configuración en `package.json` quedará obsoleta en Prisma 7; se registra en `QA-003`. |
| Nuevos hallazgos | `QA-003` — advertencia deprecada de Prisma: migrar la configuración de `package.json#prisma` a `prisma.config.ts` antes de Prisma 7. |
| Commit | `f9fa945` — `fix(auth): revocar sesiones al cambiar credenciales` |

### Entrega 3.3 — Coordinación de renovación y cierre de sesión

| Elemento | Evidencia |
|---|---|
| Problema | El frontend podía iniciar renovaciones duplicadas bajo StrictMode o entre pestañas. Una respuesta tardía podía volver a guardar un token después de logout o de cambiar de cuenta. El backend también exponía y aceptaba refresh tokens en JSON. |
| Reproducción | Dos pruebas nuevas del store fallaron inicialmente porque el token tardío se aplicaba tras logout y sobrescribía la cuenta B con una renovación de la cuenta A. Dos contratos HTTP adicionales fallaron porque login devolvía `refreshToken` y refresh aceptaba un token enviado solo en el body. |
| Cambio | Se incorporó un coordinador con operación única por sesión y pestaña, bloqueo compartido mediante almacenamiento local, propagación por `BroadcastChannel`, timeout de 8 segundos y cancelación. Solicitudes y respuestas quedan ligadas a usuario y revisión de sesión. Login, inicialización y logout usan el coordinador; el refresh token queda restringido a la cookie `HttpOnly`. |
| Pruebas | Backend integración: 59/59 exitosas. Backend unitarias: 25/25 exitosas. Frontend unitarias: 12/12 exitosas. E2E: 2/2 exitosas en Chromium y WebKit. ESLint dirigido: sin hallazgos. Compilaciones de backend y frontend: exitosas. |
| Regresión | Se comprobaron una sola renovación por pestaña, coordinación entre dos pestañas, timeout, logout propagado, respuesta tardía descartada, cambio cuenta A → B, contratos de cookie y los recorridos web disponibles. |
| Contrato | Login y refresh ya no incluyen refresh tokens en JSON; refresh y logout los leen únicamente de la cookie. La política productiva existente se mantuvo hasta verificar dominios reales. |
| Limitaciones | Firefox continúa bloqueado por `ENV-001`. La compilación conserva `PERF-001` y `PERF-002`. No se validaron cookies sobre dominios productivos porque no están definidos en el repositorio. |
| Nuevos hallazgos | `SEC-001` registra credenciales locales que requieren rotación operativa; `AUTH-001` registra la comprobación pendiente de dominios y cookies. Ningún secreto fue incluido en el commit. |
| Commit | `2e8738d` — `fix(web): coordinar renovación y cierre de sesión` |

### Entrega 3.4 — Separación de caché por usuario

| Elemento | Evidencia |
|---|---|
| Problema | React Query mantenía claves iguales para todas las cuentas y el logout no cancelaba ni eliminaba consultas o mutaciones privadas. Una edición de perfil reutilizaba `setAuth` e incrementaba la revisión de sesión aunque la identidad no hubiera cambiado. |
| Reproducción | La línea base falló 5 de 17 controles: la caché sobrevivió al logout y al cambio A → B, una consulta siguió activa, la misma clave colisionó entre dos identidades y la edición de perfil cambió la revisión de sesión. |
| Cambio | Se centralizó el `QueryClient`, se incorporó el ID autenticado al hash de todas las claves y se conectó su cancelación y limpieza al coordinador de sesión. Se añadió `updateUser`, que solo acepta la identidad activa y conserva la revisión. |
| Pruebas | Frontend unitarias: 18/18 exitosas. ESLint dirigido: sin errores ni advertencias. Compilación de producción: exitosa. E2E: 2/2 exitosas en Chromium y WebKit. |
| Regresión | Se verificaron datos privados eliminados tras logout, caché vacía antes de establecer B, señal de cancelación en consultas activas, espacios distintos para A y B, lectura correcta al alternar identidades y rechazo de actualizaciones de perfil ajenas. |
| Cierre integrado | Backend unitarias: 25/25 exitosas; integración: 59/59 exitosas sobre PostgreSQL temporal; compilación: exitosa. El frontend conservó los 18 casos y los recorridos de navegador exitosos. |
| Datos y migraciones | No se modificó el esquema ni se utilizó una base real. La limpieza afecta únicamente estado efímero del navegador. |
| Limitaciones | Firefox continúa bloqueado por `ENV-001`. Persisten `PERF-001`, `PERF-002` y las advertencias de tooling ya registradas. |
| Nuevos hallazgos | No se detectaron defectos adicionales durante esta entrega. |
| Commit | `2c7dcac` — `fix(web): separar la caché por usuario` |

**Cierre de la fase:** una credencial revocada no recupera acceso en los casos cubiertos, las renovaciones concurrentes consumen una sola credencial y el flujo cuenta A → logout → cuenta B no conserva datos privados en memoria o caché.

Se documentarán aquí el consumo atómico de tokens, la revocación de sesiones y la separación de estado y caché entre cuentas.

## Fase 4 — Cobros y suscripciones

**Estado:** completada.
**Objetivo alcanzado:** las consultas no modifican cobros, las suscripciones se reemplazan atómicamente y las transiciones de pago y cancelación tienen un único resultado válido bajo concurrencia.

### Entrega 4.1 — Consultas de cobros sin efectos laterales

| Elemento | Evidencia |
|---|---|
| Problema | Consultar suscripciones, portal, resumen o dashboard convertía cuotas a `OVERDUE`; consultar vencimientos convertía suscripciones a `EXPIRED`. Dos rutas lanzaban escrituras sin esperarlas y analíticas dependía de que otra pantalla hubiera ejecutado primero esas mutaciones. |
| Reproducción | La matriz inicial falló 6/6 casos: cuatro consultas modificaron cuotas, una modificó la suscripción y analíticas clasificó $100 vencidos como pendientes. |
| Cambio | Se centralizaron los estados efectivos de cuota y suscripción y el cálculo de días. Las respuestas derivan `OVERDUE` y `EXPIRED` desde fecha, estado persistido y un único reloj, sin escrituras. Dashboard, alumnos, cobros, resumen, portal y analíticas consumen las mismas reglas. |
| Compatibilidad | La consulta de vencidas incluye registros `EXPIRED` creados por el comportamiento anterior y produce el mismo resultado en llamadas repetidas. Los estados transaccionales `PAID` y `CANCELLED` no se reinterpretan. |
| Pruebas | Integración focalizada: 7/7 exitosas. Integración completa: 66/66 exitosas sobre PostgreSQL temporal. Unitarias: 28/28 exitosas. Compilación TypeScript: exitosa. |
| Regresión | Se verificaron respuestas de entrenador y alumno, resumen, dashboard, vencimientos repetidos, datos `EXPIRED` heredados, analíticas y conservación de `ACTIVE/PENDING` en PostgreSQL. |
| Datos y migraciones | No se modificó el esquema ni se ejecutaron migraciones. Las pruebas reconstruyeron exclusivamente la base local identificada como testing. |
| Hallazgo durante testing | El cálculo podía producir `-0` para vencimientos inferiores a un día. Se normalizó a `0` y quedó cubierto con una prueba de límite. |
| Limitaciones | Permanecen las advertencias de tooling registradas en `QA-002`; no afectan el resultado. |
| Commit | `7eb3847` — `fix(cobros): evitar cambios de estado desde consultas` |

### Entrega 4.2 — Reemplazo atómico de suscripciones

| Elemento | Evidencia |
|---|---|
| Problema | Reemplazar una suscripción cancelaba la anterior antes de iniciar la transacción, dejaba sus cuotas pendientes cobrables y permitía dos altas activas concurrentes. Un fallo al crear cuotas podía dejar al alumno sin suscripción activa. También se admitían alumnos eliminados. |
| Reproducción | La matriz inicial falló 5/5 casos: cuota anterior pendiente, cancelación parcial ante fallo controlado, dos respuestas 201 concurrentes, duplicado directo aceptado por PostgreSQL y alta para un alumno eliminado. |
| Cambio | La comprobación de alumno y plan, la cancelación de cuotas y suscripción anteriores, y la creación de la nueva suscripción y sus cuotas se ejecutan en una única transacción. El cliente identifica la suscripción que espera reemplazar; un estado ausente o desactualizado responde 409. La primera asignación continúa admitiéndose sin ese identificador. |
| Integridad | Se añadió un índice único parcial para una sola suscripción `ACTIVE` por alumno. La migración comprueba duplicados existentes y aborta con una explicación; no borra ni modifica registros para forzar la restricción. Las cuotas usan centavos enteros y el residuo se conserva en la última cuota. |
| Pruebas | Integración focalizada: 7/7 exitosas. Integración completa: 73/73 exitosas sobre PostgreSQL temporal. Backend: 28/28 unitarias y compilación exitosa. Frontend: 18/18 unitarias, lint dirigido y compilación de producción exitosos. |
| Regresión | Se verificaron reemplazo normal, rollback ante un trigger que rechaza cuotas, dos reemplazos simultáneos, contrato faltante, primera asignación, restricción directa de PostgreSQL y alumno eliminado. |
| Datos y migraciones | Las 21 migraciones se aplicaron desde cero en la base descartable. No se ejecutó la migración sobre una base real. Una base poblada con duplicados activos será rechazada para permitir una resolución manual que preserve datos. |
| Limitaciones | El primer intento focalizado fue bloqueado por `spawn EPERM` y se repitió con el comando autorizado. Persisten las advertencias de tooling de `QA-002` y las de bundle de `PERF-001`/`PERF-002`. |
| Nuevos hallazgos | No se detectaron nuevos defectos funcionales o de seguridad fuera del alcance de esta entrega. |
| Commit | `0adeda0` — `fix(cobros): reemplazar suscripciones de forma atómica` |

### Entrega 4.3 — Pagos concurrentes y vistas sincronizadas

| Elemento | Evidencia |
|---|---|
| Problema | Pago y cancelación comprobaban el estado antes de escribirlo, por lo que la decisión no estaba ligada atómicamente a la transición. Dos cancelaciones devolvían éxito. Los conflictos usaban 400, montos fuera de `Decimal(10,2)` llegaban a Prisma, podían generarse cuotas de valor cero y las vistas de cobros, alumno y analíticas quedaban desactualizadas. |
| Reproducción | La matriz inicial falló 7 de 9 casos: doble cancelación `200/200`, conflictos como 400, montos con tres decimales aceptados, exceso de rango convertido en 500, cuotas de valor cero y notas de más de 1000 caracteres. |
| Cambio | El pago usa una actualización condicional por entrenador, cuota cobrable, suscripción activa y alumno vigente. La cancelación reclama la suscripción activa y cancela cuotas en una transacción. Solo un contendiente obtiene éxito y solo un pago genera notificación. Los estados ya consumidos responden 409 y los recursos inaccesibles 404. |
| Validación monetaria | API e interfaz limitan el total a dos decimales y `99.999.999,99`, exigen al menos un centavo por cuota y limitan las notas de pago a 1000 caracteres. Las entradas inválidas responden 400 antes de escribir. |
| Sincronización web | Crear, pagar o cancelar invalida suscripción, resumen individual, listado de alumnos, cobros, dashboard, analíticas y portal del alumno. Dos pruebas unitarias verifican las siete familias y evitan invalidar el resumen de otro alumno. |
| Pruebas | Focalizadas de integración: 12/12 exitosas. Integración completa: 85/85 exitosas sobre PostgreSQL temporal. Backend: 28/28 unitarias y build exitoso. Frontend: 20/20 unitarias, lint dirigido y build exitosos. E2E: 2/2 en Chromium y WebKit. |
| Regresión | Se cubrieron pago y lectura simultáneos, pago frente a cancelación, doble pago, doble cancelación, rollback inducido, estados ya cancelados, alumno eliminado, entrenador ajeno y conservación del único estado final permitido. |
| Datos y migraciones | Esta entrega no añadió migraciones. Las pruebas limpiaron y reconstruyeron solo la base local de testing; no se utilizó una base real ni proveedores externos. |
| Limitaciones | El primer build web recibió `spawn EPERM` dentro del sandbox y pasó al repetirlo con el comando autorizado. Firefox continúa bloqueado por `ENV-001`; permanecen `QA-002`, `PERF-001` y `PERF-002`. |
| Nuevos hallazgos | No se detectaron nuevos defectos funcionales o de seguridad fuera del alcance de esta entrega. |
| Commit | `8edbd9f` — `fix(cobros): proteger pagos y actualizar sus vistas` |

**Cierre de la fase:** los escenarios concurrentes cubiertos no producen pagos duplicados, cancelaciones parciales ni estados contradictorios. Los importes se validan antes de persistirse y las pantallas relacionadas se marcan como obsoletas tras cada mutación.

## Fase 5 — Historial y migraciones

**Estado:** completada.
**Objetivo alcanzado:** retirar o editar recursos ya utilizados no elimina relaciones ni reescribe la representación histórica de suscripciones y entrenamientos.

### Entrega 5.1 — Retiro de recursos sin pérdida histórica

| Elemento | Evidencia |
|---|---|
| Problema | Los borrados de planes cancelados, rutinas, ejercicios y ejercicios de rutina seguían claves foráneas en cascada. Podían desaparecer suscripciones, cuotas pagadas, asignaciones, sesiones y series. |
| Reproducción | La matriz inicial falló 7/7 controles: las cuatro rutas destruían relaciones históricas o no informaban archivado y PostgreSQL permitía borrar directamente planes, rutinas y ejercicios utilizados. |
| Cambio | Los recursos relacionados se archivan y dejan de estar disponibles para nuevas asignaciones o entrenamientos; los recursos sin uso se eliminan físicamente. Retirar una rutina desactiva sus asignaciones actuales. La interfaz explica ambos resultados antes de confirmar. |
| Restricciones | Se añadieron marcas de archivado a ejercicio, rutina y ejercicio de rutina. Seis relaciones históricas cambiaron de cascada a `RESTRICT`, protegiendo plan, ejercicio, rutina, ejercicio de rutina y asignación frente a borrados directos. |
| Migración | La migración `20260914190000_archive_historical_resources` pasó desde una base vacía y sobre un esquema anterior poblado con suscripción, cuota, asignación, override, sesión y serie. Los conteos y referencias se conservaron y cinco borrados directos fueron rechazados. |
| Pruebas | Focalizadas: 10/10 de comportamiento y 1/1 de migración poblada. Integración completa: 96/96. Backend: 28/28 unitarias, build y validación Prisma exitosos. Frontend: 20/20 unitarias, build y lint dirigido de planes/ejercicios exitosos. E2E: 2/2 en Chromium y WebKit. |
| Regresión | Se comprobó archivado de recursos usados, eliminación definitiva de cuatro recursos nuevos sin uso, conservación de cuotas pagadas y series, ocultamiento en API, desactivación de rutina y rechazo de entrenamientos futuros con ejercicio retirado. |
| Datos reales | No se ejecutaron migraciones ni escrituras sobre una base real. Prisma solo regeneró el cliente local y validó el esquema. |
| Limitaciones | `RoutinesPage.tsx` conserva dos errores y tres advertencias preexistentes de React incluidos en `QA-001`. La sustitución de claves foráneas puede requerir bloqueos en producción; se registra como `MIG-001`. |
| Commit | `2124526` — `fix: conservar el historial al retirar recursos` |

### Entrega 5.2 — Datos históricos de suscripciones y entrenamientos

| Elemento | Evidencia |
|---|---|
| Problema | Las suscripciones, sesiones y series conservaban IDs históricos, pero las respuestas volvían a leer nombres, duración, orden y ejercicio desde recursos editables. Editar un plan cambiaba retroactivamente el contrato mostrado; mover un ejercicio de rutina reescribía el historial y atribuía el progreso al ejercicio nuevo. |
| Reproducción | La prueba inicial falló 2/2 casos. Tras editar un plan, cinco endpoints devolvieron el nombre y duración nuevos. Tras registrar una sesión y modificar rutina, ejercicio, grupo muscular y ejercicio de rutina, los tres historiales mostraron los valores nuevos y el progreso cambió de ejercicio. |
| Cambio | La suscripción guarda nombre y duración contratados. Cada sesión guarda identidad y nombre de rutina; cada serie conserva identidad y nombre del ejercicio, grupo muscular, día, orden y prescripción completa. Las altas capturan estos valores en la misma transacción y las consultas de entrenador, alumno, dashboard, cobros, historial, resumen y progreso leen los snapshots. |
| Migración | `20260914200000_add_historical_snapshots` agrega columnas, recupera valores mediante las relaciones existentes, exige que los datos obligatorios queden completos y crea una referencia `RESTRICT` desde la serie al ejercicio original. No inventa valores sin una fuente verificable. |
| Conservación | El ensayo sobre un esquema anterior poblado confirmó nombre y duración del plan, rutina, ejercicio, grupo muscular y los ocho campos de prescripción. La identidad directa del ejercicio quedó protegida y los conteos históricos no se alteraron. No se ejecutó la migración sobre una base real. |
| Pruebas | Regresión de snapshots: 2/2. Migración poblada: 1/1. Integración completa: 99/99 sobre PostgreSQL local de testing. Backend: 28/28 unitarias y build exitoso. Frontend: 20/20 unitarias y build exitoso. E2E: 2/2 en Chromium y WebKit. Prisma validó el esquema. |
| Regresión | Se repitieron autenticación, autorización, concurrencia de cobros, archivado, altas y reemplazos de suscripciones. El progreso permanece asociado al ejercicio registrado y el portal muestra el nombre histórico de la rutina. |
| Limitaciones | El lint dirigido de `RoutinePanel.tsx` conserva un error y una advertencia preexistentes en el efecto de apertura, registrados en `QA-001`; las líneas nuevas no agregaron hallazgos. El primer build web fue bloqueado por `spawn EPERM` dentro del sandbox y pasó al repetirlo con ejecución autorizada. Firefox continúa bloqueado por `ENV-001`. |
| Nuevos hallazgos | `MIG-001` también aplica a las columnas obligatorias y la nueva clave foránea: deben medirse los bloqueos sobre una copia con volumen representativo antes del despliegue. |
| Commit | `5472b2d` — `feat: guardar datos históricos de entrenamientos` |

**Cierre de la fase:** los recursos utilizados quedan protegidos frente a borrados destructivos y las vistas históricas conservan los valores verificables existentes al contratar o registrar. Las dos migraciones de la fase pasaron desde cero y sobre esquemas anteriores poblados en PostgreSQL descartable.

## Fase 6 — Planificación, entrenamientos y fechas

**Estado:** en progreso; primera entrega completada.

### Entrega 6.1 — Semanas y ajustes persistentes

| Elemento | Evidencia |
|---|---|
| Problema | Las semanas solo existían si tenían overrides. Las fechas de todas las semanas se descartaban salvo las de la semana 1, se aceptaban números duplicados e intervalos inválidos, podía activarse una semana inexistente y el portal ignoraba las notas semanales del ejercicio. |
| Reproducción | La matriz inicial falló 5/5 casos: un plan de tres semanas regresó vacío, duplicados e intervalos inválidos respondieron 201, la semana 8 inexistente se activó y la nota semanal llegó como `null` al alumno. |
| Cambio | Se agregó `WeeklyPlanWeek` para persistir cada número, fecha inicial y fecha final sin depender de overrides. La API exige semana 1, números únicos, pares completos de fechas, orden válido e intervalos sin superposición. Solo permite editar, copiar o activar semanas persistidas y sincroniza las fechas heredadas de la semana activa. |
| Portal e interfaz | El alumno recibe la nota del override activo. El formulario web permite cargar inicio y fin para cada semana, muestra el intervalo sin desplazamiento UTC y genera pestañas solo para semanas persistidas. Las asignaciones simples crean explícitamente su semana 1. |
| Migración | `20260914210000_persist_weekly_plan_weeks` recupera la semana activa de cada asignación y todos los números presentes en overrides. Solo asocia las fechas antiguas a la semana activa conocida; no inventa fechas de otras semanas. Añade restricciones de rango, par y orden de fechas. |
| Pruebas | Línea base: 5/5 fallos esperados. Focalizadas y migración: 7/7 exitosas. Integración completa: 106/106. Backend: 28/28 unitarias y build exitoso. Frontend: 20/20 unitarias y build exitoso. E2E: 2/2 en Chromium y WebKit. Prisma validó el esquema. |
| Regresión | Se cubrieron semanas sin overrides, fechas distintas, duplicados, intervalos incompletos/invertidos/superpuestos, semana inexistente, activación válida, notas del portal, asignación simple y las fases anteriores. |
| Limitaciones | El lint de `RoutinePanel.tsx` conserva el error y la advertencia preexistentes de `QA-001`; las líneas nuevas no agregaron hallazgos. Firefox permanece bloqueado por `ENV-001`. La migración debe ensayarse con volumen representativo según `MIG-001`. |
| Hallazgo durante testing | El primer build detectó que el tipo interno del override omitía `notes`; se corrigió y ambos builds posteriores pasaron. También se reemplazó la conversión directa de fechas UTC por `parseLocalDate`. |
| Commit | `77b86d8` — `fix(rutinas): conservar semanas y ajustes` |

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
