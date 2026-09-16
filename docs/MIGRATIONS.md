# Procedimiento de migraciones

## Reglas

1. No editar una migración aplicada.
2. Crear una migración nueva y aditiva cuando sea posible.
3. No ejecutar `prisma migrate reset` sobre datos que deban conservarse.
4. No resolver duplicados o inconsistencias borrando datos automáticamente.
5. Verificar claves foráneas, índices, restricciones e importes antes y después.

## Desarrollo

```bash
cd backend
npm ci
npx prisma validate
npx prisma migrate dev --name nombre_descriptivo
npm run test:integration
```

La migración debe incluir una prueba con esquema aislado y datos representativos cuando cambie restricciones o snapshots históricos.

## Ensayo previo a producción

1. Restaurar una copia anonimizada y representativa en un entorno aislado.
2. Medir duración, locks y espacio adicional.
3. Ejecutar `npx prisma migrate status`.
4. Aplicar `npx prisma migrate deploy` con los mismos límites de conexión previstos.
5. Comparar conteos por tabla, relaciones, suscripciones activas, cuotas pagadas e importes.
6. Ejecutar consultas de historial, progreso, cobros y analíticas.
7. Registrar tiempo total y ventana de bloqueo.

Las migraciones que sustituyen `CASCADE` por `RESTRICT`, crean índices o hacen columnas obligatorias deben ensayarse con volumen realista. El entorno automatizado prueba conservación funcional, pero no predice la duración de locks en producción.

## Orden de despliegue

Las migraciones actuales se diseñaron para aplicarse antes del backend que las consume:

1. Pausar escrituras sensibles o procesos programados si la migración lo requiere.
2. Crear un backup verificable.
3. Ejecutar `prisma migrate deploy` con `DIRECT_URL`.
4. Verificar estado y conteos.
5. Desplegar backend.
6. Desplegar frontend.
7. Reanudar workers y cron; observar outbox y errores.

## Recuperación

Prisma no genera down migrations automáticas. Ante un fallo:

- Detener nuevas escrituras.
- Revertir la aplicación solo si el esquema sigue siendo compatible.
- Corregir hacia adelante con una nueva migración cuando los datos estén íntegros.
- Restaurar el backup si hubo transformación destructiva o pérdida verificable.

No marcar manualmente una migración como aplicada sin comprobar que su SQL quedó ejecutado por completo.
