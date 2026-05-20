/* ══════════════════════════════════════════════
   app-core.js — دوال مشتركة، Toast، أخطاء
   ══════════════════════════════════════════════ */

<script>
/* ══════════════════════════════════════════════════════════
   🔒 منع Pull-to-Refresh — نسخة مُصلَحة بمنطق صحيح
   المنطق الصحيح:
   - dy > 0  = المستخدم يسحب إلى الأسفل (إصبع ينزل) = pull-to-refresh
   - dy < 0  = المستخدم يسحب إلى الأعلى (إصبع يصعد) = تمرير عادي للأعلى
   - نمنع فقط: dy>0 (سحب أسفل) عندما لا يوجد عنصر يمكنه التمرير للأعلى
   ══════════════════════════════════════════════════════════ */
(function(){
'use strict';
var _sy = 0; /* startY */

document.addEventListener('touchstart', function(e){
  _sy = e.touches[0] ? e.touches[0].clientY : 0;
}, {passive:true, capture:true});

document.addEventListener('touchmove', function(e){
  if(!e.touches[0]) return;
  var dy = e.touches[0].clientY - _sy; /*양수 = سحب للأسفل */

  /* فقط نهتم بالسحب للأسفل (pull-to-refresh) */
  if(dy <= 0) return;

  /* ابحث عن أقرب عنصر يمكنه التمرير للأعلى (scrollTop > 0) */
  var el = e.target;
  while(el && el !== document.documentElement){
    var ov = window.getComputedStyle(el).overflowY;
    if((ov === 'auto' || ov === 'scroll') && el.scrollTop > 0){
      /* هذا العنصر لم يصل للأعلى بعد — السحب تمرير عادي، لا نمنع */
      return;
    }
    el = el.parentElement;
  }
  /* وصلنا للأعلى أو لا يوجد عنصر scroll — هذا pull-to-refresh، نمنعه */
  e.preventDefault();

}, {passive:false, capture:true});
})();
</script>


<script>
(function(){
  'use strict';
  window.ErrorType = Object.freeze({
    UPLOAD:'UPLOAD', AUTH:'AUTH', NETWORK:'NETWORK',
    FILE:'FILE', ADMIN:'ADMIN', GENERIC:'GENERIC'
  });

  /**
   * handleError(type, message, originalError?)
   * استخدام موحّد في كل الكود:
   *   throw handleError(ErrorType.UPLOAD, 'فشل رفع الصورة', err)
   */
  window.handleError = function(type, message, originalError){
    const label = '[ConnectDZ:' + type + ']';
    if(originalError) console.error(label, message, originalError);
    else              console.error(label, message);

    const icons = { UPLOAD:'☁️', AUTH:'🔒', NETWORK:'📡', FILE:'📁', ADMIN:'🛡️', GENERIC:'⚠️' };
    const userMsg = (icons[type]||'⚠️') + ' ' + message;

    if(typeof window.showToast === 'function'){
      window.showToast(userMsg);
    } else {
      window.addEventListener('load', function(){
        if(typeof window.showToast === 'function') window.showToast(userMsg);
      }, { once:true });
    }

    return new Error('[' + type + '] ' + message);
  };
})();
</script>


<script>
(function(){
  'use strict';
  const DB_URL = "https://connectdz-49fab-default-rtdb.firebaseio.com";

  /* ── شاشة التحميل ── */
  function showLoader(){
    const el = document.createElement('div');
    el.id = '__fb_loader';
    el.style.cssText = `
      position:fixed;inset:0;z-index:999999;
      background:#050a0e;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      gap:16px;font-family:'Tajawal',sans-serif;
    `;
    el.innerHTML = `
      <div style="font-size:40px;">🔥</div>
      <div style="font-size:16px;font-weight:800;color:#00e5a0;">جارٍ تحميل البيانات...</div>
      <div style="width:180px;height:4px;background:rgba(255,255,255,0.1);border-radius:99px;overflow:hidden;">
        <div id="__fb_bar" style="height:100%;width:0%;background:#00e5a0;border-radius:99px;transition:width .4s ease;"></div>
      </div>
    `;
    document.documentElement.appendChild(el);
  }

  function updateLoader(pct){
    const bar = document.getElementById('__fb_bar');
    if(bar) bar.style.width = pct + '%';
  }

  function hideLoader(){
    const el = document.getElementById('__fb_loader');
    if(el){
      el.style.opacity = '0';
      el.style.transition = 'opacity .4s ease';
      setTimeout(() => el.remove(), 400);
    }
  }

  /* ── الاحتفاظ بالدوال الأصلية ── */
  const _set    = Storage.prototype.setItem.bind(localStorage);
  const _remove = Storage.prototype.removeItem.bind(localStorage);
  const _clear  = Storage.prototype.clear.bind(localStorage);
  window.__lsNativeSet = _set;

  /* ── مفاتيح يتم تجاهلها (خاصة بالجهاز) ── */
  const SKIP_KEYS = new Set([
    '__deviceId','pwa_banner_dismissed','selectedLang',
    'lang','currentLang','__fb_loaded','nld_saved_accounts','nld_member_msgs'
  ]);

  /* 🔒 كلمات محظورة — لا تُرسل أبداً لـ Firebase */
  const BLOCKED_WORDS = ['password','pass','pwd','token','secret','admin','nld_admin','yahia'];

  function shouldSkip(key){
    if(!key) return true;
    if(SKIP_KEYS.has(key)) return true;
    if(key.startsWith('__') || key.startsWith('nld_saved_accounts') || key.startsWith('nld_member_msgs')) return true;
    /* 🔒 منع إرسال البيانات الحساسة */
    const lk = key.toLowerCase();
    if(BLOCKED_WORDS.some(w => lk.includes(w))) return true;
    return false;
  }

  /* ── رفع مفتاح واحد إلى Firebase ── */
  let _pushCount = 0;
  let _pushReset = Date.now();
  function pushKey(key, value){
    if(shouldSkip(key)) return;
    /* 🔒 حد معدل الإرسال: 60 عملية كل 60 ثانية */
    const now = Date.now();
    if(now - _pushReset > 60000){ _pushCount = 0; _pushReset = now; }
    if(_pushCount++ > 60){ console.warn('🔒 Firebase: تم تجاوز حد الإرسال'); return; }
    /* 🔒 حد حجم القيمة: 50KB كحد أقصى */
    const strVal = JSON.stringify(value);
    if(strVal.length > 50000){ console.warn('🔒 Firebase: القيمة كبيرة جداً، تم الحذف'); return; }
    const safeKey = encodeURIComponent(key).replace(/%/g,'~');
    fetch(`${DB_URL}/appdata/${safeKey}.json`, {
      method : 'PUT',
      headers: {'Content-Type':'application/json'},
      body   : strVal
    }).catch(()=>{});
  }

  /* ── حذف مفتاح من Firebase ── */
  function deleteKey(key){
    if(shouldSkip(key)) return;
    const safeKey = encodeURIComponent(key).replace(/%/g,'~');
    fetch(`${DB_URL}/appdata/${safeKey}.json`, { method:'DELETE' }).catch(()=>{});
  }

  /* ── تجاوز localStorage.setItem ── */
  Storage.prototype.setItem = function(key, value){
    _set(key, value);
    pushKey(key, value);
  };

  /* ── تجاوز localStorage.removeItem ── */
  Storage.prototype.removeItem = function(key){
    _remove(key);
    deleteKey(key);
  };

  /* ── تجاوز localStorage.clear ── */
  Storage.prototype.clear = function(){ console.warn('Protected clear called');
    // احتفظ بالمفاتيح المحلية والمحادثات قبل المسح
    const local = {};
    SKIP_KEYS.forEach(k => {
      const v = localStorage.getItem(k);
      if(v !== null) local[k] = v;
    });
    // ══ حماية المحادثات — لا تُحذف أبداً حتى عند تحديث التطبيق ══
    const savedConvs = {};
    try{
      for(let i=0;i<localStorage.length;i++){
        const k = localStorage.key(i);
        if(k && (k.startsWith('nld_p2p_') || k.startsWith('nld_star_') || k.startsWith('nld_friends_') || k.startsWith('nld_freq_'))){
          const v = localStorage.getItem(k);
          if(v) savedConvs[k] = v;
        }
      }
    }catch(e){}
    _clear();
    Object.entries(local).forEach(([k,v]) => _set(k,v));
    // استعادة المحادثات والعلاقات المحفوظة
    Object.entries(savedConvs).forEach(([k,v]) => _set(k,v));
    fetch(`${DB_URL}/appdata.json`, { method:'DELETE' }).catch(()=>{});
  };

  /* ── تحميل البيانات من Firebase عند الفتح ── */
  showLoader();
  updateLoader(20);

  fetch(`${DB_URL}/appdata.json`)
    .then(r => {
      updateLoader(60);
      return r.json();
    })
    .then(data => {
      updateLoader(90);
      if(data && typeof data === 'object'){
        Object.entries(data).forEach(([safeKey, value]) => {
          try{
            const key = decodeURIComponent(safeKey.replace(/~/g,'%'));
            if(!shouldSkip(key)){
              _set(key, typeof value === 'string' ? value : JSON.stringify(value));
            }
          }catch(e){}
        });
      } else {
      }
      updateLoader(100);
      setTimeout(hideLoader, 300);
    })
    .catch(err => {
      console.warn('⚠️ Firebase: تعذّر التحميل، يعمل محلياً', err);
      hideLoader();
    });

  /* ── مزامنة فورية عند تغيير من تبويب آخر ── */
  window.addEventListener('storage', e => {
    if(e.key && !shouldSkip(e.key)){
      if(e.newValue === null){
        deleteKey(e.key);
      } else {
        pushKey(e.key, e.newValue);
      }
    }
  });
})();
</script>


<script>
(function(){
  'use strict';

  const DB_URL = 'https://connectdz-49fab-default-rtdb.firebaseio.com';
  const MAX_LOGS = 100; // حد أقصى للسجلات المحفوظة

  /* ══ تجميع السجلات محلياً أولاً ══ */
  const _errorQueue = [];
  let _flushTimer = null;

  function _getDeviceInfo(){
    return {
      ua: navigator.userAgent.slice(0,80),
      lang: navigator.language,
      online: navigator.onLine,
      screen: screen.width + 'x' + screen.height,
      time: new Date().toISOString()
    };
  }

  /* ══ حفظ خطأ في القائمة ══ */
  function _queueError(type, message, source){
    if(_errorQueue.length >= MAX_LOGS) return;
    _errorQueue.push({
      type,
      message: String(message).slice(0, 200),
      source: String(source || '').slice(0, 100),
      ...(_getDeviceInfo())
    });
    /* إرسال دفعي كل 5 ثوانٍ */
    if(!_flushTimer){
      _flushTimer = setTimeout(_flushErrors, 5000);
    }
  }

  /* ══ إرسال الأخطاء لـ Firebase دفعة واحدة ══ */
  function _flushErrors(){
    _flushTimer = null;
    if(!_errorQueue.length) return;
    const batch = _errorQueue.splice(0, 10); // 10 في كل مرة
    const key = 'errors_' + Date.now();
    fetch(DB_URL + '/monitor/' + key + '.json', {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(batch)
    }).catch(()=>{});
  }

  /* ══ 1. التقاط أخطاء JavaScript ══ */
  window.addEventListener('error', function(e){
    _queueError('JS_ERROR', e.message, e.filename + ':' + e.lineno);
  });

  /* ══ 2. التقاط Promise غير المعالجة ══ */
  window.addEventListener('unhandledrejection', function(e){
    _queueError('PROMISE_ERROR', e.reason?.message || String(e.reason), 'unhandledrejection');
  });

  /* ══ 3. مراقبة الأداء عند التحميل ══ */
  window.addEventListener('load', function(){
    setTimeout(function(){
      const perf = performance.timing;
      const loadTime = perf.loadEventEnd - perf.navigationStart;
      const domReady = perf.domContentLoadedEventEnd - perf.navigationStart;
      const ttfb = perf.responseStart - perf.navigationStart;

      const perfData = {
        loadTime_ms: loadTime,
        domReady_ms: domReady,
        ttfb_ms: ttfb,
        rating: loadTime < 2000 ? '🟢 ممتاز' : loadTime < 4000 ? '🟡 مقبول' : '🔴 بطيء',
        ...(_getDeviceInfo())
      };

      fetch(DB_URL + '/monitor/perf_' + Date.now() + '.json', {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(perfData)
      }).catch(()=>{});

      /* عرض في console للمطور */
      if(window.__DEV__){
        console.info('📊 أداء التحميل:', perfData);
      }
    }, 1000);
  });

  /* ══ 4. مراقبة الاتصال بالإنترنت ══ */
  window.addEventListener('offline', function(){
    _queueError('NETWORK', 'انقطع الاتصال بالإنترنت', 'navigator');
  });

  /* ══ 5. دالة يدوية للمطور — window.logError() ══ */
  window.logError = function(msg, source){
    _queueError('MANUAL', msg, source || 'developer');
  };

  /* ══ 6. لوحة تحكم المراقبة — للمدير فقط ══ */
  window.showMonitorDashboard = async function(){
    try{
      const res = await fetch(DB_URL + '/monitor.json');
      const data = await res.json();
      if(!data){ alert('لا توجد بيانات مراقبة بعد'); return; }

      const entries = Object.values(data);
      const errors = entries.flat().filter(e => e.type && e.type !== 'NETWORK');
      const perfs = entries.flat().filter(e => e.loadTime_ms);

      const avgLoad = perfs.length
        ? Math.round(perfs.reduce((s,p) => s + p.loadTime_ms, 0) / perfs.length)
        : 0;

      const errCount = errors.length;
      const lastErr = errors[errors.length-1];

      alert(
        '📊 لوحة المراقبة — Connect DZ
' +
        '━━━━━━━━━━━━━━━━━━━━
' +
        '⚡ متوسط وقت التحميل: ' + avgLoad + 'ms
' +
        '❌ إجمالي الأخطاء: ' + errCount + '
' +
        (lastErr ? '🔴 آخر خطأ: ' + lastErr.message + '
   في: ' + lastErr.source : '✅ لا أخطاء مسجلة') + '
' +
        '━━━━━━━━━━━━━━━━━━━━
' +
        '📱 عدد الزيارات المرصودة: ' + perfs.length
      );
    } catch(e){
      alert('⚠️ تعذّر تحميل بيانات المراقبة');
    }
  };

})();
</script>


function showToast(msg, type, duration){
  /* 🎨 نظام Toast محسّن مع أنواع متعددة */
  const old = document.getElementById('socialToast');
  if(old){ old.style.opacity='0'; setTimeout(()=>old.remove(), 200); }

  type = type || 'info';
  duration = duration || 3000;

  const colors = {
    success: 'linear-gradient(135deg,#00e5a0,#00b894)',
    error:   'linear-gradient(135deg,#ff4757,#c0392b)',
    warning: 'linear-gradient(135deg,#ffa502,#e67e22)',
    info:    'linear-gradient(135deg,#1e90ff,#0052cc)',
  };

  /* كشف النوع تلقائياً من الرسالة */
  if(!type || type==='info'){
    if(msg.includes('✅')||msg.includes('تم')||msg.includes('نجح')) type='success';
    else if(msg.includes('❌')||msg.includes('فشل')||msg.includes('خطأ')) type='error';
    else if(msg.includes('⚠️')||msg.includes('تحذير')||msg.includes('انتبه')) type='warning';
  }

  const t = document.createElement('div');
  t.id = 'socialToast';
  t.style.cssText = `
    position:fixed;bottom:100px;left:50%;transform:translateX(-50%) translateY(20px);
    background:${colors[type]||colors.info};
    color:white;padding:12px 22px;border-radius:24px;
    font-family:Tajawal,sans-serif;font-size:14px;font-weight:700;
    z-index:999999;white-space:nowrap;max-width:88%;text-align:center;
    box-shadow:0 8px 32px rgba(0,0,0,0.3);
    opacity:0;transition:opacity .2s ease, transform .2s ease cubic-bezier(.22,.68,0,1.2);
    pointer-events:none;
  `;
  t.innerText = msg;
  document.body.appendChild(t);

  /* انيميشن ظهور */
  requestAnimationFrame(()=>{
    t.style.opacity = '1';
    t.style.transform = 'translateX(-50%) translateY(0)';
  });

  /* اختفاء تلقائي */
  setTimeout(()=>{
    t.style.opacity = '0';
    t.style.transform = 'translateX(-50%) translateY(10px)';
    setTimeout(()=>t.remove(), 300);
  }, duration);
}

/* دوال مختصرة للاستخدام السريع */
window.toastSuccess = msg => showToast(msg, 'success');
window.toastError   = msg => showToast(msg, 'error', 4000);
window.toastWarning = msg => showToast(msg, 'warning');


/* ══════════════════════════════════════════════════════════════════
   👍 نظام الإعجاب والتفاعل المحسّن – الإعجاب بنقرة، التفاعلات بالضغط المطوّل
   ══════════════════════════════════════════════════════════════════ */


<script>
/* 🎨 بديل احترافي عن prompt() */
window.showPrompt = function(title, placeholder, icon, subtitle){
  return new Promise(resolve => {
    const overlay = document.getElementById('__customPromptOverlay');
    const input   = document.getElementById('__promptInput');
    const titleEl = document.getElementById('__promptTitle');
    const subEl   = document.getElementById('__promptSub');
    const iconEl  = document.getElementById('__promptIcon');

    titleEl.innerText = title || 'أدخل البيانات';
    subEl.innerText   = subtitle || '';
    iconEl.innerText  = icon || '💬';
    input.value       = '';
    input.placeholder = placeholder || '';
    input.style.borderColor = 'rgba(255,255,255,0.1)';

    overlay.style.display = 'flex';
    setTimeout(()=> input.focus(), 100);

    /* Enter للتأكيد */
    input.onkeydown = e => { if(e.key==='Enter') window.__promptResolve(input.value); };

    window.__promptResolve = function(val){
      overlay.style.display = 'none';
      input.onkeydown = null;
      resolve(val && val.trim() ? val.trim() : null);
    };
  });
};

/* 🎨 بديل احترافي عن confirm() */
window.showConfirm = function(title, subtitle, icon){
  return new Promise(resolve => {
    const overlay = document.getElementById('__customPromptOverlay');
    const input   = document.getElementById('__promptInput');
    const titleEl = document.getElementById('__promptTitle');
    const subEl   = document.getElementById('__promptSub');
    const iconEl  = document.getElementById('__promptIcon');

    titleEl.innerText = title || 'هل أنت متأكد؟';
    subEl.innerText   = subtitle || '';
    iconEl.innerText  = icon || '⚠️';
    input.style.display = 'none';

    overlay.style.display = 'flex';

    window.__promptResolve = function(val){
      overlay.style.display = 'none';
      input.style.display = '';
      resolve(val !== null);
    };
  });
};
</script>


<script>
(function(){
'use strict';

/* تحسين التمرير */
document.documentElement.style.scrollBehavior = 'smooth';

/* منع التهنيج الناتج عن الصور الثقيلة */
document.querySelectorAll('img').forEach(img=>{
  img.loading='lazy';
  img.decoding='async';
});

/* تنظيف الذاكرة للعناصر المخفية */
const observer = new MutationObserver(()=>{
  document.querySelectorAll('video').forEach(v=>{
    v.setAttribute('playsinline','true');
    v.setAttribute('preload','metadata');
  });
});
observer.observe(document.body,{childList:true,subtree:true});

/* منع التكرار العشوائي للأحداث — نسخة مُصلَحة تماماً */
/* ⚠️ تحذير: لا تُجبر passive:true على touchstart/touchmove أبداً
   لأن ذلك يمنع preventDefault() ويكسر التمرير والـ pull-to-refresh prevention */
const _add = EventTarget.prototype.addEventListener;
const _regMap = new WeakMap();
/* هذه الأحداث تحتاج non-passive لتعمل preventDefault() */
const _mustNonPassive = /^(touch|wheel|DOMMouseScroll|mouse(down|move|up)|key|click|scroll|drag|pointer)/i;
EventTarget.prototype.addEventListener = function(t, fn, opts){
  if(!fn) return;
  /* نحترم خيارات المستدعي دون تعديل */
  return _add.call(this, t, fn, opts);
};

/* تحسين الأداء أثناء السحب — passive:true آمن على scroll */
let ticking = false;
window.addEventListener('scroll', function _scrollRaf(){
  if(!ticking){
    requestAnimationFrame(function(){ ticking = false; });
    ticking = true;
  }
}, {passive:true});

console.log('✅ Connect DZ Stability Patch Loaded');
})();
</script>
      
