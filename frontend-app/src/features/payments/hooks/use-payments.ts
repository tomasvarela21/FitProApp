import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { paymentsApi } from "@/api/payments.api";
import type { PaymentStatusFilter } from "@/features/payments/types";

export function usePayments() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter>("ALL");

  const { data, isLoading } = useQuery({
    queryKey: ["payments", page, search, statusFilter],
    queryFn: () =>
      paymentsApi.listSubscriptions({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter,
      }),
    select: (res) => res.data.data,
    staleTime: 30_000,
  });

  return {
    items: data?.items ?? [],
    meta: data?.meta ?? null,
    isLoading,
    page,
    setPage,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
  };
}
