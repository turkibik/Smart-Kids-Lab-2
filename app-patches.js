/* ══════════════════════════════════════════════
   app-patches.js — الإصلاحات النهائية v8.0
   يُحمَّل آخر شيء دائماً
   ══════════════════════════════════════════════ */

<script>
(function(){
  'use strict';

  /* ════════════════════════════════════════════
     🔧  إصلاح 1: التأكد من تهيئة Firebase
  ════════════════════════════════════════════ */
  function _ensureFirebase(){
    try {
      if(typeof firebase === 'undefined') return false;
      if(!firebase.apps || !firebase.apps.length) return false;
      return true;
    } catch(e){ return false; }
  }

  /* ════════════════════════════════════════════
     🔧  إصلاح 2: Toast احتياطي إذا لم يُعرَّف
  ════════════════════════════════════════════ */
  if(typeof window.showToast !== 'function'){
    window.showToast = function(msg){
      const existing = document.getElementById('_patchToast');
      if(existing) existing.remove();
      const t = document.createElement('div');
      t.id = '_patchToast';
      t.textContent = msg;
      t.style.cssText = [
        'position:fixed','bottom:80px','left:50%',
        'transform:translateX(-50%)','z-index:99999',
        'background:rgba(20,20,30,0.92)','color:#fff',
        'padding:10px 22px','border-radius:50px',
        'font-family:Tajawal,sans-serif','font-size:14px',
        'font-weight:700','pointer-events:none',
        'box-shadow:0 4px 20px rgba(0,0,0,0.4)',
        'max-width:85vw','text-align:center',
        'transition:opacity .3s'
      ].join(';');
      document.body.appendChild(t);
      setTimeout(()=>{ t.style.opacity='0'; setTimeout(()=>t.remove(),350); }, 2800);
    };
  }

  /* ════════════════════════════════════════════
     🔧  إصلاح 3: مزامنة المسنجر — polling آمن
  ════════════════════════════════════════════ */
  let _msgPollInterval = null;

  function _startMsgPolling(){
    if(_msgPollInterval) return;
    const user = localStorage.getItem('sklab_user_name');
    if(!user || user === 'زائر' || !_ensureFirebase()) return;

    _msgPollInterval = setInterval(function(){
      _checkNewMessages(user);
    }, 8000);
  }

  function _checkNewMessages(user){
    if(!_ensureFirebase()) return;
    const db    = firebase.database();
    const norm  = user.replace(/\s+/g,'_');
    const since = Date.now() - 30000;

    db.ref('messages').orderByChild('ts').startAt(since)
      .once('value')
      .then(snap => {
        if(!snap.exists()) return;
        let hasNew = false;
        snap.forEach(child => {
          const m = child.val();
          if(m && m.to && m.to.replace(/\s+/g,'_') === norm && !m.read){
            hasNew = true;
            db.ref('messages/' + child.key + '/read').set(true);
          }
        });
        if(hasNew){
          const badge = document.getElementById('msgBadge');
          if(badge){ badge.style.display = 'flex'; }
          if(Notification.permission === 'granted'){
            new Notification('💬 رسالة جديدة', {
              body: 'لديك رسالة جديدة في Connect DZ',
              icon: '/icon-192.png'
            });
          }
        }
      })
      .catch(()=>{});
  }

  /* ════════════════════════════════════════════
     🔧  إصلاح 4: الشعلة — حساب صحيح بـ normName
  ════════════════════════════════════════════ */
  window._patchStreakForUser = async function(userName){
    if(!userName || !_ensureFirebase()) return;
    const db       = firebase.database();
    const normName = userName.trim().replace(/\s+/g,'_');
    const today    = new Date().toISOString().split('T')[0];

    const snap = await db.ref('streaks/' + normName).once('value');
    const data  = snap.val() || {};
    const last  = data.lastDate || '';
    let streak  = data.streak   || 0;

    if(last === today) return streak;

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    streak = (last === yesterday) ? streak + 1 : 1;

    await db.ref('streaks/' + normName).set({ streak, lastDate: today });

    const streakEls = document.querySelectorAll('.user-streak-count');
    streakEls.forEach(el => el.textContent = streak);
    return streak;
  };

  /* ════════════════════════════════════════════
     🔧  إصلاح 5: عزل صور الملفات الشخصية
  ════════════════════════════════════════════ */
  window._getUserPhoto = function(userName){
    if(!userName) return null;
    const key = 'sklab_photo_' + userName.replace(/\s+/g,'_');
    return localStorage.getItem(key) || localStorage.getItem('sklab_user_photo') || null;
  };

  window._setUserPhoto = function(userName, photoUrl){
    if(!userName || !photoUrl) return;
    const key = 'sklab_photo_' + userName.replace(/\s+/g,'_');
    localStorage.setItem(key, photoUrl);
    if(userName === localStorage.getItem('sklab_user_name')){
      localStorage.setItem('sklab_user_photo', photoUrl);
    }
  };

  /* ════════════════════════════════════════════
     🔧  إصلاح 6: نقاط الملف الشخصي من Firebase
  ════════════════════════════════════════════ */
  window._fetchUserPoints = async function(userName){
    if(!userName || !_ensureFirebase()) return 0;
    const db   = firebase.database();
    const norm = userName.replace(/\s+/g,'_');
    const snap = await db.ref('users/' + norm + '/points').once('value');
    return snap.val() || 0;
  };

  /* ════════════════════════════════════════════
     🔧  إصلاح 7: تقييم النجوم — منفصل لكل عضو
  ════════════════════════════════════════════ */
  window._getMyRatingForMember = async function(targetName){
    if(!_ensureFirebase()) return 0;
    const user = localStorage.getItem('sklab_user_name');
    if(!user || user === 'زائر') return 0;
    const db         = firebase.database();
    const normTarget = targetName.replace(/\s+/g,'_');
    const normUser   = user.replace(/\s+/g,'_');
    const snap = await db.ref('ratings/' + normTarget + '/' + normUser).once('value');
    return snap.exists() ? (snap.val().stars || 0) : 0;
  };

  /* ════════════════════════════════════════════
     🔧  إصلاح 8: منع تكرار التهيئة
  ════════════════════════════════════════════ */
  if(!window._patchesApplied){
    window._patchesApplied = true;

    /* تشغيل polling بعد تسجيل الدخول */
    window.addEventListener('userLoggedIn', function(e){
      setTimeout(_startMsgPolling, 2000);
      if(e.detail && e.detail.name){
        window._patchStreakForUser(e.detail.name);
      }
    });

    /* تشغيل polling إذا كان المستخدم مسجلاً أصلاً */
    window.addEventListener('DOMContentLoaded', function(){
      setTimeout(function(){
        const u = localStorage.getItem('sklab_user_name');
        if(u && u !== 'زائر'){
          _startMsgPolling();
          window._patchStreakForUser(u);
        }
      }, 3000);
    });
  }

  console.log('✅ app-patches.js — جميع الإصلاحات مُطبَّقة');

})();
</script>

