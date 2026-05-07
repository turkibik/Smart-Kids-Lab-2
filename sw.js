/* ══════════════════════════════════════════════════════
   🔧 Service Worker — Connect DZ
   يدعم: PWA Cache + Push Notifications الكاملة
   ══════════════════════════════════════════════════════ */

const CACHE_NAME = 'connectdz-v2';
const ASSETS = ['/'];

/* ── تثبيت SW ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

/* ── تفعيل SW ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* ── استقبال طلبات الشبكة ── */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('firebaseio.com')) return; // لا تخزن Firebase مؤقتاً

  event.respondWith(
    fetch(event.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});

/* ══════════════════════════════════════════════════════
   🔔 Push Notifications
   يستقبل الإشعارات حتى عندما يكون التطبيق في الخلفية
   ══════════════════════════════════════════════════════ */

self.addEventListener('push', event => {
  let data = {
    title: '💬 رسالة جديدة — Connect DZ',
    body: 'لديك رسالة جديدة',
    tag: 'cdz-push-' + Date.now(),
    url: self.location.origin
  };

  if (event.data) {
    try { Object.assign(data, event.data.json()); } catch(e) {}
  }

  const options = {
    body: data.body,
    icon: data.icon || self.location.origin + '/icon-192.png',
    badge: data.badge || self.location.origin + '/icon-72.png',
    tag: data.tag,
    renotify: true,
    vibrate: [200, 100, 200, 100, 300],
    dir: 'rtl',
    lang: 'ar',
    requireInteraction: false,
    silent: false,
    actions: [
      { action: 'open',    title: '📖 فتح التطبيق' },
      { action: 'dismiss', title: '✕ تجاهل'        }
    ],
    data: { url: data.url || self.location.origin, ts: Date.now() }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

/* ── النقر على الإشعار ── */
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : self.location.origin;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // إذا كان التطبيق مفتوحاً — أحضره للمقدمة
      for (const client of list) {
        if (client.url.includes(self.location.hostname) && 'focus' in client) {
          return client.focus();
        }
      }
      // وإلا — افتح نافذة جديدة
      return clients.openWindow(targetUrl);
    })
  );
});

/* ── إغلاق الإشعار ── */
self.addEventListener('notificationclose', event => {
  console.log('🔕 تم إغلاق الإشعار:', event.notification.tag);
});

/* ── رسائل من الصفحة الرئيسية ── */
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag } = event.data;
    self.registration.showNotification(title || '💬 Connect DZ', {
      body: body || '',
      tag: tag || 'cdz-manual',
      dir: 'rtl',
      lang: 'ar',
      vibrate: [200, 100, 200],
      icon: self.location.origin + '/icon-192.png',
      data: { url: self.location.origin }
    });
  }
});
