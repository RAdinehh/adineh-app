/* ═══════════════════════════════════════════════
   ROUTER — ناوبری بین صفحات
   ساخته شده توسط رضا آدینه
   نسخه v2 — رفع باگ back()
   ═══════════════════════════════════════════════ */
const Router = (() => {

  const routes = {};
  const stack = [];
  let current = null;

  /* ═══════════════════════════════════════════════
     ثبت صفحه جدید
     ═══════════════════════════════════════════════ */
  function register(pageId, config) {
    if (!pageId || typeof config !== 'object') {
      console.warn('⚠️ route invalid:', pageId);
      return;
    }

    routes[pageId] = config;

    // ثبت گلوبال برای دسترسی از onclick
    if (pageId === 'dashboard')  window.Dashboard  = config;
    if (pageId === 'daily')      window.Daily      = config;
    if (pageId === 'finance')    window.Finance    = config;
    if (pageId === 'flocks')     window.Flocks     = config;
    if (pageId === 'sales')      window.Sales      = config;
    if (pageId === 'inventory')  window.Inventory  = config;
    if (pageId === 'incubation') window.Incubation = config;
    if (pageId === 'medicine')   window.Medicine   = config;
    if (pageId === 'feed')       window.Feed       = config;
    if (pageId === 'reports')    window.Reports    = config;
    if (pageId === 'settings')   window.Settings   = config;
    if (pageId === 'more')       window.More       = config;
    if (pageId === 'contacts')   window.Contacts   = config;
  }

  /* ═══════════════════════════════════════════════
     رفتن به صفحه
     ═══════════════════════════════════════════════ */
  function go(pageId, params = {}) {
    if (!routes[pageId]) {
      console.warn('⚠️ route not found:', pageId);
      if (typeof UI !== 'undefined' && UI.toast) {
        UI.toast(`صفحه «${pageId}» پیدا نشد`, 'error');
      }
      if (pageId !== 'dashboard') go('dashboard');
      return;
    }

    if (current && current !== pageId) stack.push(current);
    current = pageId;
    const route = routes[pageId];
    const view = document.getElementById('view');
    if (!view) return;

    // پاک‌سازی
    try {
      if (typeof UI !== 'undefined') {
        UI.closeAllModals();
        if (UI.clearAllErrors) UI.clearAllErrors();
      }
    } catch(e){}

    // انیمیشن
    view.style.opacity = '0';
    view.innerHTML = '';

    requestAnimationFrame(() => {
      try {
        const content = typeof route.render === 'function' ? route.render(params) : '';
        if (typeof content === 'string') view.innerHTML = content;
        else if (content instanceof HTMLElement) view.appendChild(content);

        view.style.opacity = '1';
        view.style.transition = 'opacity .2s ease';

        if (typeof route.after === 'function') {
          requestAnimationFrame(() => {
            try { route.after(params); }
            catch (e) {
              console.error('❌ route.after error:', e);
              if (typeof UI !== 'undefined' && UI.toast) {
                UI.toast('خطا در بارگذاری صفحه', 'error');
              }
            }
          });
        }
      } catch (e) {
        console.error('❌ render error:', e);
        view.innerHTML = `
          <div class="empty-state">
            <div class="empty-emoji">⚠️</div>
            <div class="empty-title">خطا در نمایش صفحه</div>
            <div class="empty-text">${e.message || 'مشکلی پیش آمد'}</div>
            <button class="empty-action" onclick="Router.go('dashboard')">بازگشت به خانه</button>
          </div>
        `;
      }
    });

    // هدر پایین (تاریخ)
    const hdrSub = document.getElementById('hdrSub');
    const hdrBack = document.getElementById('hdrBack');
    if (hdrSub && typeof UI !== 'undefined') hdrSub.textContent = route.sub || UI.todayStr;
    if (hdrBack) {
      hdrBack.style.visibility = (stack.length > 0 && !route.topLevel) ? 'visible' : 'hidden';
    }

    // نوار پایین
    document.querySelectorAll('.nav-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.page === route.navPage || b.dataset.page === pageId);
    });

    // ذخیره صفحه فعلی
    try { Store.updateSettings({ activePage: pageId }); } catch(e){}

    // Hash
    if (location.hash !== '#' + pageId) {
      if (stack.length > 0) history.pushState(null, '', '#' + pageId);
      else history.replaceState(null, '', '#' + pageId);
    }

    // ویبره
    try {
      const s = Store.getSettings();
      if (s.vibrate && navigator.vibrate) navigator.vibrate(6);
    } catch(e){}
  }

  /* ═══════════════════════════════════════════════
     بازگشت به صفحه قبل (نسخه اصلاح‌شده)
     ═══════════════════════════════════════════════ */
  function back() {
    if (stack.length === 0) {
      go('dashboard');
      return;
    }

    const prev = stack.pop();

    /* current = null تا go خودش push اضافه نکنه */
    current = null;

    go(prev);
  }

  /* ═══════════════════════════════════════════════
     راه‌اندازی اولیه
     ═══════════════════════════════════════════════ */
  function init() {
    const hash = location.hash.replace('#', '');
    let start = 'dashboard';
    try {
      start = (hash && routes[hash]) ? hash : (Store.getSettings().activePage || 'dashboard');
    } catch(e){}

    if (!routes[start]) start = 'dashboard';
    go(start);

    // تغییر hash
    window.addEventListener('hashchange', () => {
      const h = location.hash.replace('#', '');
      if (h && routes[h] && h !== current) go(h);
    });

    // دکمه back مرورگر
    window.addEventListener('popstate', () => {
      const h = location.hash.replace('#', '');
      if (h && routes[h]) go(h);
    });
  }

  /* ═══════════════════════════════════════════════
     API عمومی
     ═══════════════════════════════════════════════ */
  return {
    register,
    go,
    back,
    init,
    get current() { return current; },
    get routes() { return routes; }
  };
})();