/* ══════════════════════════════════════════════
   app-social.js — التفاعل الاجتماعي
   (الإعجابات، التعليقات، المتابعة، التقييم)
   ══════════════════════════════════════════════ */

<script>
(function(){
  'use strict';

  const db = () => firebase.database();

  /* ════════════════════════════════════════════
     ❤️  الإعجاب بمنشور
  ════════════════════════════════════════════ */
  window.toggleLike = async function(postId){
    const user = window.getCurrentUser ? window.getCurrentUser() : localStorage.getItem('sklab_user_name');
    if(!user || user === 'زائر'){
      if(typeof showToast==='function') showToast('⚠️ سجّل دخولك أولاً');
      return;
    }
    const normUser = user.replace(/\s+/g,'_');
    const ref = db().ref('likes/' + postId + '/' + normUser);
    const snap = await ref.once('value');
    if(snap.exists()){
      await ref.remove();
    } else {
      await ref.set({ name: user, ts: Date.now() });
    }
    _updateLikeUI(postId);
  };

  async function _updateLikeUI(postId){
    const snap = await db().ref('likes/' + postId).once('value');
    const count = snap.numChildren();
    const btns = document.querySelectorAll('[data-like-post="' + postId + '"]');
    btns.forEach(btn => {
      const countEl = btn.querySelector('.like-count');
      if(countEl) countEl.textContent = count;
    });
  }

  /* ════════════════════════════════════════════
     💬  التعليقات
  ════════════════════════════════════════════ */
  window.addComment = async function(postId, text){
    if(!text || !text.trim()){
      if(typeof showToast==='function') showToast('⚠️ اكتب تعليقاً');
      return;
    }
    const user = window.getCurrentUser ? window.getCurrentUser() : localStorage.getItem('sklab_user_name');
    if(!user || user === 'زائر'){
      if(typeof showToast==='function') showToast('⚠️ سجّل دخولك أولاً');
      return;
    }
    try {
      await db().ref('comments/' + postId).push({
        author : user,
        text   : text.trim(),
        ts     : Date.now()
      });
      if(typeof showToast==='function') showToast('✅ تم إضافة التعليق');
    } catch(err){
      console.error('Comment error:', err);
      if(typeof showToast==='function') showToast('❌ فشل إضافة التعليق');
    }
  };

  window.loadComments = function(postId, containerId){
    const el = document.getElementById(containerId);
    if(!el) return;
    db().ref('comments/' + postId).orderByChild('ts').on('value', snap => {
      if(!snap.exists()){
        el.innerHTML = '<p style="color:#888;font-size:12px;text-align:center;padding:8px;">لا توجد تعليقات بعد</p>';
        return;
      }
      let html = '';
      snap.forEach(child => {
        const c = child.val();
        const time = new Date(c.ts).toLocaleTimeString('ar', {hour:'2-digit', minute:'2-digit'});
        html += `<div style="padding:8px 10px;border-bottom:1px solid rgba(0,0,0,0.06);">
          <span style="font-weight:700;font-size:13px;color:#1a6bb5;">${c.author}</span>
          <span style="font-size:11px;color:#999;margin-right:6px;">${time}</span>
          <p style="margin:4px 0 0;font-size:13px;color:#333;">${c.text}</p>
        </div>`;
      });
      el.innerHTML = html;
    });
  };

  /* ════════════════════════════════════════════
     👥  المتابعة
  ════════════════════════════════════════════ */
  window.toggleFollow = async function(targetName){
    const user = window.getCurrentUser ? window.getCurrentUser() : localStorage.getItem('sklab_user_name');
    if(!user || user === 'زائر'){
      if(typeof showToast==='function') showToast('⚠️ سجّل دخولك أولاً');
      return;
    }
    if(user === targetName){
      if(typeof showToast==='function') showToast('⚠️ لا يمكنك متابعة نفسك');
      return;
    }
    const normUser   = user.replace(/\s+/g,'_');
    const normTarget = targetName.replace(/\s+/g,'_');
    const ref = db().ref('follows/' + normTarget + '/' + normUser);
    const snap = await ref.once('value');
    if(snap.exists()){
      await ref.remove();
      if(typeof showToast==='function') showToast('✅ تم إلغاء المتابعة');
    } else {
      await ref.set({ name: user, ts: Date.now() });
      if(typeof showToast==='function') showToast('✅ تمت المتابعة');
    }
  };

  window.getFollowersCount = async function(targetName){
    const normTarget = targetName.replace(/\s+/g,'_');
    const snap = await db().ref('follows/' + normTarget).once('value');
    return snap.numChildren();
  };

  /* ════════════════════════════════════════════
     ⭐  التقييم بالنجوم
  ════════════════════════════════════════════ */
  window.rateMember = async function(targetName, stars){
    const user = window.getCurrentUser ? window.getCurrentUser() : localStorage.getItem('sklab_user_name');
    if(!user || user === 'زائر'){
      if(typeof showToast==='function') showToast('⚠️ سجّل دخولك أولاً');
      return;
    }
    if(user === targetName){
      if(typeof showToast==='function') showToast('⚠️ لا يمكنك تقييم نفسك');
      return;
    }
    const normTarget = targetName.replace(/\s+/g,'_');
    const normUser   = user.replace(/\s+/g,'_');
    try {
      await db().ref('ratings/' + normTarget + '/' + normUser).set({
        stars : parseInt(stars) || 5,
        rater : user,
        ts    : Date.now()
      });
      if(typeof showToast==='function') showToast('⭐ تم تقييمك بـ ' + stars + ' نجوم');
      _updateRatingUI(targetName);
    } catch(err){
      console.error('Rating error:', err);
    }
  };

  async function _updateRatingUI(targetName){
    const normTarget = targetName.replace(/\s+/g,'_');
    const snap = await db().ref('ratings/' + normTarget).once('value');
    if(!snap.exists()) return;
    let total = 0, count = 0;
    snap.forEach(c => { total += (c.val().stars || 0); count++; });
    const avg = count ? (total / count).toFixed(1) : '0';
    const els = document.querySelectorAll('[data-rating-member="' + targetName + '"]');
    els.forEach(el => el.textContent = '⭐ ' + avg);
  }

  /* ════════════════════════════════════════════
     📊  جلب إحصائيات عضو من Firebase
  ════════════════════════════════════════════ */
  window.getMemberStats = async function(name){
    const norm = name.replace(/\s+/g,'_');
    const [viewsSnap, followSnap, ratingSnap] = await Promise.all([
      db().ref('userStats/' + norm + '/views').once('value'),
      db().ref('follows/' + norm).once('value'),
      db().ref('ratings/' + norm).once('value')
    ]);
    const views     = viewsSnap.val() || 0;
    const followers = followSnap.numChildren();
    let avgRating   = 0;
    if(ratingSnap.exists()){
      let total = 0, count = 0;
      ratingSnap.forEach(c => { total += (c.val().stars||0); count++; });
      avgRating = count ? (total/count).toFixed(1) : 0;
    }
    return { views, followers, avgRating };
  };

  /* ════════════════════════════════════════════
     👁️  تسجيل مشاهدة ملف شخصي
  ════════════════════════════════════════════ */
  window.recordProfileView = async function(name){
    const norm = name.replace(/\s+/g,'_');
    const ref  = db().ref('userStats/' + norm + '/views');
    const snap = await ref.once('value');
    await ref.set((snap.val() || 0) + 1);
  };

})();
</script>
                                          
