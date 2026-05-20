/* ══════════════════════════════════════════════
   app-feed.js — المنشورات + القصص + الفيد
   ══════════════════════════════════════════════ */

function getSocialPosts(){ return JSON.parse(localStorage.getItem(_socialPostsKey)||'[]'); }
function saveSocialPosts(arr){
  /* ── حاول الحفظ مباشرة أولاً ── */
  try {
    localStorage.setItem(_socialPostsKey, JSON.stringify(arr));
  } catch(e) {
    /* localStorage ممتلئ — الآن فقط نحذف القديم */
    console.warn('localStorage ممتلئ! جارٍ تنظيف المنشورات القديمة...');
    /* احذف الأقدم من 30 يوم */
    var cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000);
    arr = arr.filter(function(p){ return (p.ts||0) >= cutoff; });
    /* إذا لا يزال كثيراً احذف حتى يبقى 200 */
    if(arr.length > 200){
      arr = arr.slice().sort(function(a,b){ return (b.ts||0)-(a.ts||0); }).slice(0, 200);
    }
    try {
      localStorage.setItem(_socialPostsKey, JSON.stringify(arr));
      if(typeof showToast==='function') showToast('🧹 تم تنظيف المنشورات القديمة تلقائياً');
    } catch(e2) {
      console.error('فشل الحفظ حتى بعد التنظيف:', e2);
    }
  }
}
function getFriends(name){ return JSON.parse(localStorage.getItem(_friendsKey(name))||'[]'); }
function getFriendRequests(name){ return JSON.parse(localStorage.getItem(_friendReqKey(name))||'[]'); }
function getSocialNotifs(name){ return JSON.parse(localStorage.getItem(_socialNotifsKey(name))||'[]'); }
function addSocialNotif(toUser, msg, icon){
  if(!toUser) return;
  const notifs = getSocialNotifs(toUser);
  notifs.unshift({ msg, icon: icon||'🔔', ts: Date.now() });
  if(notifs.length>50) notifs.splice(50);
  localStorage.setItem(_socialNotifsKey(toUser), JSON.stringify(notifs));
  // تحديث الشارة إذا كان صاحب الملف مفتوحاً
  const curUser = getCurrentUser();
  if(toUser === curUser) refreshSocialNotifBadge();
}
function refreshSocialNotifBadge(){
  const name = getCurrentUser();
  if(!name) return;
  const notifs = getSocialNotifs(name);
  const badge = document.getElementById('socialNotifBadge');
  if(!badge) return;
  const unseen = notifs.filter(n=>!n.seen).length;
  if(unseen>0){
    badge.style.display='flex';
    badge.innerText = unseen > 9 ? '9+' : String(unseen);
  } else {
    badge.style.display='none';
  }
}

/* ─── فتح / إغلاق الصفحة الاجتماعية ─── */
/* showSocialHome الكاملة معرّفة لاحقاً (تشمل badge المسنجر والقصص) */

function hideSocialHome(){
  const el = document.getElementById('socialHomeCard');
  if(el){
    // نحفظ علامة أن صفحتي كانت مفتوحة عند الانتقال للمحادثة
    window._messagesOpenedFromSocial = true;
    el.style.display='none';
  }
}

function syncSocialAvatar(name){
  if(!name) return;
  const photo = typeof getProfilePhoto === 'function' ? getProfilePhoto(name) : null;
  // تحديث أفاتار إنشاء المنشور (داخل حلقة القصة)
  const socialPostAvatar = document.getElementById('socialPostAvatar');
  if(socialPostAvatar){
    if(photo){ socialPostAvatar.innerHTML=`<img loading="lazy" src="${photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`; }
    else{ socialPostAvatar.innerHTML = (typeof getLeaderIcon==='function'?getLeaderIcon(name):'👑'); }
  }
  ['scpAvatar'].forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    if(photo){ el.innerHTML=`<img loading="lazy" src="${photo}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`; }
    else{ el.innerHTML = (typeof getLeaderIcon==='function'?getLeaderIcon(name):'👑'); }
  });
  // تحديث حلقة القصة
  const ring = document.getElementById('myStoryRing');
  if(ring){
    const stories = getMyStories ? getMyStories(name).filter(s=>Date.now()<s.expires) : [];
    ring.className = stories.length > 0 ? 'story-ring' : 'story-ring no-story';
  }
}

/* ─── التنقل بين تبويبات الصفحة الاجتماعية ─── */
const _socialTabs = ['home','friends','notifs','pages','myprofile'];

/* ══════════════════════════════════════════
   👥 لوحة الأعضاء المنخرطون
   ══════════════════════════════════════════ */
let _membersCache = [];
function renderMembersPanel(){
  const list = document.getElementById('membersPanelList');
  const label = document.getElementById('membersCountLabel');
  if(!list) return;
  list.innerHTML = `<div style="text-align:center;padding:20px;"><div style="font-size:24px;margin-bottom:6px;">⏳</div><div style="font-size:13px;color:#65676B;">جاري تحميل الأعضاء…</div></div>`;

  // جلب الأعضاء من مصدر البيانات الرئيسي
  _fetchAllMembers().then(names => {
    // بناء قائمة الأعضاء مع نقاطهم من localStorage
    const members = names.map(name => {
      const raw = localStorage.getItem('sklab_pts_' + name.replace(/\s+/g,'_'));
      const pts = raw ? (JSON.parse(raw).total || 0) : 0;
      const levelData = typeof getLevel === 'function' ? getLevel(pts) : { level: 1 };
      return { name, points: pts, level: levelData.level || 1 };
    });
    // ترتيب حسب النقاط تنازلياً
    members.sort((a,b) => b.points - a.points);
    _membersCache = members;
    if(label) label.innerText = `${members.length} عضو منخرط`;
    renderMembersPanelList(members);
  }).catch(() => {
    // fallback: من localStorage العادي
    try {
      const raw = localStorage.getItem('sklab_members');
      const members = raw ? JSON.parse(raw).map(m=>({ name: m.name||m.fullName||m.email||'عضو', points: m.points||0, level: m.level||1 })) : [];
      _membersCache = members;
      if(label) label.innerText = `${members.length} عضو منخرط`;
      renderMembersPanelList(members);
    } catch(e){
      if(list) list.innerHTML = `<div style="text-align:center;padding:20px;font-size:13px;color:#65676B;">تعذر تحميل بيانات الأعضاء</div>`;
    }
  });
}

function renderMembersPanelList(members){
  const list = document.getElementById('membersPanelList');
  if(!list) return;
  if(!members || members.length===0){
    list.innerHTML = `<div style="text-align:center;padding:40px 20px;"><div style="font-size:48px;margin-bottom:10px;">👥</div><div style="font-size:14px;font-weight:700;color:#65676B;">لا يوجد أعضاء منخرطون بعد</div></div>`;
    return;
  }
  const curUser = getCurrentUser();
  list.innerHTML = members.map((m,i)=>{
    const name = m.name || m.fullName || m.email || 'عضو';
    const photo = typeof getProfilePhoto==='function' ? getProfilePhoto(name) : null;
    const icon = typeof getLeaderIcon==='function' ? getLeaderIcon(name) : '👤';
    const pts = m.points || 0;
    const level = m.level || 1;
    const avatarHtml = photo
      ? `<img loading="lazy" src="${photo}" style="width:46px;height:46px;border-radius:50%;object-fit:cover;">`
      : `<div style="width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,#1877F2,#00c853);display:flex;align-items:center;justify-content:center;font-size:20px;">${icon}</div>`;
    const isOnline = typeof _onlinePresenceKey==='function' || false;
    return `<div onclick="viewMemberProfile('${name}')" style="display:flex;align-items:center;gap:12px;background:white;padding:12px 14px;border-radius:14px;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,0.06);transition:.15s;" onmouseover="this.style.background='#F7F8FA'" onmouseout="this.style.background='white'">
      <div style="position:relative;flex-shrink:0;">${avatarHtml}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:14px;font-weight:900;color:#050505;margin-bottom:2px;">${name}${typeof getAdminVerifiedBadgeHtml==='function'?getAdminVerifiedBadgeHtml(name):''}${name===curUser?'  <span style="font-size:10px;background:#E8F4FD;color:#1877F2;border-radius:6px;padding:1px 6px;font-weight:700;">أنت</span>':''}</div>
        <div style="font-size:11px;color:#65676B;">⭐ ${pts} نقطة  •  المستوى ${level}</div>
      </div>
      <div style="font-size:18px;color:#BCC0C4;">›</div>
    </div>`;
  }).join('');
}

function filterMembersPanel(q){
  const filtered = q.trim()==='' ? _membersCache : _membersCache.filter(m=>{
    const name = (m.name||m.fullName||m.email||'').toLowerCase();
    return name.includes(q.toLowerCase());
  });
  renderMembersPanelList(filtered);
}

/* ══════════════════════════════════════════
   🔔 لوحة الإشعارات داخل الصفحة
   ══════════════════════════════════════════ */
function renderNotifsPanel(){
  const el = document.getElementById('socialNotifsInlineList');
  if(!el) return;
  const name = getCurrentUser();
  if(!name){ el.innerHTML=`<div style="text-align:center;padding:30px;font-size:13px;color:#65676B;">سجّل دخولك أولاً</div>`; return; }
  const notifs = getSocialNotifs(name);
  if(notifs.length===0){
    el.innerHTML=`<div style="text-align:center;padding:40px 20px;"><div style="font-size:48px;margin-bottom:10px;">🔔</div><div style="font-size:13px;color:#65676B;">لا توجد إشعارات</div></div>`;
  } else {
    el.innerHTML = notifs.map(n=>`
      <div style="display:flex;align-items:flex-start;gap:12px;background:white;padding:14px;border-radius:14px;margin-bottom:8px;box-shadow:0 1px 4px rgba(0,0,0,0.05);${!n.seen?'border-right:3px solid #1877F2;':''}">
        <div style="width:42px;height:42px;border-radius:50%;background:#F0F2F5;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">${n.icon||'🔔'}</div>
        <div style="flex:1;">
          <div style="font-size:13px;color:#050505;line-height:1.5;font-weight:${n.seen?'600':'800'};">${n.msg}</div>
          <div style="font-size:11px;color:#65676B;margin-top:4px;">${new Date(n.ts).toLocaleDateString('ar-DZ',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})}</div>
        </div>
      </div>`).join('');
  }
  // تعيين علامة "تمت القراءة"
  notifs.forEach(n=>n.seen=true);
  localStorage.setItem(_socialNotifsKey(name), JSON.stringify(notifs));
  refreshSocialNotifBadge();
}

/* ══════════════════════════════════════════
   📰 الفيد الاجتماعي (كل المنشورات)
   ══════════════════════════════════════════ */
function renderSocialFeed(){
  const container = document.getElementById('socialFeedContainer');
  if(!container) return;
  const allPosts = getSocialPosts();
  const myName = getCurrentUser();
  const myFriends = myName ? getFriends(myName) : [];
  // ✅ تصفية المنشورات حسب الخصوصية
  const posts = myName
    ? allPosts.filter(p => {
        if(p.isActivityAd) return true; // إعلانات تظهر للجميع
        const priv = p.privacy || '🌐 عام';
        if(priv.includes('أنت فقط')) return p.author === myName; // خاص
        if(priv.includes('الأصدقاء')) return p.author === myName || myFriends.includes(p.author); // أصدقاء
        // عام: اعرض فقط منشورات المستخدم وأصدقائه
        return p.author === myName || myFriends.includes(p.author);
      })
    : allPosts.filter(p => !p.privacy || p.privacy.includes('عام'));
  if(posts.length===0){
    container.innerHTML=`<div style="background:white;padding:32px 20px;text-align:center;margin-bottom:8px;"><div style="font-size:48px;margin-bottom:10px;">✍️</div><div style="font-size:14px;font-weight:700;color:#65676B;">لا توجد منشورات بعد. أضف أصدقاء لترى منشوراتهم!</div></div>`;
    return;
  }
  // الإعلانات أولاً ثم المنشورات العادية
  const adPosts    = posts.filter(p=>p.isActivityAd).slice().reverse();
  const normalPosts= posts.filter(p=>!p.isActivityAd).slice().reverse();
  container.innerHTML = [...adPosts, ...normalPosts].map(p => renderSocialPostCard(p)).join('');
}

function renderSocialPostCard(p){
  const name = getCurrentUser();
  const isAd = !!p.isActivityAd;

  // أفاتار الناشر
  const photo = !isAd && typeof getProfilePhoto==='function' ? getProfilePhoto(p.author) : null;
  const avatarHtml = isAd
    ? `<div style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#FF9500,#FF3B30);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">🏅</div>`
    : (photo
        ? `<img loading="lazy" src="${photo}" style="width:42px;height:42px;border-radius:50%;object-fit:cover;cursor:pointer;" onclick="viewMemberProfile('${p.author}')">`
        : `<div onclick="viewMemberProfile('${p.author}')" style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#1877F2,#00c853);display:flex;align-items:center;justify-content:center;font-size:19px;cursor:pointer;">${typeof getLeaderIcon==='function'?getLeaderIcon(p.author):'👑'}</div>`);

  const reactions = p.reactions || {};
  const allReactors = Object.values(reactions).flat();
  const totalReacts = allReactors.length;
  const myReact = Object.keys(reactions).find(r=> (reactions[r]||[]).includes(name));
  const reactEmojis = ['👍','❤️','😂','😮','😢','😡'];

  const comments = p.comments || [];
  const isOwner = p.author === name;

  // شريط الإعلان المميز (فقط للنشاطات)
  const adBanner = isAd ? `<div style="background:linear-gradient(135deg,#FF9500,#FF3B30);padding:6px 14px;display:flex;align-items:center;gap:6px;">
    <span style="font-size:13px;color:white;font-weight:900;">📣 إعلان ورشة • Connect DZ</span>
    <span style="margin-right:auto;background:rgba(255,255,255,0.25);color:white;font-size:10px;font-weight:800;border-radius:6px;padding:2px 7px;">مُعلَن</span>
  </div>` : '';

  return `<div id="spost_${p.id}" style="background:white;margin-bottom:8px;box-shadow:${isAd?'0 2px 12px rgba(255,149,0,0.18)':'0 1px 3px rgba(0,0,0,0.05)'};${isAd?'border:1.5px solid rgba(255,149,0,0.35);border-radius:16px;overflow:hidden;':''}">
    ${adBanner}
    <div style="padding:12px 14px 8px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        ${avatarHtml}
        <div style="flex:1;">
          <div style="font-size:14px;font-weight:900;color:#050505;cursor:${isAd?'default':'pointer'};" ${isAd?'':` onclick="viewMemberProfile('${p.author}')"`}>${p.author}${!isAd && typeof getAdminVerifiedBadgeHtml==='function' ? getAdminVerifiedBadgeHtml(p.author) : ''}</div>
          <div style="font-size:11px;color:#65676B;">${p.date} • ${isAd?'📢 إعلان':(p.privacy||'🌐 عام')}</div>
        </div>
        ${!isAd ? `<div style="position:relative;">
          <div onclick="togglePostMenu('${p.id}')" style="width:32px;height:32px;border-radius:50%;background:#F0F2F5;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:18px;font-weight:900;color:#65676B;letter-spacing:1px;transition:.15s;" onmouseover="this.style.background='#E4E6EB'" onmouseout="this.style.background='#F0F2F5'">⋮</div>
          <div id="postMenu_${p.id}" style="display:none;position:absolute;top:36px;left:0;background:white;border-radius:14px;box-shadow:0 8px 28px rgba(0,0,0,0.18);z-index:300;min-width:200px;overflow:hidden;border:1px solid #E4E6EB;animation:fadeIn .15s ease;">
            ${isOwner ? `
            <div onclick="editSocialPost('${p.id}');closeAllPostMenus()" style="display:flex;align-items:center;gap:10px;padding:12px 16px;cursor:pointer;font-size:13px;font-weight:700;color:#050505;transition:.15s;" onmouseover="this.style.background='#F0F2F5'" onmouseout="this.style.background='transparent'">
              <span style="font-size:18px;">✏️</span> تعديل المنشور
            </div>
            <div style="height:1px;background:#F0F2F5;margin:0 12px;"></div>
            <div onclick="changePostPrivacy('${p.id}');closeAllPostMenus()" style="display:flex;align-items:center;gap:10px;padding:12px 16px;cursor:pointer;font-size:13px;font-weight:700;color:#050505;transition:.15s;" onmouseover="this.style.background='#F0F2F5'" onmouseout="this.style.background='transparent'">
              <span style="font-size:18px;">🔒</span> تعديل خصوصية المنشور
            </div>
            <div style="height:1px;background:#F0F2F5;margin:0 12px;"></div>
            <div onclick="copyPostLink('${p.id}');closeAllPostMenus()" style="display:flex;align-items:center;gap:10px;padding:12px 16px;cursor:pointer;font-size:13px;font-weight:700;color:#050505;transition:.15s;" onmouseover="this.style.background='#F0F2F5'" onmouseout="this.style.background='transparent'">
              <span style="font-size:18px;">🔗</span> نسخ رابط المنشور
            </div>
            <div style="height:1px;background:#F0F2F5;margin:0 12px;"></div>
            <div onclick="deleteSocialPost('${p.id}');closeAllPostMenus()" style="display:flex;align-items:center;gap:10px;padding:12px 16px;cursor:pointer;font-size:13px;font-weight:700;color:#e53935;transition:.15s;" onmouseover="this.style.background='#FFF0F0'" onmouseout="this.style.background='transparent'">
              <span style="font-size:18px;">🗑️</span> حذف المنشور
            </div>` : `
            <div onclick="copyPostLink('${p.id}');closeAllPostMenus()" style="display:flex;align-items:center;gap:10px;padding:12px 16px;cursor:pointer;font-size:13px;font-weight:700;color:#050505;transition:.15s;" onmouseover="this.style.background='#F0F2F5'" onmouseout="this.style.background='transparent'">
              <span style="font-size:18px;">🔗</span> نسخ رابط المنشور
            </div>`}
          </div>
        </div>` : ''}
      </div>
      ${p.feeling ? `<div style="background:linear-gradient(135deg,#F7B928,#F3425F);border-radius:8px;padding:4px 10px;font-size:12px;font-weight:700;color:white;display:inline-flex;align-items:center;gap:5px;margin-bottom:8px;">${p.feeling}</div>` : ''}
      ${p.text ? `<div style="font-size:14px;color:#050505;line-height:1.6;margin-bottom:${p.image||p.video?'10px':'0'};text-align:right;white-space:pre-wrap;">${p.text}</div>` : ''}
      ${p.image ? `<div style="border-radius:12px;overflow:hidden;margin:8px -14px 0;background:#f0f2f5;min-height:60px;"><img src="${p.image}" loading="lazy" style="width:100%;max-height:420px;object-fit:cover;display:block;opacity:0;transition:opacity .35s ease;" onload="this.style.opacity=1" onerror="this.parentElement.style.display='none'"></div>` : ''}
      ${p.video ? `<div style="border-radius:12px;overflow:hidden;margin:8px -14px 0;background:#000;"><video src="${p.video}" controls playsinline preload="metadata" style="width:100%;max-height:400px;display:block;object-fit:contain;" onplay="document.querySelectorAll('video').forEach(v=>{if(v!==this&&!v.paused)v.pause();})"></video></div>` : ''}
    </div>

    <!-- إحصائيات التفاعل -->
    ${totalReacts>0 || comments.length>0 ? `<div style="padding:6px 14px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #F0F2F5;">
      <div style="font-size:12px;color:#65676B;">${totalReacts>0?`<span>${getTopReactEmojis(reactions)} ${totalReacts}</span>`:''}${totalReacts>0&&comments.length>0?' · ':''} ${comments.length>0?`${comments.length} تعليق`:''}</div>
    </div>` : ''}

    <!-- أزرار التفاعل -->
    <div style="display:flex;border-top:1px solid #E4E6EB;padding:2px 4px;">
      <div style="position:relative;flex:1;">
        <div id="likeBtn_${p.id}" onmousedown="${myReact?'':'_startReactTimer(\''+p.id+'\')'}" onmouseup="${myReact?'':'_cancelReactTimer()'}" ontouchstart="${myReact?'':'_startReactTimer(\''+p.id+'\')'}" ontouchend="${myReact?'':'_cancelReactTimer()'}" onclick="${myReact?'':'_handleLikeClick(\''+p.id+'\')'}" style="display:flex;align-items:center;justify-content:center;gap:5px;padding:8px 4px;border-radius:8px;cursor:${myReact?'default':'pointer'};font-size:13px;font-weight:700;color:${myReact?'#1877F2':'#65676B'};transition:.15s;user-select:none;-webkit-user-select:none;" ${myReact?'':'onmouseover="this.style.background=\'#F0F2F5\'" onmouseout="this.style.background=\'transparent\'"'}>
          ${myReact||'👍'} ${myReact?'معجب':'إعجاب'}
        </div>
        <div id="reactPicker_${p.id}" style="display:none;position:absolute;bottom:48px;left:50%;transform:translateX(-50%);background:white;border-radius:30px;padding:8px 12px;box-shadow:0 4px 20px rgba(0,0,0,0.25);gap:8px;z-index:200;border:1px solid #E4E6EB;white-space:nowrap;flex-direction:row;animation:reactPickerIn .2s ease;">
          ${reactEmojis.map(e=>`<span onclick="addReaction('${p.id}','${e}')" style="font-size:28px;cursor:pointer;transition:.15s;display:inline-block;" onmouseover="this.style.transform='scale(1.35) translateY(-4px)'" onmouseout="this.style.transf
