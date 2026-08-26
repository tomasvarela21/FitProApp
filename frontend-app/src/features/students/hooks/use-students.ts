import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { studentsApi } from "@/api/students.api";
import type { StudentStatus } from "@/types";

export type StudentStatusFilter = StudentStatus | "ALL";

export const useStudents = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StudentStatusFilter>("ALL");

  const { data, isLoading } = useQuery({
    queryKey: ["students", page, search, statusFilter],
    queryFn: async () => {
      const res = await studentsApi.list({
        page,
        limit: 10,
        search,
        ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
      });
      return res.data.data;
    },
  });

  return {
    students: data?.items ?? [],
    meta: data?.meta,
    isLoading,
    page,
    setPage,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
  };
};
