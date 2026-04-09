import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { studentsApi } from "@/api/students.api";

export const useStudents = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["students", page, search],
    queryFn: async () => {
      const res = await studentsApi.list({ page, limit: 10, search });
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
  };
};