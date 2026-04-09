import { useAuthStore } from "@/store/auth.store";

export const useAuth = () => {
  const { user, token, isAuthenticated, setAuth, logout } = useAuthStore();
  return { user, token, isAuthenticated, setAuth, logout };
};