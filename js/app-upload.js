/* ══════════════════════════════════════════════
   app-upload.js — Cloudinary + رفع الملفات
   ══════════════════════════════════════════════ */

<script>
(function(){
  'use strict';

  /* 🔒 النظام الجديد: لا نخزن اسم المدير أبداً — نخزن فقط HASH المشتق منه
     حتى لو فتح المهاجم DevTools لن يجد الاسم الحقيقي، فقط hash لا يُعكس */
  const _ADMIN_HASH = '7fb5b388af2b5211f7bfa88575eb1a6b89337cee6e3cf0eb1a47505d92324505'; // SHA-256 آمن — لا يُعكس

  /* دالة hash داخلية باستخدام SubtleCrypto */
  async function _hashString(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  /* 🔒 لا نُعرّف __ADMIN_ID عالمياً أبداً — الاسم لا يُخزَّن في أي متغير */
  window.__ADMIN_ID = null; // مقصود: لا قيمة حقيقية هنا

  /* ── إعدادات Cloudinary ── */
  const CLOUD_NAME  = 'dzjutgs7s';
  const UPLOAD_PRESET = 'connectdz_unsigned';
  const UPLOAD_URL  = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/`;

  /* 🔒 قائمة المستخدمين المصرح لهم بالرفع */
  const ALLOWED_USERS_KEY = 'sklab_user_name';
  const GUEST_NAME = 'زائر';

  /* 🔒 أنواع الملفات المسموحة فقط */
  const ALLOWED_MIME = [
    'image/jpeg','image/png','image/gif','image/webp',
    'video/mp4','video/webm',
    'audio/mpeg','audio/mp4','audio/ogg','audio/wav'
  ];

  /* 🔒 الامتدادات المسموحة — فحص مزدوج مع MIME */
  const ALLOWED_EXT = ['jpg','jpeg','png','gif','webp','mp4','webm','mp3','m4a','ogg','wav'];

  /* 🔒 الأحجام القصوى الصارمة بالـ MB — مصدر وحيد لكل الكود */
  const HARD_LIMITS = {
    image: 25, video: 200, audio: 50,
    stories: 80, covers: 8, profiles: 5,
    'social-posts': 10, documents: 20, media: 50,
    images: 25, videos: 200
  };

  /* ✅ تصدير HARD_LIMITS عالمياً لاستخدامه في كامل الكود */
  window._UPLOAD_HARD_LIMITS = HARD_LIMITS;

  /* 🔒 حد رفع لكل مستخدم: 20 عملية في الساعة
     ✅ إصلاح: يُخزَّن في localStorage بدلاً من الذاكرة
        الذاكرة تُصفَّر عند إعادة تحميل الصفحة — localStorage لا تُصفَّر */
  const _UPLOAD_LIMIT_LS_KEY = '__cdz_ul';
  const _UPLOAD_MAX = 20;
  const _UPLOAD_WINDOW = 3600000; // ساعة واحدة بالمللي ثانية

  function _getUploadRecord(user){
    try {
      const raw = localStorage.getItem(_UPLOAD_LIMIT_LS_KEY + '_' + user);
      if(!raw) return { count:0, resetAt: Date.now() + _UPLOAD_WINDOW };
      return JSON.parse(raw);
    } catch { return { count:0, resetAt: Date.now() + _UPLOAD_WINDOW }; }
  }

  function _saveUploadRecord(user, rec){
    try { localStorage.setItem(_UPLOAD_LIMIT_LS_KEY + '_' + user, JSON.stringify(rec)); }
    catch { /* localStorage ممتلئ — نتجاهل */ }
  }

  function _checkUploadLimit(){
    const user = localStorage.getItem(ALLOWED_USERS_KEY) || 'unknown';
    const now  = Date.now();
    let rec = _getUploadRecord(user);

    /* إعادة تصفير إذا انقضت الساعة */
    if(now >= rec.resetAt){
      rec = { count:0, resetAt: now + _UPLOAD_WINDOW };
    }

    if(rec.count >= _UPLOAD_MAX){
      const mins = Math.ceil((rec.resetAt - now) / 60000);
      throw new Error(`🔒 تجاوزت حد الرفع (${_UPLOAD_MAX} ملف/ساعة). حاول بعد ${mins} دقيقة.`);
    }

    rec.count++;
    _saveUploadRecord(user, rec);
  }

  /* دالة مساعدة عامة — تُظهر كم رفعاً تبقى للمستخدم */
  window.getRemainingUploads = function(){
    const user = localStorage.getItem(ALLOWED_USERS_KEY) || 'unknown';
    const rec  = _getUploadRecord(user);
    if(Date.now() >= rec.resetAt) return _UPLOAD_MAX;
    return Math.max(0, _UPLOAD_MAX - rec.count);
  };

  function _checkFileType(file){
    /* فحص MIME Type */
    if(!ALLOWED_MIME.includes(file.type)){
      throw new Error('❌ نوع الملف غير مسموح: ' + file.type);
    }
    /* فحص الامتداد — منع التزوير (file.jpg في الحقيقة exe) */
    const ext = (file.name || '').split('.').pop().toLowerCase();
    if(!ALLOWED_EXT.includes(ext)){
      throw new Error('❌ امتداد الملف غير مسموح: .' + ext);
    }
    /* فحص اسم الملف — منع path traversal */
    if(/[\/\<>:"\|\?\*]/.test(file.name)){
      throw new Error('❌ اسم الملف يحتوي رموز غير مسموحة');
    }
  }

  function _applyHardSizeLimit(file, folder){
    const fileMB = file.size / (1024 * 1024);
    const limit = HARD_LIMITS[folder] || 50;
    if(fileMB > limit){
      throw new Error(`❌ الملف ${fileMB.toFixed(1)}MB يتجاوز الحد المسموح ${limit}MB لمجلد ${folder}`);
    }
  }

  function _checkUserAllowed(){
    const user = localStorage.getItem(ALLOWED_USERS_KEY);
    // السماح لكل المستخدمين المسجلين سواء في النظام القديم أو الجديد
    // منع فقط المستخدم "زائر" الصريح
    if(!user || user === GUEST_NAME){
      throw new Error('🔒 يجب تسجيل الدخول أولاً للرفع');
    }
  }

  /* ══════════════════════════════════════════════════════════════
     📤 الدالة الرئيسية: رفع ملف إلى Cloudinary
     onProgress : fn(pct 0-100)
     إرجاع : { url, publicId }
  ══════════════════════════════════════════════════════════════ */
  /* 🔒 فحص Magic Bytes — نسخة مُصلَحة: ترفض فعلاً بدلاً من القبول الصامت */
  async function _checkMagicBytes(file){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function(e){
        const arr = new Uint8Array(e.target.result);
        /* ✅ نقرأ 12 بايت بدلاً من 4 لتغطية جميع التوقيعات */
        const hex = Array.from(arr).map(b => b.toString(16).padStart(2,'0')).join('');

        /* ✅ قائمة التوقيعات مُوسَّعة وصحيحة */
        const MAGIC_SIGNATURES = [
          'ffd8ff',    // image/jpeg
          '89504e47',  // image/png
          '47494638',  // image/gif
          '52494646',  // image/webp & audio/wav (RIFF)
          '00000018',  // video/mp4
          '00000020',  // video/mp4
          '00000014',  // video/mp4 ftyp variant
          '0000001c',  // video/mp4 ftyp variant
          '1a45dfa3',  // video/webm
          'fffb',      // audio/mpeg
          'fff3',      // audio/mpeg
          'fff2',      // audio/mpeg
          '49443303',  // audio/mpeg ID3v2.3 ✅ إصلاح: كان '4944330' خاطئاً (7 أرقام بدل 8)
          '49443304',  // audio/mpeg ID3v2.4
          '4f676753',  // audio/ogg
          '664c6143',  // audio/flac
        ];

        const matched = MAGIC_SIGNATURES.some(sig => hex.startsWith(sig));

        if(matched){
          resolve(true);
        } else {
          /* ✅ إصلاح: نرفض بدلاً من القبول الصامت */
          reject(new Error('\u274c \u0645\u062d\u062a\u0648\u0649 \u0627\u0644\u0645\u0644\u0641 \u0644\u0627 \u064a\u0637\u0627\u0628\u0642 \u0646\u0648\u0639\u0647 \u2014 \u0642\u062f \u064a\u0643\u0648\u0646 \u0645\u0644\u0641\u0627\u064b \u0645\u0632\u0648\u0631\u0627\u064b: ' + file.name));
        }
      };
      /* ✅ إصلاح: خطأ القراءة = رفض وليس قبول */
      reader.onerror = () => reject(new Error('\u274c \u062a\u0639\u0630\u0651\u0631 \u0642\u0631\u0627\u0621\u0629 \u0645\u062d\u062a\u0648\u0649 \u0627\u0644\u0645\u0644\u0641 \u0644\u0644\u062a\u062d\u0642\u0642 \u0645\u0646\u0647'));
      reader.readAsArrayBuffer(file.slice(0, 12));
    });
  }

  window.uploadToCloudinary = async function(file, folder, onProgress) {
    /* ✅ كل الأخطاء تمر من handleError الموحّد */
    const _err = window.handleError || function(t,m){ throw new Error(m); };

    if (!file) throw _err(ErrorType?.FILE || 'FILE', 'لم يتم تحديد ملف');

    /* 🔒 فحص صلاحية المستخدم */
    try { _checkUserAllowed(); }
    catch(e){ throw _err(ErrorType?.AUTH || 'AUTH', e.message); }

    /* 🔒 فحص نوع الملف + الامتداد */
    try { _checkFileType(file); }
    catch(e){ throw _err(ErrorType?.FILE || 'FILE', e.message); }

    /* 🔒 فحص Magic Bytes — التحقق من المحتوى الحقيقي */
    try { await _checkMagicBytes(file); }
    catch(e){ throw _err(ErrorType?.FILE || 'FILE', e.message); }

    /* 🔒 فحص حد الرفع */
    try { _checkUploadLimit(); }
    catch(e){ throw _err(ErrorType?.UPLOAD || 'UPLOAD', e.message); }

    /* 🔒 فحص الحجم الصارم حسب المجلد */
    try { _applyHardSizeLimit(file, folder || 'media'); }
    catch(e){ throw _err(ErrorType?.FILE || 'FILE', e.message); }

    /* ✅ تم توحيد حدود الحجم — تُستخدم HARD_LIMITS فقط (أُزيلت LIMITS المكررة) */

    /* تحديد نوع الملف لـ Cloudinary */
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    const resourceType = isVideo ? 'video' : isAudio ? 'video' : 'image';
    const endpoint = UPLOAD_URL + resourceType + '/upload';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    /* 🔒 قائمة المجلدات المسموحة فقط */
    const ALLOWED_FOLDERS = ['images','videos','audio','stories','covers','profiles','social-posts','documents','media'];
    const safeFolder = ALLOWED_FOLDERS.includes(folder) ? folder : 'media';
    formData.append('folder', 'connectdz/' + safeFolder);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', endpoint);

      /* تتبع التقدم */
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && typeof onProgress === 'function') {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status === 200 && data.secure_url) {
            resolve({ url: data.secure_url, publicId: data.public_id, path: data.public_id });
          } else {
            const msg = data.error?.message || 'فشل رفع الملف إلى الخادم';
            reject(window.handleError ? window.handleError('UPLOAD', msg) : new Error(msg));
          }
        } catch(e) {
          const msg = 'خطأ في معالجة استجابة الخادم';
          reject(window.handleError ? window.handleError('NETWORK', msg, e) : new Error(msg));
        }
      };

      xhr.onerror = () => {
        const msg = 'فشل الاتصال بـ Cloudinary — تحقق من الإنترنت';
        reject(window.handleError ? window.handleError('NETWORK', msg) : new Error(msg));
      };
      xhr.send(formData);
    });
  };

  /* alias للتوافق مع الكود القديم */
  window.uploadToFirebaseStorage = window.uploadToCloudinary;

  /* ══════════════════════════════════════════════════════════════
     🖼️ رفع صورة مع ضغط تلقائي
  ══════════════════════════════════════════════════════════════ */
  window.uploadImageCompressed = async function(file, folder, maxWidth, quality, onProgress) {
    maxWidth = maxWidth || 1400;
    quality  = quality  || 0.82;
    folder   = folder   || 'images';

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let w = img.width, h = img.height;
          if (w > maxWidth || h > maxWidth) {
            if (w > h) { h = Math.round(h * maxWidth / w); w = maxWidth; }
            else       { w = Math.round(w * maxWidth / h); h = maxWidth; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          canvas.toBlob(async (blob) => {
            if (!blob) { reject(new Error('فشل ضغط الصورة')); return; }
            const compressed = new File([blob], file.name || 'image.jpg', { type: 'image/jpeg' });
            try {
              const result = await window.uploadToCloudinary(compressed, folder, onProgress);
              resolve(result);
            } catch(err) { reject(err); }
          }, 'image/jpeg', quality);
        };
        img.onerror = () => reject(new Error('تعذّر قراءة الصورة'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('تعذّر قراءة الملف'));
      reader.readAsDataURL(file);
    });
  };
})();
</script>


<script>
/* ── شريط تقدم رفع Firebase Storage ── */
window._showStorageProgress = function(label) {
  let overlay = document.getElementById('__fbStorageOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = '__fbStorageOverlay';
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:999998;
      background:rgba(5,10,14,0.75);
      display:flex;align-items:center;justify-content:center;
    `;
    overlay.innerHTML = `
      <div style="
        background:#0d1117;border:1px solid rgba(255,255,255,0.1);
        border-radius:20px;padding:28px 32px;width:88%;max-width:340px;
        text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.7);
      ">
        <div style="font-size:32px;margin-bottom:12px;">☁️</div>
        <div id="__fbStorageLabel" style="font-size:14px;font-weight:800;color:#e8eaed;margin-bottom:16px;font-family:'Tajawal',sans-serif;">
          جارٍ الرفع...
        </div>
        <div style="width:100%;height:6px;background:rgba(255,255,255,0.1);border-radius:99px;overflow:hidden;">
          <div id="__fbStorageBar" style="height:100%;width:0%;background:linear-gradient(90deg,#00e5a0,#0099ff);border-radius:99px;transition:width .25s ease;"></div>
        </div>
        <div id="__fbStoragePct" style="font-size:13px;color:#8b949e;margin-top:10px;font-family:'Tajawal',sans-serif;">0%</div>
      </div>
    `;
    document.body.appendChild(overlay);
  }
  overlay.style.display = 'flex';
  const labelEl = document.getElementById('__fbStorageLabel');
  if (labelEl) labelEl.innerText = label || 'جارٍ رفع الملف...';
  const bar = document.getElementById('__fbStorageBar');
  if (bar) bar.style.width = '0%';
  const pct = document.getElementById('__fbStoragePct');
  if (pct) pct.innerText = '0%';
};

window._updateStorageProgress = function(percent) {
  const bar = document.getElementById('__fbStorageBar');
  const pct = document.getElementById('__fbStoragePct');
  if (bar) bar.style.width = percent + '%';
  if (pct) pct.innerText = percent + '%';
};

window._hideStorageProgress = function() {
  const overlay = document.getElementById('__fbStorageOverlay');
  if (overlay) {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity .3s ease';
    setTimeout(() => { overlay.style.display = 'none'; overlay.style.opacity = '1'; }, 300);
  }
};

/* ══════════════════════════════════════════════════════════════
   🔄 وظيفة رفع الوسائط للمحادثة مع Firebase Storage
   تُستدعى كبديل من handleMediaUpload
══════════════════════════════════════════════════════════════ */
window.handleMediaUploadCloud = async function(event, type) {
  const file = event.target.files[0];
  if (!file) return;
  document.getElementById('attachMenu')?.style && (document.getElementById('attachMenu').style.display = 'none');

  /* تحديد المجلد حسب نوع الملف */
  const folderMap = { image: 'images', video: 'videos', audio: 'audio', document: 'documents' };
  const folder    = folderMap[type] || 'media';

  /* ✅ حدود الحجم — تُقرأ من HARD_LIMITS المركزية (لا تكرار) */
  const fileMB   = file.size / (1024 * 1024);
  const maxMB    = window._UPLOAD_HARD_LIMITS?.[type] || window._UPLOAD_HARD_LIMITS?.[folder] || 50;
  if (fileMB > maxMB) {
    if (typeof showToast === 'function') showToast(`❌ الحد الأقصى ${maxMB}MB — حجم ملفك ${fileMB.toFixed(1)}MB`);
    event.target.value = '';
    return;
  }

  /* رفع مع شريط تقدم */
  const typeLabels = { image: '🖼️ جارٍ رفع الصورة...', video: '🎬 جارٍ رفع الفيديو...', audio: '🎵 جارٍ رفع الصوت...' };
  window._showStorageProgress(typeLabels[type] || '☁️ جارٍ الرفع...');

  try {
    let result;
    if (type === 'image') {
      /* الصور: ضغط قبل الرفع */
      const quality = fileMB > 4 ? 0.7 : 0.85;
      result = await window.uploadImageCompressed(file, 'images', 1400, quality, (pct) => {
        window._updateStorageProgress(pct);
      });
    } else {
      result = await window.uploadToFirebaseStorage(file, folder, (pct) => {
        window._updateStorageProgress(pct);
      });
    }

    window._hideStorageProgress();

    /* إرسال الرسالة برابط Firebase */
    window._mediaToSend = {
      type,
      data: result.url,       // رابط Firebase بدلاً من base64
      storagePath: result.path,
      name: file.name,
      fileName: file.name,
      mime: file.type,
      isCloudUrl: true        // علامة للتمييز
    };
    if (typeof sendChatMessage === 'function') sendChatMessage();

  } catch (err) {
    window._hideStorageProgress();
    console.error('❌ خطأ في الرفع:', err);
    if (typeof showToast === 'function') showToast('❌ فشل رفع الملف: ' + (err.message || 'خطأ غير معروف'));
    /* fallback: الطريقة القديمة */
    if (typeof handleMediaUpload === 'function') handleMediaUpload(event, type);
  }

  event.target.value = '';
};

/* ══════════════════════════════════════════════════════════════
   📸 رفع صورة المنشور الاجتماعي إلى Firebase Storage
══════════════════════════════════════════════════════════════ */
window.uploadSocialPostImage = async function(file) {
  window._showStorageProgress('🖼️ جارٍ رفع صورة المنشور...');
  try {
    const fileMB = file.size / (1024 * 1024);
    const quality = fileMB > 3 ? 0.75 : 0.88;
    const result = await window.uploadImageCompressed(file, 'social-posts', 1200, quality, (pct) => {
      window._updateStorageProgress(pct);
    });
    window._hideStorageProgress();
    return result.url;
  } catch (err) {
    window._hideStorageProgress();
    if (typeof showToast === 'function') showToast('⚠️ فشل رفع الصورة، جرّب مرة أخرى');
    return null;
  }
};

/* ══════════════════════════════════════════════════════════════
   📖 رفع صورة/فيديو القصة إلى Firebase Storage
══════════════════════════════════════════════════════════════ */
window.uploadStoryMedia = async function(file) {
  const isVideo = file.type.startsWith('video/');
  window._showStorageProgress(isVideo ? '🎬 جارٍ رفع فيديو القصة...' : '📸 جارٍ رفع صورة القصة...');
  try {
    let result;
    if (isVideo) {
      result = await window.uploadToFirebaseStorage(file, 'stories', (pct) => {
        window._updateStorageProgress(pct);
      });
    } else {
      result = await window.uploadImageCompressed(file, 'stories', 1080, 0.85, (pct) => {
        window._updateStorageProgress(pct);
      });
    }
    window._hideStorageProgress();
    return { url: result.url, path: result.path };
  } catch (err) {
    window._hideStorageProgress();
    if (typeof showToast === 'function') showToast('⚠️ فشل رفع وسائط القصة');
    return null;
  }
};

/* ══════════════════════════════════════════════════════════════
   👤 رفع صورة الملف الشخصي / صورة الغلاف
══════════════════════════════════════════════════════════════ */
window.uploadProfilePhoto = async function(file) {
  window._showStorageProgress('👤 جارٍ رفع صورة الملف الشخصي...');
  try {
    const result = await window.uploadImageCompressed(file, 'profiles', 600, 0.88, (pct) => {
      window._updateStorageProgress(pct);
    });
    window._hideStorageProgress();
    return result.url;
  } catch (err) {
    window._hideStorageProgress();
    if (typeof showToast === 'function') showToast('⚠️ فشل رفع صورة الملف الشخصي');
    return null;
  }
};

window.uploadCoverPhoto = async function(file) {
  window._showStorageProgress('🖼️ جارٍ رفع صورة الغلاف...');
  try {
    const result = await window.uploadImageCompressed(file, 'covers', 1200, 0.82, (pct) => {
      window._updateStorageProgress(pct);
    });
    window._hideStorageProgress();
    return result.url;
  } catch (err) {
    window._hideStorageProgress();
    if (typeof showToast === 'function') showToast('⚠️ فشل رفع صورة الغلاف');
    return null;
  }
};

/* ══════════════════════════════════════════════════════════════
   🎵 رفع الموسيقى للقصة
══════════════════════════════════════════════════════════════ */
window.uploadStoryMusic = async function(file) {
  window._showStorageProgress('🎵 جارٍ رفع الموسيقى...');
  try {
    const result = await window.uploadToFirebaseStorage(file, 'audio', (pct) => {
      window._updateStorageProgress(pct);
    });
    window._hideStorageProgress();
    return { url: result.url, name: file.name.replace(/\.[^/.]+$/, '') };
  } catch (err) {
    window._h
