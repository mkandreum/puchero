// Service worker de PUCHERO: recordatorios (Web Push). No cachea nada: la app siempre va fresca.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch {
    data = { body: e.data && e.data.text() };
  }
  e.waitUntil(
    self.registration.showNotification(data.title || 'PUCHERO', {
      body: data.body || 'La cazuela te espera.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.slot || 'puchero',
      vibrate: [40, 50, 40],
      data: { url: data.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          c.navigate(url).catch(() => undefined);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
