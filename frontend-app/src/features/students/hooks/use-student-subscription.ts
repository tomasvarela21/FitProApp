import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { subscriptionsApi } from "@/api/subscriptions.api";

export const useStudentSubscription = (studentId: string) => {
  const queryClient = useQueryClient();

  const subscriptionQuery = useQuery({
    queryKey: ["subscription", studentId],
    queryFn: async () => {
      const res = await subscriptionsApi.getByStudent(studentId);
      return res.data.data;
    },
    enabled: !!studentId,
  });

  const createMutation = useMutation({
    mutationFn: subscriptionsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription", studentId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });

  const payInstallmentMutation = useMutation({
    mutationFn: ({
      installmentId,
      ...data
    }: { installmentId: string } & Parameters<typeof subscriptionsApi.payInstallment>[1]) =>
      subscriptionsApi.payInstallment(installmentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription", studentId] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: subscriptionsApi.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription", studentId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });

  return {
    subscription: subscriptionQuery.data,
    isLoadingSubscription: subscriptionQuery.isLoading,
    createSubscription: createMutation.mutateAsync,
    payInstallment: payInstallmentMutation.mutateAsync,
    cancelSubscription: cancelMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isPayingInstallment: payInstallmentMutation.isPending,
    isCancelling: cancelMutation.isPending,
  };
};
