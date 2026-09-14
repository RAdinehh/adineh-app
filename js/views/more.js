/**
 * Adineh Poultry Management - More / Hub View (Compact Edition)
 * v2.2 — حذف کارت تنظیمات (به هدر منتقل شد)
 */

const MoreView = (() => {
  const LAYOUT_KEY = 'adineh_more_layout_v2';

  const editorState = {
    active: false,
    draggedId: null
  };

  function getCategories() {
    return [
      { id: 'flock_ops', title: 'پرورش و گله', icon: '🐣' },
      { id: 'logistics', title: 'تدارکات و انبار', icon: '📦' },
      { id: 'business', title: 'مالی و فروش', icon: '💰' },
      { id: 'system', title: 'سیستم و گزارش', icon: '⚙️' }
    ];
  }

  function getModuleDefinitions() {
    const s = (typeof Store !== 'undefined' && Store.data) ? Store.data : {};
    const flocksArr = (s.flocks && s.flocks.flocks) || [];
    const activeFlocks = flocksArr.filter(f => f.status === 'active').length;
    const totalBirds = flocksArr
      .filter(f => f.status === 'active')
      .reduce((sum, f) => sum + (Number(f.alive || f.aliveCount) || 0), 0);
    const txArr = s.transactions || [];
    const lowStock = txArr.filter(i => i.kind === 'inv_in' && Number(i.qty) <= 5).length;
    const incsArr = (s.incubation && s.incubation.incs) || [];
    const activeMachines = incsArr.filter(b => b.status === 'setting' || b.status === 'hatching').length;
    const salesArr = (s.sales && s.sales.sales) || [];
    const pendingSales = salesArr.filter(o => o.status !== 'paid').length;
    const contactsCount = (s.parties || []).length;
    const medRecs = (s.medicine && s.medicine.records) || [];
    const medTreatments = medRecs.filter(m => m.status === 'in_progress').length;

    return [
      { id: 'flocks', cat: 'flock_ops', title: 'مدیریت گله‌ها', icon: '🐔', color: '#16a34a', badge: `${activeFlocks} فعال (${totalBirds.toLocaleString('fa-IR')} قطعه)` },
      { id: 'daily', cat: 'flock_ops', title: 'ثبت روزانه', icon: '📝', color: '#2563eb', badge: 'تخم، تلفات، دان' },
      { id: 'incubation', cat: 'flock_ops', title: 'دستگاه جوجه‌کشی', icon: '🥚', color: '#d97706', badge: activeMachines ? `${activeMachines} دوره فعال` : 'آماده به کار' },
      { id: 'medicine', cat: 'flock_ops', title: 'واکسن و درمان', icon: '💉', color: '#dc2626', badge: medTreatments ? `${medTreatments} دوره فعال` : 'ثبت نسخه' },

      { id: 'inventory', cat: 'logistics', title: 'انبار و کالاها', icon: '📦', color: '#0891b2', badge: lowStock ? `${lowStock} هشدار موجودی` : 'موجودی پایدار' },
      { id: 'feed', cat: 'logistics', title: 'فرمول و مصرف دان', icon: '🌾', color: '#ca8a04', badge: 'جیره و میکسر' },
      { id: 'contacts', cat: 'logistics', title: 'مخاطبین و طرف‌حساب', icon: '👥', color: '#4f46e5', badge: `${contactsCount} مخاطب` },

      { id: 'finance', cat: 'business', title: 'دفتر مالی و تراکنش‌ها', icon: '💳', color: '#059669', badge: 'درآمد و هزینه' },
      { id: 'sales', cat: 'business', title: 'فاکتور و فروش', icon: '🏷️', color: '#ea580c', badge: pendingSales ? `${pendingSales} تسویه‌نشده` : 'فروش تخم و پرنده' },
      { id: 'flock-profit', cat: 'business', title: 'سود و زیان دوره', icon: '📊', color: '#0284c7', badge: 'تحلیل اقتصادی' },

      { id: 'flock-analytics', cat: 'system', title: 'آنالیز و نمودارها', icon: '📈', color: '#7c3aed', badge: 'روند تولید و رشد' },
      { id: 'reports', cat: 'system', title: 'گزارش‌گیری جامع', icon: '📑', color: '#475569', badge: 'خروجی اکسل/PDF' }
    ];
  }

  function getSavedLayout() {
    try {
      const raw = localStorage.getItem(LAYOUT_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Failed to parse layout:', e);
    }
    return { order: [], hidden: [] };
  }

  function saveLayout(order, hidden) {
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify({ order, hidden }));
      if (typeof UI !== 'undefined' && UI.toast) UI.toast('چیدمان ذخیره شد', 'success');
    } catch (e) {
      if (typeof UI !== 'undefined' && UI.toast) UI.toast('خطا در ذخیره‌سازی چیدمان', 'error');
    }
  }

  function resetLayout() {
    localStorage.removeItem(LAYOUT_KEY);
    editorState.active = false;
    if (typeof UI !== 'undefined' && UI.toast) UI.toast('چیدمان به پیش‌فرض بازگشت', 'info');
    render();
  }

  function getOrderedModules() {
    const defs = getModuleDefinitions();
    const layout = getSavedLayout();
    const map = new Map(defs.map(m => [m.id, m]));

    let ordered = [];
    (layout.order || []).forEach(id => {
      if (map.has(id)) {
        ordered.push({ ...map.get(id), hidden: (layout.hidden || []).includes(id) });
        map.delete(id);
      }
    });

    map.forEach(m => {
      ordered.push({ ...m, hidden: (layout.hidden || []).includes(m.id) });
    });

    return ordered;
  }

  function renderCard(mod, isEditor = false) {
    if (!isEditor && mod.hidden) return '';

    return `
      <div class="more-compact-card ${mod.hidden ? 'is-hidden' : ''}" 
           data-id="${mod.id}" 
           style="--mc: ${mod.color};"
           ${!isEditor ? `onclick="Router.go('${mod.id}')"` : ''}>
        
        <div class="mcc-icon">${mod.icon}</div>
        
        <div class="mcc-info">
          <div class="mcc-title">${mod.title}</div>
          <div class="mcc-badge">${mod.badge}</div>
        </div>

        ${isEditor ? `
          <div class="mcc-actions">
            <button class="mcc-btn" data-act="up" title="بالاتر">▲</button>
            <button class="mcc-btn" data-act="down" title="پایین‌تر">▼</button>
            <button class="mcc-btn ${mod.hidden ? 'text-danger' : ''}" data-act="toggle-hide" title="${mod.hidden ? 'نمایش' : 'مخفی'}">
              ${mod.hidden ? '👁️' : '🚫'}
            </button>
          </div>
        ` : `
          <div class="mcc-arrow">‹</div>
        `}
      </div>
    `;
  }

  function renderPage() {
    const modules = getOrderedModules();
    const categories = getCategories();

    return `
      <div class="more-page-container">
        <div class="more-compact-header">
          <div class="mch-title">
            <span class="mch-icon">📑</span>
            <span>بخش‌های سیستم</span>
          </div>
          <button class="btn btn-sm ${editorState.active ? 'btn-primary' : 'btn-outline'}" data-more="toggle-edit">
            ${editorState.active ? '✓ پایان ویرایش' : '✏️ چیدمان'}
          </button>
        </div>

        ${editorState.active ? `
          <div class="more-edit-toolbar">
            <span>حالت شخصی‌سازی منو فعال است:</span>
            <div class="more-edit-btns">
              <button class="btn btn-xs btn-outline" data-more="reset-layout">پیش‌فرض</button>
              <button class="btn btn-xs btn-primary" data-more="save-layout">ذخیره</button>
            </div>
          </div>
          <div class="more-compact-grid editor-mode" id="moreModulesGrid">
            ${modules.map(m => renderCard(m, true)).join('')}
          </div>
        ` : `
          <div class="more-sections-wrapper">
            ${categories.map(cat => {
              const catModules = modules.filter(m => m.cat === cat.id && !m.hidden);
              if (!catModules.length) return '';
              return `
                <div class="more-group">
                  <div class="more-group-title">
                    <span>${cat.icon}</span>
                    <span>${cat.title}</span>
                  </div>
                  <div class="more-compact-grid">
                    ${catModules.map(m => renderCard(m, false)).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}

        <div class="more-compact-footer">
          <div class="mcf-title">مدیریت مرغداری (آدینه)</div>
          <div class="mcf-meta">نسخه ۲.۰ • طراحی اختصاصی رضا آدینه</div>
        </div>
      </div>
    `;
  }

  function attachEvents(container) {
    if (!container) return;

    container.querySelectorAll('[data-more="toggle-edit"]').forEach(btn => {
      btn.onclick = () => {
        editorState.active = !editorState.active;
        render();
      };
    });

    const resetBtn = container.querySelector('[data-more="reset-layout"]');
    if (resetBtn) resetBtn.onclick = resetLayout;

    const saveBtn = container.querySelector('[data-more="save-layout"]');
    if (saveBtn) {
      saveBtn.onclick = () => {
        const cards = Array.from(container.querySelectorAll('.more-compact-card'));
        const order = cards.map(c => c.dataset.id);
        const hidden = cards.filter(c => c.classList.contains('is-hidden')).map(c => c.dataset.id);
        saveLayout(order, hidden);
        editorState.active = false;
        render();
      };
    }

    if (editorState.active) {
      container.querySelectorAll('.mcc-btn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const card = btn.closest('.more-compact-card');
          const act = btn.dataset.act;

          if (act === 'up' && card.previousElementSibling) {
            card.parentNode.insertBefore(card, card.previousElementSibling);
          } else if (act === 'down' && card.nextElementSibling) {
            card.parentNode.insertBefore(card.nextElementSibling, card);
          } else if (act === 'toggle-hide') {
            card.classList.toggle('is-hidden');
            btn.innerHTML = card.classList.contains('is-hidden') ? '👁️' : '🚫';
          }
        };
      });
    }
  }

  function render() {
    const view = document.getElementById('view');
    if (!view) return;
    view.innerHTML = renderPage();
    attachEvents(view);
  }

  function openLayoutEditor() {
    editorState.active = true;
    render();
  }

  if (typeof Router !== 'undefined' && Router.register) {
    Router.register('more', {
      title: 'همه بخش‌ها',
      navPage: 'more',
      topLevel: true,
      render: function () { return renderPage(); },
      after: function () { attachEvents(document.getElementById('view')); }
    });
  }

  return {
    render,
    openLayoutEditor,
    resetLayout
  };
})();

/* ✅ صادر کردن به window.More */
window.More = {
  render: MoreView.render,
  openLayoutEditor: MoreView.openLayoutEditor,
  resetLayout: MoreView.resetLayout
};