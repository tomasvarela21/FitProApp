import { useQuery } from "@tanstack/react-query";
import { trainersApi } from "@/api/trainers.api";

export const useDashboard = () => {
  return useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const res = await trainersApi.getDashboardSummary();
      return res.data.data;
    },
    staleTime: 60_000, // 1 minuto — evita refetch al volver al tab
  });
};