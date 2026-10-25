/* Сервис-воркер: офлайн-кэш сайта и тайлов карты */
const CACHE = 'okoneshnikowo-v1';
const ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.css',
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  // Тайлы карты: сначала кэш, потом сеть; удачный ответ кладём в кэш
  const isTile =
    /openstreetmap\.org|arcgisonline\.com|tile\.opentopomap|server\.arcgisonline/.test(url.hostname);

  if (isTile) {
    e.respondWith(
      caches.open(CACHE).then(c =>
        c.match(e.request).then(hit =>
          hit ||
          fetch(e.request).then(resp => {
            if (resp.ok) c.put(e.request, resp.clone());
            return resp;
          })
        )
      )
    );
    return;
  }

  // Свои файлы: cache-first, обновление в фоне
  e.respondWith(
    caches.open(CACHE).then(c =>
      c.match(e.request).then(hit => {
        const net = fetch(e.request).then(resp => {
          if (resp.ok) c.put(e.request, resp.clone());
          return resp;
        }).catch(() => hit);
        return hit || net;
      })
    )
  );
});
