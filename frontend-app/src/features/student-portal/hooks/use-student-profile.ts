import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentPortalApi } from "@/api/student-portal.api";
import { useAuthStore } from "@/store/auth.store";

export const useStudentProfile = () => {
  const queryClient = useQueryClient();
  const { token, user, setAuth } = useAuthStore();

  const query = useQuery({
    queryKey: ["student-profile"],
    queryFn: async () => {
      const res = await studentPortalApi.getProfile();
      return res.data.data;
    },
  });

  const mutation = useMutation({
    mutationFn: studentPortalApi.updateProfile,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["student-profile"] });
      // Actualizar el store para que el sidebar refleje el cambio
      if (user && token) {
        setAuth(token, {
          ...user,
          profile: {
            id: user.profile?.id ?? "",
            firstName: res.data.data.firstName,
            lastName: res.data.data.lastName,
            phone: res.data.data.phone,
          },
        });
      }
    },
  });

  return {
    profile: query.data,
    isLoading: query.isLoading,
    updateProfile: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
};
