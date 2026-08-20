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

// Devuelve la fecha de hoy como YYYY-MM-DD en hora local
export function todayLocalString(): string {
  return new Date().toLocaleDateString("sv-SE");
}
