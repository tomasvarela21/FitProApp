import type { StudentStatus, SubscriptionStatus, PaymentFrequency } from "@/types";

export type PaymentStatus = "OVERDUE" | "EXPIRING_SOON" | "ACTIVE" | "PAID";
export type PaymentStatusFilter = "ALL" | PaymentStatus;

export type PaymentItem = {
  subscriptionId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentStatus: StudentStatus;
  planName: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  installmentCount: number;
  frequency: PaymentFrequency;
  subscriptionStatus: SubscriptionStatus;
  paymentStatus: PaymentStatus;
  paidCount: number;
  overdueCount: number;
  pendingCount: number;
  nextDueDate: string | null;
  nextAmount: number | null;
};
