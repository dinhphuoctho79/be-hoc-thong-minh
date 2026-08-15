// Bé Học Thông Minh 2.0E - Service Worker
// Tăng phiên bản CACHE_NAME khi deploy thay đổi lớn để loại cache cũ.
const CACHE_NAME = 'be-hoc-thong-minh-v1';

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/logo.png',
  '/icon-192.png',
  '/icon-512.png',
  '/og-image.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cache từng file để một file lỗi không làm hỏng toàn bộ bước install.
      await Promise.allSettled(
        APP_SHELL.map((url) => cache.add(url))
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Không can thiệp TTS/CDN/API bên ngoài.
  if (url.origin !== self.location.origin) return;

  // Chỉ xử lý GET.
  if (request.method !== 'GET') return;

  // HTML/navigation: network-first, fallback cache.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(async () => {
          return (await caches.match(request))
            || (await caches.match('/index.html'))
            || (await caches.match('/'));
        })
    );
    return;
  }

  // Asset nội bộ: cache-first, cập nhật cache khi lấy được mạng.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        fetch(request).then((response) => {
          if (response && response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          }
        }).catch(() => {});
        return cached;
      }

      return fetch(request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
