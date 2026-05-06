-- Limpiar datos existentes de rutinas globales (van a ser re-seeded)
DELETE FROM "RoutineExercise";
DELETE FROM "WorkoutSet";
DELETE FROM "WorkoutLog";
DELETE FROM "StudentRoutine";
DELETE FROM "Routine";

-- Eliminar columna daysOfWeek del modelo Routine
ALTER TABLE "Routine" DROP COLUMN IF EXISTS "daysOfWeek";

-- Agregar dayOfWeek a RoutineExercise
ALTER TABLE "RoutineExercise" ADD COLUMN "dayOfWeek" TEXT NOT NULL DEFAULT 'MONDAY';

-- Agregar índice
CREATE INDEX "RoutineExercise_dayOfWeek_idx" ON "RoutineExercise"("dayOfWeek");
