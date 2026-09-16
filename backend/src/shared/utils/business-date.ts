import type { DayOfWeek } from "@prisma/client";

export const BUSINESS_TIME_ZONE = "America/Argentina/Buenos_Aires";

export function businessDateString(instant: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function businessDateValue(calendarDate: string): Date {
  return new Date(`${calendarDate}T00:00:00.000Z`);
}

export function storedBusinessDateString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function workoutInstant(value?: string, now: Date = new Date()): Date {
  if (!value) return now;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00.000Z`);
  }
  return new Date(value);
}

export function businessDayOfWeek(instant: Date = new Date()): DayOfWeek {
  const days: DayOfWeek[] = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ];
  const calendarDate = businessDateString(instant);
  return days[new Date(`${calendarDate}T00:00:00.000Z`).getUTCDay()];
}
