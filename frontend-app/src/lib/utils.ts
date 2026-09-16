import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Parsea un ISO string o YYYY-MM-DD como fecha local (evita el desfase UTC)
export function parseLocalDate(isoOrDate: string): Date {
  const datePart = isoOrDate.split("T")[0];
  const [y, m, d] = datePart.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export const BUSINESS_TIME_ZONE = "America/Argentina/Buenos_Aires";

// Devuelve la fecha de negocio actual como YYYY-MM-DD.
export function businessDateString(instant: Date = new Date()): string {
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

export function todayLocalString(): string {
  return businessDateString();
}

export function businessDayIndex(instant: Date = new Date()): number {
  return new Date(`${businessDateString(instant)}T00:00:00.000Z`).getUTCDay();
}
