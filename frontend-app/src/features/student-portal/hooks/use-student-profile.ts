import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentPortalApi } from "@/api/student-portal.api";

export const useStudentProfile = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["student-profile"],
    queryFn: async () => {
      const res = await studentPortalApi.getProfile();
      return res.data.data;
    },
  });

  const mutation = useMutation({
    mutationFn: studentPortalApi.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-profile"] });
    },
  });

  return {
    profile: query.data,
    isLoading: query.isLoading,
    updateProfile: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
};
