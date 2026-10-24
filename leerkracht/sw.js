// Service worker van de leerkrachtensite: toont pushmeldingen en opent bij een tik de fiche van het kind.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Rood bolletje op het icoon: het aantal meldingen sinds de leerkracht de app laatst opende.
// De teller staat in Cache Storage, zodat hij een herstart van de service worker overleeft.
// De pagina zet hem terug op nul bij het openen (zie js/leerkracht.js).
async function tellerOphogen() {
  const cache = await caches.open('konijnenklas-badge');
  const oud = await cache.match('teller');
  const n = (oud ? Number(await oud.text()) : 0) + 1;
  await cache.put('teller', new Response(String(n)));
  await self.navigator.setAppBadge?.(n);
}

self.addEventListener('push', (e) => {
  let bericht = {};
  try { bericht = e.data ? e.data.json() : {}; } catch { bericht = { body: e.data?.text() }; }
  e.waitUntil(Promise.all([
    self.registration.showNotification(bericht.title || 'Konijnenklas', {
      body: bericht.body || '',
      icon: '../img/icoon-192.png',
      data: { url: bericht.url || './' },
    }),
    tellerOphogen().catch(() => {}),
  ]));
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
