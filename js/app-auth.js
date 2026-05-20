/* ══════════════════════════════════════════════
   app-auth.js — تسجيل الدخول والتسجيل
   ══════════════════════════════════════════════ */

<script>
(function(){
  'use strict';

  /* ════════════════════════════════════════════
     🔑  مفاتيح localStorage
  ════════════════════════════════════════════ */
  const USER_KEY   = 'sklab_user_name';
  const ROLE_KEY   = 'sklab_user_role';
  const PHOTO_KEY  = 'sklab_user_photo';
  const ADMIN_PASS = 'cdz2024admin';

  /* ════════════════════════════════════════════
     🚀  تهيئة عند التحميل
  ════════════════════════════════════════════ */
  window.addEventListener('DOMContentLoaded', function(){
    const saved = localStorage.getItem(USER_KEY);
    if(saved && saved !== 'زائر'){
      _applyLogin(saved, localStorage.getItem(ROLE_KEY)||'member');
    }
  });

  /* ════════════════════════════════════════════
     🔓  تسجيل الدخول
  ════════════════════════════════════════════ */
  window.loginUser = function(name, pass){
    if(!name || !name.trim()){
      if(typeof showToast==='function') showToast('⚠️ أدخل اسمك');
      return;
    }
    const role = (pass && pass.trim() === ADMIN_PASS) ? 'admin' : 'member';
    localStorage.setItem(USER_KEY,  name.trim());
    localStorage.setItem(ROLE_KEY,  role);
    _applyLogin(name.trim(), role);
    if(typeof showToast==='function') showToast('✅ مرحباً ' + name.trim());
  };

  /* ════════════════════════════════════════════
     🚪  تسجيل الخروج
  ════════════════════════════════════════════ */
  window.logoutUser = function(){
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(PHOTO_KEY);
    location.reload();
  };

  /* ════════════════════════════════════════════
     👤  تطبيق حالة تسجيل الدخول على الواجهة
  ════════════════════════════════════════════ */
  function _applyLogin(name, role){
    /* إخفاء شاشة الدخول */
    const loginCard = document.getElementById('loginCard');
    if(loginCard) loginCard.style.display = 'none';

    /* إظهار الواجهة الرئيسية */
    const mainApp = document.getElementById('mainApp');
    if(mainApp) mainApp.style.display = 'block';

    /* تعيين اسم المستخدم في الواجهة */
    const nameEls = document.querySelectorAll('.current-user-name');
    nameEls.forEach(el => el.textContent = name);

    /* حالة المدير */
    window._isAdmin = (role === 'admin');
    document.body.classList.toggle('admin-mode', window._isAdmin);

    /* حفظ عالمي */
    window._currentUser = name;
    window._currentRole = role;

    /* إطلاق حدث */
    window.dispatchEvent(new CustomEvent('userLoggedIn', { detail:{ name, role } }));
  }

  /* ════════════════════════════════════════════
     📝  فتح نموذج التسجيل
  ════════════════════════════════════════════ */
  window.openFbRegister = function(){
    const regCard = document.getElementById('registerCard');
    if(regCard) regCard.style.display = 'flex';
  };

  window.closeFbRegister = function(){
    const regCard = document.getElementById('registerCard');
    if(regCard) regCard.style.display = 'none';
  };

  /* ════════════════════════════════════════════
     ✅  تسجيل عضو جديد عبر Firebase
  ════════════════════════════════════════════ */
  window.registerNewUser = async function(formData){
    if(!formData || !formData.name){
      if(typeof showToast==='function') showToast('⚠️ أدخل اسمك الكامل');
      return;
    }
    try {
      const db = firebase.database();
      const normName = formData.name.trim().replace(/\s+/g,'_');
      await db.ref('users/' + normName).set({
        name      : formData.name.trim(),
        phone     : formData.phone  || '',
        birthdate : formData.birth  || '',
        joinDate  : new Date().toISOString().split('T')[0],
        role      : 'member',
        points    : 0
      });
      localStorage.setItem(USER_KEY, formData.name.trim());
      localStorage.setItem(ROLE_KEY, 'member');
      _applyLogin(formData.name.trim(), 'member');
      if(typeof showToast==='function') showToast('🎉 تم التسجيل بنجاح!');
      window.closeFbRegister();
    } catch(err){
      console.error('Register error:', err);
      if(typeof showToast==='function') showToast('❌ فشل التسجيل، حاول مجدداً');
    }
  };

  /* ════════════════════════════════════════════
     🔍  التحقق من حالة تسجيل الدخول
  ════════════════════════════════════════════ */
  window.isLoggedIn = function(){
    const u = localStorage.getItem(USER_KEY);
    return !!(u && u !== 'زائر');
  };

  window.getCurrentUser = function(){
    return localStorage.getItem(USER_KEY) || 'زائر';
  };

  window.getCurrentRole = function(){
    return localStorage.getItem(ROLE_KEY) || 'member';
  };

})();
</script>

