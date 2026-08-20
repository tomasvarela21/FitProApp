import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trainersApi, type TelegramLinkCode } from "@/api/trainers.api";

export const useTelegramLink = () => {
  const queryClient = useQueryClient();

  const statusQuery = useQuery({
    queryKey: ["telegram-link"],
    queryFn: async () => {
      const res = await trainersApi.getTelegramLinkStatus();
      return res.data.data;
    },
    // Mientras se muestra un código, refrescar para detectar la vinculación
    refetchInterval: (query) => (query.state.data?.linked ? false : 5000),
  });

  const generateCode = useMutation({
    mutationFn: async (): Promise<TelegramLinkCode> => {
      const res = await trainersApi.generateTelegramLinkCode();
      return res.data.data;
    },
  });

  const unlink = useMutation({
    mutationFn: () => trainersApi.unlinkTelegram(),
    onSuccess: () => {
      generateCode.reset();
      queryClient.invalidateQueries({ queryKey: ["telegram-link"] });
    },
  });

  return {
    status: statusQuery.data,
    isLoading: statusQuery.isLoading,
    generateCode: generateCode.mutateAsync,
    generatedCode: generateCode.data,
    isGenerating: generateCode.isPending,
    resetCode: generateCode.reset,
    unlink: unlink.mutateAsync,
    isUnlinking: unlink.isPending,
  };
};
