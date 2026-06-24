import { useEffect, useState } from "react";
import { notificationsApi } from "@/api/notifications.api";

export const usePushNotifications = (isAuthenticated: boolean) => {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window
    ) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const registerAndSubscribe = async () => {
    if (!isSupported || !isAuthenticated) return;

    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== "granted") {
        console.warn("Notification permission not granted");
        return;
      }

      // Registrar Service Worker
      const registration = await navigator.serviceWorker.register("/sw.js");
      
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.warn("VITE_VAPID_PUBLIC_KEY not set in environment");
        return;
      }

      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      // Enviar al backend
      const subscriptionJson = subscription.toJSON();
      if (
        subscriptionJson.endpoint &&
        subscriptionJson.keys?.p256dh &&
        subscriptionJson.keys?.auth
      ) {
        await notificationsApi.subscribe({
          type: "WEB",
          endpoint: subscriptionJson.endpoint,
          p256dh: subscriptionJson.keys.p256dh,
          auth: subscriptionJson.keys.auth,
        });
        console.log("Suscripción de Web Push registrada correctamente en el backend");
      }
    } catch (err) {
      console.error("Error al registrar/suscribirse a notificaciones push:", err);
    }
  };

  useEffect(() => {
    if (isAuthenticated && isSupported && Notification.permission === "granted") {
      registerAndSubscribe();
    }
  }, [isAuthenticated, isSupported]);

  return {
    permission,
    isSupported,
    requestPermission: registerAndSubscribe,
  };
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
