/* ══════════════════════════════════════════════════════════
   🔧 Connect DZ — Service Worker v2
   ✅ Firebase Cloud Messaging (إشعارات الخلفية)
   ✅ PWA Cache (يعمل بدون إنترنت)
   ✅ Push Events + Notification Click
   ══════════════════════════════════════════════════════════ */

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

/* ════════════════════════════════════════════
   ⚙️  إعداد Firebase — نفس بيانات الـ HTML
════════════════════════════════════════════ */
firebase.initializeApp({
  apiKey           : "AIzaSyDdqve_7EDtm8E0M615TMMNtdnQKf1F5AQ",
  authDomain       : "connectdz-49fab.firebaseapp.com",
  databaseURL      : "https://connectdz-49fab-default-rtdb.firebaseio.com",
  projectId        : "connectdz-49fab",
  storageBucket    : "connectdz-49fab.firebasestorage.app",
  messagingSenderId: "283968450187",
  appId            : "1:283968450187:web:cd392f2255492237986e8e",
  measurementId    : "G-RE9ETWKQ4H"
});

const messaging = firebase.messaging();

/* ════════════════════════════════════════════
   📬  استقبال إشعارات Firebase في الخلفية
   يعمل حتى لو كان المتصفح مغلقاً
════════════════════════════════════════════ */
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] 📬 رسالة في الخلفية:', payload);

  const title = payload.notification?.title || '💬 رسالة جديدة — Connect DZ';
  const body  = payload.notification?.body  || 'لديك رسالة جديدة';
  const icon  = payload.notification?.icon  || '/icon-192.png';

  self.registration.showNotification(title, {
    body   : body,
    icon   : icon,
    badge  : '/badge-72.png',
    tag    : 'cdz-bg-msg',
    renotify: true,
    dir    : 'rtl',
    lang   : 'ar',
    vibrate: [200, 100, 200, 100, 300],
    requireInteraction: false,
    data   : { url: payload.data?.url || '/' },
    actions: [
      { action: 'open',    title: '📖 فتح التطبيق' },
      { action: 'dismiss', title: '✕ تجاهل' }
    ]
  });
});

/* ════════════════════════════════════════════
   👆  النقر على الإشعار — فتح التطبيق
════════════════════════════════════════════ */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      /* إذا كان التطبيق مفتوحاً — ركّز عليه */
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      /* وإلا — افتح نافذة جديدة */
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

/* ════════════════════════════════════════════
   📦  PWA Cache — يخزّن الملفات للعمل أوفلاين
════════════════════════════════════════════ */
const CACHE_NAME    = 'cdz-cache-v3';
const CACHE_ASSETS  = [
  '/',
  '/400000.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

/* تثبيت: تخزين الأصول الأساسية */
self.addEventListener('install', (event) => {
  console.log('[SW] 📦 تثبيت Cache...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CACHE_ASSETS).catch((err) => {
        /* تجاهل الأخطاء إذا لم تكن الأيقونات موجودة بعد */
        console.warn('[SW] ⚠️ بعض الأصول لم تُخزَّن:', err);
      });
    })
  );
  self.skipWaiting(); /* تفعيل فوري بدون انتظار */
});

/* تنشيط: حذف الـ Cache القديم */
self.addEventListener('activate', (event) => {
  console.log('[SW] ✅ تنشيط SW الجديد');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('[SW] 🗑️ حذف cache قديم:', key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim(); /* التحكم الفوري بجميع الصفحات */
});

/* ════════════════════════════════════════════
   🌐  Fetch Strategy: Network First → Cache Fallback
   الطلبات الحية تأتي من الشبكة، وعند انقطاعها من الـ Cache
════════════════════════════════════════════ */
self.addEventListener('fetch', (event) => {
  /* تجاهل طلبات Firebase و APIs الخارجية */
  if (
    event.request.url.includes('firebaseio.com') ||
    event.request.url.includes('googleapis.com') ||
    event.request.url.includes('gstatic.com') ||
    event.request.method !== 'GET'
  ) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        /* خزّن نسخة حديثة في الـ Cache */
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => {
        /* الشبكة مقطوعة — أرجع من الـ Cache */
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          /* fallback للصفحة الرئيسية */
          return caches.match('/400000.html');
        });
      })
  );
});

console.log('[SW] 🔧 Connect DZ Service Worker v3 — جاهز');
            
