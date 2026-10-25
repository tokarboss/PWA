// Service Worker для PWA и Push-уведомлений на телефоне
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Автосервис', body: 'Новое уведомление от бокса' };
  const options = {
    body: data.body,
    icon: 'https://cdn-icons-png.flaticon.com/512/3202/3202926.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/3202/3202926.png',
    vibrate: [200, 100, 200]
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
