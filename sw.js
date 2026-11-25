// Service worker v6.0 - cache vỏ ứng dụng để mở được khi mạng yếu.
// Dữ liệu Firebase KHÔNG đi qua cache (luôn lấy trực tiếp từ đám mây).
const CACHE = 'qldm-v6.1';
const SHELL = [
  './',
  'index.html',
  'manifest.json',
  'icons/icon-32.png',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Dữ liệu & xác thực Firebase: không can thiệp
  if (url.hostname.endsWith('firebaseio.com') || url.hostname.endsWith('googleapis.com')) return;

  // Trang của ứng dụng: ưu tiên mạng, rơi về cache khi offline
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('index.html')))
    );
    return;
  }

  // Thư viện CDN (Tailwind, Firebase SDK, SheetJS): dùng cache trước, cập nhật ngầm
  e.respondWith(
    caches.match(req).then((cached) => {
      const fetching = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => cached);
      return cached || fetching;
    })
  );
});
