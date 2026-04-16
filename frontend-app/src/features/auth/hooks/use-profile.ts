import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trainersApi } from "@/api/trainers.api";
import { useAuthStore } from "@/store/auth.store";

export const useProfile = () => {
  const queryClient = useQueryClient();
  const { setAuth, token, user } = useAuthStore();

  const query = useQuery({
    queryKey: ["trainer-profile"],
    queryFn: async () => {
      const res = await trainersApi.getProfile();
      return res.data.data;
    },
  });

  const mutation = useMutation({
    mutationFn: trainersApi.updateProfile,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["trainer-profile"] });
      // Actualizar el store con los nuevos datos
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
    error: mutation.error,
  };
};
