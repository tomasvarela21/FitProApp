import type { InstallmentStatus, SubscriptionStatus } from "@prisma/client";

const DAY_MS = 24 * 60 * 60 * 1000;

export function effectiveInstallmentStatus(
  status: InstallmentStatus,
  dueDate: Date,
  now: Date
): InstallmentStatus {
  return status === "PENDING" && dueDate < now ? "OVERDUE" : status;
}

export function effectiveSubscriptionStatus(
  status: SubscriptionStatus,
  endDate: Date,
  now: Date
): SubscriptionStatus {
  return status === "ACTIVE" && endDate < now ? "EXPIRED" : status;
}

export function daysUntilExpiry(endDate: Date, now: Date): number {
  const days = Math.ceil((endDate.getTime() - now.getTime()) / DAY_MS);
  return days === 0 ? 0 : days;
}
