/* ══════════════════════════════════════════════
   app-messenger.js — المسنجر (SSE + Polling)
   ══════════════════════════════════════════════ */

function renderInboxList(){
  const myName = getCurrentUser();
  const div = document.getElementById('inboxList');

  if(_isAdmin){
    /* ========= المدير: يرى محادثاته مع الأعضاء + قسم مراقبة ========= */
    document.getElementById('inboxTitle').innerText = '💬 رسائل ومحادثات';
    document.getElementById('inboxSub').innerText = 'رسائلك مع الأعضاء ومراقبة المحادثات';

    // إضافة زر محادثة جديدة للمدير أيضاً
    const nb = document.getElementById('newChatBtn');
    if(nb) nb.style.display = 'flex';

    // جمع محادثات المدير مع الأعضاء
    const adminConvs = [];
    const allSpyConvs = [];
    const seenAdminKeys = new Set();

    // جمع مفاتيح localStorage بطريقة موثوقة (تشمل Firebase)
    const _adminAllKeys = new Set();
    try{ for(let i=0;i<localStorage.length;i++){ const _k=localStorage.key(i); if(_k) _adminAllKeys.add(_k); } }catch(e){}
    try{ Object.keys(localStorage).forEach(function(_k){ _adminAllKeys.add(_k); }); }catch(e){}

    for(const k of _adminAllKeys){
      if(k && k.startsWith('nld_p2p_') && !seenAdminKeys.has(k)){
        seenAdminKeys.add(k);
        let msgs; try{ msgs = JSON.parse(localStorage.getItem(k)||'[]'); }catch(e){ msgs=[]; }
        if(msgs.length === 0) continue;
        const last = msgs[msgs.length-1];
        // تحديد ما إذا كانت المحادثة تشمل المدير
        const adminMsg = msgs.find(m => m.from === 'المدير' || m.to === 'المدير');
        if(adminMsg){
          const other = adminMsg.from === 'المدير' ? adminMsg.to : adminMsg.from;
          if(!other) continue;
          const unread = msgs.filter(m=>m.to==='المدير'&&!m.read).length;
          adminConvs.push({other, msgs, last, unread, key:k});
        } else {
          // محادثات بين أعضاء (للمراقبة) — استخراج الاسمين من الرسائل
          const firstMsg = msgs[0];
          if(firstMsg && firstMsg.from && firstMsg.to){
            allSpyConvs.push({a:firstMsg.from, b:firstMsg.to, msgs, last, key:k});
          }
        }
      }
    }

    adminConvs.sort((a,b)=>(b.last?.timestamp||'').localeCompare(a.last?.timestamp||''));
    allSpyConvs.sort((a,b)=>(b.last?.timestamp||'').localeCompare(a.last?.timestamp||''));

    let html = '';

    // قسم محادثات المدير مع الأعضاء
    if(adminConvs.length > 0){
      html += `<div style="padding:8px 14px 4px;font-size:11px;font-weight:800;color:var(--accent);text-transform:uppercase;letter-spacing:1px;">💬 محادثاتك مع الأعضاء</div>`;
      html += adminConvs.map(({other, last, unread})=>{
        const lastText = last ? (last.message||(last.mediaType==='image'?'🖼️ صورة':last.mediaType==='video'?'🎬 فيديو':'🎙️ صوت')) : '';
        const lastTs = last ? new Date(last.timestamp).toLocaleString('ar-DZ',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : '';
        const unreadBadge = unread>0 ? `<span style="min-width:20px;height:20px;border-radius:10px;background:linear-gradient(135deg,#e52d27,#b91c1c);color:white;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;padding:0 5px;">${unread}</span>` : '';
        return `<div onclick="openAdminChat('${other.replace(/'/g,"\'")}',false)" style="display:flex;align-items:center;gap:12px;padding:13px 14px;border-bottom:1px solid rgba(255,255,255,0.05);cursor:pointer;transition:.15s;" onmouseover="this.style.background='rgba(0,120,255,0.05)'" onmouseout="this.style.background='transparent'">
          ${getMemberAvatarHtml(other, 48, 15)}
          <div style="flex:1;min-width:0;">
            <div style="font-size:14px;font-weight:800;color:#1C1E21;margin-bottom:3px;">${other}</div>
            <div style="font-size:12px;color:#65676B;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${lastText}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex-shrink:0;">
            <span style="font-size:10px;color:var(--muted);">${lastTs}</span>
            ${unreadBadge}
          </div>
        </div>`;
      }).join('');
    }

    // قسم مراقبة المحادثات بين الأعضاء
    if(allSpyConvs.length > 0){
      html += `<div style="padding:8px 14px 4px;margin-top:4px;font-size:11px;font-weight:800;color:#f87171;text-transform:uppercase;letter-spacing:1px;">🛡️ مراقبة محادثات الأعضاء</div>`;
      html += `<div style="padding:0 14px 4px;"><div style="background:rgba(229,45,39,0.1);border:1px solid rgba(229,45,39,0.25);border-radius:10px;padding:7px 12px;font-size:11px;color:#f87171;font-weight:700;text-align:center;">👁️ جميع المحادثات الخاصة بين الأعضاء</div></div>`;
      html += allSpyConvs.map(({a, b, msgs, last})=>{
        const iconA = getLeaderIcon(a), iconB = getLeaderIcon(b);
        const lastText = last ? (last.message||(last.mediaType==='image'?'🖼️ صورة':last.mediaType==='video'?'🎬 فيديو':'🎙️ صوت')) : '';
        const lastTs = last ? new Date(last.timestamp).toLocaleString('ar-DZ',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : '';
        const convKey = _p2pKey(a,b);
        return `<div onclick="adminSpyChat('${a.replace(/'/g,"\'")}','${b.replace(/'/g,"\'")}','${convKey}')" style="display:flex;align-items:center;gap:12px;padding:13px 14px;border-bottom:1px solid rgba(255,255,255,0.05);cursor:pointer;transition:.15s;" onmouseover="this.style.background='rgba(0,120,255,0.05)'" onmouseout="this.style.background='transparent'">
          <div style="position:relative;width:48px;height:48px;flex-shrink:0;">
            <div style="position:absolute;top:0;right:0;width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#0099ff,#a855f7);display:flex;align-items:center;justify-content:center;font-size:16px;">${iconA}</div>
            <div style="position:absolute;bottom:0;left:0;width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#059669,#34d399);display:flex;align-items:center;justify-content:center;font-size:12px;border:2px solid var(--dark);">${iconB}</div>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:800;color:var(--text);margin-bottom:2px;">${a} ↔ ${b}</div>
            <div style="font-size:11px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${lastText}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;">
            <span style="font-size:10px;color:var(--muted);">${lastTs}</span>
            <span style="font-size:10px;color:#f87171;background:rgba(229,45,39,0.1);border-radius:6px;padding:1px 6px;">${msgs.length} رسالة</span>
          </div>
        </div>`;
      }).join('');
    }

    if(adminConvs.length === 0 && allSpyConvs.length === 0){
      div.innerHTML=`<div style="text-align:center;margin:40px auto;color:var(--muted);">
        <div style="font-size:48px;margin-bottom:12px;">💬</div>
        <div style="font-weight:700;margin-bottom:6px;">لا توجد محادثات بعد</div>
        <div style="font-size:12px;opacity:0.6;">ستظهر هنا محادثات الأعضاء عند بدئها</div>
      </div>`;
      return;
    }

    div.innerHTML = html;

  } else {
    /* ========= العضو: يرى محادثاته الخاصة مع الأعضاء الآخرين ========= */
    document.getElementById('inboxTitle').innerText = 'المحادثات';
    document.getElementById('inboxSub').innerText = 'رسائلك الخاصة مع الأعضاء';

    // جمع كل محادثات هذا العضو
    const myConvs = [];
    const seenKeys = new Set();
    for(let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i);
      if(k && k.startsWith('nld_p2p_') && !seenKeys.has(k)){
        seenKeys.add(k);
        const msgs = JSON.parse(localStorage.getItem(k)||'[]');
        if(msgs.length === 0) continue;
        // استخراج الطرف الآخر من الرسائل مباشرة (أكثر موثوقية من فك تشفير المفتاح)
        const myMsg = msgs.find(m => m.from === myName || m.to === myName);
        if(!myMsg) continue;
        const other = myMsg.from === myName ? myMsg.to : myMsg.from;
        if(!other || other === myName) continue;
        const last = msgs[msgs.length-1];
        const unread = msgs.filter(m=>m.to===myName&&!m.read).length;
        myConvs.push({other, msgs, last, unread, key:k});
      }
    }

    myConvs.sort((a,b)=>(b.last?.timestamp||'').localeCompare(a.last?.timestamp||''));

    // إخفاء المحادثات مع المحظورين
    const myBlocked = getBlockedList(myName);
    const myConvsFiltered = myConvs.filter(c=>!myBlocked.includes(c.other));

    let totalUnread = myConvsFiltered.reduce((s,c)=>s+c.unread,0);
    if(totalUnread > 0){
      const tb = document.getElementById('totalUnreadBadge');
      if(tb){ tb.style.display='flex'; tb.innerText=totalUnread+' جديد'; }
    }

    if(myConvsFiltered.length === 0){
      div.innerHTML=`<div style="text-align:center;margin:40px auto;color:var(--muted);padding:20px;">
        <div style="font-size:48px;margin-bottom:12px;">💬</div>
        <div style="font-weight:700;margin-bottom:8px;">لا توجد محادثات بعد</div>
        <div style="font-size:12px;opacity:0.6;margin-bottom:20px;">ابدأ محادثة جديدة مع أحد الأعضاء</div>
        <div onclick="showNewChatScreen()" style="display:inline-flex;align-items:center;gap:8px;padding:10px 20px;background:linear-gradient(135deg,#0099ff,#a855f7);border-radius:14px;font-size:13px;font-weight:800;color:white;cursor:pointer;">✏️ محادثة جديدة</div>
      </div>`;
      return;
    }

    div.innerHTML = myConvsFiltered.map(({other, last, unread})=>{
      const icon = getLeaderIcon(other);
      const lastText = last ? (last.message||(last.mediaType==='image'?'🖼️ صورة':last.mediaType==='video'?'🎬 فيديو':'🎙️ صوت')) : '';
      const lastTs = last ? new Date(last.timestamp).toLocaleString('ar-DZ',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : '';
      const unreadBadge = unread>0 ? `<span style="min-width:20px;height:20px;border-radius:10px;background:linear-gradient(135deg,#0099ff,#a855f7);color:white;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;padding:0 5px;">${unread}</span>` : '';
      return `<div onclick="${other==='المدير' ? '_openMemberAdminChat(\'المدير\')' : 'openP2PChat(\''+other.replace(/'/g,"\\'")+'\',false)'}" style="display:flex;align-items:center;gap:12px;padding:13px 14px;border-bottom:1px solid rgba(255,255,255,0.05);cursor:pointer;transition:.15s;" onmouseover="this.style.background='rgba(0,120,255,0.05)'" onmouseout="this.style.background='transparent'">
        <div style="position:relative;flex-shrink:0;">${getMemberAvatarHtml(other, 48, 15)}<span style="position:absolute;bottom:1px;right:1px;width:12px;height:12px;border-radius:50%;background:${_getOnlineStatus(other)==='online'?'#22c55e':_getOnlineStatus(other)==='recent'?'#ef4444':'#374151'};border:2.5px solid var(--dark);box-shadow:0 0 6px ${_getOnlineStatus(other)==='online'?'rgba(34,197,94,0.7)':_getOnlineStatus(other)==='recent'?'rgba(239,68,68,0.5)':'none'};"></span></div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:14px;font-weight:800;color:#1C1E21;margin-bottom:3px;">${other==='المدير'?'🛡️ رسائل المدير':other}</div>
          <div style="font-size:12px;color:#65676B;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${lastText}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex-shrink:0;">
          <span style="font-size:10px;color:var(--muted);">${lastTs}</span>
          ${unreadBadge}
        </div>
      </div>`;
    }).join('');
  }
}

/* ---------------------------------------------------------------
   شاشة اختيار عضو جديد للمحادثة
--------------------------------------------------------------- */
let _memberPickAll = [];

async function showNewChatScreen(){
  const sc = document.getElementById('newChatScreen');
  sc.style.display = 'flex';
  sc.style.flexDirection = 'column';
  document.getElementById('memberSearchInput').value = '';
  document.getElementById('memberPickList').innerHTML = '<div style="text-align:center;padding:30px;color:var(--muted);"><div class="spinner"></div></div>';
  const myName = getCurrentUser();
  const all = await _fetchAllMembers();
  _memberPickAll = all.filter(n=>n.toLowerCase()!==myName.toLowerCase());
  renderMemberPickList(_memberPickAll);
}

function closeNewChatScreen(){
  document.getElementById('newChatScreen').style.display='none';
  // إذا كانت صفحتي مفتوحة، ارجع لتبويب المسنجر فيها
  const socialHome = document.getElementById('socialHomeCard');
  if(socialHome && socialHome.style.display === 'flex'){
    switchSocialTab && switchSocialTab('pages');
  }
}

function filterMemberList(q){
  const filtered = q ? _memberPickAll.filter(n=>n.toLowerCase().includes(q.toLowerCase())) : _memberPickAll;
  renderMemberPickList(filtered);
}

function renderMemberPickList(members){
  const div = document.getElementById('memberPickList');
  if(members.length===0){
    div.innerHTML='<div style="text-align:center;padding:30px;color:var(--muted);font-size:13px;">لا توجد نتائج</div>';
    return;
  }
  div.innerHTML = members.map(n=>{
    return `<div class="member-pick-item" onclick="startNewChat('${n.replace(/'/g,"\'")}')">
      ${getMemberAvatarHtml(n, 44, 13)}
      <div style="flex:1;">
        <div style="font-size:14px;font-weight:800;color:var(--text);">${n}</div>
        <div style="font-size:11px;color:var(--muted);">عضو القادة المستقبليين</div>
      </div>
      <div style="color:var(--accent);font-size:12px;font-weight:700;">محادثة ›</div>
    </div>`;
  }).join('');
}

function startNewChat(targetName){
  closeNewChatScreen();
  if(_isAdmin){
    openAdminChat(targetName, false);
  } else {
    openP2PChat(targetName, false);
  }
}

/* المدير يفتح محادثة مع عضو */
function openAdminChat(targetName, readOnly){
  // تأكد من أن targetName ليس 'المدير' (لا يرسل المدير لنفسه)
  if(!targetName || targetName === 'المدير') {
    console.warn('⚠️ openAdminChat: لا يمكن فتح محادثة المدير مع نفسه');
    showNewChatScreen();
    return;
  }
  _currentChatTarget = targetName;
  _lastPolledMsgId = null; // إعادة تعيين عند فتح محادثة جديدة
  if(typeof window._resetFixedChatPolling === 'function') window._resetFixedChatPolling();
  const cs = document.getElementById('chatScreen');
  cs.style.display = 'flex';
  cs.style.flexDirection = 'column';
  cs.removeAttribute('data-readonly');
  cs.removeAttribute('data-spy-a');
  cs.removeAttribute('data-spy-b');

  // إخفاء زر الثلاث نقاط وميزات المحادثة للمدير
  const dotsBtn = document.getElementById('chatDotsBtn');
  if(dotsBtn) dotsBtn.style.display = 'none';
  const callBtn2 = document.getElementById('callBtn');
  // إخفاء منطقة الإدخال للمدير (الإرسال يتم من أيقونة برمجة التطبيق)
  const inputArea = document.getElementById('chatInputArea');
  if(inputArea) inputArea.style.display = 'none';
  const voiceBar2 = document.getElementById('voiceRecordBar');
  if(voiceBar2) voiceBar2.style.display = 'none';

  // تطبيق السمة المحفوظة (ثابتة لا تتغير)
  if(typeof _applySavedChatTheme==='function') _applySavedChatTheme();

  document.getElementById('chatTitle').innerText = getDisplayName(targetName);
  if(_statusDotEl){
    const _st = _getOnlineStatus(targetName);
    if(_st === 'online') { _statusDotEl.style.color='#22c55e'; _statusDotEl.innerHTML='● متصل الآن'; }
    else if(_st === 'recent') { _statusDotEl.style.color='#ef4444'; _statusDotEl.innerHTML='● وصل مؤخراً'; }
    else { _statusDotEl.style.color='#8b949e'; _statusDotEl.innerHTML='● غير متصل'; }
  }
  const chatAv = document.getElementById('chatAvatar');
  const chatPhoto = getProfilePhoto(targetName);
  if(chatPhoto){
    chatAv.innerHTML = `<img loading="lazy" src="${chatPhoto}" style="width:100%;height:100%;border-radius:13px;object-fit:cover;">`;
    chatAv.style.background = 'transparent';
  } else {
    chatAv.innerHTML = getLeaderIcon(targetName);
    chatAv.style.background = 'linear-gradient(135deg,#e52d27,#fbbf24)';
  }

  // منطقة الإدخال مخفية للمدير (تم إخفاؤها أعلاه)

  const adminMsgDiv = document.getElementById('messagesContent');
  adminMsgDiv.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted);"><div class="spinner"></div></div>';

  /* 🔧 تشغيل SSE+polling فوراً */
  if(typeof window._startFixedChatPolling === 'function') window._startFixedChatPolling();

  _syncAndGetMsgs('المدير', targetName).then(msgs => {
    let changed = false;
    msgs.forEach(m=>{ if(m.to==='المدير' && !m.read){ m.read=true; changed=true; } });
    if(changed){
      _saveP2PMsgs('المدير', targetName, msgs);
      sbMarkRead('المدير', targetName, 'المدير');
    }

    // تحديث زر الحظر
    const blockBtnEl2 = document.getElementById('blockBtn');
    const blockedNoticeEl2 = document.getElementById('blockedNotice');
    if(blockedNoticeEl2) blockedNoticeEl2.remove();
    if(blockBtnEl2){ blockBtnEl2.style.display='flex'; _updateBlockBtnState('المدير', targetName); }
    if(isBlocked('المدير', targetName)) _applyBlockUI('المدير', targetName);

    renderChatBubbles(msgs, adminMsgDiv, 'المدير', false);
  });
}


/* ---------------------------------------------------------------
   فتح محادثة P2P بين العضو وعضو آخر
--------------------------------------------------------------- */
function openP2PChat(targetName, readOnly){
  _currentChatTarget = targetName;
  _lastPolledMsgId = null; // إعادة تعيين عند فتح محادثة جديدة
  if(typeof window._resetFixedChatPolling === 'function') window._resetFixedChatPolling();
  const myName = getCurrentUser();
  const cs = document.getElementById('chatScreen');
  cs.style.display = 'flex';
  cs.style.flexDirection = 'column';

  document.getElementById('chatTitle').innerText = targetName;
  if(typeof _applySavedChatTheme==='function') _applySavedChatTheme();
  // تحديث نقطة الحالة في رأس المحادثة
  const _statusDotEl = document.getElementById('chatStatusDot');
  if(_statusDotEl){
    const _st = _getOnlineStatus(targetName);
    if(_st === 'online') { _statusDotEl.style.color='#22c55e'; _statusDotEl.innerHTML='● متصل الآن'; }
    else if(_st === 'recent') { _statusDotEl.style.color='#ef4444'; _statusDotEl.innerHTML='● وصل مؤخراً'; }
    else { _statusDotEl.style.color='#8b949e'; _statusDotEl.innerHTML='● غير متصل'; }
  }
  const chatAv = document.getElementById('chatAvatar');
  const chatPhoto = getProfilePhoto(targetName);
  if(chatPhoto){
    chatAv.innerHTML = `<img loading="lazy" src="${chatPhoto}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" alt="${targetName}">`;
    chatAv.style.background = 'transparent';
  } else {
    chatAv.innerHTML = getLeaderIcon(targetName);
    chatAv.style.background = 'linear-gradient(135deg,#0099ff,#a855f7)';
  }

  // تحديث حالة وضع القراءة (للمراقبة)
  const inputArea = document.getElementById('chatInputArea');
  const voiceBar = document.getElementById('voiceRecordBar');
  if(readOnly){
    if(inputArea) inputArea.style.display='none';
    if(voiceBar) voiceBar.style.display='none';
    document.getElementById('chatScreen').setAttribute('data-readonly','1');
  } else {
    if(inputArea) inputArea.style.display='flex';
    document.getElementById('chatScreen').removeAttribute('data-readonly');
  }

  // تحديث زر الحظر
  const blockBtnEl = document.getElementById('blockBtn');
  const blockedNoticeEl = document.getElementById('blockedNotice');
  if(blockedNoticeEl) blockedNoticeEl.remove();
  if(readOnly){
    if(blockBtnEl) blockBtnEl.style.display='none';
  } else {
    if(blockBtnEl) blockBtnEl.style.display='flex';
    _updateBlockBtnState(myName, targetName);
    if(isBlocked(myName, targetName)) _applyBlockUI(myName, targetName);
    else {
      const ia = document.getElementById('chatInputArea');
      if(ia) ia.style.display='flex';
    }
  }

  // تحميل الرسائل من Supabase
  const msgDiv = document.getElementById('messagesContent');
  msgDiv.innerHTML = '<div style="text-align:
