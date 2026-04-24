import { useQuery } from "@tanstack/react-query";
import { studentPortalApi } from "@/api/student-portal.api";

export const useStudentSubscription = () => {
  const query = useQuery({
    queryKey: ["student-subscription"],
    queryFn: async () => {
      const res = await studentPortalApi.getSubscription();
      return res.data.data;
    },
  });

  return {
    subscription: query.data,
    isLoading: query.isLoading,
  };
};
