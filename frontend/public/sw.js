self.addEventListener("push", (event: any) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || "ValidFi Notification";
    const options: NotificationOptions = {
      body: data.message || "",
      icon: "/icon-192.png",
      badge: "/badge.png",
      tag: data.tag || "validfi-notification",
      data: {
        url: data.url || "/notifications",
        timestamp: Date.now(),
        type: data.type || "system_update",
      },
      requireInteraction: data.requireInteraction || false,
      vibrate: [200, 100, 200],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch {
    const title = "ValidFi Notification";
    const options: NotificationOptions = {
      body: event.data.text(),
      icon: "/icon-192.png",
      badge: "/badge.png",
    };
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

self.addEventListener("notificationclick", (event: any) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/notifications";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.includes(targetUrl) && "focus" in client) {
            return (client as WindowClient).focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

self.addEventListener("install", () => {
  (self as any).skipWaiting();
});

self.addEventListener("activate", (event: any) => {
  event.waitUntil(self.clients.claim());
});
