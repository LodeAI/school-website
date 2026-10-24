// Service worker van de leerkrachtensite: toont pushmeldingen en opent bij een tik de fiche van het kind.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let bericht = {};
  try { bericht = e.data ? e.data.json() : {}; } catch { bericht = { body: e.data?.text() }; }
  e.waitUntil(self.registration.showNotification(bericht.title || 'Konijnenklas', {
    body: bericht.body || '',
    icon: '../img/icoon-192.png',
    data: { url: bericht.url || './' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || './', self.registration.scope).href;
  e.waitUntil((async () => {
    const vensters = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = vensters.find((v) => v.url.startsWith(self.registration.scope));
    if (open) {
      await open.focus();
      open.postMessage({ openen: url });
      return;
    }
    await self.clients.openWindow(url);
  })());
});
