/* ══════════════════════════════════════════════
   app-config.js — إعدادات Firebase + Supabase
   ══════════════════════════════════════════════ */

<script>
(function(){
  'use strict';

  /* ════════════════════════════════════════════
     ⚙️  إعداد Firebase
  ════════════════════════════════════════════ */
  const firebaseConfig = {
    apiKey           : "AIzaSyDdqve_7EDtm8E0M615TMMNtdnQKf1F5AQ",
    authDomain       : "connectdz-49fab.firebaseapp.com",
    databaseURL      : "https://connectdz-49fab-default-rtdb.firebaseio.com",
    projectId        : "connectdz-49fab",
    storageBucket    : "connectdz-49fab.firebasestorage.app",
    messagingSenderId: "283968450187",
    appId            : "1:283968450187:web:cd392f2255492237986e8e",
    measurementId    : "G-RE9ETWKQ4H"
  };

  /* تهيئة Firebase مرة واحدة فقط */
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  const db       = firebase.database();
  const DB_URL   = "https://connectdz-49fab-default-rtdb.firebaseio.com";
  const VAPID_KEY = 'BNBfJEdK6BYmpL-ZzB27HFKxw_-L-hyswuZjWc8ZUzmcSKO7pcpcDtTZrJsxjRlacxfccXebJW2j_snAsgsvIU4';

  /* ════════════════════════════════════════════
     🔑  تحويل VAPID Key
  ════════════════════════════════════════════ */
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
  }

  /* ════════════════════════════════════════════
     🔔  طلب إذن الإشعارات + حفظ التوكن في Firebase
     يستخدم Firebase SDK مباشرةً بدلاً من fetch
  ════════════════════════════════════════════ */
  async function requestPushPermission() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return;
      }

      const reg = await navigator.serviceWorker.ready;

      if (reg.pushManager) {
        try {
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_KEY)
          });

          const userName = localStorage.getItem('sklab_user_name') || 'مجهول';
          const safeKey  = encodeURIComponent(userName).replace(/%/g,'~');

          /* ✅ Firebase SDK — set() بدلاً من fetch/PUT */
          await db.ref(`push_tokens/${safeKey}`).set({
            sub : JSON.stringify(sub),
            name: userName,
            ts  : Date.now(),
            ua  : navigator.userAgent.substring(0, 80)
          });
        } catch(subErr) {
          console.warn('⚠️ Push subscription فشل، الإشعارات المحلية تعمل:', subErr);
        }
      }
    } catch(err) {
      console.warn('⚠️ خطأ في طلب الإذن:', err);
    }
  }

  /* ── إشعار مباشر في المتصفح (بدون سيرفر) ── */
  function showLocalNotification(title, body, tag) {
    if (Notification.permission !== 'granted') return;
    try {
      // محاولة عبر Service Worker أولاً (يعمل حتى في الخلفية)
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(title, {
            body: body,
            icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" rx="20" fill="%231565c0"/%3E%3Ctext x="50" y="68" font-size="55" text-anchor="middle" fill="white" font-weight="900"%3ECDZ%3C/text%3E%3C/svg%3E',
            badge: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%2300e5a0"/%3E%3Ctext x="50" y="67" font-size="55" text-anchor="middle" fill="white" font-weight="900"%3E!%3C/text%3E%3C/svg%3E',
            tag: tag || 'cdz-notif',
            renotify: true,
            vibrate: [200, 100, 200, 100, 300],
            dir: 'rtl',
            lang: 'ar',
            requireInteraction: false,
            actions: [
              { action: 'open', title: '📖 فتح التطبيق' },
              { action: 'dismiss', title: '✕ تجاهل' }
            ],
            data: { url: window.location.href, ts: Date.now() }
          });
        }).catch(() => {
          // fallback: إشعار عادي
          new Notification(title, { body, tag: tag || 'cdz-notif', dir: 'rtl' });
        });
      } else {
        new Notification(title, {
          body: body,
          tag: tag || 'cdz-notif',
          dir: 'rtl',
          lang: 'ar',
          vibrate: [200, 100, 200]
        });
      }
    } catch(e) {}
  }

  /* ══════════════════════════════════════════════════════
     🔴 نظام عداد الرسائل المنبثق (مثل المسنجر)
     يُظهر رقماً أحمر على أيقونة المتصفح + title الصفحة
     ══════════════════════════════════════════════════════ */
  let _unreadCount = 0;
  const _origTitle = document.title;

  /* أيقونة الـ favicon مع عداد أحمر */
  function updateFaviconBadge(count) {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');

    // رسم أيقونة CDZ الأساسية
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 64, 64);
      if (count > 0) {
        // الدائرة الحمراء
        const badgeX = 46, badgeY = 10, r = 16;
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, r, 0, 2 * Math.PI);
        ctx.fillStyle = '#ff3b30';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        // الرقم
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold ' + (count > 9 ? '14' : '18') + 'px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(count > 99 ? '99+' : String(count), badgeX, badgeY + 1);
      }
      // تحديث الـ favicon
      let link = document.querySelector("link[rel~='icon']");
      if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
      link.type = 'image/png';
      link.href = canvas.toDataURL();
    };
    img.onerror = () => {
      // إذا فشلت الصورة — ارسم أيقونة بسيطة
      ctx.fillStyle = '#1565c0';
      ctx.beginPath(); ctx.roundRect(0, 0, 64, 64, 12); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('CDZ', 32, 34);
      if (count > 0) {
        const badgeX = 50, badgeY = 14, r = 13;
        ctx.beginPath(); ctx.arc(badgeX, badgeY, r, 0, 2 * Math.PI);
        ctx.fillStyle = '#ff3b30'; ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Arial';
        ctx.fillText(count > 9 ? '9+' : String(count), badgeX, badgeY + 1);
      }
      let link = document.querySelector("link[rel~='icon']");
      if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
      link.type = 'image/png'; link.href = canvas.toDataURL();
    };
    // استخدام الـ favicon الحالي كأساس
    const curIcon = document.querySelector("link[rel~='icon']");
    img.src = curIcon ? curIcon.href : '';
    if (!curIcon || !curIcon.href) img.onerror();
  }

  /* تحديث عنوان الصفحة مع عدد الرسائل */
  function updatePageTitle(count) {
    document.title = count > 0 ? `(${count}) ${_origTitle}` : _origTitle;
  }

  /* تحديث Badge API (Android/PWA) */
  function updateAppBadge(count) {
    if ('setAppBadge' in navigator) {
      if (count > 0) navigator.setAppBadge(count).catch(() => {});
      else navigator.clearAppBadge().catch(() => {});
    }
  }

  /* الدالة الرئيسية لتحديث كل العدادات */
  function setBadgeCount(count) {
    _unreadCount = Math.max(0, count);
    updateFaviconBadge(_unreadCount);
    updatePageTitle(_unreadCount);
    updateAppBadge(_unreadCount);
  }

  /* إضافة رسالة جديدة للعداد */
  function incrementBadge() { setBadgeCount(_unreadCount + 1); }

  /* مسح العداد عند فتح التطبيق / النقر */
  function clearBadge() { setBadgeCount(0); }

  /* مسح العداد عند تفاعل المستخدم */
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) clearBadge();
  });
  document.addEventListener('click', () => {
    if (_unreadCount > 0) clearBadge();
  });

  /* تصدير الدوال للاستخدام من خارج */
  window.cdz_setBadge = setBadgeCount;
  window.cdz_clearBadge = clearBadge;

  /* ════════════════════════════════════════════
     👁️  مراقبة الرسائل بـ Firebase onValue (فوري 100%)
     ✅ يستخدم Firebase SDK بدلاً من SSE يدوي
     ✅ يعيد الاتصال تلقائياً عند انقطاع الشبكة
     ✅ يفلتر الرسائل الموجهة للمستخدم الحالي فقط
  ════════════════════════════════════════════ */
  let _lastMsgTs  = Date.now();
  let _watchingMsgs = false;
  let _msgListener  = null;

  function startWatchingMessages() {
    if (_watchingMsgs) return;
    _watchingMsgs = true;

    const userName = localStorage.getItem('sklab_user_name') || '';
    const msgsRef  = db.ref('nld_member_msgs');

    /* إلغاء أي مستمع سابق */
    if (_msgListener) { msgsRef.off('value', _msgListener); }

    _msgListener = msgsRef.on('value', (snapshot) => {
      try {
        const rawData = snapshot.val();
        if (!rawData) return;

        let msgs = [];
        if (typeof rawData === 'string') {
          msgs = JSON.parse(rawData);
        } else if (Array.isArray(rawData)) {
          msgs = rawData;
        } else if (typeof rawData === 'object') {
          msgs = Object.values(rawData);
        }

        if (!Array.isArray(msgs) || msgs.length === 0) return;

        /* رسائل أحدث من آخر وقت فحص — موجّهة للمستخدم الحالي فقط */
        const newMsgs = msgs.filter(m =>
          m && m.ts && m.ts > _lastMsgTs &&
          (m.to === userName || m.to === 'all' || !m.to)
        );
        if (newMsgs.length === 0) return;

        _lastMsgTs = Math.max(...msgs.map(m => m.ts || 0));

        newMsgs.forEach((msg, i) => {
          setTimeout(() => {
            const senderName = msg.from || 'منخرط';
            const msgText    = (msg.text || '').substring(0, 80).replace(/\n/g, ' ');

            showLocalNotification(
              `💬 رسالة جديدة — Connect DZ`,
              `👤 ${senderName}: ${msgText}`,
              `cdz-msg-${msg.ts}`
            );
            incrementBadge();
            playNotifSound();
          }, i * 800);
        });

      } catch(err) {
        console.warn('⚠️ خطأ في معالجة الرسائل:', err);
      }
    }, (err) => {
      /* Firebase يعيد الاتصال تلقائياً — نسجّل فقط */
      console.warn('⚠️ Firebase onValue خطأ:', err);
      _watchingMsgs = false;
      setTimeout(startWatchingMessages, 5000);
    });
  }

  /* ── تشغيل نغمة إشعار خفيفة ── */
  function playNotifSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch(e) {}
  }

  /* ── زر طلب الإذن يظهر للمستخدم ── */
  function showNotifPermissionBanner() {
    // لا تُظهر إذا كان الإذن ممنوحاً أو مرفوضاً نهائياً
    if (Notification.permission === 'granted') return;
    if (Notification.permission === 'denied') return;
    if (localStorage.getItem('notif_banner_dismissed')) return;

    setTimeout(() => {
      const banner = document.createElement('div');
      banner.id = 'notifPermBanner';
      banner.style.cssText = `
        position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
        z-index:99990;width:90%;max-width:380px;
        background:linear-gradient(135deg,#0d1117,#161b22);
        border:1.5px solid rgba(0,229,160,0.35);
        border-radius:20px;padding:16px 18px;
        box-shadow:0 20px 50px rgba(0,0,0,0.6),0 0 0 1px rgba(0,229,160,0.08) inset;
        animation:notifBannerIn .4s cubic-bezier(.22,.68,0,1.2) both;
        display:flex;align-items:center;gap:14px;
        font-family:'Tajawal',sans-serif;
      `;
      banner.innerHTML = `
        <style>
          @keyframes notifBannerIn{from{opacity:0;transform:translateX(-50%) translateY(30px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        </style>
        <div style="font-size:32px;flex-shrink:0;">🔔</div>
        <div style="flex:1;">
          <div style="font-size:14px;font-weight:900;color:#e8eaed;margin-bottom:3px;">فعّل الإشعارات</div>
          <div style="font-size:11px;color:#8b949e;line-height:1.5;">احصل على إشعار فوري على شاشتك عند وصول رسالة جديدة</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:7px;flex-shrink:0;">
          <button id="notifAllowBtn" style="background:linear-gradient(135deg,#00e5a0,#00b894);border:none;border-radius:10px;padding:8px 14px;color:#050505;font-family:'Tajawal',sans-serif;font-size:12px;font-weight:900;cursor:pointer;white-space:nowrap;">تفعيل ✓</button>
          <button id="notifDismissBtn" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:6px 10px;color:#8b949e;font-family:'Tajawal',sans-serif;font-size:11px;font-weight:700;cursor:pointer;">لاحقاً</button>
        </div>
      `;

      document.body.appendChild(banner);

      document.getElementById('notifAllowBtn').addEventListener('click', async () => {
        banner.remove();
        await requestPushPermission();
        if (Notification.permission === 'granted') {
          startWatchingMessages();
          // مسح علامة "تم الرفض" إن وجدت
          localStorage.removeItem('notif_banner_dismissed');
          if (typeof showToast === 'function') showToast('🔔 تم تفعيل الإشعارات بنجاح!');
          else showToast('✅ تم تفعيل الإشعارات بنجاح!', 'success');
        }
      });

      document.getElementById('notifDismissBtn').addEventListener('click', () => {
        banner.remove();
        localStorage.setItem('notif_banner_dismissed', '1');
      });

      // إخفاء تلقائي بعد 12 ثانية
      setTimeout(() => { if (banner.parentNode) banner.remove(); }, 12000);
    }, 3500);
  }

  /* ── تهيئة النظام عند تحميل الصفحة ── */
  window.addEventListener('load', () => {
    // انتظر حتى يسجل الدخول المستخدم
    const waitForUser = setInterval(() => {
      const userName = localStorage.getItem('sklab_user_name');
      if (!userName) return;
      clearInterval(waitForUser);

      // إذا كان الإذن ممنوحاً مسبقاً — ابدأ المراقبة مباشرة
      if (Notification.permission === 'granted') {
        startWatchingMessages();
        requestPushPermission(); // تجديد التوكن
      } else {
        // اعرض البانر لطلب الإذن
        showNotifPermissionBanner();
      }
    }, 1000);
  });

  /* ── دالة عامة لإرسال إشعار يدوياً (للمدير) ── */
  window.sendAdminPushNotif = function(title, body) {
    // إشعار محلي (التطبيق مفتوح)
    showLocalNotification(title, body, 'admin-notif-' + Date.now());
    // إشعار OneSignal (التطبيق مغلق) ✅
    if (typeof window.sendOneSignalNotif === 'function') {
      window.sendOneSignalNotif(title, body);
    }
  };

  /* ── تصدير دالة بدء المراقبة ── */
  window.startPushWatcher = startWatchingMessages;

  /* ════════════════════════════════════════════
     📡  مراقبة حالة الاتصال بـ Firebase (.info/connected)
     يُظهر toast عند الاتصال / الانقطاع
  ════════════════════════════════════════════ */
  db.ref('.info/connected').on('value', (snap) => {
    const connected = snap.val();
    if (connected === true) {
    } else {
      console.warn('📴 Firebase: انقطع الاتصال — سيعمل من الـ Cache');
    }
  });

  /* ════════════════════════════════════════════
     🔄  استئناف المراقبة عند عودة الشبكة
  ════════════════════════════════════════════ */
  window.addEventListener('online', () => {
    if (!_watchingMsgs) {
      startWatchingMessages();
    }
  });
})();
</script>


<script>
/* ════════════════════════════════════════════════════════════
   ⚡ INSTANT MESSENGER v3 — حذف بثلاث نقرات فقط
   (الـ polling والـ SSE يُديرهما النظام الأساسي في _fixMessengerFinal)
   ════════════════════════════════════════════════════════════ */
(function(){
'use strict';

/* ══════════════════════════════════════════════
   PART 2: حذف الرسالة بثلاث نقرات متتالية
   ══════════════════════════════════════════════ */

/* تتبع النقرات لكل رسالة */
const _tapCount  = {};
const _tapTimer  = {};
const TAP_LIMIT  = 600; /* ms بين النقرات */

/* حذف رسالة من localStorage + Supabase + الواجهة */
async function _deleteMyMsgById(msgId){
  if(!msgId) return;

  const myName = window._isAdmin
    ? 'المدير'
    : (typeof getCurrentUser === 'function' ? getCurrentUser() : localStorage.getItem('sklab_user_name') || '');

  /* حذف من localStorage */
  let deleted = false;
  for(let i = 0; i < localStorage.length; i++){
    const k = localStorage.key(i);
    if(k && k.startsWith('nld_p2p_')){
      try{
        let msgs = JSON.parse(localStorage.getItem(k) || '[]');
        const before = msgs.length;
        msgs = msgs.filter(m => m.id !== msgId);
        if(msgs.length !== before){
          localStorage.setItem(k, JSON.stringify(msgs));
          deleted = true;
        }
      }catch(e){}
    }
  }

  /* حذف من Supabase */
  try{
    const sbUrl = (typeof SUPABASE_URL !== 'undefined') ? SUPABASE_URL : 'https://slqgbnxwsnzsiovfarsn.supabase.co';
    const sbKey = (typeof SUPABASE_KEY !== 'undefined') ? SUPABASE_KEY
      : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNscWdibnh3c256c2lvdmZhcnNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDc1MDcsImV4cCI6MjA5MzU4MzUwN30.gDJojEroxvwc86K6Xd0mO2rcRMQ9vuDacqUKZpJTQTI';
    await fetch(sbUrl + '/rest/v1/messages?id=eq.' + encodeURIComponent(msgId), {
      method: 'DELETE',
      headers: {
        'apikey': sbKey,
        'Authorization': 'Bearer ' + sbKey,
        'Content-Type': 'application/json'
      }
    });
  }catch(e){}

  /* إخفاء من الواجهة */
  const wrap = document.querySelector('[data-msg-id="' + msgId + '"]');
  if(wrap){
    wrap.style.transition = 'opacity .25s ease, transform .25s ease';
    wrap.style.opacity    = '0';
    wrap.style.transform  = 'scale(0.85)';
    setTimeout(() => wrap.remove(), 260);
  }

  if(deleted || wrap){
    if(typeof showToast === 'function') showToast('🗑️ تم حذف الرسالة');
    _fastSig = ''; /* أجبر إعادة التحميل */
  }
}

/* معالج النقر الثلاثي — يُضاف على كل فقاعة */
function _handleTripleTap(e, msgId, isMe){
  /* فقط رسائلي أنا */
  if(!isMe) return;
  if(!msgId) return;

  const now = Date.now();

  if(!_tapCount[msgId] || (now - (_tapTimer[msgId] || 0)) > TAP_LIMIT * 3){
    _tapCount[msgId] = 1;
  } else {
    _tapCount[msgId]++;
  }
  _tapTimer[msgId] = now;

  /* إلغاء مؤقت سابق */
  if(_tapTimer['_t_' + msgId]) clearTimeout(_tapTimer['_t_' + msgId]);

  if(_tapCount[msgId] >= 3){
    _tapCount[msgId] = 0;
    e.preventDefault();
    e.stopPropagation();
    /* تأكيد بصري على الفقاعة */
    const wrap = document.querySelector('[data-msg-id="' + msgId + '"]');
    if(wrap){
      wrap.style.transition = 'background .15s ease';
      const bbl = wrap.querySelector('.chat-bubble');
      if(bbl){ bbl.style.background = 'rgba(248,113,113,0.35)'; }
      setTimeout(() => _deleteMyMsgById(msgId), 150);
    } else {
      _deleteMyMsgById(msgId);
    }
    return;
  }

  /* تصفير العداد بعد 1.8 ثانية بدون نقر */
  _tapTimer['_t_' + msgId] = setTimeout(() => {
    _tapCount[msgId] = 0;
  }, 1800);
}

/* اعتراض renderBubble لإضافة onclick ثلاثي النقر */
const _origRenderBubble = window.renderBubble;
      
