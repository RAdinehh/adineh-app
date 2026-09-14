/* ═══════════════════════════════════════════════
   CONTACTS — پرونده مشتری + کارگر (v2.0)
   بازنویسی‌شده برای Store v4
   ساخته شده توسط رضا آدینه
   ═══════════════════════════════════════════════ */
(function(){
'use strict';

if(typeof Router === 'undefined' || typeof Router.register !== 'function'){
  console.error('❌ Router not available');
  return;
}
if(window.__contactsModuleLoaded) return;
window.__contactsModuleLoaded = true;

/* ═══════ helpers از UI ═══════ */
var sid       = UI.sid;
var sameId    = UI.sameId;
var findBy    = UI.findBy;
var esc       = UI.esc;
var fa        = UI.fa;
var toFa      = UI.toFa;
var toEnDigits= UI.toEnDigits;
var fmtShort  = UI.formatShort;
var faMoney   = UI.formatShort;
var toast     = UI.toast;
var todayStr  = UI.todayStr;

/* ═══════ State (فقط UI) ═══════ */
var _state = {
  tab: 'customers',
  filter: 'all',
  expanded: {}
};
var _modals = {};

/* ═══════ Modal ═══════ */
function openModal(id, html, opts){
  opts = opts || {};
  if(_modals[id]) return _modals[id];
  var wrap = document.createElement('div');
  wrap.className = 'ct-modal-wrap';
  wrap.dataset.modalId = id;
  wrap.innerHTML = '<div class="ct-modal-bg" data-ct="close-modal" data-mid="'+id+'"></div>' +
    '<div class="ct-modal-box' + (opts.sheet?' ct-sheet':'') + '">' + html + '</div>';
  var root = document.getElementById('modalRoot') || document.body;
  root.appendChild(wrap);
  requestAnimationFrame(function(){ wrap.classList.add('on'); });
  _modals[id] = wrap;
  return wrap;
}
function closeModal(id){
  var el = _modals[id];
  if(!el) return;
  el.classList.remove('on');
  setTimeout(function(){
    if(el.parentNode) el.parentNode.removeChild(el);
    delete _modals[id];
  }, 250);
}

/* ═══════ Data Access ═══════ */
function getParties(){ return Store.all('parties'); }
function getWorkers(){ return Store.all('workers'); }
function getSales(){ return Store.all('sales'); }
function getFinanceTransactions(){
  /* فقط تراکنش‌های مالی (نه انبار) */
  return Store.all('transactions').filter(function(t){
    return !t.kind || t.kind === 'finance_income' || t.kind === 'finance_expense'
      || t.transType === 'income' || t.transType === 'expense';
  });
}

/* ═══════ Styles ═══════ */
function injectStyles(){
  if(document.getElementById('ct-styles')) return;
  var css =
  '.ct-page{padding:10px;max-width:760px;margin:0 auto}' +
  '.ct-header{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:12px;flex-wrap:wrap}' +
  '.ct-title{font-size:14px;font-weight:900}' +
  '.ct-sub{font-size:10.5px;color:#64748b;font-weight:700;margin-top:1px}' +
  '.ct-add-btn{background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;border:none;padding:8px 14px;border-radius:9999px;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:4px;white-space:nowrap;box-shadow:0 3px 10px rgba(15,118,110,.3)}' +
  '.ct-tabs{display:flex;gap:4px;background:#f1f5f9;padding:4px;border-radius:12px;margin-bottom:12px}' +
  '.ct-tab{flex:1;padding:10px 6px;border:none;background:transparent;border-radius:8px;font-family:inherit;font-size:11.5px;font-weight:800;color:#64748b;cursor:pointer;transition:all .15s}' +
  '.ct-tab.on{background:#fff;color:#0f766e;box-shadow:0 1px 3px rgba(15,23,42,.08)}' +
  '.ct-filters{display:flex;gap:4px;margin-bottom:10px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none}' +
  '.ct-filters::-webkit-scrollbar{display:none}' +
  '.ct-chip{background:#fff;border:1.5px solid #e2e8f0;color:#64748b;padding:5px 12px;border-radius:9999px;font-family:inherit;font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap;flex-shrink:0}' +
  '.ct-chip.on{background:#0f766e;border-color:#0f766e;color:#fff}' +
  '.ct-card{background:#fff;border-radius:12px;margin-bottom:8px;border:1px solid #e2e8f0;border-right:3px solid #0f766e;overflow:hidden}' +
  '.ct-card.customer{border-right-color:#3b82f6}' +
  '.ct-card.worker{border-right-color:#f59e0b}' +
  '.ct-card.owed{border-right-color:#ef4444}' +
  '.ct-card-hd{padding:12px;cursor:pointer;user-select:none}' +
  '.ct-card-hd:active{background:#f8fafc}' +
  '.ct-row1{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px}' +
  '.ct-name{font-size:13px;font-weight:900;color:#0f172a;display:flex;align-items:center;gap:6px;min-width:0}' +
  '.ct-name-text{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
  '.ct-avatar{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}' +
  '.ct-avatar.customer{background:#eff6ff;color:#1e40af}' +
  '.ct-avatar.worker{background:#fffbeb;color:#92400e}' +
  '.ct-badge{font-size:9.5px;font-weight:800;padding:2px 8px;border-radius:9999px;white-space:nowrap;flex-shrink:0}' +
  '.ct-badge.buyer{background:#eff6ff;color:#1e40af}' +
  '.ct-badge.seller{background:#fef2f2;color:#991b1b}' +
  '.ct-badge.both{background:#f5f3ff;color:#6b21a8}' +
  '.ct-badge.owed{background:#fef2f2;color:#991b1b}' +
  '.ct-badge.clean{background:#ecfdf5;color:#166534}' +
  '.ct-badge.worker-active{background:#ecfdf5;color:#166534}' +
  '.ct-badge.worker-inactive{background:#f1f5f9;color:#64748b}' +
  '.ct-row2{display:flex;align-items:center;gap:5px;flex-wrap:wrap;font-size:10.5px}' +
  '.ct-stat{display:inline-flex;align-items:center;gap:2px;padding:2px 7px;border-radius:9999px;background:#f1f5f9;font-size:10px;font-weight:700}' +
  '.ct-stat.g{background:#ecfdf5;color:#065f46}' +
  '.ct-stat.r{background:#fef2f2;color:#991b1b}' +
  '.ct-stat.b{background:#eff6ff;color:#1e40af}' +
  '.ct-stat.o{background:#fffbeb;color:#92400e}' +
  '.ct-stat strong{font-weight:900;font-size:11px}' +
  '.ct-body{display:none;padding:0 12px 12px;border-top:1px dashed #e2e8f0;padding-top:10px}' +
  '.ct-card.expanded .ct-body{display:block}' +
  '.ct-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px}' +
  '.ct-info-item{background:#f8fafc;padding:8px 10px;border-radius:8px;border-right:2px solid #3b82f6}' +
  '.ct-info-l{font-size:9.5px;color:#64748b;font-weight:700;margin-bottom:2px}' +
  '.ct-info-v{font-size:11.5px;color:#0f172a;font-weight:800;word-break:break-word}' +
  '.ct-info-item.worker{border-right-color:#f59e0b}' +
  '.ct-section{margin-bottom:10px}' +
  '.ct-section-title{font-size:10.5px;font-weight:900;color:#0f766e;margin-bottom:6px;display:flex;align-items:center;gap:5px;text-transform:uppercase;letter-spacing:.4px}' +
  '.ct-section-title::before{content:"";width:3px;height:11px;background:#0f766e;border-radius:2px}' +
  '.ct-table{width:100%;border-collapse:collapse;font-size:11px}' +
  '.ct-table td{padding:5px 6px;border-bottom:1px solid #f1f5f9;color:#334155;font-weight:600}' +
  '.ct-table td.lbl{color:#64748b;font-weight:700;width:60%}' +
  '.ct-table td.val{text-align:left;direction:ltr;font-variant-numeric:tabular-nums;font-weight:900}' +
  '.ct-table tr.total td{border-top:2px solid #cbd5e1;font-weight:900;font-size:12px;padding-top:8px}' +
  '.ct-table tr.total.owed td.val{color:#ef4444}' +
  '.ct-table tr.total.clean td.val{color:#10b981}' +
  '.ct-payments-table{width:100%;border-collapse:collapse;font-size:11px;background:#f8fafc;border-radius:8px;overflow:hidden}' +
  '.ct-payments-table th{background:#f1f5f9;color:#0f172a;padding:6px;font-size:10px;font-weight:800;text-align:right;border-bottom:1px solid #e2e8f0}' +
  '.ct-payments-table td{padding:6px;border-bottom:1px solid #f1f5f9;color:#334155;font-weight:600}' +
  '.ct-payments-table tr:last-child td{border-bottom:none}' +
  '.ct-payments-table .num{text-align:left;direction:ltr;font-variant-numeric:tabular-nums;font-weight:800}' +
  '.ct-actions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;padding-top:8px;border-top:1px dashed #e2e8f0;margin-top:8px}' +
  '.ct-actions button{padding:7px;border:none;border-radius:8px;font-family:inherit;font-size:10.5px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:3px}' +
  '.ct-act-pay{background:#ecfdf5;color:#166534}' +
  '.ct-act-edit{background:#eff6ff;color:#1e40af}' +
  '.ct-act-del{background:#fef2f2;color:#991b1b}' +
  '.ct-actions.two{grid-template-columns:1fr 1fr}' +
  '.ct-empty{text-align:center;padding:48px 24px;background:#fff;border-radius:12px;border:1px dashed #cbd5e1}' +
  '.ct-empty-ic{font-size:56px;line-height:1;display:block;margin-bottom:12px;opacity:.6}' +
  '.ct-empty-t{font-size:14px;font-weight:900;margin-bottom:6px}' +
  '.ct-empty-x{font-size:12px;color:#64748b;font-weight:600;margin:0 auto 16px;max-width:300px}' +
  '.ct-btn{background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;border:none;padding:9px 18px;border-radius:9999px;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer;box-shadow:0 3px 10px rgba(15,118,110,.3)}' +
  '.ct-kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px}' +
  '.ct-kpi{background:#f0fdfa;border-radius:10px;padding:8px 4px;text-align:center;border-bottom:2px solid #0f766e}' +
  '.ct-kpi.g{border-color:#10b981;background:#ecfdf5}' +
  '.ct-kpi.r{border-color:#ef4444;background:#fef2f2}' +
  '.ct-kpi.o{border-color:#f59e0b;background:#fffbeb}' +
  '.ct-kpi.b{border-color:#3b82f6;background:#eff6ff}' +
  '.ct-kpi-ic{font-size:14px;margin-bottom:2px}' +
  '.ct-kpi-v{font-size:14px;font-weight:900;line-height:1.1}' +
  '.ct-kpi-l{font-size:9px;color:#64748b;font-weight:700;margin-top:2px}' +
  '.ct-kpi.g .ct-kpi-v{color:#059669}' +
  '.ct-kpi.r .ct-kpi-v{color:#dc2626}' +
  '.ct-kpi.o .ct-kpi-v{color:#d97706}' +
  '.ct-kpi.b .ct-kpi-v{color:#2563eb}' +
  '.ct-modal-wrap{position:fixed;inset:0;z-index:2000;display:flex;align-items:flex-end;justify-content:center;opacity:0;pointer-events:none;transition:opacity .2s}' +
  '.ct-modal-wrap.on{opacity:1;pointer-events:auto}' +
  '.ct-modal-bg{position:absolute;inset:0;background:rgba(15,23,42,.55)}' +
  '.ct-modal-box{position:relative;background:#fff;width:100%;max-width:760px;border-radius:24px 24px 0 0;padding:14px;max-height:95vh;overflow-y:auto;transform:translateY(30px);transition:transform .3s;padding-bottom:calc(20px + env(safe-area-inset-bottom,0px));box-sizing:border-box}' +
  '.ct-modal-wrap.on .ct-modal-box{transform:translateY(0)}' +
  '.ct-modal-box.ct-sheet{border-radius:16px;max-width:440px;margin:auto}' +
  '.ct-modal-hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #e2e8f0}' +
  '.ct-modal-t{font-size:14px;font-weight:800}' +
  '.ct-modal-x{background:#f1f5f9;border:none;width:32px;height:32px;border-radius:50%;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center}' +
  '.ct-fg{margin-bottom:10px}' +
  '.ct-fl{font-size:11px;font-weight:800;margin-bottom:4px;display:flex;align-items:center;gap:4px}' +
  '.ct-fi,.ct-fs,.ct-ft{display:block;width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:12px;font-size:13px;font-family:inherit;background:#f1f5f9;color:#0f172a;box-sizing:border-box}' +
  '.ct-fi:focus,.ct-fs:focus,.ct-ft:focus{outline:none;border-color:#0f766e;background:#fff;box-shadow:0 0 0 3px #f0fdfa}' +
  '.ct-ft{resize:vertical;min-height:55px;line-height:1.6}' +
  '.ct-fr{display:grid;grid-template-columns:1fr 1fr;gap:8px}' +
  '.ct-save{width:100%;padding:14px;border:none;border-radius:12px;background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;font-family:inherit;font-size:14px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:16px}' +
  '.ct-check{display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer}' +
  '.ct-check input{width:18px;height:18px;accent-color:#0f766e}' +
  '@media (max-width:420px){.ct-kpi-grid{grid-template-columns:1fr 1fr}}';
  var s = document.createElement('style');
  s.id = 'ct-styles';
  s.textContent = css;
  document.head.appendChild(s);
}

/* ═══════════════════════════════════════════════
   محاسبه آمار مشتری
   ═══════════════════════════════════════════════ */
function getCustomerStats(name){
  var sales = getSales();
  var finance = getFinanceTransactions();
  var totalSales = 0, paidSales = 0, pendingSales = 0, salesCount = 0;
  var purchasesQty = 0, lastDate = '';

  for(var i = 0; i < sales.length; i++){
    var s = sales[i];
    var partyName = s.party || s.buyer;
    if(partyName !== name) continue;
    salesCount++;
    var amt = s.total || (s.qty || 0) * (s.price || 0);
    totalSales += amt;
    if(s.status === 'pending' || s.payStatus === 'نسیه') pendingSales += amt;
    else paidSales += amt;
    purchasesQty += s.quantity || s.qty || 0;
    if(!lastDate || UI.jToC(s.date) > UI.jToC(lastDate)) lastDate = s.date;
  }

  var finIncome = 0, finExpense = 0, finCount = 0;
  for(i = 0; i < finance.length; i++){
    var f = finance[i];
    if(f.party !== name) continue;
    finCount++;
    var isIncome = f.transType === 'income' || f.kind === 'finance_income';
    if(isIncome) finIncome += f.amount || 0;
    else finExpense += f.amount || 0;
  }

  return {
    totalValue: totalSales + finIncome,
    totalPaid: paidSales,
    owed: totalSales - paidSales,
    salesCount: salesCount,
    purchasesQty: purchasesQty,
    lastDate: lastDate,
    finIncome: finIncome,
    finExpense: finExpense,
    finCount: finCount
  };
}

/* ═══════════════════════════════════════════════
   آمار کارگر
   ═══════════════════════════════════════════════ */
function getWorkerStats(w){
  var payments = w.payments || [];
  var totalPaid = 0, lastPayDate = '';
  var now = new Date();
  var currentMonth = now.getFullYear() + '/' + String(now.getMonth() + 1).padStart(2, '0');
  var monthPaid = 0, paymentsThisMonth = 0;

  for(var i = 0; i < payments.length; i++){
    var p = payments[i];
    totalPaid += p.amount || 0;
    if(p.date && p.date.indexOf(currentMonth) === 0){
      monthPaid += p.amount || 0;
      paymentsThisMonth++;
    }
    if(!lastPayDate || UI.jToC(p.date) > UI.jToC(lastPayDate)) lastPayDate = p.date;
  }

  var monthly = w.salary || 0;
  return {
    totalPaid: totalPaid,
    monthPaid: monthPaid,
    monthly: monthly,
    paymentsCount: payments.length,
    lastPayDate: lastPayDate,
    paymentsThisMonth: paymentsThisMonth,
    monthRemaining: Math.max(0, monthly - monthPaid)
  };
}

/* ═══════════════════════════════════════════════
   رندر تب مشتری‌ها
   ═══════════════════════════════════════════════ */
function renderCustomersTab(){
  var customers = getParties();

  if(!customers.length){
    return '<div class="ct-empty">' +
      '<div class="ct-empty-ic">👥</div>' +
      '<div class="ct-empty-t">هنوز مشتری‌ای نداری</div>' +
      '<div class="ct-empty-x">وقتی فروش یا تراکنش مالی ثبت کنی و طرف حساب انتخاب کنی، اینجا ظاهر میشه</div>' +
      '<button class="ct-btn" data-ct="go-sales">💰 رفتن به فروش</button>' +
    '</div>';
  }

  var withStats = customers.map(function(c){
    return { customer: c, stats: getCustomerStats(c.name) };
  });

  var totalValue = 0, totalOwed = 0, totalPaid = 0;
  for(var i = 0; i < withStats.length; i++){
    totalValue += withStats[i].stats.totalValue;
    totalOwed += withStats[i].stats.owed;
    totalPaid += withStats[i].stats.totalPaid;
  }
  var owedCount = withStats.filter(function(x){ return x.stats.owed > 0; }).length;

  var kpiHtml = '<div class="ct-kpi-grid">' +
    '<div class="ct-kpi b"><div class="ct-kpi-ic">👥</div><div class="ct-kpi-v">' + fa(withStats.length) + '</div><div class="ct-kpi-l">مشتری</div></div>' +
    '<div class="ct-kpi g"><div class="ct-kpi-ic">📈</div><div class="ct-kpi-v">' + faMoney(totalValue) + '</div><div class="ct-kpi-l">کل معاملات</div></div>' +
    '<div class="ct-kpi o"><div class="ct-kpi-ic">✅</div><div class="ct-kpi-v">' + faMoney(totalPaid) + '</div><div class="ct-kpi-l">پرداخت‌شده</div></div>' +
    '<div class="ct-kpi r"><div class="ct-kpi-ic">⚠️</div><div class="ct-kpi-v">' + faMoney(totalOwed) + '</div><div class="ct-kpi-l">بدهی</div></div>' +
  '</div>';

  var filters = '<div class="ct-filters">' +
    '<button class="ct-chip ' + (_state.filter === 'all' ? 'on' : '') + '" data-ct="filter" data-f="all">👥 همه (' + fa(withStats.length) + ')</button>' +
    '<button class="ct-chip ' + (_state.filter === 'owed' ? 'on' : '') + '" data-ct="filter" data-f="owed">⚠️ بدهکار (' + fa(owedCount) + ')</button>' +
    '<button class="ct-chip ' + (_state.filter === 'clean' ? 'on' : '') + '" data-ct="filter" data-f="clean">✅ تسویه</button>' +
    '<button class="ct-chip ' + (_state.filter === 'buyer' ? 'on' : '') + '" data-ct="filter" data-f="buyer">🛒 خریدار</button>' +
    '<button class="ct-chip ' + (_state.filter === 'seller' ? 'on' : '') + '" data-ct="filter" data-f="seller">💰 فروشنده</button>' +
  '</div>';

  withStats.sort(function(a, b){ return b.stats.owed - a.stats.owed; });

  var filtered = withStats;
  if(_state.filter === 'owed') filtered = withStats.filter(function(x){ return x.stats.owed > 0; });
  else if(_state.filter === 'clean') filtered = withStats.filter(function(x){ return x.stats.owed <= 0; });
  else if(_state.filter === 'buyer') filtered = withStats.filter(function(x){
    return x.customer.type === 'buyer' || x.customer.type === 'both' || !x.customer.type;
  });
  else if(_state.filter === 'seller') filtered = withStats.filter(function(x){
    return x.customer.type === 'seller' || x.customer.type === 'both';
  });

  if(!filtered.length){
    return kpiHtml + filters + '<div class="ct-empty" style="padding:30px 20px">' +
      '<div class="ct-empty-ic" style="font-size:40px">🔍</div>' +
      '<div class="ct-empty-t">موردی برای این فیلتر نیست</div>' +
    '</div>';
  }

  var cardsHtml = '';
  for(i = 0; i < filtered.length; i++) cardsHtml += renderCustomerCard(filtered[i]);

  return kpiHtml + filters + '<div data-ct-list>' + cardsHtml + '</div>';
}

function renderCustomerCard(item){
  var c = item.customer;
  var st = item.stats;
  var isOwed = st.owed > 0;
  var cardCls = isOwed ? 'owed' : 'customer';

  var typeBadge = '';
  if(c.type === 'buyer') typeBadge = '<span class="ct-badge buyer">🛒 خریدار</span>';
  else if(c.type === 'seller') typeBadge = '<span class="ct-badge seller">💰 فروشنده</span>';
  else if(c.type === 'both') typeBadge = '<span class="ct-badge both">🔄 هر دو</span>';

  var owedBadge = isOwed
    ? '<span class="ct-badge owed">⚠️ بدهکار</span>'
    : '<span class="ct-badge clean">✅ تسویه</span>';

  var key = 'c_' + c.name;
  var isOpen = !!_state.expanded[key];

  return '<div class="ct-card ' + cardCls + ' ' + (isOpen ? 'expanded' : '') + '" data-ct-card="' + esc(key) + '">' +
    '<div class="ct-card-hd" data-ct="toggle" data-key="' + esc(key) + '">' +
      '<div class="ct-row1">' +
        '<div class="ct-name">' +
          '<div class="ct-avatar customer">👤</div>' +
          '<span class="ct-name-text">' + esc(c.name) + '</span>' +
        '</div>' +
        '<div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end">' + typeBadge + owedBadge + '</div>' +
      '</div>' +
      '<div class="ct-row2">' +
        '<span class="ct-stat b">💰 <strong>' + faMoney(st.totalValue) + '</strong></span>' +
        '<span class="ct-stat g">✅ <strong>' + faMoney(st.totalPaid) + '</strong></span>' +
        (isOwed ? '<span class="ct-stat r">⚠️ <strong>' + faMoney(st.owed) + '</strong></span>' : '') +
      '</div>' +
    '</div>' +
    '<div class="ct-body">' +
      (c.phone || c.city ?
        '<div class="ct-info-grid">' +
          (c.phone ? '<div class="ct-info-item"><div class="ct-info-l">📞 تلفن</div><div class="ct-info-v">' + esc(c.phone) + '</div></div>' : '') +
          (c.city ? '<div class="ct-info-item"><div class="ct-info-l">📍 شهر</div><div class="ct-info-v">' + esc(c.city) + '</div></div>' : '') +
        '</div>' : '') +
      '<div class="ct-section">' +
        '<div class="ct-section-title">📊 خلاصه مالی</div>' +
        '<table class="ct-table">' +
          '<tr><td class="lbl">تعداد فروش</td><td class="val">' + fa(st.salesCount) + ' فاکتور</td></tr>' +
          '<tr><td class="lbl">مقدار خرید</td><td class="val">' + fa(st.purchasesQty) + '</td></tr>' +
          (st.lastDate ? '<tr><td class="lbl">آخرین معامله</td><td class="val">' + esc(st.lastDate) + '</td></tr>' : '') +
          '<tr><td class="lbl">💰 کل ارزش</td><td class="val">' + fa(st.totalValue) + '</td></tr>' +
          '<tr><td class="lbl">✅ پرداخت‌شده</td><td class="val">' + fa(st.totalPaid) + '</td></tr>' +
          '<tr class="total ' + (isOwed ? 'owed' : 'clean') + '"><td class="lbl">' + (isOwed ? '⚠️ بدهی' : '✅ تسویه') + '</td><td class="val">' + fa(Math.abs(st.owed)) + '</td></tr>' +
        '</table>' +
      '</div>' +
      (c.notes ? '<div class="ct-info-item" style="margin-bottom:10px"><div class="ct-info-l">📝 یادداشت</div><div class="ct-info-v">' + esc(c.notes) + '</div></div>' : '') +
      '<div class="ct-actions two">' +
        '<button class="ct-act-edit" data-ct="edit-customer" data-id="' + sid(c.id) + '">✏️ ویرایش</button>' +
        '<button class="ct-act-del" data-ct="del-customer" data-id="' + sid(c.id) + '">🗑️ حذف</button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

/* ═══════════════════════════════════════════════
   رندر تب کارگرها
   ═══════════════════════════════════════════════ */
function renderWorkersTab(){
  var workers = getWorkers();

  if(!workers.length){
    return '<div class="ct-empty">' +
      '<div class="ct-empty-ic">👷</div>' +
      '<div class="ct-empty-t">هنوز کارگری ثبت نشده</div>' +
      '<div class="ct-empty-x">اولین کارگر خودت رو اضافه کن و حقوق و پرداخت‌هاش رو مدیریت کن</div>' +
      '<button class="ct-btn" data-ct="open-add-worker">➕ افزودن کارگر</button>' +
    '</div>';
  }

  var withStats = workers.map(function(w){
    return { worker: w, stats: getWorkerStats(w) };
  });

  var totalMonthly = 0, totalPaid = 0, totalRemaining = 0, activeCount = 0;
  for(var i = 0; i < withStats.length; i++){
    totalMonthly += withStats[i].stats.monthly;
    totalPaid += withStats[i].stats.totalPaid;
    totalRemaining += withStats[i].stats.monthRemaining;
    if(withStats[i].worker.active !== false) activeCount++;
  }

  var kpiHtml = '<div class="ct-kpi-grid">' +
    '<div class="ct-kpi o"><div class="ct-kpi-ic">👷</div><div class="ct-kpi-v">' + fa(activeCount) + '</div><div class="ct-kpi-l">کارگر فعال</div></div>' +
    '<div class="ct-kpi b"><div class="ct-kpi-ic">💼</div><div class="ct-kpi-v">' + faMoney(totalMonthly) + '</div><div class="ct-kpi-l">حقوق ماهانه</div></div>' +
    '<div class="ct-kpi g"><div class="ct-kpi-ic">✅</div><div class="ct-kpi-v">' + faMoney(totalPaid) + '</div><div class="ct-kpi-l">کل پرداخت</div></div>' +
    '<div class="ct-kpi r"><div class="ct-kpi-ic">⏳</div><div class="ct-kpi-v">' + faMoney(totalRemaining) + '</div><div class="ct-kpi-l">مانده این ماه</div></div>' +
  '</div>';

  var cardsHtml = '';
  for(i = 0; i < withStats.length; i++) cardsHtml += renderWorkerCard(withStats[i]);

  return kpiHtml + '<div data-ct-list>' + cardsHtml + '</div>';
}

function renderWorkerCard(item){
  var w = item.worker;
  var st = item.stats;
  var isActive = w.active !== false;
  var cardCls = isActive ? 'worker' : '';
  var statusBadge = isActive
    ? '<span class="ct-badge worker-active">✅ فعال</span>'
    : '<span class="ct-badge worker-inactive">⏸️ غیرفعال</span>';

  var key = 'w_' + w.id;
  var isOpen = !!_state.expanded[key];

  return '<div class="ct-card ' + cardCls + ' ' + (isOpen ? 'expanded' : '') + '" data-ct-card="' + esc(key) + '">' +
    '<div class="ct-card-hd" data-ct="toggle" data-key="' + esc(key) + '">' +
      '<div class="ct-row1">' +
        '<div class="ct-name">' +
          '<div class="ct-avatar worker">' + (w.icon || '👷') + '</div>' +
          '<span class="ct-name-text">' + esc(w.name) + '</span>' +
        '</div>' +
        statusBadge +
      '</div>' +
      '<div class="ct-row2">' +
        (w.role ? '<span class="ct-stat">' + esc(w.role) + '</span>' : '') +
        '<span class="ct-stat o">💼 <strong>' + faMoney(st.monthly) + '</strong></span>' +
        '<span class="ct-stat g">✅ <strong>' + faMoney(st.totalPaid) + '</strong></span>' +
        (st.monthRemaining > 0 ? '<span class="ct-stat r">⏳ <strong>' + faMoney(st.monthRemaining) + '</strong></span>' : '') +
      '</div>' +
    '</div>' +
    '<div class="ct-body">' +
      '<div class="ct-info-grid">' +
        (w.phone ? '<div class="ct-info-item worker"><div class="ct-info-l">📞 تلفن</div><div class="ct-info-v">' + esc(w.phone) + '</div></div>' : '') +
        (w.role ? '<div class="ct-info-item worker"><div class="ct-info-l">💼 سمت</div><div class="ct-info-v">' + esc(w.role) + '</div></div>' : '') +
        (w.hireDate ? '<div class="ct-info-item worker"><div class="ct-info-l">📅 تاریخ استخدام</div><div class="ct-info-v">' + esc(w.hireDate) + '</div></div>' : '') +
        (w.nationalId ? '<div class="ct-info-item worker"><div class="ct-info-l">🆔 کد ملی</div><div class="ct-info-v">' + esc(w.nationalId) + '</div></div>' : '') +
      '</div>' +
      '<div class="ct-section">' +
        '<div class="ct-section-title">💰 وضعیت حقوق</div>' +
        '<table class="ct-table">' +
          '<tr><td class="lbl">حقوق ماهانه</td><td class="val">' + fa(st.monthly) + ' تومان</td></tr>' +
          '<tr><td class="lbl">پرداختی این ماه</td><td class="val">' + fa(st.monthPaid) + ' تومان</td></tr>' +
          '<tr><td class="lbl">تعداد پرداخت این ماه</td><td class="val">' + fa(st.paymentsThisMonth) + ' بار</td></tr>' +
          '<tr class="total ' + (st.monthRemaining > 0 ? 'owed' : 'clean') + '">' +
            '<td class="lbl">' + (st.monthRemaining > 0 ? '⏳ مانده این ماه' : '✅ تسویه این ماه') + '</td>' +
            '<td class="val">' + fa(st.monthRemaining) + '</td>' +
          '</tr>' +
        '</table>' +
      '</div>' +
      (w.payments && w.payments.length ?
        '<div class="ct-section">' +
          '<div class="ct-section-title">📋 آخرین پرداخت‌ها</div>' +
          renderWorkerPayments(w) +
        '</div>' : '') +
      (w.notes ? '<div class="ct-info-item worker" style="margin-bottom:10px"><div class="ct-info-l">📝 یادداشت</div><div class="ct-info-v">' + esc(w.notes) + '</div></div>' : '') +
      '<div class="ct-actions">' +
        '<button class="ct-act-pay" data-ct="add-payment" data-id="' + sid(w.id) + '">➕ پرداخت</button>' +
        '<button class="ct-act-edit" data-ct="edit-worker" data-id="' + sid(w.id) + '">✏️ ویرایش</button>' +
        '<button class="ct-act-del" data-ct="del-worker" data-id="' + sid(w.id) + '">🗑️ حذف</button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function renderWorkerPayments(w){
  var payments = (w.payments || []).slice().sort(function(a, b){
    return UI.jToC(b.date) - UI.jToC(a.date);
  }).slice(0, 6);

  var rows = '';
  for(var i = 0; i < payments.length; i++){
    var p = payments[i];
    rows += '<tr>' +
      '<td>' + esc(p.date || '—') + '</td>' +
      '<td>' + esc(p.note || '—') + '</td>' +
      '<td class="num">' + fmtShort(p.amount || 0) + '</td>' +
      '<td style="text-align:center"><button data-ct="del-payment" data-wid="' + sid(w.id) + '" data-pid="' + sid(p.id) + '" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:12px;padding:2px">✕</button></td>' +
    '</tr>';
  }
  return '<table class="ct-payments-table">' +
    '<thead><tr><th>تاریخ</th><th>توضیح</th><th class="num">مبلغ</th><th></th></tr></thead>' +
    '<tbody>' + rows + '</tbody>' +
  '</table>';
}

/* ═══════════════════════════════════════════════
   Page Render
   ═══════════════════════════════════════════════ */
function renderPage(){
  var tab = _state.tab;
  var content = '';
  if(tab === 'customers') content = renderCustomersTab();
  else content = renderWorkersTab();

  var addBtn = tab === 'workers'
    ? '<button class="ct-add-btn" data-ct="open-add-worker">➕ <span>کارگر جدید</span></button>'
    : '';

  return '<div class="page ct-page" data-ct-root>' +
    '<div class="ct-header">' +
      '<div><div class="ct-title">👥 پرونده‌ها</div>' +
      '<div class="ct-sub">مشتری‌ها و کارگرها</div></div>' +
      addBtn +
    '</div>' +
    '<div class="ct-tabs">' +
      '<button class="ct-tab ' + (tab === 'customers' ? 'on' : '') + '" data-ct="tab" data-t="customers">👤 مشتری‌ها</button>' +
      '<button class="ct-tab ' + (tab === 'workers' ? 'on' : '') + '" data-ct="tab" data-t="workers">👷 کارگرها</button>' +
    '</div>' +
    content +
  '</div>';
}

function renderRoot(){
  var root = document.querySelector('[data-ct-root]');
  if(!root) return;
  var fresh = document.createElement('div');
  fresh.innerHTML = renderPage();
  root.parentNode.replaceChild(fresh.firstElementChild, root);
}

/* ═══════════════════════════════════════════════
   Form: Customer
   ═══════════════════════════════════════════════ */
function openEditCustomer(id){
  var c = id ? Store.find('parties', id) : null;
  if(id && !c){ toast('❌ پیدا نشد', 'error'); return; }

  var html = '<div class="ct-modal-hd">' +
    '<div class="ct-modal-t">' + (id ? '✏️ ویرایش مشتری' : '➕ مشتری جدید') + '</div>' +
    '<button class="ct-modal-x" data-ct="close-modal" data-mid="ct-edit-customer">✕</button>' +
  '</div>' +
  '<div class="ct-fg"><label class="ct-fl">👤 نام <span style="color:#ef4444">*</span></label>' +
    '<input class="ct-fi" id="ctCName" value="' + (c ? esc(c.name) : '') + '" placeholder="نام مشتری"></div>' +
  '<div class="ct-fr">' +
    '<div class="ct-fg"><label class="ct-fl">📞 تلفن</label>' +
      '<input class="ct-fi" id="ctCPhone" value="' + (c ? esc(c.phone || '') : '') + '" placeholder="۰۹۱۲..." inputmode="tel"></div>' +
    '<div class="ct-fg"><label class="ct-fl">📍 شهر</label>' +
      '<input class="ct-fi" id="ctCCity" value="' + (c ? esc(c.city || '') : '') + '" placeholder="مثلاً قزوین"></div>' +
  '</div>' +
  '<div class="ct-fg"><label class="ct-fl">🏷️ نوع</label>' +
    '<select class="ct-fs" id="ctCType">' +
      '<option value="buyer" ' + (c && c.type === 'buyer' ? 'selected' : '') + '>🛒 خریدار</option>' +
      '<option value="seller" ' + (c && c.type === 'seller' ? 'selected' : '') + '>💰 فروشنده</option>' +
      '<option value="both" ' + (c && c.type === 'both' ? 'selected' : '') + '>🔄 هر دو</option>' +
    '</select></div>' +
  '<div class="ct-fg"><label class="ct-fl">📝 یادداشت</label>' +
    '<textarea class="ct-ft" id="ctCNotes" placeholder="نکات مهم...">' + (c ? esc(c.notes || '') : '') + '</textarea></div>' +
  (id ?
    '<div style="background:#fffbeb;padding:10px 12px;border-radius:10px;margin-bottom:12px;font-size:10.5px;font-weight:700;color:#92400e;line-height:1.7;border-right:3px solid #f59e0b">' +
      '⚠️ <b>توجه:</b> با تغییر نام، تمام فروش‌ها و تراکنش‌های مالی مرتبط هم به‌روز می‌شن.' +
    '</div>' : '') +
  '<button class="ct-save" data-ct="save-customer" data-id="' + (id ? sid(id) : '') + '">💾 ذخیره</button>';

  openModal('ct-edit-customer', html, { sheet: true });
}

function saveCustomer(id){
  var name = (document.getElementById('ctCName').value || '').trim();
  var phone = (document.getElementById('ctCPhone').value || '').trim();
  var city = (document.getElementById('ctCCity').value || '').trim();
  var type = document.getElementById('ctCType').value;
  var notes = (document.getElementById('ctCNotes').value || '').trim();

  if(!name){ toast('❌ نام اجباری', 'error'); return; }
  if(name.length < 2){ toast('❌ نام حداقل ۲ حرف', 'error'); return; }

  var existing = id ? Store.find('parties', id) : null;
  var oldName = existing ? existing.name : null;
  var renamed = id && oldName !== name;

  /* چک تکراری */
  if(!id || renamed){
    var all = getParties();
    for(var k = 0; k < all.length; k++){
      if(all[k].name === name && (!id || !sameId(all[k].id, id))){
        toast('⚠️ این نام قبلاً وجود داره', 'error');
        return;
      }
    }
  }

  /* ذخیره */
  if(id && existing){
    Store.update('parties', id, { name: name, phone: phone, city: city, type: type, notes: notes });

    /* آپدیت نام در فروش‌ها */
    if(renamed){
      var sales = Store.all('sales');
      sales.forEach(function(s){
        if(s.party === oldName) Store.update('sales', s.id, { party: name });
        if(s.buyer === oldName) Store.update('sales', s.id, { buyer: name });
      });
      /* آپدیت در تراکنش‌ها */
      var tx = Store.all('transactions');
      tx.forEach(function(t){
        if(t.party === oldName) Store.update('transactions', t.id, { party: name });
      });
    }
    toast(renamed ? '✅ نام و اطلاعات به‌روز شد' : '✅ ذخیره شد', 'success');
  } else {
    Store.add('parties', {
      name: name, phone: phone, city: city,
      type: type || 'buyer', notes: notes, isLocked: false
    });
    toast('✅ اضافه شد', 'success');
  }

  closeModal('ct-edit-customer');
  renderRoot();
}

/* ═══════════════════════════════════════════════
   Form: Worker
   ═══════════════════════════════════════════════ */
function openAddWorker(){ openWorkerForm(); }
function openEditWorker(id){ openWorkerForm(id); }

function openWorkerForm(id){
  var w = id ? Store.find('workers', id) : null;
  if(id && !w){ toast('❌ پیدا نشد', 'error'); return; }

  var salaryVal = (w && w.salary) ? Number(w.salary).toLocaleString('en-US') : '';

  var html = '<div class="ct-modal-hd">' +
    '<div class="ct-modal-t">' + (id ? '✏️ ویرایش کارگر' : '👷 کارگر جدید') + '</div>' +
    '<button class="ct-modal-x" data-ct="close-modal" data-mid="ct-worker-edit">✕</button>' +
  '</div>' +
  '<div class="ct-fg"><label class="ct-fl">👤 نام <span style="color:#ef4444">*</span></label>' +
    '<input class="ct-fi" id="ctWName" value="' + (w ? esc(w.name) : '') + '" placeholder="نام و نام خانوادگی"></div>' +
  '<div class="ct-fr">' +
    '<div class="ct-fg"><label class="ct-fl">📞 تلفن</label>' +
      '<input class="ct-fi" id="ctWPhone" value="' + (w ? esc(w.phone || '') : '') + '" inputmode="tel"></div>' +
    '<div class="ct-fg"><label class="ct-fl">💼 سمت</label>' +
      '<input class="ct-fi" id="ctWRole" value="' + (w ? esc(w.role || '') : '') + '" placeholder="مثلاً: کارگر روزمزد"></div>' +
  '</div>' +
  '<div class="ct-fr">' +
    '<div class="ct-fg"><label class="ct-fl">💰 حقوق ماهانه (تومان)</label>' +
      '<input class="ct-fi" id="ctWSalary" inputmode="numeric" value="' + salaryVal + '" placeholder="۱۵,۰۰۰,۰۰۰"></div>' +
    '<div class="ct-fg"><label class="ct-fl">📅 تاریخ استخدام</label>' +
      '<input class="ct-fi" id="ctWHireDate" value="' + (w ? esc(w.hireDate || '') : todayStr) + '"></div>' +
  '</div>' +
  '<div class="ct-fg"><label class="ct-fl">🆔 کد ملی</label>' +
    '<input class="ct-fi" id="ctWNational" value="' + (w ? esc(w.nationalId || '') : '') + '" inputmode="numeric" placeholder="۱۰ رقم"></div>' +
  '<div class="ct-fg"><label class="ct-fl">📝 یادداشت</label>' +
    '<textarea class="ct-ft" id="ctWNotes" placeholder="نکات مهم...">' + (w ? esc(w.notes || '') : '') + '</textarea></div>' +
  '<div class="ct-fg"><label class="ct-check"><input type="checkbox" id="ctWActive" ' + (!w || w.active !== false ? 'checked' : '') + '> <span>✅ فعال</span></label></div>' +
  '<button class="ct-save" data-ct="save-worker" data-id="' + (id ? sid(id) : '') + '">💾 ذخیره</button>';

  openModal('ct-worker-edit', html, { sheet: true });
}

function saveWorker(id){
  var name = (document.getElementById('ctWName').value || '').trim();
  if(!name){ toast('❌ نام اجباری', 'error'); return; }

  var data = {
    name: name,
    phone: (document.getElementById('ctWPhone').value || '').trim(),
    role: (document.getElementById('ctWRole').value || '').trim(),
    salary: UI.parseNum(document.getElementById('ctWSalary').value),
    hireDate: (document.getElementById('ctWHireDate').value || '').trim(),
    nationalId: (document.getElementById('ctWNational').value || '').trim(),
    notes: (document.getElementById('ctWNotes').value || '').trim(),
    active: document.getElementById('ctWActive').checked
  };

  if(id && Store.find('workers', id)){
    Store.update('workers', id, data);
    toast('✅ ویرایش شد', 'success');
  } else {
    data.payments = [];
    data.icon = '👷';
    Store.add('workers', data);
    toast('✅ اضافه شد', 'success');
  }

  closeModal('ct-worker-edit');
  renderRoot();
}

function deleteWorker(id){
  var w = Store.find('workers', id);
  if(!w) return;
  if(!confirm('کارگر «' + w.name + '» و همه پرداخت‌هاش حذف شود؟')) return;
  Store.remove('workers', id);
  toast('🗑️ حذف شد', 'success');
  renderRoot();
}

/* ═══════════════════════════════════════════════
   Payment
   ═══════════════════════════════════════════════ */
function openAddPayment(workerId){
  var w = Store.find('workers', workerId);
  if(!w){ toast('❌ پیدا نشد', 'error'); return; }

  var st = getWorkerStats(w);

  var html = '<div class="ct-modal-hd">' +
    '<div class="ct-modal-t">➕ پرداخت به ' + esc(w.name) + '</div>' +
    '<button class="ct-modal-x" data-ct="close-modal" data-mid="ct-payment">✕</button>' +
  '</div>' +
  '<div style="background:#ecfdf5;padding:10px 12px;border-radius:10px;margin-bottom:12px;font-size:11.5px;font-weight:700;color:#065f46;line-height:1.7;border-right:3px solid #10b981">' +
    '💰 حقوق ماهانه: <b>' + fa(st.monthly) + '</b> تومان<br>' +
    '✅ این ماه پرداخت‌شده: <b>' + fa(st.monthPaid) + '</b> تومان<br>' +
    '⏳ مانده این ماه: <b style="color:#dc2626">' + fa(st.monthRemaining) + '</b> تومان' +
  '</div>' +
  '<div class="ct-fg"><label class="ct-fl">📅 تاریخ پرداخت</label>' +
    '<input class="ct-fi" id="ctPayDate" value="' + todayStr + '"></div>' +
  '<div class="ct-fg"><label class="ct-fl">💰 مبلغ (تومان) <span style="color:#ef4444">*</span></label>' +
    '<input class="ct-fi" id="ctPayAmount" inputmode="numeric" placeholder="۵,۰۰۰,۰۰۰" value="' + (st.monthRemaining > 0 ? st.monthRemaining.toLocaleString('en-US') : '') + '"></div>' +
  '<div class="ct-fg"><label class="ct-fl">📝 توضیح</label>' +
    '<input class="ct-fi" id="ctPayNote" placeholder="مثلاً: حقوق مهر ماه"></div>' +
  '<div class="ct-fr">' +
    '<button class="ct-save" style="background:#f1f5f9;color:#0f172a;margin-top:0" data-ct="quick-pay" data-id="' + sid(workerId) + '" data-amt="' + st.monthRemaining + '">⚡ پرداخت کامل</button>' +
    '<button class="ct-save" style="margin-top:0" data-ct="save-payment" data-id="' + sid(workerId) + '">💾 ثبت پرداخت</button>' +
  '</div>';

  openModal('ct-payment', html, { sheet: true });
}

function savePayment(workerId){
  var w = Store.find('workers', workerId);
  if(!w) return;

  var date = (document.getElementById('ctPayDate').value || '').trim();
  var amount = UI.parseNum(document.getElementById('ctPayAmount').value);
  var note = (document.getElementById('ctPayNote').value || '').trim();

  if(!date){ toast('❌ تاریخ', 'error'); return; }
  if(amount <= 0){ toast('❌ مبلغ', 'error'); return; }

  var payments = (w.payments || []).slice();
  payments.push({
    id: String(payments.length + 1),
    date: date, amount: amount, note: note
  });
  Store.update('workers', workerId, { payments: payments });

  toast('✅ پرداخت ثبت شد', 'success');
  closeModal('ct-payment');
  renderRoot();
}

function quickPay(workerId, amt){
  var w = Store.find('workers', workerId);
  if(!w) return;
  if(amt <= 0){ toast('⚠️ مانده‌ای وجود نداره', 'warn'); return; }
  if(!confirm('پرداخت کامل ' + fa(amt) + ' تومان؟')) return;

  var payments = (w.payments || []).slice();
  payments.push({
    id: String(payments.length + 1),
    date: todayStr, amount: amt, note: 'پرداخت کامل مانده ماه'
  });
  Store.update('workers', workerId, { payments: payments });

  toast('✅ پرداخت کامل انجام شد', 'success');
  closeModal('ct-payment');
  renderRoot();
}

function deletePayment(workerId, paymentId){
  var w = Store.find('workers', workerId);
  if(!w) return;
  if(!confirm('این پرداخت حذف شود؟')) return;

  var payments = (w.payments || []).filter(function(p){
    return !sameId(p.id, paymentId);
  });
  Store.update('workers', workerId, { payments: payments });

  toast('🗑️ حذف شد', 'success');
  renderRoot();
}

/* ═══════════════════════════════════════════════
   Events
   ═══════════════════════════════════════════════ */
document.addEventListener('click', function(e){
  var btn = e.target.closest ? e.target.closest('[data-ct]') : null;
  if(!btn) return;

  var act = btn.dataset.ct;
  var id = sid(btn.dataset.id);
  var mid = btn.dataset.mid;
  var key = btn.dataset.key;

  switch(act){
    case 'tab':
      _state.tab = btn.dataset.t;
      renderRoot();
      break;
    case 'filter':
      _state.filter = btn.dataset.f;
      renderRoot();
      break;
    case 'toggle': {
      _state.expanded[key] = !_state.expanded[key];
      var card = document.querySelector('[data-ct-card="' + key + '"]');
      if(card) card.classList.toggle('expanded', !!_state.expanded[key]);
      break;
    }

    /* مشتری */
    case 'edit-customer': openEditCustomer(id); break;
    case 'save-customer': saveCustomer(id); break;
    case 'del-customer': {
      var c = Store.find('parties', id);
      if(!c) return;
      if(!confirm('مشتری «' + c.name + '» حذف شود؟\n(فروش‌ها و تراکنش‌ها باقی می‌مونن)')) return;
      Store.remove('parties', id);
      toast('🗑️ حذف شد', 'success');
      renderRoot();
      break;
    }
    case 'go-sales':
      if(typeof Router !== 'undefined' && Router.go) Router.go('sales');
      break;

    /* کارگر */
    case 'open-add-worker': openAddWorker(); break;
    case 'edit-worker': openEditWorker(id); break;
    case 'save-worker': saveWorker(id); break;
    case 'del-worker': deleteWorker(id); break;

    /* پرداخت */
    case 'add-payment': openAddPayment(id); break;
    case 'save-payment': savePayment(id); break;
    case 'quick-pay': quickPay(id, +btn.dataset.amt); break;
    case 'del-payment': deletePayment(btn.dataset.wid, btn.dataset.pid); break;

    case 'close-modal': closeModal(mid); break;
  }
});

/* قالب‌بندی خودکار حقوق */
document.addEventListener('input', function(e){
  var t = e.target;
  if(t.id === 'ctWSalary' || t.id === 'ctPayAmount'){
    var v = String(t.value).replace(/[^\d]/g, '');
    if(v === ''){ t.value = ''; return; }
    t.value = Number(v).toLocaleString('en-US');
  }
});

/* ═══════════════════════════════════════════════
   Init
   ═══════════════════════════════════════════════ */
injectStyles();

Router.register('contacts', {
  title: 'پرونده‌ها',
  navPage: 'more',
  topLevel: true,
  render: function(){
    return renderPage();
  }
});

window.Contacts = {
  render: renderPage,
  getWorkers: function(){ return getWorkers().slice(); },
  getParties: getParties
};

console.log('✅ contacts route registered (v2.0 - Store v4)');

})();