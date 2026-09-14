import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { subscriptionsApi } from "@/api/subscriptions.api";

export const invalidateBillingQueries = (queryClient: QueryClient, studentId: string) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: ["subscription", studentId] }),
    queryClient.invalidateQueries({ queryKey: ["student-summary", studentId] }),
    queryClient.invalidateQueries({ queryKey: ["students"] }),
    queryClient.invalidateQueries({ queryKey: ["payments"] }),
    queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
    queryClient.invalidateQueries({ queryKey: ["analytics-business"] }),
    queryClient.invalidateQueries({ queryKey: ["student-subscription"] }),
  ]);

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
    onSuccess: () => invalidateBillingQueries(queryClient, studentId),
  });

  const payInstallmentMutation = useMutation({
    mutationFn: ({
      installmentId,
      ...data
    }: { installmentId: string } & Parameters<typeof subscriptionsApi.payInstallment>[1]) =>
      subscriptionsApi.payInstallment(installmentId, data),
    onSuccess: () => invalidateBillingQueries(queryClient, studentId),
  });

  const cancelMutation = useMutation({
    mutationFn: subscriptionsApi.cancel,
    onSuccess: () => invalidateBillingQueries(queryClient, studentId),
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
