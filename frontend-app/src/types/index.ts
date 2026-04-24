export type UserRole = "TRAINER" | "STUDENT";

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  status: string;
  emailVerifiedAt: string | null;
  profile: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
  } | null;
};

export type TrainerProfile = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string;
  createdAt: string;
};

export type StudentStatus = "INVITED" | "ACTIVE" | "PAUSED" | "INACTIVE";

export type StudentSubscriptionSummary = {
  id: string;
  planName: string;
  endDate: string;
  subscriptionStatus: "ACTIVE" | "EXPIRING_SOON" | "OVERDUE" | "PAID";
};

export type Student = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  status: StudentStatus;
  invitedAt: string | null;
  activatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  subscription: StudentSubscriptionSummary | null;
};

export type PaginatedResponse<T> = {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type DashboardStats = {
  total: number;
  active: number;
  invited: number;
  paused: number;
  inactive: number;
};

export type DashboardRecentStudent = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: StudentStatus;
  invitedAt: string | null;
  activatedAt: string | null;
  createdAt: string;
};

export type ExpiringAlert = {
  subscriptionId: string;
  installmentId: string;
  studentId: string;
  studentName: string;
  planName: string;
  installmentNumber: number;
  endDate: string;
  daysUntilExpiry: number;
};

export type DashboardSummary = {
  stats: DashboardStats;
  recentStudents: DashboardRecentStudent[];
  alerts: {
    expiringSoon: ExpiringAlert[];
    expired: ExpiringAlert[];
  };
};

export type ApiSuccess<T> = {
  ok: true;
  message: string;
  data: T;
};

export type ApiError = {
  ok: false;
  message: string;
  errors?: unknown;
};

export type PlanDuration = "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "ANNUAL";

export type Plan = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: PlanDuration;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SubscriptionStatus = "ACTIVE" | "EXPIRED" | "CANCELLED";

export type InstallmentStatus = "PENDING" | "PAID" | "OVERDUE";
export type PaymentFrequency = "BIWEEKLY" | "MONTHLY";

export type Installment = {
  id: string;
  number: number;
  amount: number;
  dueDate: string;
  paidAt: string | null;
  status: InstallmentStatus;
  notes: string | null;
};

export type Subscription = {
  id: string;
  studentId: string;
  studentName: string;
  planId: string;
  planName: string;
  planDuration: PlanDuration;
  frequency: PaymentFrequency;
  totalAmount: number;
  installmentCount: number;
  paidAmount: number;
  pendingAmount: number;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  daysUntilExpiry: number;
  createdAt: string;
  installments: Installment[];
};

export type Payment = {
  id: string;
  amount: number;
  paidAt: string;
  periodLabel: string;
  notes: string | null;
  createdAt: string;
};

export type StudentProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: string;
  activatedAt: string | null;
  trainer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
};

export type StudentSubscription = {
  id: string;
  planName: string;
  planDuration: PlanDuration;
  frequency: PaymentFrequency;
  totalAmount: number;
  installmentCount: number;
  paidAmount: number;
  pendingAmount: number;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  daysUntilExpiry: number;
  nextInstallment: {
    id: string;
    number: number;
    amount: number;
    dueDate: string;
    status: InstallmentStatus;
  } | null;
  installments: Installment[];
};