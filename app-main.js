/* ══════════════════════════════════════════════
   app-main.js — التنسيق العام + إعداد التطبيق
   ══════════════════════════════════════════════ */

<script>
(function(){
  'use strict';
  emailjs.init({ publicKey: 'LEviaBzvlA-PwfV9j' });

  window._sendVerifyEmail = async function(toEmail, code, toName){
    try {
      await emailjs.send('service_e895qj1', 'template_9c21jti', {
        to_email   : toEmail,
        to_name    : toName || toEmail.split('@')[0],
        verify_code: code,
        app_name   : 'Connect DZ'
      });
      return { ok: true };
    } catch(err){
      console.error('EmailJS error:', err);
      return { ok: false, error: err.text || err.message };
    }
  };
  window._emailjsConfigured = true;
})();
</script>


<script>
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  OneSignalDeferred.push(async function(OneSignal) {
    await OneSignal.init({
      appId: "0c7b884d-9c60-435e-a475-86b610bc5542",
    });
  });

  /* ════════════════════════════════════════════
     📤  إرسال إشعار لجميع المشتركين عبر OneSignal API
     يُستدعى تلقائياً عند كل رسالة جديدة
  ════════════════════════════════════════════ */
  /* ══════════════════════════════════════════════════════════
     📣 إشعارات محلية آمنة — بدون مفتاح سري في الكود
     لإرسال إشعارات جماعية استخدم OneSignal Dashboard مباشرة
     ══════════════════════════════════════════════════════════ */
  window.sendOneSignalNotif = async function(title, message, targetUserName) {
    try {
      // إشعار محلي للمستخدم الحالي فقط (آمن 100%)
      if(typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(title, {
          body: message,
          icon: '/icon-192.png'
        });
      }
    } catch(err) {
      console.warn('⚠️ فشل الإشعار المحلي', err);
    }
  };
</script>


<script>
/* ▼ جدول البيانات الرئيسي - المصدر الوحيد للنقاط والمنخرطين ▼ */
const dataUrl       = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR3H3djgDqL2iegFEqaGjCnQUG616lofnKleTsk4F1E2vGOqhrHTJIQT3ORvTDwnGeDfTT-5OO1ctS1/pub?output=csv';

/* =======================================================================
   إعداد Google Apps Script لمزامنة نقاط الكويز بين جميع المستخدمين
   =========================================================================
   1. افتح Google Sheets الخاص بك → Extensions → Apps Script
   2. أنشئ ملف جديد والصق الكود التالي:

   ───────────────────────────────────────────────────
   const SHEET='QuizPoints';
   function doGet(e){
     const ss=SpreadsheetApp.getActiveSpreadsheet();
     let sh=ss.getSheetByName(SHEET)||ss.insertSheet(SHEET);
     const d=sh.getDataRange().getValues();
     const r={};
     for(let i=1;i<d.length;i++) if(d[i][0]) r[d[i][0]]=parseInt(d[i][1])||0;
     return ContentService.createTextOutput(JSON.stringify(r))
       .setMimeType(ContentService.MimeType.JSON);
   }
   function doPost(e){
     const b=JSON.parse(e.postData.contents);
     const name=String(b.name||'').trim();
     const pts=parseInt(b.pts)||0;
     if(!name) return ContentService.createTextOutput('{}').setMimeType(ContentService.MimeType.JSON);
     const ss=SpreadsheetApp.getActiveSpreadsheet();
     let sh=ss.getSheetByName(SHEET)||ss.insertSheet(SHEET);
     const d=sh.getDataRange().getValues();
     for(let i=1;i<d.length;i++){
       if(String(d[i][0]).trim()===name){sh.getRange(i+1,2).setValue(pts);return ContentService.createTextOutput('{"ok":true}').setMimeType(ContentService.MimeType.JSON);}
     }
     sh.appendRow([name,pts,new Date().toISOString()]);
     return ContentService.createTextOutput('{"ok":true}').setMimeType(ContentService.MimeType.JSON);
   }
   ───────────────────────────────────────────────────
   3. Deploy → New deployment → Web app → Anyone → Deploy
   4. انسخ رابط الـ Web App وضعه في المتغير quizPtsApiUrl أدناه
   ======================================================================= */
const membersUrl    = dataUrl;
/* ▼ استمارة الشباب: مغلقة حتى إشعار آخر ▼ */
const shabaabUrl    = null;
const newShabaabUrl = null;
/* ▼ جدول استمارة "انظم إلينا" (Smart) ▼ */
const smartUrl      = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRDI3Sw6dUaU02463Rj5xpZ5Q3_vUq4WpaZVLnErKubqDbfBcWt_tPbQSckySuRzeSS0IU-25T2XZcI/pub?output=csv';
const quizUrl       = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQi_JTvEBgrlT-nba8SzIEiuTvPS6sz-eIRLM-cESaztFr35bl6mGq7rzwNc-tiP1BY-44d7x6rcvEf/pubhtml';
const rankingUrl    = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSP7Q70E0ey5k7JnnOh7Ju7281ytxEDTViCVRiv4JM0FakJSgxZM47XmZN1bgZSGwCU5fIHzldOQhid/pub?output=csv';

/* ▼ رابط Google Apps Script لحفظ نقاط الكويز المشتركة بين جميع المستخدمين ▼
   ← ضع رابط الـ Web App الذي ستنشره من Google Apps Script هنا             */
const quizPtsApiUrl = 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';

/* ===== جزيئات الخلفية ===== */
(function(){
  const s=document.getElementById('sparks');
  const colors=['rgba(0,229,160,0.6)','rgba(15,155,15,0.5)','rgba(245,197,24,0.5)','rgba(229,45,39,0.4)'];
  for(let i=0;i<10;i++){
    const d=document.createElement('div');
    d.className='spark';
    const sz=4+Math.random()*8;
    d.style.cssText=`width:${sz}px;height:${sz}px;left:${Math.random()*100}%;top:${Math.random()*100}%;background:${colors[i%colors.length]};animation-duration:${3+Math.random()*4}s;animation-delay:${Math.random()*4}s;`;
    s.appendChild(d);
  }
})();

/* ===== رموز القيادة ===== */
const leaderIcons=['👑','🌟','⚡','🎯','🦁','🔥','💎','🚀','🏆','✨'];
function getLeaderIcon(name){
  let h=0;
  for(let i=0;i<name.length;i++) h=(h*31+name.charCodeAt(i))&0xffff;
  return leaderIcons[h%leaderIcons.length];
}

/* ===== كود العضو التسلسلي ===== */
function getMemberCode(name){
  const key='nld_code_'+name.replace(/\s+/g,'_');
  let code=localStorage.getItem(key);
  if(!code){
    let last=parseInt(localStorage.getItem('nld_last_code')||'1000000');
    last++;
    localStorage.setItem('nld_last_code',String(last));
    code=String(last);
    localStorage.setItem(key,code);
  }
  return code;
}

/* =====================================================================
   وظائف التخزين المشترك لنقاط الكويز (تُرى من جميع الأجهزة)
   ===================================================================== */

/** جلب جميع نقاط الكويز من Google Apps Script (قاموس: الاسم → النقاط) */
async function fetchAllQuizPts(){
  if(!quizPtsApiUrl || quizPtsApiUrl.includes('YOUR_APPS_SCRIPT')){
    // fallback: قرأ من localStorage فقط (وضع عدم الإعداد)
    return {};
  }
  try{
    const res=await fetch(quizPtsApiUrl+'?action=get',{method:'GET'});
    if(!res.ok) return {};
    const json=await res.json();
    return json||{};
  }catch(e){ return {}; }
}

/** حفظ نقاط الكويز للمستخدم في localStorage + Google Apps Script */
async function syncQuizPts(name, pts){
  if(!name) return;
  // دائماً احفظ محلياً أولاً (سريع + fallback)
  localStorage.setItem(_earnedKey(name), String(pts));
  // ثم حفظ مشترك عبر Apps Script
  if(!quizPtsApiUrl || quizPtsApiUrl.includes('YOUR_APPS_SCRIPT')) return;
  try{
    await fetch(quizPtsApiUrl, {
      method:'POST',
      headers:{'Content-Type':'text/plain'},
      body: JSON.stringify({action:'set', name, pts})
    });
  }catch(e){}
}

/* ===== فتح المنخرطون للمدير فقط ===== */
function openMembersIfAdmin(){
  if(_isAdmin) showModal('membersCard');
  else{
    const n=document.createElement('div');
    n.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:20000;background:rgba(13,17,23,0.97);border:1px solid rgba(229,45,39,0.4);border-radius:18px;padding:24px 28px;text-align:center;font-family:Tajawal,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,0.7);max-width:280px;width:88%;';
    n.innerHTML='<div style="font-size:38px;margin-bottom:10px;">🔒</div><div style="font-size:15px;font-weight:800;color:#f87171;margin-bottom:6px;">قسم خاص بالمدير</div><div style="font-size:12px;color:#8b949e;">هذا القسم متاح للمدير فقط 🛡️</div><div onclick="this.parentElement.remove()" style="margin-top:14px;padding:10px;background:rgba(229,45,39,0.12);border:1px solid rgba(229,45,39,0.3);border-radius:10px;font-size:13px;font-weight:700;color:#f87171;cursor:pointer;">إغلاق</div>';
    document.body.appendChild(n);
    setTimeout(()=>n.remove&&n.remove(),3000);
  }
}

/* ===== نوافذ الأيقونات الجديدة ===== */
/* ███████████████████████████████████████████████████████████████████
   🏛️  وحدة من نحن  —  WhoWeAreModule
   ███████████████████████████████████████████████████████████████████
   📋 هذه الوحدة بسيطة — دالة واحدة فقط + محتوى HTML ثابت:
   ┌─────────────────────────────────────────────────────────────────┐
   │  الفتح             : showWhoWeAreModal()  ← هنا               │
   │  المحتوى (HTML)    : ابحث عن  🏛️ نافذة من نحن  في الملف      │
   └─────────────────────────────────────────────────────────────────┘
   💡 لتعديل النصوص أو الأقسام: ابحث عن  whoWeAreModal  في HTML
   💡 لتغيير الألوان أو الأيقونات: عدّل مباشرة في الـ HTML
   ███████████████████████████████████████████████████████████████████ */
function showWhoWeAreModal(){ showModal('whoWeAreModal'); }
/* ─── نهاية وحدة من نحن (WhoWeAreModule) ────────────────────────── */
function showCityWorldModal(){ showModal('cityWorldModal'); }
function showWatchEarnModal(){ showModal('watchEarnModal'); }

/* ===== بناء الشبكة ===== */
let _lastIsReg = true;
/* ══════════════════════════════════════════════════════
   ⚽ قسم الرياضة
   ══════════════════════════════════════════════════════ */
function openSportsSection(){
  const old = document.getElementById('_sportsSectionOverlay');
  if(old) old.remove();
  const ov = document.createElement('div');
  ov.id = '_sportsSectionOverlay';
  ov.style.cssText = 'position:fixed;inset:0;background:var(--dark);z-index:9000;display:flex;flex-direction:column;animation:fadeIn .2s ease;overflow:hidden;';
  ov.innerHTML = `
    <div style="background:linear-gradient(135deg,#1e9e5e,#43e97b);padding:20px 18px 16px;flex-shrink:0;position:relative;">
      <div onclick="document.getElementById('_sportsSectionOverlay').remove()" style="position:absolute;top:16px;right:16px;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:20px;cursor:pointer;color:white;font-weight:700;">✕</div>
      <div onclick="document.getElementById('_sportsSectionOverlay').remove()" style="position:absolute;top:16px;left:16px;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;color:white;font-weight:700;">‹</div>
      <div style="font-size:36px;margin-bottom:8px;">⚽</div>
      <div style="font-size:20px;font-weight:900;color:white;">الرياضة</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.85);margin-top:4px;">معلومات رياضية وكرة قدم جزائرية</div>
    </div>
    <div style="flex:1;overflow-y:auto;padding:16px;" id="_sportsContent">
      ${_buildSportsContent()}
    </div>`;
  document.body.appendChild(ov);
}

function _buildSportsContent(){
  const cards = [
    { icon:'🇩🇿', title:'المنتخب الوطني الجزائري', desc:'بطل أفريقيا 2019 — أعظم إنجازات الخضر والتاريخ الكروي', color:'linear-gradient(135deg,#0f9b0f,#1a1a2e,#e52d27)', action:"_showSportsCard('algeria')" },
    { icon:'🏆', title:'دوري المحترفين الجزائري', desc:'ليغ برو — أحداث الموسم والترتيب', color:'linear-gradient(135deg,#f5c518,#f97316)', action:"_showSportsCard('ligue')" },
    { icon:'🎯', title:'كرة القدم العالمية', desc:'كأس العالم وأبرز الأحداث الكروية العالمية', color:'linear-gradient(135deg,#4facfe,#00f2fe)', action:"_showSportsCard('world')" },
    { icon:'🏋️', title:'الرياضات الأولمبية', desc:'رياضات الميداليات الجزائرية — ملاكمة، عدو، جودو', color:'linear-gradient(135deg,#f093fb,#f5576c)', action:"_showSportsCard('olympic')" },
    { icon:'💪', title:'نصائح اللياقة البدنية', desc:'تمارين وبرامج لياقة يومية', color:'linear-gradient(135deg,#43e97b,#38f9d7)', action:"_showSportsCard('fitness')" },
    { icon:'🏅', title:'أبطال الجزائر', desc:'أشهر الرياضيين الجزائريين في التاريخ', color:'linear-gradient(135deg,#667eea,#764ba2)', action:"_showSportsCard('champions')" },
  ];
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">` +
    cards.map(c=>`
    <div onclick="${c.action}" style="background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:16px 12px;cursor:pointer;transition:.2s;text-align:center;position:relative;overflow:hidden;" onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform='none'">
      <div style="width:50px;height:50px;border-radius:14px;background:${c.color};display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 10px;box-shadow:0 4px 14px rgba(0,0,0,0.3);">${c.icon}</div>
      <div style="font-size:12px;font-weight:900;color:var(--text);margin-bottom:4px;line-height:1.3;">${c.title}</div>
      <div style="font-size:10px;color:var(--muted);line-height:1.5;">${c.desc}</div>
    </div>`).join('') + `</div>`;
}

function _showSportsCard(type){
  const data = {
    algeria: {
      title:'🇩🇿 المنتخب الجزائري',
      color:'linear-gradient(135deg,#0f9b0f,#1a1a2e,#e52d27)',
      items:[
        { t:'🏆 بطولة أمم أفريقيا 2019', v:'الجزائر بطلة أفريقيا في مصر 2019 بفوز نهائي على السنغال 1-0' },
        { t:'🥇 ألقاب تاريخية', v:'بطولة 1990 بالجزائر — أول لقب قاري. اللقبان جاءا بفارق 29 سنة' },
        { t:'⭐ أفضل اللاعبين', v:'رياض محرز — ليستر سيتي، مانشستر سيتي. سعيد حجاف أفضل لاعب 2019' },
        { t:'🌍 المشاركات الدولية', v:'4 مشاركات في كأس العالم: 1982، 1986، 2010، 2014 — أبطال مونديال 2014 أفضل موسم' },
        { t:'📊 الترتيب الفيفا', v:'الجزائر تتراوح بين المرتبة 30-70 عالمياً وتُصنَّف أفضل منتخب في أفريقيا موسمياً' },
      ]
    },
    ligue: {
      title:'🏆 دوري المحترفين',
      color:'linear-gradient(135deg,#f5c518,#f97316)',
      items:[
        { t:'📋 هيكل الدوري', v:'ليغ برو 1 (16 فريق) + ليغ برو 2 — يلعب كل فريق 30 مباراة موسمياً' },
        { t:'🥇 الأكثر تتويجاً', v:'مولودية الجزائر 9 ألقاب — شبيبة القبائل 8 — اتحاد العاصمة 7 ألقاب' },
        { t:'⚽ أبرز الأندية', v:'مولودية الجزائر، اتحاد العاصمة، شبيبة القبائل، اتحاد بليدة، إيفري' },
        { t:'🏅 كأس الجزائر', v:'منافسة الكأس متوازية مع الدوري — الفائز يشارك في كأس الاتحاد الأفريقي' },
        { t:'🌟 النجوم المحليون', v:'الدوري ينتج مواهب تنتقل لأوروبا كمحرز وبوعناني وبراهيمي' },
      ]
    },
    world: {
      title:'🌍 كرة القدم العالمية',
      color:'linear-gradient(135deg,#4facfe,#00f2fe)',
      items:[
        { t:'🏆 تاريخ كأس العالم', v:'أول مشاركة 1930 — الجزائر أول عربية تفوز في المونديال (1982 ضد ألمانيا 2-1)' },
        { t:'⭐ أفضل الدوريات', v:'الدوري الإسباني، الإنجليزي، الألماني، الفرنسي، الإيطالي — أقوى 5 دوريات في العالم' },
        { t:'🥇 أكثر الأندية تتويجاً', v:'ريال مدريد 14 دوري أبطال — ليفربول 6 — ميلان 7 — بايرن ميونيخ 6' },
        { t:'👑 الأساطير', v:'بيليه، مارادونا، رونالدو الفينومينو، رونالدو، ميسي — أعظم في التاريخ' },
        { t:'🌟 جيل اليوم', v:'ميسي، رونالدو، مبابي، هالاند، فينيسيوس — أبرز نجوم العقد الحالي' },
      ]
    },
    olympic: {
      title:'🏅 الرياضات الأولمبية',
      color:'linear-gradient(135deg,#f093fb,#f5576c)',
      items:[
        { t:'🥊 الملاكمة', v:'الجزائر الأفضل عربياً وأفريقياً في الملاكمة — بطل أولمبي حسيبة بولمرقة وبوعزة' },
        { t:'🏃 الألعاب القوى', v:'نورالدين مورسلي أسطورة 1500م — حسيبة بولمرقة ذهبية 1992 برشلونة' },
        { t:'🥋 الجودو', v:'صورية حداد — بطلة أولمبية 2012 لندن. أفضل رياضية جزائرية في التاريخ' },
        { t:'🎯 الرماية', v:'لمين غازي ونورية ميهوبي — أبرز مشاركات جزائرية في أولمبياد الرماية' },
        { t:'🏊 السباحة', v:'رامي مبارك مقدم — أبرز سباح جزائري في العالمية والأولمبياد' },
      ]
    },
    fitness: {
      title:'💪 برنامج اللياقة',
      color:'linear-gradient(135deg,#43e97b,#38f9d7)',
      items:[
        { t:'🌅 تمرين الصباح (15 دقيقة)', v:'5 قفزات حبل + 20 ضغط + 30 بطن + 15 ثني ركبة + 10 دقائق مشي سريع' },
        { t:'🏋️ يوم القوة', v:'تمارين بدون معدات: بلانك 1 دقيقة × 3 + 4 × 12 ضغطة + 4 × 15 سكوات' },
        { t:'🧘 يوم المرونة', v:'يوغا بسيطة: تمدد الظهر + الكتفين + الساقين — 20 دقيقة تحسّن الأداء 40%' },
        { t:'🥗 التغذية الرياضية', v:'بروتين + كربوهيدرات معقدة + مياه كافية — تجنب السكريات قبل التمرين' },
        { t:'💤 التعافي مهم', v:'8 ساعات نوم + يوم راحة أسبوعي — العضلات تنمو أثناء النوم لا أثناء التمرين' },
      ]
    },
    champions: {
      title:'🏅 أبطال الجزائر',
      color:'linear-gradient(135deg,#667eea,#764ba2)',
      items:[
        { t:'رياض محرز 🌟', v:'أفضل لاعب أفريقي 2016 — بطل بريميرليغ × 5 مع ليستر ومانشستر سيتي' },
        { t:'صورية حداد 🥋', v:'بطلة أولمبية جودو 2012 — أول ذهبية جزائرية وعربية في تاريخ الأولمبياد' },
        { t:'نورالدين مورسلي 🏃', v:'أسطورة 1500م — بطل عالمي وأولمبي وصاحب أرقام قياسية خالدة' },
        { t:'حسيبة بولمرقة 🏅', v:'ذهبية 1992 في 1500م — أشعلت المخيلة الجزائرية للعب القوى' },
        { t:'علي بلقايد 🥊', v:'أسطورة الملاكمة الجزائرية — بطل أفريقيا وأولمبي 1996 في الوزن الخفيف' },
      ]
    }
  };
  const d = data[type];
  if(!d) return;
  const old = document.getElementById('_sportsDetailOverlay');
  if(old) old.remove();
  const ov = document.createElement('div');
  ov.id = '_sportsDetailOverlay';
  ov.style.cssText = 'position:fixed;inset:0;background:var(--dark);z-index:9100;display:flex;flex-direction:column;animation:fadeIn .15s ease;overflow:hidden;';
  ov.innerHTML = `
    <div style="background:${d.color};padding:20px 18px 18px;flex-shrink:0;">
      <div onclick="this.closest('#_sportsDetailOverlay').remove()" style="width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:20px;cursor:pointer;color:white;font-weight:700;margin-bottom:10px;">‹</div>
      <div style="font-size:22px;font-weight:900;color:white;">${d.title}</div>
    </div>
    <div style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;">
      ${d.items.map(it=>`
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:14px;padding:14px 16px;">
        <div style="font-size:13px;font-weight:800;color:var(--accent);margin-bottom:6px;">${it.t}</div>
        <div style="font-size:13px;color:var(--text);line-height:1.7;">${it.v}</div>
      </div>`).join('')}
    </div>`;
  document.body.appendChild(ov);
}

/* ══════════════════════════════════════════════════════
   ⚖️ قسم القانون الجزائري
   ══════════════════════════════════════════════════════ */
function openAlgerianLaw(){
  const old = document.getElementById('_lawSectionOverlay');
  if(old) old.remove();
  const ov = document.createElement('div');
  ov.id = '_lawSectionOverlay';
  ov.style.cssText = 'position:fixed;inset:0;background:var(--dark);z-index:9000;display:flex;flex-direction:column;animation:fadeIn .2s ease;overflow:hidden;';
  ov.innerHTML = `
    <div style="background:linear-gradient(135deg,#0f9b0f,#1a1a2e);padding:20px 18px 16px;flex-shrink:0;position:relative;">
      <div onclick="document.getElementById('_lawSectionOverlay').remove()" style="position:absolute;top:16px;right:16px;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:20px;cursor:pointer;color:white;font-weight:700;">✕</div>
      <div onclick="document.getElementById('_lawSectionOverlay').remove()" style="position:absolute;top:16px;left:16px;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;color:white;font-weight:700;">‹</div>
      <div style="font-size:36px;margin-bottom:8px;">⚖️</div>
      <div style="font-size:20px;font-weight:900;color:white;">القانون الجزائري</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.8);margin-top:4px;">أبرز أحكام القانو
