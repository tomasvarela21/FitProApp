import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import * as SecureStore from "expo-secure-store";
import axios from "axios";

export type AuthUser = {
  id: string;
  email: string;
  role: "TRAINER" | "STUDENT";
  status: string;
  firstName: string;
  lastName: string;
  phone: string | null;
};

type AuthContextType = {
  token: string | null;
  user: AuthUser | null;
  apiUrl: string;
  setApiUrl: (url: string) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  api: ReturnType<typeof buildApi>;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:4000/api";

function buildApi(
  baseURL: string,
  tokenRef: React.MutableRefObject<string | null>,
  refreshTokenRef: React.MutableRefObject<string | null>,
  onLogout: () => Promise<void>
) {
  const instance = axios.create({ baseURL, timeout: 10000 });

  instance.interceptors.request.use((config) => {
    if (tokenRef.current) {
      config.headers.Authorization = `Bearer ${tokenRef.current}`;
    }
    return config;
  });

  let isRefreshing = false;

  instance.interceptors.response.use(
    (res) => res,
    async (error) => {
      const original = error.config;

      if (
        error.response?.status !== 401 ||
        original._retry ||
        original.url?.includes("/auth/refresh") ||
        original.url?.includes("/auth/login")
      ) {
        return Promise.reject(error);
      }

      if (!refreshTokenRef.current || isRefreshing) {
        await onLogout();
        return Promise.reject(error);
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(
          `${baseURL}/auth/refresh`,
          { refreshToken: refreshTokenRef.current },
          { timeout: 10000 }
        );
        const { accessToken, refreshToken: newRefreshToken } = res.data.data;

        tokenRef.current = accessToken;
        refreshTokenRef.current = newRefreshToken;

        await SecureStore.setItemAsync("fitpro_token", accessToken);
        await SecureStore.setItemAsync("fitpro_refresh_token", newRefreshToken);

        original.headers.Authorization = `Bearer ${accessToken}`;
        return instance(original);
      } catch {
        await onLogout();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }
  );

  return {
    get: (url: string, config?: object) => instance.get(url, config),
    post: (url: string, data?: unknown, config?: object) => instance.post(url, data, config),
    put: (url: string, data?: unknown, config?: object) => instance.put(url, data, config),
    patch: (url: string, data?: unknown, config?: object) => instance.patch(url, data, config),
    delete: (url: string, config?: object) => instance.delete(url, config),
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [apiUrl, setApiUrlState] = useState<string>(DEFAULT_API_URL);
  const [isLoading, setIsLoading] = useState(true);

  const tokenRef = useRef<string | null>(null);
  const refreshTokenRef = useRef<string | null>(null);

  const logout = async () => {
    tokenRef.current = null;
    refreshTokenRef.current = null;
    setToken(null);
    setUser(null);
    await Promise.all([
      SecureStore.deleteItemAsync("fitpro_token"),
      SecureStore.deleteItemAsync("fitpro_refresh_token"),
      SecureStore.deleteItemAsync("fitpro_user"),
    ]);
  };

  // Instancia estable — solo se recrea si cambia la URL base
  const api = React.useMemo(
    () => buildApi(apiUrl, tokenRef, refreshTokenRef, logout),
    [apiUrl]
  );

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const savedApiUrl = await SecureStore.getItemAsync("fitpro_api_url");
        if (savedApiUrl) setApiUrlState(savedApiUrl);

        const savedToken = await SecureStore.getItemAsync("fitpro_token");
        const savedRefreshToken = await SecureStore.getItemAsync("fitpro_refresh_token");
        const savedUserJson = await SecureStore.getItemAsync("fitpro_user");

        if (savedToken && savedRefreshToken && savedUserJson) {
          tokenRef.current = savedToken;
          refreshTokenRef.current = savedRefreshToken;
          setToken(savedToken);
          setUser(JSON.parse(savedUserJson));
        }
      } catch (e) {
        console.error("[Auth] Error restaurando credenciales:", e);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, []);

  const setApiUrl = async (url: string) => {
    setApiUrlState(url);
    await SecureStore.setItemAsync("fitpro_api_url", url);
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(
        `${apiUrl}/auth/login`,
        { email, password },
        { timeout: 10000 }
      );
      const { accessToken, refreshToken, user: rawUser } = response.data.data;

      const userData: AuthUser = {
        id: rawUser.id,
        email: rawUser.email,
        role: rawUser.role,
        status: rawUser.status,
        firstName: rawUser.profile?.firstName ?? "",
        lastName: rawUser.profile?.lastName ?? "",
        phone: rawUser.profile?.phone ?? null,
      };

      tokenRef.current = accessToken;
      refreshTokenRef.current = refreshToken;
      setToken(accessToken);
      setUser(userData);

      await SecureStore.setItemAsync("fitpro_token", accessToken);
      await SecureStore.setItemAsync("fitpro_refresh_token", refreshToken);
      await SecureStore.setItemAsync("fitpro_user", JSON.stringify(userData));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string }; }; message?: string })
          ?.response?.data?.message ?? "Error al iniciar sesión";
      throw new Error(msg);
    }
  };

  return (
    <AuthContext.Provider value={{ token, user, apiUrl, setApiUrl, login, logout, api, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de un AuthProvider");
  return context;
};
