import { z } from "zod";

export const cuidSchema = z.string().cuid("ID inválido");

export const weekNumberParamSchema = z.coerce
  .number()
  .int("Número de semana inválido")
  .min(1, "Número de semana inválido")
  .max(52, "Número de semana inválido");

const calendarDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const dateTimePattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?$/;

function isValidCalendarDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export const dateInputSchema = z.string().refine((value) => {
  if (calendarDatePattern.test(value)) {
    return isValidCalendarDate(value);
  }

  return dateTimePattern.test(value) && !Number.isNaN(Date.parse(value));
}, "Fecha inválida");

export const calendarDateSchema = z
  .string()
  .refine(
    (value) => calendarDatePattern.test(value) && isValidCalendarDate(value),
    "Fecha inválida"
  );
