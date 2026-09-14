/* ═══════════════════════════════════════════════
   SEARCH — جستجوی سراسری (v2.0)
   شامل: ماژول‌ها + داده‌ها
   ساخته شده توسط رضا آدینه
   ═══════════════════════════════════════════════ */
(function(){
'use strict';

if(typeof Router === 'undefined' || typeof Router.register !== 'function'){
  console.error('❌ Router not available');
  return;
}
if(window.__searchModuleLoaded) return;
window.__searchModuleLoaded = true;

var esc = UI.esc, fa = UI.fa;
var fmtShort = UI.formatShort;

/* ═══ ماژول‌ها (صفحات) — برای جستجوی مستقیم ═══ */
var MODULES = [
  { id: 'dashboard',       icon: '🏠', title: 'خانه',                  sub: 'صفحه اصلی و خلاصه',           search: 'خانه dashboard اصلی خلاصه داشبورد' },
  { id: 'daily',           icon: '📅', title: 'ثبت روزانه',            sub: 'تخم، تلفات، دان، وزن',          search: 'روزانه ثبت تلفات تخم دان وزن daily' },
  { id: 'flocks',          icon: '🐔', title: 'مدیریت گله‌ها',          sub: 'گله، سالن، گروه، ادغام',         search: 'گله گله‌ها سالن مرغ flocks bird' },
  { id: 'finance',         icon: '💼', title: 'دفتر مالی',              sub: 'درآمد، هزینه، تراکنش',          search: 'مالی دفتر درآمد هزینه تراکنش finance' },
  { id: 'sales',           icon: '🏷️', title: 'فاکتور و فروش',         sub: 'فروش تخم، پرنده، جوجه',         search: 'فروش فاکتور خریدار sales' },
  { id: 'inventory',       icon: '📦', title: 'انبار و کالاها',        sub: 'ورود، خروج، ضایعات',            search: 'انبار کالا موجودی ورود خروج inventory' },
  { id: 'medicine',        icon: '💊', title: 'واکسن و درمان',          sub: 'دارو، واکسن، نسخه',             search: 'دارو واکسن درمان نسخه medicine' },
  { id: 'incubation',      icon: '🥚', title: 'جوجه‌کشی',              sub: 'دستگاه، هچر، دوره',             search: 'جوجه کشی هچر ستر incubation' },
  { id: 'feed',            icon: '🌾', title: 'فرمول و مصرف دان',      sub: 'جیره، میکسر، فرمول',            search: 'خوراک دان فرمول جیره میکسر feed' },
  { id: 'contacts',        icon: '👥', title: 'پرونده‌ها',              sub: 'مشتری، کارگر، طرف‌حساب',       search: 'پرونده مشتری کارگر طرف حساب contacts' },
  { id: 'flock-analytics', icon: '📈', title: 'آنالیز و نمودارها',     sub: 'روند تولید، رشد، نمودار',       search: 'آنالیز تحلیل نمودار رشد analytics' },
  { id: 'flock-profit',    icon: '💰', title: 'سود و زیان دوره',       sub: 'مقایسه، تحلیل اقتصادی',         search: 'سود زیان مقایسه دوره profit' },
  { id: 'reports',         icon: '📊', title: 'گزارش‌گیری جامع',        sub: 'خروجی اکسل، PDF',                search: 'گزارش جامع خروجی reports' },
  { id: 'settings',        icon: '⚙️', title: 'تنظیمات',                sub: 'پوسته، فونت، پشتیبان',          search: 'تنظیمات پوسته فونت پشتیبان settings' },
  { id: 'more',            icon: '☰', title: 'بیشتر',                   sub: 'همه بخش‌های سیستم',             search: 'بیشتر همه بخش‌ها منو more' }
];

/* ═══ منابع داده ═══ */
function getDataSources(){
  var s = Store.data;
  return [
    {
      id: 'flocks', icon: '🐔', title: 'گله‌ها', page: 'flocks',
      items: ((s.flocks && s.flocks.flocks) || []).map(function(f){
        return {
          id: f.id, title: f.name || '—',
          sub: (f.hall ? '🏢 ' + f.hall + ' • ' : '') + fa(f.alive || f.aliveCount || 0) + ' زنده',
          search: [f.name, f.hall, f.birdType, f.group, f.notes].join(' ').toLowerCase()
        };
      })
    },
    {
      id: 'sales', icon: '🏷️', title: 'فروش‌ها', page: 'sales',
      items: ((s.sales && s.sales.sales) || []).map(function(x){
        return {
          id: x.id,
          title: (x.type || '—') + (x.party ? ' → ' + x.party : ''),
          sub: '📅 ' + (x.date || '—') + ' • 💰 ' + fmtShort(x.total || 0),
          search: [x.type, x.party, x.buyer, x.notes].join(' ').toLowerCase()
        };
      })
    },
    {
      id: 'finance', icon: '💼', title: 'تراکنش‌های مالی', page: 'finance',
      items: ((s.finance && s.finance.transactions) || []).filter(function(t){
        return !t.kind || t.kind === 'finance_income' || t.kind === 'finance_expense'
          || t.transType === 'income' || t.transType === 'expense';
      }).map(function(t){
        return {
          id: t.id, title: t.title || t.category || '—',
          sub: '📅 ' + (t.date || '—') + ' • 💰 ' + fmtShort(t.amount || 0),
          search: [t.title, t.category, t.party, t.notes, t.method].join(' ').toLowerCase()
        };
      })
    },
    {
      id: 'parties', icon: '👥', title: 'طرف‌حساب‌ها', page: 'contacts',
      items: (s.parties || []).map(function(p){
        return {
          id: p.id, title: p.name || '—',
          sub: (p.phone ? '📞 ' + p.phone + ' • ' : '') + (p.city ? '📍 ' + p.city : ''),
          search: [p.name, p.phone, p.city, p.notes].join(' ').toLowerCase()
        };
      })
    },
    {
      id: 'daily', icon: '📅', title: 'رکورد روزانه', page: 'daily',
      items: ((s.daily && s.daily.records) || []).map(function(r){
        return {
          id: r.id,
          title: (r.date || '—') + ' • ' + (r.flock || '—'),
          sub: '💀 ' + fa(r.deaths || 0) + ' • 🥚 ' + fa(r.eggs || 0),
          search: [r.date, r.flock, r.cause, r.notes, r.medicine].join(' ').toLowerCase()
        };
      })
    },
    {
      id: 'medicine', icon: '💊', title: 'سوابق دارو', page: 'medicine',
      items: ((s.medicine && s.medicine.records) || []).map(function(m){
        var itemNames = (m.items || []).map(function(i){ return i.name; }).join('، ');
        return {
          id: m.id, title: itemNames || '—',
          sub: '📅 ' + (m.date || '—') + ' • ' + (m.flock || '—'),
          search: [itemNames, m.flock, m.notes, m.type, m.method].join(' ').toLowerCase()
        };
      })
    },
    {
      id: 'inventory', icon: '📦', title: 'تراکنش‌های انبار', page: 'inventory',
      items: ((s.finance && s.finance.transactions) || []).filter(function(t){
        return t.kind === 'inv_in' || t.kind === 'inv_out' || t.kind === 'inv_waste';
      }).map(function(t){
        var label = t.kind === 'inv_in' ? 'ورود' : t.kind === 'inv_out' ? 'خروج' : 'ضایعات';
        return {
          id: t.id, title: (t.item || '—') + ' • ' + label,
          sub: '📅 ' + (t.date || '—') + ' • ' + fa(t.qty || 0) + ' ' + (t.unit || ''),
          search: [t.item, t.category, t.supplier, t.notes, t.transportVehicle].join(' ').toLowerCase()
        };
      })
    },
    {
      id: 'incubation', icon: '🥚', title: 'دوره‌های جوجه‌کشی', page: 'incubation',
      items: ((s.incubation && s.incubation.incs) || []).map(function(x){
        return {
          id: x.id,
          title: (x.bird || '—') + ' • ' + fa(x.eggs || 0) + ' تخم',
          sub: '📅 ' + (x.startDate || '—') + ' • ' + (x.device || '—'),
          search: [x.bird, x.device, x.seller, x.buyer, x.notes, x.result].join(' ').toLowerCase()
        };
      })
    },
    {
      id: 'feed', icon: '🌾', title: 'فرمول‌های جیره', page: 'feed',
      items: ((s.feed && s.feed.formulas) || []).map(function(f){
        return {
          id: f.id, title: f.name || '—',
          sub: '📊 ' + (f.type || '—') + ' • ' + fa((f.ingredients || []).length) + ' قلم',
          search: [f.name, f.type, f.suitable, f.notes].join(' ').toLowerCase()
        };
      })
    }
  ];
}

/* ═══ باز کردن مودال ═══ */
function openSearch(){
  var html = '<div style="background:#fff;border-radius:16px;padding:0;max-width:520px;width:100%;margin:auto;box-shadow:0 20px 50px rgba(15,23,42,.3);overflow:hidden">' +
    '<div style="display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid #e2e8f0;background:#f8fafc">' +
      '<div style="font-size:20px;flex-shrink:0">🔍</div>' +
      '<input id="srchInput" type="text" placeholder="جستجو در همه‌جا..." autocomplete="off" ' +
        'style="flex:1;padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;font-family:inherit;background:#fff;color:#0f172a;outline:none">' +
      '<button data-close style="background:#f1f5f9;border:none;width:36px;height:36px;border-radius:50%;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0">✕</button>' +
    '</div>' +
    '<div id="srchResults" style="max-height:65vh;overflow-y:auto;padding:10px 12px"></div>' +
  '</div>';

  UI.closeAllModals();
  var modal = UI.openModal(html);
  modal.classList.add('modal-center');

  var input = modal.querySelector('#srchInput');
  var results = modal.querySelector('#srchResults');

  function showEmpty(msg, icon, hint){
    results.innerHTML = '<div style="text-align:center;padding:40px 20px;color:#94a3b8">' +
      '<div style="font-size:44px;margin-bottom:8px;opacity:.5">' + (icon || '🔍') + '</div>' +
      '<div style="font-size:12px;font-weight:700">' + msg + '</div>' +
      (hint ? '<div style="font-size:10.5px;margin-top:6px;opacity:.8">' + hint + '</div>' : '') +
    '</div>';
  }

  function goTo(page){
    UI.closeAllModals();
    if(!page) return;
    setTimeout(function(){
      try{ Router.go(page); }
      catch(e){ console.error('Router.go failed:', page, e); }
    }, 100);
  }

  function renderModuleResult(m){
    return '<div class="srch-result" data-page="' + m.id + '" ' +
      'style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#f0fdfa;border:1.5px solid #a7f3d0;border-radius:10px;margin-bottom:5px;cursor:pointer">' +
      '<div style="width:32px;height:32px;border-radius:8px;background:#fff;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;border:1px solid #d1fae5">' + m.icon + '</div>' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:12.5px;font-weight:800;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(m.title) + '</div>' +
        (m.sub ? '<div style="font-size:10px;color:#0f766e;font-weight:600;margin-top:2px">' + esc(m.sub) + '</div>' : '') +
      '</div>' +
      '<div style="font-size:9px;font-weight:800;padding:3px 8px;border-radius:9999px;background:#0f766e;color:#fff;flex-shrink:0">باز کن</div>' +
    '</div>';
  }

  function renderDataResult(src, m){
    return '<div class="srch-result" data-page="' + src.page + '" ' +
      'style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:5px;cursor:pointer">' +
      '<div style="width:32px;height:32px;border-radius:8px;background:#fff;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;border:1px solid #e2e8f0">' + src.icon + '</div>' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:12.5px;font-weight:800;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(m.title) + '</div>' +
        (m.sub ? '<div style="font-size:10px;color:#64748b;font-weight:600;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(m.sub) + '</div>' : '') +
      '</div>' +
      '<div style="font-size:16px;color:#94a3b8;flex-shrink:0">‹</div>' +
    '</div>';
  }

  function renderResults(q){
    q = (q || '').trim().toLowerCase();

    if(!q){
      showEmpty('چی می‌خوای پیدا کنی؟', '🔍', 'می‌تونی هم اسم صفحه رو بنویسی هم داده‌ها');
      return;
    }

    var html = '';
    var totalMatches = 0;

    /* ═══ ۱. جستجو در ماژول‌ها ═══ */
    var moduleMatches = [];
    for(var i = 0; i < MODULES.length; i++){
      var mod = MODULES[i];
      if(mod.search.indexOf(q) !== -1 || mod.title.toLowerCase().indexOf(q) !== -1){
        moduleMatches.push(mod);
      }
    }

    if(moduleMatches.length){
      totalMatches += moduleMatches.length;
      html += '<div style="margin-bottom:14px">' +
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;padding:0 4px">' +
          '<span style="font-size:16px">🧭</span>' +
          '<span style="font-size:12px;font-weight:900;color:#0f766e">صفحه‌ها</span>' +
          '<span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:9999px;background:#0f766e;color:#fff">' + fa(moduleMatches.length) + '</span>' +
        '</div>';
      for(i = 0; i < moduleMatches.length; i++){
        html += renderModuleResult(moduleMatches[i]);
      }
      html += '</div>';
    }

    /* ═══ ۲. جستجو در داده‌ها ═══ */
    var sources = getDataSources();
    for(i = 0; i < sources.length; i++){
      var src = sources[i];
      var matches = [];
      for(var j = 0; j < src.items.length; j++){
        if(src.items[j].search.indexOf(q) !== -1){
          matches.push(src.items[j]);
        }
      }
      if(!matches.length) continue;

      totalMatches += matches.length;

      html += '<div style="margin-bottom:12px">' +
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;padding:0 4px">' +
          '<span style="font-size:16px">' + src.icon + '</span>' +
          '<span style="font-size:12px;font-weight:900;color:#0f172a">' + src.title + '</span>' +
          '<span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:9999px;background:#f0fdfa;color:#0f766e">' + fa(matches.length) + '</span>' +
        '</div>';

      for(j = 0; j < Math.min(matches.length, 5); j++){
        html += renderDataResult(src, matches[j]);
      }

      if(matches.length > 5){
        html += '<div style="font-size:10.5px;font-weight:700;color:#64748b;text-align:center;padding:6px">+ ' + fa(matches.length - 5) + ' نتیجه دیگر</div>';
      }

      html += '</div>';
    }

    if(totalMatches === 0){
      showEmpty('چیزی پیدا نشد', '😕', 'یه کلمه دیگه امتحان کن');
      return;
    }

    results.innerHTML = html;

    results.querySelectorAll('.srch-result').forEach(function(el){
      el.addEventListener('click', function(){
        goTo(el.dataset.page);
      });
    });
  }

  input.addEventListener('input', function(){ renderResults(input.value); });

  input.addEventListener('keydown', function(e){
    if(e.key === 'Enter'){
      var first = results.querySelector('.srch-result');
      if(first) goTo(first.dataset.page);
    }
  });

  setTimeout(function(){ try{ input.focus(); }catch(e){} }, 50);
  showEmpty('چی می‌خوای پیدا کنی؟', '🔍', 'می‌تونی هم اسم صفحه رو بنویسی هم داده‌ها');
}

window.__openSearch = openSearch;

Router.register('search', {
  title: 'جستجو',
  navPage: 'more',
  topLevel: false,
  render: function(){
    setTimeout(openSearch, 50);
    return '<div class="page" style="text-align:center;padding:60px 20px;color:#94a3b8;font-size:13px;font-weight:700">در حال باز کردن جستجو...</div>';
  }
});

console.log('✅ search module loaded (v2.0 — modules + data)');

})();