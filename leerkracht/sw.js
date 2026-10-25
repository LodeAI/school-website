// Service worker van de leerkrachtensite: toont pushmeldingen en opent bij een tik de fiche van het kind.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Rood bolletje op het icoon: het aantal meldingen sinds de leerkracht de app laatst opende.
// De server stuurt dat getal mee (app_badge); daarnaast telt de service worker zelf in Cache Storage,
// zodat er altijd minstens een bolletje staat. Nooit minder dan het aantal meldingen dat nog in het
// meldingencentrum staat. De pagina wist het bij het openen.
async function bolletjeZetten(vanServer = 0) {
  let n = 1;
  try {
    const cache = await caches.open('konijnenklas-badge');
    const oud = await cache.match('teller');
    n = (oud ? Number(await oud.text()) || 0 : 0) + 1;
    await cache.put('teller', new Response(String(n)));
  } catch { /* geen opslag: dan minstens 1 */ }
  n = Math.max(n, vanServer);
  try {
    n = Math.max(n, (await self.registration.getNotifications()).length);
  } catch { /* niet ondersteund */ }
  if ('setAppBadge' in self.navigator) await self.navigator.setAppBadge(n);
}

// De melding komt als { title, body, url, tag, app_badge }. Het formaat van declarative web push
// ({ web_push, notification }) wordt ook nog gelezen.
self.addEventListener('push', (e) => {
  let bericht = {};
  try { bericht = e.data ? e.data.json() : {}; } catch { bericht = { body: e.data?.text() }; }
  const n = bericht.notification ?? {};
  const getal = Number(bericht.app_badge ?? n.app_badge) || 0;
  e.waitUntil((async () => {
    await self.registration.showNotification(n.title || bericht.title || 'Konijnenklas', {
      body: n.body || bericht.body || '',
      icon: '../img/icoon-192.png',
      data: { url: n.navigate || bericht.url || './' },
    });
    await bolletjeZetten(getal).catch(() => {});
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  // De leerkracht kiest zelf welk kind: de pagina mag niet naar de kinderlijst springen.
  e.waitUntil(caches.open('konijnenklas-badge').then((c) => c.delete('teller')).catch(() => {}));
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
