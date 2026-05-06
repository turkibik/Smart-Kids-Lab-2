/* ══════════════════════════════════════════════
   🔧 Connect DZ — Service Worker
   يدعم: التخزين المؤقت + العمل أوفلاين
   ══════════════════════════════════════════════ */

const CACHE_NAME = 'connectdz-v1';

/* الملفات التي تُخزَّن فوراً عند التثبيت */
const PRECACHE_URLS = [
  '/'
];

/* ── التثبيت: تخزين الملفات الأساسية ── */
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

/* ── التفعيل: حذف الكاش القديم ── */
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

/* ── الاعتراض: Network First ثم الكاش ── */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  /* تجاهل طلبات Firebase والـ APIs الخارجية */
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('firebaseio') ||
    url.hostname.includes('googleapis') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        /* احفظ نسخة في الكاش */
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        /* إذا فشل الشبكة → ارجع من الكاش */
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          /* صفحة أوفلاين احتياطية */
          if (event.request.destination === 'document') {
            return caches.match('/');
          }
        });
      })
  );
});
