export type StudentListItemDto = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  status: string;
  invitedAt: Date | null;
  activatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type StudentDetailDto = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  status: string;
  invitedAt: Date | null;
  activatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PaginatedStudentsDto = {
  items: StudentListItemDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};