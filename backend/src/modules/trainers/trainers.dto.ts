export type DashboardStudentSummaryDto = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  invitedAt: Date | null;
  activatedAt: Date | null;
  createdAt: Date;
};

export type DashboardSummaryDto = {
  stats: {
    total: number;
    active: number;
    invited: number;
    paused: number;
    inactive: number;
  };
  recentStudents: DashboardStudentSummaryDto[];
};