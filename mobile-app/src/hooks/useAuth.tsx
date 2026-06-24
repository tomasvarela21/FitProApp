import React, { createContext, useContext, useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import axios, { AxiosInstance } from "axios";

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
  api: AxiosInstance;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

const DEFAULT_API_URL = "http://10.0.2.2:4000/api"; // Default para emulador de Android

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [apiUrl, setApiUrlState] = useState<string>(DEFAULT_API_URL);
  const [isLoading, setIsLoading] = useState(true);

  // Instancia de axios configurable (interna)
  const [axiosInstance, setAxiosInstance] = useState(() =>
    axios.create({
      baseURL: DEFAULT_API_URL,
      timeout: 10000,
    })
  );

  useEffect(() => {
    // Actualizar la instancia de axios cuando cambia la URL o el token
    const newApi = axios.create({
      baseURL: apiUrl,
      timeout: 10000,
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
      },
    });
    setAxiosInstance(() => newApi);
  }, [apiUrl, token]);

  // Envoltura plana para evitar el bug de prototipos de Hermes en React Native
  const api = React.useMemo(() => {
    const makeRequest = (config: any) => {
      const req = axiosInstance.request || axiosInstance;
      return req.call(axiosInstance, config);
    };

    return {
      get: (url: string, config?: any) => makeRequest({ method: "get", url, ...config }),
      post: (url: string, data?: any, config?: any) => makeRequest({ method: "post", url, data, ...config }),
      put: (url: string, data?: any, config?: any) => makeRequest({ method: "put", url, data, ...config }),
      delete: (url: string, config?: any) => makeRequest({ method: "delete", url, ...config }),
      request: (config: any) => makeRequest(config),
    } as unknown as AxiosInstance;
  }, [axiosInstance]);

  useEffect(() => {
    // Cargar credenciales guardadas al iniciar
    const bootstrapAsync = async () => {
      try {
        const savedApiUrl = await SecureStore.getItemAsync("fitpro_api_url");
        if (savedApiUrl) {
          setApiUrlState(savedApiUrl);
        }

        const savedToken = await SecureStore.getItemAsync("fitpro_token");
        const savedUserJson = await SecureStore.getItemAsync("fitpro_user");

        if (savedToken && savedUserJson) {
          setToken(savedToken);
          setUser(JSON.parse(savedUserJson));
        }
      } catch (e) {
        console.error("Error al restaurar credenciales:", e);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const setApiUrl = async (url: string) => {
    setApiUrlState(url);
    await SecureStore.setItemAsync("fitpro_api_url", url);
  };

  const login = async (email: string, password: string) => {
    console.log("DIAGNOSTICO LOGIN:", {
      api_exists: !!api,
      api_post_type: typeof api?.post,
      SecureStore_exists: !!SecureStore,
      SecureStore_setItem_type: typeof SecureStore?.setItemAsync,
      SecureStore_getItem_type: typeof SecureStore?.getItemAsync,
    });
    try {
      const response = await api.post("/auth/login", { email, password });
      const { accessToken, user: profile } = response.data.data;

      const userData: AuthUser = {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        status: profile.status,
        firstName: profile.profile?.firstName ?? "",
        lastName: profile.profile?.lastName ?? "",
        phone: profile.profile?.phone ?? null,
      };

      setToken(accessToken);
      setUser(userData);

      await SecureStore.setItemAsync("fitpro_token", accessToken);
      await SecureStore.setItemAsync("fitpro_user", JSON.stringify(userData));
    } catch (err: any) {
      console.error("Detalle del error de login:", err);
      const msg = err.response?.data?.message ?? `Error al iniciar sesión: ${err.message}`;
      throw new Error(msg);
    }
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await SecureStore.deleteItemAsync("fitpro_token");
    await SecureStore.deleteItemAsync("fitpro_user");
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        apiUrl,
        setApiUrl,
        login,
        logout,
        api,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
};
