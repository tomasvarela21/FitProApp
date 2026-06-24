import React from "react";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useMobileNotifications } from "@/hooks/useMobileNotifications";
import { LoginScreen } from "@/components/LoginScreen";
import AppTabs from "@/components/app-tabs";
import { ThemePreferenceProvider, useColorScheme } from "@/hooks/use-color-scheme";

function MainApp() {
  const { token, isLoading, api } = useAuth();

  // Registrar notificaciones push móviles si está autenticado
  useMobileNotifications(!!token, api);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000000" }}>
        <ActivityIndicator size="large" color="#208AEF" />
      </View>
    );
  }

  if (!token) {
    return <LoginScreen />;
  }

  return <AppTabs />;
}

function TabLayoutContent() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <MainApp />
    </ThemeProvider>
  );
}

export default function TabLayout() {
  return (
    <ThemePreferenceProvider>
      <AuthProvider>
        <TabLayoutContent />
      </AuthProvider>
    </ThemePreferenceProvider>
  );
}

