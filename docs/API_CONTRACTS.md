# Contratos HTTP

## Envelope

```json
{
  "ok": true,
  "message": "Operación exitosa",
  "data": {}
}
```

```json
{
  "ok": false,
  "message": "Datos inválidos",
  "errors": {}
}
```

`data` y `errors` son opcionales. Los clientes deben decidir por el código HTTP y `ok`, no por comparar textos.

## Códigos

| Código | Semántica estable |
|---|---|
| 200 | Lectura o actualización exitosa |
| 201 | Recurso creado |
| 400 | Body, query o parámetro inválido; JSON mal formado |
| 401 | Credenciales ausentes, token inválido, usuario suspendido o sesión revocada |
| 404 | Recurso inexistente o fuera del alcance del usuario |
| 409 | Estado concurrente, versión desactualizada, token consumido o idempotencia duplicada |
| 413 | JSON superior a 100 KB |
| 429 | Límite global excedido |
| 500 | Error interno inesperado |
| 503 | Proveedor o proceso temporalmente indisponible |

## Autenticación web

- El login y refresh entregan el access token en `data.accessToken`.
- El refresh token no forma parte del JSON; se transporta en cookie HttpOnly.
- Una renovación consume y rota el token anterior. Dos renovaciones concurrentes no pueden triunfar ambas.
- El access token contiene `authVersion`; el servidor lo contrasta con el usuario actual.
- Cambiar o restablecer contraseña invalida sesiones anteriores.

## Paginación

Las listas paginadas usan:

```json
{
  "items": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 1
  }
}
```

El filtro se aplica antes de paginar. Una página fuera de rango conserva el total y devuelve `items: []`.

## Conflictos recuperables

- Planificación semanal: enviar la `version` leída. HTTP 409 obliga a recargar antes de sobrescribir.
- Entrenamientos: reutilizar la misma clave de idempotencia en un reintento de la misma sesión.
- Pagos y cancelaciones: un 409 indica que otra operación ya cambió el estado.

## Recursos privados

Los IDs anidados no conceden acceso. El backend valida entrenador, alumno, gimnasio, rutina y ejercicios relacionados. La respuesta a un recurso ajeno es 404 para reducir enumeración.
