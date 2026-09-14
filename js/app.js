/* ═══════════════════════════════════════════════
   APP — راه‌انداز اصلی (v5.0 — full auto-refresh)
   ساخته شده توسط رضا آدینه
   ═══════════════════════════════════════════════ */
(function(){
'use strict';

var BOTTOM_NAV_MODULES = {
  'dashboard':  { icon: '📊', label: 'داشبورد' },
  'daily':      { icon: '📅', label: 'روزانه' },
  'flocks':     { icon: '🐔', label: 'گله‌ها' },
  'finance':    { icon: '💰', label: 'مالی' },
  'sales':      { icon: '🏷️', label: 'فروش' },
  'inventory':  { icon: '📦', label: 'انبار' },
  'medicine':   { icon: '💊', label: 'دارو' },
  'incubation': { icon: '🥚', label: 'جوجه‌کشی' },
  'feed':       { icon: '🌾', label: 'خوراک' },
  'contacts':   { icon: '👥', label: 'پرونده' },
  'reports':    { icon: '📊', label: 'گزارش' },
  'more':       { icon: '☰', label: 'بیشتر' }
};

var FIXED_LAST = 'more';
var MAX_SELECTABLE = 5;
var DEFAULT_SELECTED = ['dashboard', 'daily', 'flocks', 'finance', 'sales'];

var _lastNavSignature = '';
var _lastTheme = '';
var _lastFont = '';
var _lastFontSize = 0;

function showFatal(title, msg, err){
  console.error('💥 FATAL:', title, msg, err || '');
  var el = document.getElementById('errorOv');
  if(el){
    var t = document.getElementById('errTitle');
    var m = document.getElementById('errMsg');
    if(t) t.textContent = title;
    if(m) m.textContent = msg + (err ? ('\n\n' + (err.message || err)) : '');
    el.classList.add('on');
  } else {
    alert(title + '\n\n' + msg);
  }
}

function hideSplash(){
  var s = document.getElementById('appSplash');
  if(s && !s.classList.contains('off')){
    s.classList.add('off');
    setTimeout(function(){ try{ s.remove(); }catch(e){} }, 400);
  }
}

function checkDependencies(){
  var missing = [];
  if(typeof Store === 'undefined'){ missing.push('store.js'); }
  if(typeof UI === 'undefined'){ missing.push('ui.js'); }
  if(typeof Router === 'undefined'){ missing.push('router.js'); }
  if(missing.length){
    console.error('❌ فایل‌های بارگذاری‌نشده:', missing.join(', '));
    return { ok: false, missing: missing };
  }
  return { ok: true };
}

/* ═══════════════════════════════════════════════
   منوی پایین
   ═══════════════════════════════════════════════ */
function renderBottomNav(){
  var nav = document.getElementById('bottomNav');
  if(!nav) return;

  var s = Store.getSettings();
  var items = s.bottomNav;

  if(!Array.isArray(items)){
    items = DEFAULT_SELECTED.slice();
  } else {
    var userItems = [];
    for(var v = 0; v < items.length; v++){
      var it = items[v];
      if(it !== FIXED_LAST && BOTTOM_NAV_MODULES[it] && userItems.indexOf(it) === -1){
        userItems.push(it);
      }
    }
    for(var d = 0; d < DEFAULT_SELECTED.length && userItems.length < MAX_SELECTABLE; d++){
      if(userItems.indexOf(DEFAULT_SELECTED[d]) === -1){
        userItems.push(DEFAULT_SELECTED[d]);
      }
    }
    items = userItems.slice(0, MAX_SELECTABLE);
  }

  items = items.slice(0, MAX_SELECTABLE);
  items.push(FIXED_LAST);

  var html = '';
  for(var i = 0; i < items.length; i++){
    var id = items[i];
    var mod = BOTTOM_NAV_MODULES[id];
    if(!mod) continue;
    html += '<button class="nav-btn" data-page="' + id + '">' +
      '<span class="nav-ic">' + mod.icon + '</span>' +
      '<span class="nav-label">' + mod.label + '</span>' +
    '</button>';
  }
  nav.innerHTML = html;

  var btns = nav.querySelectorAll('.nav-btn');
  for(var k = 0; k < btns.length; k++){
    btns[k].addEventListener('click', (function(btn){
      return function(){
        try{ Router.go(btn.dataset.page); }
        catch(e){ console.error('❌ Router.go failed:', e); }
      };
    })(btns[k]));
  }

  updateActiveNav();
}

function updateActiveNav(){
  var current = Router.current;
  if(!current) return;
  var btns = document.querySelectorAll('.bottom-nav .nav-btn');
  for(var i = 0; i < btns.length; i++){
    btns[i].classList.toggle('active', btns[i].dataset.page === current);
  }
}

window.__renderBottomNav = renderBottomNav;
window.__updateActiveNav = updateActiveNav;
window.__BOTTOM_NAV_MODULES = BOTTOM_NAV_MODULES;

/* ═══════════════════════════════════════════════
   🔄 Auto-Refresh — از هر صفحه به هر صفحه
   ═══════════════════════════════════════════════ */
function getNavSignature(){
  try{
    var s = Store.getSettings();
    return (s.bottomNav || []).join(',');
  }catch(e){ return ''; }
}

function refreshFromStore(force){
  try{
    var s = Store.getSettings();
    var changed = false;

    /* ═══ ۱. تم ═══ */
    var theme = s.theme || 'light';
    if(force || theme !== _lastTheme){
      _lastTheme = theme;
      if(UI.applyTheme) UI.applyTheme();
      var icon = document.getElementById('hdrTheme');
      if(icon) icon.textContent = (theme === 'dark') ? '☀️' : '🌙';
      changed = true;
    }

    /* ═══ ۲. فونت ═══ */
    var font = s.font || 'vazirmatn';
    if(force || font !== _lastFont){
      _lastFont = font;
      if(UI.applyFont) UI.applyFont();
      changed = true;
    }

    /* ═══ ۳. اندازه فونت ═══ */
    var fs = s.fontSize || 100;
    if(force || fs !== _lastFontSize){
      _lastFontSize = fs;
      if(UI.applyFontSize) UI.applyFontSize();
      changed = true;
    }

    /* ═══ ۴. منوی پایین ═══ */
    var newSig = getNavSignature();
    if(force || newSig !== _lastNavSignature){
      _lastNavSignature = newSig;
      renderBottomNav();
      changed = true;
    } else {
      updateActiveNav();
    }

    /* ═══ ۵. ستینگ‌های دیگه (compact, vibrate, ...) — اگه آینده اضافه شدن ═══ */
    /* فعلاً چیزی نیست */

    if(changed){
      console.log('🔄 App state refreshed (' + (force ? 'force' : 'diff') + ')');
    }
  }catch(e){
    console.warn('⚠️ refreshFromStore failed:', e);
  }
}

window.__refreshFromStore = refreshFromStore;

/* ═══════════════════════════════════════════════
   Patch Router — refresh قبل و بعد از هر ناوبری
   ═══════════════════════════════════════════════ */
function patchRouter(){
  if(!Router || Router.__patched) return;

  var origGo = Router.go;
  var origBack = Router.back;
  var origInit = Router.init;

  Router.go = function(pageId, params){
    /* ✅ refresh قبل از رفتن به صفحه جدید */
    refreshFromStore(true);

    /* ✅ ناوبری */
    var result = origGo.call(Router, pageId, params);

    /* ✅ refresh بعد از render صفحه (async) */
    setTimeout(function(){
      refreshFromStore(false);
      updateActiveNav();
    }, 150);

    return result;
  };

  Router.back = function(){
    /* ✅ refresh قبل */
    refreshFromStore(true);

    var result = origBack.call(Router);

    /* ✅ refresh بعد */
    setTimeout(function(){
      refreshFromStore(false);
      updateActiveNav();
    }, 150);

    return result;
  };

  Router.init = function(){
    var result = origInit.call(Router);

    setTimeout(function(){
      refreshFromStore(true);
    }, 100);

    return result;
  };

  /* ✅ ذخیره‌ی حالت‌های اولیه */
  try{
    var s = Store.getSettings();
    _lastNavSignature = getNavSignature();
    _lastTheme = s.theme || 'light';
    _lastFont = s.font || 'vazirmatn';
    _lastFontSize = s.fontSize || 100;
  }catch(e){}

  Router.__patched = true;
  console.log('✅ Router patched — full auto-refresh enabled');
}

/* ═══ Event Delegation — دکمه‌های هدر ═══ */
function attachHeaderButtons(){
  document.addEventListener('click', function(e){
    var btn = e.target.closest ? e.target.closest('[data-nav]') : null;
    if(!btn) return;
    var nav = btn.dataset.nav;

    if(nav === 'settings'){
      e.preventDefault();
      try{ Router.go('settings'); }
      catch(err){ console.error('Settings nav failed:', err); }
    } else if(nav === 'search'){
      e.preventDefault();
      if(typeof window.__openSearch === 'function'){
        try{ window.__openSearch(); }
        catch(err){ console.error('Search failed:', err); }
      } else {
        console.warn('Search module not loaded yet');
        try{ UI.toast('⚠️ ماژول جستجو هنوز لود نشده', 'warn'); }catch(e){}
      }
    }
  });
}

/* ═══════════════════════════════════════════════
   Boot
   ═══════════════════════════════════════════════ */
function boot(){
  console.log('🚀 boot');

  var deps = checkDependencies();
  if(!deps.ok){
    showFatal('خطای بارگذاری', 'فایل‌ها لود نشدن:\n' + deps.missing.join(', '));
    hideSplash();
    return;
  }

  try{ Store.init(); }
  catch(e){ showFatal('خطا در Store', 'مشکل حافظه', e); hideSplash(); return; }

  /* ثبت state اولیه */
  try{
    var s = Store.getSettings();
    _lastNavSignature = getNavSignature();
    _lastTheme = s.theme || 'light';
    _lastFont = s.font || 'vazirmatn';
    _lastFontSize = s.fontSize || 100;
  }catch(e){}

  try{ renderBottomNav(); }catch(e){ console.warn('BottomNav:', e); }

  try{ attachHeaderButtons(); }catch(e){ console.warn('Header buttons:', e); }

  try{ if(UI.applyAll) UI.applyAll(); }catch(e){}

  /* ✅ patch قبل از init */
  try{ patchRouter(); }catch(e){ console.warn('patchRouter:', e); }

  var registered = (Router.routes) ? Object.keys(Router.routes) : [];
  if(registered.length === 0){
    showFatal('هیچ صفحه‌ای ثبت نشد', 'ماژول‌ها لود نشدن');
    hideSplash();
    return;
  }

  try{
    Router.init();
    setTimeout(updateActiveNav, 50);
  }catch(e){
    showFatal('خطا در Router', 'مشکل ناوبری', e);
    hideSplash();
    return;
  }

  setTimeout(hideSplash, 300);

  try{
    if('serviceWorker' in navigator && location.protocol === 'https:'){
      navigator.serviceWorker.register('sw.js').catch(function(){});
    }
  }catch(e){}

  try{
    document.addEventListener('visibilitychange', function(){
      if(document.visibilityState === 'hidden'){
        try{ if(Store.getSettings().autoSave) Store.save(); }catch(e){}
      } else if(document.visibilityState === 'visible'){
        /* ✅ برگشتن به اپ — refresh کن */
        setTimeout(function(){ refreshFromStore(true); }, 100);
      }
    });

    window.addEventListener('pagehide', function(){
      try{ if(Store.getSettings().autoSave) Store.save(); }catch(e){}
    });

    window.addEventListener('focus', function(){
      setTimeout(function(){ refreshFromStore(true); }, 100);
    });

    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape'){ try{ UI.closeAllModals(); }catch(e){} }
      if((e.ctrlKey || e.metaKey) && e.key === 'k'){
        e.preventDefault();
        if(typeof window.__openSearch === 'function') window.__openSearch();
      }
    });
  }catch(e){}

  setTimeout(function(){
    try{
      var s = Store.getSettings();
      if(s.firstRun){
        Store.updateSettings({ firstRun: false });
        var farm = Store.getFarm();
        UI.toast('خوش آمدید به ' + (farm.name || 'مرغداری') + ' 👋', 'success', 2500);
      }
    }catch(e){}
  }, 600);
}

window.addEventListener('error', function(e){
  console.error('❌ Error:', e.message);
});
window.addEventListener('unhandledrejection', function(e){
  console.error('❌ Rejection:', e.reason);
});

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

})();