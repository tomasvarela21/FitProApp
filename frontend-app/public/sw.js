self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: "/dumbbell.png",
      badge: "/dumbbell.png",
      data: data.data,
      vibrate: [100, 50, 100],
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (err) {
    console.error("Error parsing push notification data:", err);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      // Si la app ya está abierta, hacer foco en ella
      for (const client of clientList) {
        if ("focus" in client) {
          return client.focus();
        }
      }
      // Si no, abrir una ventana nueva
      if (clients.openWindow) {
        return clients.openWindow("/");
      }
    })
  );
});
