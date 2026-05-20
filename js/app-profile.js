/* ══════════════════════════════════════════════
   app-profile.js — الملف الشخصي + النقاط + الشعلة
   ══════════════════════════════════════════════ */

function showMyProfile(){
  const name = getCurrentUser();
  if(!name) return;
  showSocialHome();
}

function openMyFullProfile(){
  const name = getCurrentUser();
  if(!name) return;
  const el = document.getElementById('digitalCard');
  if(el){ el.style.display='flex'; el.style.flexDirection='column'; }
  updateProfilePageData(name);
  renderProfilePosts(name);
  renderProfileBadges(name);
  switchProfileTab('posts');
  const cover = localStorage.getItem('nld_cover_'+name.replace(/\s+/g,'_'));
  const coverDiv = document.getElementById('profileCoverImg');
  if(coverDiv && cover){ coverDiv.style.backgroundImage = 'url('+cover+')'; }
  syncProfilePageAvatar(name);
  const joinEl = document.getElementById('ppJoinDate');
  if(joinEl){
    const stored = localStorage.getItem('nld_joined_'+name.replace(/\s+/g,'_'));
    if(!stored){ const d=new Date(); localStorage.setItem('nld_joined_'+name.replace(/\s+/g,'_'), d.toLocaleDateString('ar-DZ',{year:'numeric',month:'long'})); }
    joinEl.innerText = localStorage.getItem('nld_joined_'+name.replace(/\s+/g,'_')) || new Date().toLocaleDateString('ar-DZ',{year:'numeric',month:'long'});
  }
  const codeEl = document.getElementById('ppMemberCode');
  if(codeEl) codeEl.innerText = 'NLD-' + getMemberCode(name);
  // تحديث شارة التوثيق
  _refreshMyVerifiedBadge(name);
}

function hideMyProfile(){
  const el = document.getElementById('digitalCard');
  if(el) el.style.display='none';
}

function syncProfilePageAvatar(name){
  const photo = getProfilePhoto ? getProfilePhoto(name) : null;
  ['profilePageAvatar','postBoxAvatar','cpAvatar'].forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    if(photo){ el.innerHTML=`<img loading="lazy" src="${photo}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`; }
    else{ el.innerHTML = getLeaderIcon(name) || '👑'; }
  });
}

function updateProfilePageData(name){
  const pts = _basePoints || 0;
  const quizPts = parseInt(localStorage.getItem(_earnedKey ? _earnedKey(name) : 'nld_earned_'+name)||'0');
  const sheetPts = pts - quizPts; // نقاط الجدول فقط (بدون الكويز) للرصيد
  const LEVEL_PTS = 3000;
  const lv = Math.floor(pts/LEVEL_PTS)+1;
  const ptsInLv = pts % LEVEL_PTS;
  // الرصيد: أوائل 15 = 35 دج / 50 نقطة، ما بعد = 30 دج (يُحدَّث من loadRanking، قيمة مبدئية 30 دج)
  const _savedRate = window._userBalanceRate || 30;
  const bal = ((Math.max(0,sheetPts)/50)*_savedRate).toFixed(2);

  const setTxt = (id,v) => { const e=document.getElementById(id); if(e) e.innerText=v; };
  const displayName = getDisplayName(name);
  setTxt('profilePageName', displayName);
  setTxt('scpName', displayName);
  // تحديث اسم في القائمة الجانبية
  const sideNameEl = document.getElementById('sideMenuName');
  if(sideNameEl) sideNameEl.innerText = displayName;
  setTxt('ppStatPoints', pts.toLocaleString());
  setTxt('ppStatLevel', lv);
  setTxt('ppStatBalance', bal+' دج');
  setTxt('ppInfoPoints', pts.toLocaleString());
  setTxt('ppInfoLevel', lv);
  setTxt('ppInfoBalance', bal+' دج');
  setTxt('ppInfoQuiz', quizPts.toLocaleString());
  setTxt('cpName', name);

  // Progress bar
  const pct = Math.min(Math.round((ptsInLv/LEVEL_PTS)*100), 100);
  setTxt('ppProgressPct', pct+'%');
  setTxt('ppProgressCurrent', ptsInLv.toLocaleString()+' نقطة');
  setTxt('ppProgressNext', (lv*LEVEL_PTS).toLocaleString()+' نقطة');
  setTxt('ppProgressFrom', 'المستوى '+lv+' → '+(lv+1));
  setTimeout(()=>{
    const bar = document.getElementById('ppProgressBar');
    if(bar) bar.style.width = pct+'%';
  }, 300);
}

function renderProfileBadges(name){
  const pts = _basePoints || 0;
  const lv = Math.floor(pts/3000)+1;
  const quizPts = parseInt(localStorage.getItem(_earnedKey ? _earnedKey(name) : 'nld_earned_'+name)||'0');
  const badges = [
    { icon:'🌟', label:'عضو مسجّل', desc:'انضممت للتطبيق', earned:true },
    { icon:'🎯', label:'مشارك الكويز', desc:'أجبت على أسئلة', earned:quizPts>0 },
    { icon:'⭐', label:'المستوى '+lv, desc:'وصلت للمستوى '+lv, earned:lv>=1 },
    { icon:'💎', label:'جامع النقاط', desc:'حصلت على نقاط', earned:pts>0 },
    { icon:'🏆', label:'بطل النقاط', desc:'تجاوزت 500 نقطة', earned:pts>=500 },
    { icon:'🔥', label:'المتميز', desc:'تجاوزت 1000 نقطة', earned:pts>=1000 },
    { icon:'🚀', label:'القائد', desc:'تجاوزت 3000 نقطة', earned:pts>=3000 },
    { icon:'👑', label:'الأسطورة', desc:'تجاوزت 5000 نقطة', earned:pts>=5000 },
    { icon:'💡', label:'الفضولي', desc:'فتحت جميع الأقسام', earned:true },
  ];
  const grid = document.getElementById('profileBadgesGrid');
  if(!grid) return;
  grid.innerHTML = badges.map(b=>`
    <div style="background:${b.earned?'white':'#F0F2F5'};border:1.5px solid ${b.earned?'#E4E6EB':'#E4E6EB'};border-radius:14px;padding:12px 6px;text-align:center;opacity:${b.earned?1:0.4};transition:.2s;" ${b.earned?'onmouseover="this.style.transform=\'translateY(-3px)\'"  onmouseout="this.style.transform=\'none\'"':''}>
      <div style="font-size:24px;margin-bottom:5px;">${b.icon}</div>
      <div style="font-size:10px;font-weight:900;color:#050505;line-height:1.3;">${b.label}</div>
      <div style="font-size:9px;color:#65676B;margin-top:2px;line-height:1.3;">${b.desc}</div>
      ${b.earned?'<div style="margin-top:4px;font-size:9px;color:#45BD62;font-weight:800;">✓ مكتسبة</div>':'<div style="margin-top:4px;font-size:9px;color:#BCC0C4;">مقفلة</div>'}
    </div>
  `).join('');
}

function switchProfileTab(tab){
  ['posts','info','activity','about'].forEach(t=>{
    const tabEl = document.getElementById('ppTab_'+t);
    const panEl = document.getElementById('ppPanel_'+t);
    if(tabEl){
      tabEl.style.color = t===tab ? '#1877F2' : '#65676B';
      tabEl.style.borderBottom = t===tab ? '3px solid #1877F2' : '3px solid transparent';
      tabEl.style.fontWeight = t===tab ? '800' : '700';
    }
    if(panEl) panEl.style.display = t===tab ? 'block' : 'none';
  });
  // تحديث شارة التوثيق عند فتح تبويب الإنجازات
  if(tab === 'activity'){
    const name = getCurrentUser();
    if(name) _refreshMyVerifiedBadge(name);
  }
}

function showBalanceModal(){
  startCoins(); playGoldSound();
  const bm = document.getElementById('balanceModal');
  if(bm) bm.style.display = 'flex';

  // حساب الرصيد مباشرة من جدول الترتيب
  _computeAndShowBalance();
}

async function _computeAndShowBalance(){
  const name = getCurrentUser();
  if(!name || name === 'زائر' || name === 'المدير') return;

  const explainEl = document.getElementById('_balanceExplainText');
  const rateEl    = document.getElementById('_balanceRateBadge');
  const balEl     = document.getElementById('cardBalance');

  if(explainEl) explainEl.innerText = 'جارٍ تحميل البيانات…';

  try{
    const norm = s => s.replace(/"/g,'').replace(/\s+/g,' ').trim().toLowerCase();
    const csvParse = line => {
      const res=[]; let cur=''; let q=false;
      for(let i=0;i<=line.length;i++){
        const ch=line[i];
        if(ch==='"'){q=!q;}
        else if((ch===','||ch===undefined)&&!q){res.push(cur.replace(/^"|"$/g,'').trim());cur='';}
        else{cur+=ch||'';}
      }
      return res;
    };

    // جلب جدول البيانات الرئيسي لترتيب الأعضاء
    const [r1, r2] = await Promise.all([
      fetch(dataUrl).then(r=>r.text()).catch(()=>''),
      fetch(smartUrl).then(r=>r.text()).catch(()=>'')
    ]);

    // بناء قائمة الأعضاء مرتبة حسب النقاط (لتحديد الأوائل 15)
    const _EXCLUDED = ['لؤي','لؤي عماري','ممتاز'];
    const allRows = [];
    const seen = new Set();

    [r1,r2].forEach(txt=>{
      txt.split('\n').slice(1).forEach(row=>{
        if(!row.trim()) return;
        const c = csvParse(row);
        const n = (c[2]||'').trim();
        if(!n || _EXCLUDED.some(ex=>n===ex||n.startsWith(ex+' '))) return;
        const key = norm(n);
        if(seen.has(key)) return;
        seen.add(key);
        const pts = parseInt((c[c.length-1]||'').replace(/[^\d]/g,''))||0;
        allRows.push({n, pts});
      });
    });

    // ترتيب من الأعلى نقاطاً
    allRows.sort((a,b)=>b.pts-a.pts);

    // إيجاد ترتيب المستخدم الحالي
    const myIdx = allRows.findIndex(x=>norm(x.n)===norm(name));
    const myEntry = myIdx >= 0 ? allRows[myIdx] : null;
    const mySheetPts = myEntry ? myEntry.pts : (window._sheetPtsCache || 0);

    // تحديد السعر: أوائل 15 → 35 دج / 50 نقطة، باقي → 30 دج
    const isTop15 = myIdx >= 0 && myIdx < 15;
    const rate = isTop15 ? 35 : 30;
    window._userBalanceRate = rate;

    // حساب الرصيد من نقاط الجدول فقط (sheetPts)
    const balance = ((mySheetPts / 50) * rate).toFixed(2);

    // تحديث الواجهة
    if(balEl) balEl.innerText = balance + ' دج';
    ['cardBalance','ppStatBalance','ppInfoBalance'].forEach(id=>{
      const el = document.getElementById(id);
      if(el) el.innerText = balance + ' دج';
    });
    const mgBal = document.getElementById('mgStatBalance');
    if(mgBal) mgBal.innerText = balance + ' دج';
    // تحديث الترتيب في لوحة العضو
    if(!_isAdmin){
      const mgRk = document.getElementById('mgStatRank');
      if(mgRk && myIdx >= 0) mgRk.innerText = '#'+(myIdx+1);
    }

    // شارة نوع السعر
    if(rateEl){
      rateEl.innerHTML = isTop15
        ? `<span style="background:linear-gradient(135deg,#f5c518,#f97316);color:white;border-radius:20px;padding:4px 14px;font-size:11px;font-weight:900;display:inline-block;">⭐ أنت من الأوائل الـ15 — سعر مميز</span>`
        : `<span style="background:rgba(0,229,160,0.12);border:1px solid rgba(0,229,160,0.3);color:var(--accent);border-radius:20px;padding:4px 14px;font-size:11px;font-weight:700;display:inline-block;">50 نقطة = 30 دج</span>`;
    }

    // شرح التحويل
    if(explainEl){
      const rankTxt = myIdx >= 0 ? `ترتيبك الحالي: #${myIdx+1}` : 'غير مرتب بعد';
      explainEl.innerHTML = `
        <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
          <span>📍 ${rankTxt}</span>
          <span style="color:${isTop15?'#f5c518':'var(--accent)'};">${isTop15?'⭐ من الأوائل الـ15':'عضو عادي'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
          <span>🏆 نقاط جدولك</span>
          <span style="color:var(--text);font-weight:800;">${mySheetPts.toLocaleString()} نقطة</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
          <span>💱 سعر التحويل</span>
          <span style="color:${isTop15?'#f5c518':'var(--accent)'};font-weight:800;">50 نقطة = ${rate} دج</span>
        </div>
        <div style="height:1px;background:var(--border);margin:8px 0;"></div>
        <div style="display:flex;justify-content:space-between;">
          <span style="font-weight:800;color:var(--text);">💎 رصيدك الإجمالي</span>
          <span style="font-weight:900;color:#00e5a0;font-size:15px;">${balance} دج</span>
        </div>
      `;
    }

  } catch(e){
    // fallback: استخدام القيم المحفوظة مسبقاً
    const rate = (typeof window._userBalanceRate !== 'undefined') ? window._userBalanceRate : 30;
    const sheetPts = window._sheetPtsCache || 0;
    const balance = ((sheetPts / 50) * rate).toFixed(2);
    if(balEl) balEl.innerText = balance + ' دج';
    if(explainEl) explainEl.innerText = `نقاط جدولك: ${sheetPts} — ${balance} دج (${rate} دج / 50 نقطة)`;
  }
}

function hideBalanceModal(){
  const bm = document.getElementById('balanceModal');
  if(bm) bm.style.display = 'none';
}

async function handleCoverUpload(event){
  const file = event.target.files[0];
  if(!file) return;
  if(file.size > 15 * 1024 * 1024){
    if(typeof showToast==='function') showToast('⚠️ الصورة كبيرة جداً! الحد الأقصى 15MB');
    event.target.value = '';
    return;
  }
  /* رفع صورة الغلاف إلى Cloudinary مع ضغط */
  window._showStorageProgress('🖼️ جارٍ رفع صورة الغلاف...');
  try {
    const result = await window.uploadImageCompressed(file, 'covers', 1200, 0.82, (pct) => {
      window._updateStorageProgress(pct);
    });
    window._hideStorageProgress();
    const url = result.url;
    const name = getCurrentUser();
    if(name) localStorage.setItem('nld_cover_'+name.replace(/\s+/g,'_'), url);
    const coverDiv = document.getElementById('profileCoverImg');
    if(coverDiv){ coverDiv.style.backgroundImage='url('+url+')'; }
    if(typeof showToast==='function') showToast('✅ تم تحديث صورة الغلاف بنجاح!');
  } catch(err) {
    window._hideStorageProgress();
    console.error('❌ خطأ في رفع صورة الغلاف:', err);
    if(typeof showToast==='function') showToast('❌ فشل رفع صورة الغلاف: ' + (err.message || 'خطأ غير معروف'));
  }
  event.target.value = '';
}

function showProfileEditMenu(){
  const n = document.createElement('div');
  n.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:5000;display:flex;align-items:flex-end;justify-content:center;';
  n.innerHTML=`<div style="background:white;width:100%;max-width:480px;border-radius:24px 24px 0 0;padding:20px;animation:slideUp .3s ease;">
    <div style="font-size:16px;font-weight:900;color:#050505;margin-bottom:14px;text-align:center;">تعديل ملفك الشخصي</div>
    <div onclick="document.getElementById('profilePhotoInput').click();this.closest('[style*=fixed]').remove();" style="display:flex;align-items:center;gap:12px;padding:12px;border-radius:10px;cursor:pointer;font-size:14px;font-weight:800;color:#050505;" onmouseover="this.style.background='#F0F2F5'" onmouseout="this.style.background=''">📷 تغيير صورة الملف الشخصي</div>
    <div onclick="document.getElementById('coverPhotoInput').click();this.closest('[style*=fixed]').remove();" style="display:flex;align-items:center;gap:12px;padding:12px;border-radius:10px;cursor:pointer;font-size:14px;font-weight:800;color:#050505;" onmouseover="this.style.background='#F0F2F5'" onmouseout="this.style.background=''">🖼️ تغيير صورة الغلاف</div>
    <div onclick="resetMemberFiles()" style="display:flex;align-items:center;gap:12px;padding:12px;border-radius:10px;cursor:pointer;font-size:14px;font-weight:800;color:#e53935;" onmouseover="this.style.background='#FFF0F0'" onmouseout="this.style.background=''">🔄 إعادة تسجيل الملفات (تصفير)</div>
    <div onclick="this.closest('[style*=fixed]').remove();" style="margin-top:8px;padding:12px;background:#F0F2F5;border-radius:12px;text-align:center;font-size:14px;font-weight:700;color:#65676B;cursor:pointer;">إلغاء</div>
  </div>`;
  n.onclick = e=>{ if(e.target===n) n.remove(); };
  document.body.appendChild(n);
}

function _saveDisplayName(realName){
  const input = document.getElementById('_editDisplayNameInput');
  if(!input) return;
  const val = input.value.trim();
  if(!val){ showToast('⚠️ أدخل اسماً صالحاً'); return; }
  const key = 'nld_display_name_'+realName.replace(/\s+/g,'_');
  localStorage.setItem(key, val);
  // ✅ يتغير فقط في: أيقونة صفحتي + أيقونة المحادثات (القائمة الجانبية)
  // ❌ لا يتغير في: اسم التطبيق (userNameTop) ولا في جدول الترتيب ولا المنخرطين
  // تحديث اسم أيقونة صفحتي
  const ppName = document.getElementById('profilePageName');
  if(ppName) ppName.innerText = val;
  // تحديث أيقونة صفحتي في الشبكة الاجتماعية
  const scpN = document.getElementById('scpName');
  if(scpN) scpN.innerText = val;
  // تحديث اسم في القائمة الجانبية (أيقونة المحادثات)
  const sideNameEl = document.getElementById('sideMenuName');
  if(sideNameEl) sideNameEl.innerText = val;
  // تحديث اسم المرسل في مربع إنشاء المنشورات (يظهر فوق صندوق الكتابة)
  const postAuthorEl = document.getElementById('socialPostAuthorName');
  if(postAuthorEl) postAuthorEl.innerText = val;
  // ⚠️ userNameTop و user-name و memberGreetingName لا تتغير — تبقى بالاسم الحقيقي
  document.querySelectorAll('[style*="position:fixed"][style*="z-index:5000"]').forEach(el=>el.remove());
  showToast('✅ تم حفظ اسم العرض في صفحتي والمحادثات: ' + val);
}

// دالة مساعدة: جلب اسم العرض
function getDisplayName(realName){
  return localStorage.getItem('nld_display_name_'+realName.replace(/\s+/g,'_')) || realName;
}

// تصفير ملفات المنخرط (الصورة الشخصية + الغلاف) لإعادة التسجيل
function resetMemberFiles(){
  const name = getCurrentUser(); if(!name) return;
  // إغلاق أي نافذة مفتوحة
  document.querySelectorAll('[style*="position:fixed"][style*="z-index:5000"]').forEach(el=>el.remove());
  if(!confirm('⚠️ هل أنت متأكد؟\nسيتم حذف صورتك الشخصية وصورة الغلاف\nلتتمكن من رفعهما من جديد.')) return;
  // حذف الصورة الشخصية
  localStorage.removeItem('nld_photo_'+name.replace(/\s+/g,'_'));
  // حذف صورة الغلاف
  localStorage.removeItem('nld_cover_'+name.replace(/\s+/g,'_'));
  // تحديث الواجهة
  updateTopNavAvatar(name);
  // تحديث أفاتار صفحتي
  const av = document.getElementById('profilePageAvatar');
  if(av){ av.innerHTML = '👑<div style="position:absolute;bottom:4px;left:50%;transform:translateX(-50%);width:28px;height:28px;background:#1877F2;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;border:2px solid white;">📷</div>'; }
  // تحديث الغلاف
  const coverImg = document.getElementById('profileCoverImg');
  if(coverImg){ coverImg.style.backgroundImage=''; }
  const mpvCover = document.getElementById('mpvCoverImg');
  if(mpvCover){ mpvCover.style.backgroundImage=''; }
  showToast('✅ تم تصفير الملفات. يمكنك الآن رفع ملفات جديدة!');
}

// ── منشورات الملف الشخصي ──


function getCurrentUser(){return document.getElementById("userNameTop").innerText||'guest';}

/* ══════════════════════════════════════════════════════════════════
   🏆 نظام نقاط الأوائل الـ15 — امتيازات المسجلين الأوائل
   ══════════════════════════════════════════════════════════════════ */
window._earlyBirdCache = null;

async function isEarlyBirdUser(){
  if(window._earlyBirdCache !== null) return window._earlyBirdCache;
  const name = getCurrentUser();
  if(!name || name === 'زائر' || name === 'المدير' || name === 'guest'){
    window._earlyBirdCache = false; return false;
  }
  try{
    const norm = s => s.replace(/"/g,'').replace(/\s+/g,' ').trim().toLowerCase();
    const csvParse = line => {
      const res=[]; let cur=''; let q=false;
      for(let i=0;i<=line.length;i++){
        const ch=line[i];
        if(ch==='"'){q=!q;}
        else if((ch===','||ch===undefined)&&!q){res.push(cur.replace(/^"|"$/g,'').trim());cur='';}
        else{cur+=ch||'';}
      }
      return res;
    };
    // جلب المصدرين معاً — نفس منطق أيقونة المنخرطون
    const [r1, r2] = await Promise.all([
      fetch(dataUrl).then(r=>r.text()).catch(()=>null),
      fetch(smartUrl).then(r=>r.text()).catch(()=>null)
    ]);
    if(!r1 && !r2){ window._earlyBirdCache=false; return false; }
    const _EB_EXCL = ['لؤي','لؤي عماري','ممتاز'];
    const seen2 = new Set();
    const mergedMembers = [];
    [r1||'', r2||''].forEach(txt=>{
      txt.split('\n').slice(1).filter(x=>x.trim()).forEach(row=>{
        const c=csvParse(row);
        const n=(c[2]||'').trim();
        if(!n || _EB_EXCL.some(ex=>n===ex||n.startsWith(ex+' '))) return;
        const key=norm(n);
        if(seen2.has(key)) return;
        seen2.add(key);
        mergedMembers.push(n);
      });
    });
    const myIdx = mergedMembers.findIndex(n=>norm(n)===norm(name));
    window._earlyBirdCache = (myIdx >= 0 && myIdx < 15);
    return window._earlyBirdCache;
  }catch(e){ window._earlyBirdCache=false; return false; }
}

async function grantEarlyBirdPoints(activityKey, pts, dailyLimit, label){
  try{
    const isEarly = await isEarlyBirdUser();
    if(!isEarly) return;
    const name = getCurrentUser();
    if(dailyLimit){
      const storageKey = 'nld_eb_' + name.replace(/\s+/g,'_') + '_' + activityKey;
      const lastTs = parseInt(localStorage.getItem(storageKey) || '0');
      if(Date.now() - lastTs < 24*60*60*1000) return;
      localStorage.setItem(storageKey, String(Date.now()));
    }
    addPointsInstant(pts);
    showToast('\u2B50 +' + pts + ' \u0646\u0642\u0637\u0629 \u2014 ' + label);
  }catch(e){}
}

/* ══════════════════════════════════════════════════════════════════
   ?
