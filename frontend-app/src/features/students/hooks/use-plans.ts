import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { plansApi } from "@/api/plans.api";

export const usePlans = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const res = await plansApi.list();
      return res.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: plansApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plans"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Parameters<typeof plansApi.update>[1]) =>
      plansApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plans"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: plansApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plans"] }),
  });

  return {
    plans: query.data ?? [],
    isLoading: query.isLoading,
    createPlan: createMutation.mutateAsync,
    updatePlan: updateMutation.mutateAsync,
    deletePlan: deleteMutation.mutateAsync,
  };
};
