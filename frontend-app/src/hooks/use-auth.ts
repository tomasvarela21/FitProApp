import { useAuthStore } from "@/store/auth.store";

export const useAuth = () => {
  const { user, token, isAuthenticated, isInitialized, setAuth, setToken, logout } = useAuthStore();
  return { user, token, isAuthenticated, isInitialized, setAuth, setToken, logout };
};
