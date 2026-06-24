import { useEffect } from "react";
import { Platform } from "react-native";
import * as Device from "expo-device";
import { AxiosInstance } from "axios";

// Declarar handler dinámicamente para evitar colapso en Expo Go
try {
  const Notifications = require("expo-notifications");
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (e) {
  // Usamos console.log para evitar que aparezca la pantalla amarilla de LogBox en desarrollo
  console.log("Nota: expo-notifications no está disponible en este entorno (normal en Expo Go).");
}

export const useMobileNotifications = (isAuthenticated: boolean, api: AxiosInstance) => {
  useEffect(() => {
    if (!isAuthenticated) return;

    const registerPush = async () => {
      try {
        const Notifications = require("expo-notifications");
        const token = await registerForPushNotificationsAsync(Notifications);
        if (token) {
          console.log("Expo Push Token:", token);
          // Registrar en el backend
          await api.post("/notifications/subscribe", {
            type: "EXPO",
            token: token,
          });
          console.log("Expo Push Token registrado en el backend");
        }
      } catch (err) {
        console.log("Aviso: No se pudieron registrar las notificaciones push (esperado en Expo Go):", err);
      }
    };

    registerPush();
  }, [isAuthenticated, api]);
};

async function registerForPushNotificationsAsync(Notifications: any) {
  let token = null;

  if (Platform.OS === "android") {
    try {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    } catch (e) {
      console.warn("Error al configurar canal de notificaciones:", e);
    }
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      console.warn("No se obtuvieron permisos para notificaciones push!");
      return null;
    }
    
    // Obtener token
    try {
      token = (await Notifications.getExpoPushTokenAsync()).data;
    } catch (e) {
      console.warn("Error al obtener token de push:", e);
    }
  } else {
    console.log("Las notificaciones push requieren un dispositivo físico.");
  }

  return token;
}

