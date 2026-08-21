import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { studentsApi } from "@/api/students.api";
import type { StudentStatus } from "@/types";

export const useStudents = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StudentStatus | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ["students", page, search, status],
    queryFn: async () => {
      const res = await studentsApi.list({ page, limit: 10, search, status });
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
    status,
    setStatus,
  };
};
