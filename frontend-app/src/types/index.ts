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

export type StudentStatus = "INVITED" | "ACTIVE" | "PAUSED" | "INACTIVE";

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

export type DashboardSummary = {
  stats: DashboardStats;
  recentStudents: DashboardRecentStudent[];
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