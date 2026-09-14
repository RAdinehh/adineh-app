/* ═══════════════════════════════════════════════
   FINANCE — مالی (v4.0)
   بازنویسی‌شده برای Store v4 + UI مشترک
   ساخته شده توسط رضا آدینه
   ═══════════════════════════════════════════════ */
(function(){
'use strict';

console.log('🚀 finance.js start');

if(typeof Router === 'undefined' || typeof Router.register !== 'function'){
  console.error('❌ Router not available');
  return;
}
if(window.__financeModuleLoaded) return;
window.__financeModuleLoaded = true;

/* ═══════ helpers از UI ═══════ */
var sid             = UI.sid;
var sameId          = UI.sameId;
var findBy          = UI.findBy;
var esc             = UI.esc;
var fa              = UI.fa;
var toFa            = UI.toFa;
var toEnDigits      = UI.toEnDigits;
var parseNum        = UI.parseNum;
var fmtThousandsInput = UI.fmtThousandsInput;
var fmtShort        = UI.formatShort;
var toast           = UI.toast;

var jToC            = UI.jToC;
var jToG            = UI.jToG;
var daysInJMonth    = UI.daysInJMonth;
var FA_MONTHS       = UI.FA_MONTHS;
var todayJ          = UI.todayJ;
var todayStr        = UI.todayStr;

/* ═══════ State ═══════ */
var uiState = { filter: 'all', expanded: {}, filterBoxOpen: false };
var editingFinId = null;
var editingIds = { category: null, party: null, method: null };
var selectedCategoryColor = '#10b981';
var selectedMethodColor = '#10b981';
var catManagerTab = 'income';
var calState = { y: todayJ.y, m: todayJ.m, sel: null, targetId: null };
var _modals = {};

/* ═══════════════════════════════════════════════
   Data Access
   ═══════════════════════════════════════════════ */
function getTransactions(){
  return Store.all('transactions').filter(function(t){
    return !t.kind || t.kind === 'finance_income' || t.kind === 'finance_expense'
      || t.transType === 'income' || t.transType === 'expense';
  });
}
function getCategories(){
  /* categories مشترک با انبار — فقط finance scope */
  return Store.all('categories').filter(function(c){
    return !c.scope || c.scope === 'finance';
  });
}
function getParties(){ return Store.all('parties'); }
function getMethods(){ return Store.all('financeMethods'); }

function getCategoryByName(n){
  var cats = getCategories();
  for(var i = 0; i < cats.length; i++) if(cats[i].name === n) return cats[i];
  return null;
}
function getPartyByName(n){
  var parties = getParties();
  for(var i = 0; i < parties.length; i++) if(parties[i].name === n) return parties[i];
  return null;
}
function getMethodByName(n){
  var ms = getMethods();
  for(var i = 0; i < ms.length; i++) if(ms[i].name === n) return ms[i];
  return null;
}

/* ═══════ Modal ═══════ */
function openModal(id, html, opts){
  opts = opts || {};
  if(_modals[id]) return _modals[id];
  var wrap = document.createElement('div');
  wrap.className = 'fin-modal-wrap';
  wrap.dataset.modalId = id;
  wrap.innerHTML = '<div class="fin-modal-bg" data-fin="close-modal" data-mid="' + id + '"></div>' +
    '<div class="fin-modal-box' + (opts.sheet ? ' fin-sheet' : '') + '">' + html + '</div>';
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

/* ═══════════════════════════════════════════════
   Styles
   ═══════════════════════════════════════════════ */
function injectStyles(){
  if(document.getElementById('fin-styles')) return;
  var css =
  '.fin-page{padding:10px;max-width:760px;margin:0 auto}' +
  '.fin-header{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap}' +
  '.fin-title{font-size:14px;font-weight:900}' +
  '.fin-sub{font-size:10.5px;color:#64748b;font-weight:700;margin-top:1px}' +
  '.fin-header-actions{display:flex;gap:6px;align-items:center;flex-shrink:0}' +
  '.fin-action-btn{color:#fff;border:none;padding:8px 14px;border-radius:9999px;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:4px;white-space:nowrap;background:linear-gradient(135deg,#0f766e,#14b8a6);box-shadow:0 3px 10px rgba(15,118,110,.3)}' +
  '.fin-summary{background:#fff;border-radius:12px;padding:10px;margin-bottom:10px;border:1px solid #e2e8f0;display:grid;grid-template-columns:repeat(4,1fr);gap:6px}' +
  '.fin-sum{background:#f1f5f9;border-radius:8px;padding:8px 4px;text-align:center;border-bottom:2px solid #0f766e}' +
  '.fin-sum.g{border-color:#10b981}.fin-sum.r{border-color:#ef4444}.fin-sum.p{border-color:#8b5cf6}.fin-sum.b{border-color:#3b82f6}' +
  '.fin-sum-ic{font-size:14px;line-height:1;margin-bottom:2px}' +
  '.fin-sum-v{font-size:14px;font-weight:900;line-height:1.2}' +
  '.fin-sum-l{font-size:9.5px;color:#64748b;font-weight:700;margin-top:1px}' +
  '.fin-filter-box{position:relative;margin-bottom:10px}' +
  '.fin-filter-btn{background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;padding:9px 12px;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:8px;width:100%;justify-content:space-between;color:#0f172a;box-sizing:border-box;text-align:right}' +
  '.fin-filter-btn .fb-left{display:flex;align-items:center;gap:6px;min-width:0;flex:1}' +
  '.fin-filter-btn .fb-label{color:#0f766e;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
  '.fin-filter-btn .fb-arrow{font-size:12px;color:#64748b;transition:transform .2s;flex-shrink:0}' +
  '.fin-filter-box.open .fb-arrow{transform:rotate(90deg)}' +
  '.fin-filter-menu{display:none;position:absolute;top:calc(100% + 6px);right:0;left:0;background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;box-shadow:0 8px 24px rgba(15,23,42,.14);z-index:80;overflow:hidden;max-height:60vh;overflow-y:auto}' +
  '.fin-filter-box.open .fin-filter-menu{display:block}' +
  '.fin-filter-sec{padding:8px 14px 4px;font-size:9.5px;font-weight:900;color:#94a3b8;background:#f8fafc;border-bottom:1px solid #f1f5f9}' +
  '.fin-filter-item{padding:11px 14px;font-size:12px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #f1f5f9;color:#0f172a}' +
  '.fin-filter-item:last-child{border-bottom:none}' +
  '.fin-filter-item.on{background:linear-gradient(135deg,#ecfdf5,#d1fae5);color:#0f766e}' +
  '.fin-filter-item .fi-check{color:#10b981;font-weight:900;opacity:0;font-size:13px}' +
  '.fin-filter-item.on .fi-check{opacity:1}' +
  '.fin-filter-item .fi-count{font-size:10px;color:#64748b;font-weight:700;background:#f1f5f9;padding:1px 7px;border-radius:9999px}' +
  '.fin-card{background:#fff;border-radius:12px;margin-bottom:6px;border:1px solid #e2e8f0;border-right:3px solid #0f766e;overflow:hidden}' +
  '.fin-card.income{border-right-color:#10b981}' +
  '.fin-card.expense{border-right-color:#ef4444}' +
  '.fin-card-hd{display:flex;justify-content:space-between;align-items:flex-start;gap:6px;padding:8px 10px;cursor:pointer;user-select:none}' +
  '.fin-card-hd:active{background:#f1f5f9}' +
  '.fin-hd-content{flex:1;min-width:0}' +
  '.fin-hd-row1{display:flex;align-items:center;gap:6px;margin-bottom:5px;flex-wrap:wrap}' +
  '.fin-hd-ic{font-size:14px;flex-shrink:0}' +
  '.fin-hd-name{font-size:12.5px;font-weight:900;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60%}' +
  '.fin-type-badge{font-size:9px;font-weight:800;padding:2px 7px;border-radius:9999px}' +
  '.fin-type-badge.income{background:#ecfdf5;color:#166534}' +
  '.fin-type-badge.expense{background:#fef2f2;color:#991b1b}' +
  '.fin-hd-row2{display:flex;align-items:center;gap:5px;flex-wrap:wrap}' +
  '.fin-stat{display:inline-flex;align-items:center;gap:2px;padding:2px 6px;border-radius:9999px;background:#f1f5f9;font-size:10px;font-weight:700;white-space:nowrap}' +
  '.fin-stat.r{background:#fef2f2;color:#991b1b}.fin-stat.g{background:#ecfdf5;color:#166534}' +
  '.fin-stat.b{background:#eff6ff;color:#1e40af}.fin-stat.o{background:#fffbeb;color:#92400e}' +
  '.fin-stat.p{background:#f5f3ff;color:#6b21a8}' +
  '.fin-stat strong{font-weight:900;font-size:11px}' +
  '.fin-toggle{background:#f1f5f9;border:none;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:#0f766e;cursor:pointer;flex-shrink:0;transition:transform .3s,background .2s,color .2s}' +
  '.fin-card.expanded .fin-toggle{transform:rotate(180deg);background:#0f766e;color:#fff}' +
  '.fin-card-bd{max-height:0;overflow:hidden;transition:max-height .35s,padding .35s;padding:0 10px}' +
  '.fin-card.expanded .fin-card-bd{max-height:900px;padding:8px 10px 10px;border-top:1px dashed #e2e8f0}' +
  '.fin-amount{text-align:center;padding:8px;border-radius:10px;margin-bottom:8px;font-size:17px;font-weight:900;font-variant-numeric:tabular-nums}' +
  '.fin-amount.income{background:linear-gradient(135deg,#ecfdf5,#d1fae5);color:#065f46;border-right:3px solid #10b981}' +
  '.fin-amount.expense{background:linear-gradient(135deg,#fef2f2,#fee2e2);color:#991b1b;border-right:3px solid #ef4444}' +
  '.fin-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:8px}' +
  '.fin-box{background:#f1f5f9;border-radius:6px;padding:5px 6px;text-align:center;border-bottom:2px solid #cbd5e1}' +
  '.fin-box.r{border-color:#ef4444}.fin-box.g{border-color:#10b981}.fin-box.b{border-color:#3b82f6}.fin-box.o{border-color:#f59e0b}.fin-box.p{border-color:#8b5cf6}' +
  '.fin-box-l{font-size:9px;color:#64748b;font-weight:700;margin-bottom:1px}' +
  '.fin-box-v{font-size:11.5px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
  '.fin-box.r .fin-box-v{color:#ef4444}.fin-box.g .fin-box-v{color:#10b981}' +
  '.fin-box.b .fin-box-v{color:#3b82f6}.fin-box.o .fin-box-v{color:#f59e0b}.fin-box.p .fin-box-v{color:#8b5cf6}' +
  '.fin-chips{display:flex;flex-wrap:wrap;gap:3px;margin-bottom:6px}' +
  '.fin-chip{display:inline-flex;align-items:center;gap:3px;padding:3px 7px;border-radius:9999px;font-size:10px;font-weight:700;background:#f1f5f9}' +
  '.fin-chip.date{background:#eff6ff;color:#1e40af}' +
  '.fin-chip.money{background:#ecfdf5;color:#166534}' +
  '.fin-chip.method{background:#f5f3ff;color:#6b21a8}' +
  '.fin-chip.party{background:#fffbeb;color:#92400e}' +
  '.fin-note{background:#f1f5f9;padding:6px 8px;border-radius:6px;font-size:11px;line-height:1.5;color:#475569;border-right:2px solid #0f766e;margin-bottom:6px}' +
  '.fin-note-l{font-size:9.5px;font-weight:900;color:#64748b;margin-bottom:2px;display:block}' +
  '.fin-actions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;padding-top:6px;border-top:1px dashed #e2e8f0}' +
  '.fin-actions button{padding:6px;border:none;border-radius:6px;font-family:inherit;font-size:10.5px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:3px}' +
  '.fin-act-edit{background:#eff6ff;color:#1e40af}' +
  '.fin-act-copy{background:#f5f3ff;color:#6b21a8}' +
  '.fin-act-del{background:#fef2f2;color:#991b1b}' +
  '.fin-empty{text-align:center;padding:48px 24px;background:#fff;border-radius:12px;border:1px dashed #cbd5e1}' +
  '.fin-empty-ic{font-size:56px;line-height:1;display:block;margin-bottom:12px;opacity:.6}' +
  '.fin-empty-t{font-size:14px;font-weight:900;margin-bottom:6px}' +
  '.fin-empty-x{font-size:12px;color:#64748b;font-weight:600;margin:0 auto 16px;max-width:280px}' +
  '.fin-modal-wrap{position:fixed;inset:0;z-index:2000;display:flex;align-items:flex-end;justify-content:center;opacity:0;pointer-events:none;transition:opacity .2s}' +
  '.fin-modal-wrap.on{opacity:1;pointer-events:auto}' +
  '.fin-modal-bg{position:absolute;inset:0;background:rgba(15,23,42,.55)}' +
  '.fin-modal-box{position:relative;background:#fff;width:100%;max-width:760px;border-radius:24px 24px 0 0;padding:14px;max-height:95vh;overflow-y:auto;transform:translateY(30px);transition:transform .3s;padding-bottom:calc(20px + env(safe-area-inset-bottom,0px))}' +
  '.fin-modal-wrap.on .fin-modal-box{transform:translateY(0)}' +
  '.fin-modal-box.fin-sheet{border-radius:16px;max-width:440px;margin:auto}' +
  '.fin-modal-hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #e2e8f0}' +
  '.fin-modal-t{font-size:14px;font-weight:800}' +
  '.fin-modal-x{background:#f1f5f9;border:none;width:32px;height:32px;border-radius:50%;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center}' +
  '.fin-sec{margin-bottom:16px}' +
  '.fin-sec-hd{display:flex;align-items:center;gap:6px;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #e2e8f0}' +
  '.fin-sec-ic{width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}' +
  '.fin-sec-t{font-size:12.5px;font-weight:900}' +
  '.fin-fg{margin-bottom:10px}' +
  '.fin-fl{font-size:11px;font-weight:800;margin-bottom:4px;display:flex;align-items:center;gap:4px}' +
  '.fin-fl-hint{font-size:9.5px;color:#0f766e;font-weight:700;margin-right:auto;cursor:pointer;text-decoration:underline}' +
  '.fin-fi,.fin-fs,.fin-ft{display:block;width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:12px;font-size:13px;font-family:inherit;background:#f1f5f9;color:#0f172a;box-sizing:border-box}' +
  '.fin-fi{height:42px;line-height:40px;padding:0 12px}' +
  '.fin-fs{height:42px;line-height:40px;padding:0 32px 0 12px;cursor:pointer;appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml;charset=utf8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2364748b\' stroke-width=\'2\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:left 10px center;background-size:16px 16px}' +
  '.fin-fi:focus,.fin-fs:focus,.fin-ft:focus{outline:none;border-color:#0f766e;background:#fff;box-shadow:0 0 0 3px #f0fdfa}' +
  '.fin-ft{resize:vertical;min-height:55px;line-height:1.6}' +
  '.fin-fr{display:grid;grid-template-columns:1fr 1fr;gap:8px}' +
  '.fin-date-field{display:flex;gap:6px;align-items:stretch}' +
  '.fin-date-field .fin-fi{flex:1;min-width:0;text-align:left;direction:ltr;font-weight:700;cursor:pointer}' +
  '.fin-date-btn{width:42px;flex-shrink:0;border:none;border-radius:12px;background:#0f766e;color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}' +
  '.fin-iwb{display:flex;gap:6px;align-items:stretch}' +
  '.fin-iwb .fin-fs{flex:1;min-width:0}' +
  '.fin-ibtn{width:42px;flex-shrink:0;border:none;border-radius:12px;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;background:#10b981;color:#fff}' +
  '.fin-save{width:100%;padding:14px;border:none;border-radius:12px;background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;font-family:inherit;font-size:14px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:16px}' +
  '.fin-btn{width:100%;padding:11px;border:none;border-radius:12px;font-size:13px;font-weight:800;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px}' +
  '.fin-btn-s{background:#f1f5f9;color:#0f172a}' +
  '.fin-btn-p{background:#0f766e;color:#fff}' +
  '.fin-btn-g{background:#10b981;color:#fff}' +
  '.fin-list{display:flex;flex-direction:column;gap:6px;max-height:55vh;overflow-y:auto;padding:2px}' +
  '.fin-row{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#f1f5f9;border-radius:12px;border-right:3px solid #f59e0b;margin-bottom:6px}' +
  '.fin-row.locked{border-right-color:#10b981;background:linear-gradient(90deg,#ecfdf5 0%,#f1f5f9 30%)}' +
  '.fin-row-ic{width:30px;height:30px;border-radius:8px;background:#fffbeb;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}' +
  '.fin-row-info{flex:1;min-width:0}' +
  '.fin-row-n{font-size:12.5px;font-weight:800;display:flex;align-items:center;gap:4px;flex-wrap:wrap}' +
  '.fin-row-u{font-size:10px;color:#64748b;font-weight:600;margin-top:1px}' +
  '.fin-row-acts{display:flex;gap:4px;flex-shrink:0}' +
  '.fin-row-btn{width:30px;height:30px;border-radius:8px;border:none;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center}' +
  '.fin-row-btn.edit{background:#eff6ff;color:#1e40af}' +
  '.fin-row-btn.delete{background:#fef2f2;color:#ef4444}' +
  '.fin-row-btn.lock{background:#ecfdf5;color:#10b981}' +
  '.fin-row-btn.unlock{background:#fffbeb;color:#f59e0b}' +
  '.fin-badge-locked{display:inline-flex;align-items:center;gap:3px;font-size:9px;font-weight:800;padding:2px 6px;border-radius:9999px;background:#ecfdf5;color:#166534}' +
  '.fin-info-box{background:#eff6ff;color:#1e40af;padding:10px 12px;border-radius:12px;font-size:11px;font-weight:700;margin-bottom:12px;line-height:1.7;border-right:3px solid #3b82f6}' +
  '.fin-check{display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer}' +
  '.fin-check input{width:18px;height:18px;accent-color:#0f766e}' +
  '.fin-colors{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}' +
  '.fin-color{width:26px;height:26px;border-radius:50%;cursor:pointer;border:2.5px solid transparent}' +
  '.fin-color.on{border-color:#fff;box-shadow:0 0 0 1.5px #0f172a;transform:scale(1.1)}' +
  '.fin-cat-tabs{display:flex;gap:4px;background:#f1f5f9;padding:4px;border-radius:12px;margin-bottom:12px}' +
  '.fin-cat-tab{flex:1;padding:8px 4px;border:none;background:transparent;border-radius:8px;font-size:11px;font-weight:800;color:#64748b;cursor:pointer;font-family:inherit}' +
  '.fin-cat-tab.on{background:#fff;color:#0f766e;box-shadow:0 1px 3px rgba(15,23,42,.08)}' +
  '.fin-cal-box{background:#fff;border-radius:20px;width:100%;max-width:360px;overflow:hidden}' +
  '.fin-cal-hd{background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;padding:16px;display:flex;justify-content:space-between;align-items:center}' +
  '.fin-cal-my{font-size:17px;font-weight:900}' +
  '.fin-cal-nav{display:flex;gap:6px}' +
  '.fin-cal-navb{background:rgba(255,255,255,.2);border:none;color:#fff;width:36px;height:36px;border-radius:8px;font-size:16px;cursor:pointer}' +
  '.fin-cal-wd{display:grid;grid-template-columns:repeat(7,1fr);background:#f1f5f9;padding:8px 0;border-bottom:1px solid #e2e8f0}' +
  '.fin-cal-wdc{text-align:center;font-size:11px;font-weight:900;color:#64748b}' +
  '.fin-cal-days{display:grid;grid-template-columns:repeat(7,1fr);padding:10px;gap:4px}' +
  '.fin-cal-d{aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:8px;font-size:13px;font-weight:800;cursor:pointer;border:2px solid transparent}' +
  '.fin-cal-d.empty{pointer-events:none}' +
  '.fin-cal-d.today{border-color:#0f766e;color:#0f766e}' +
  '.fin-cal-d.selected{background:#0f766e;color:#fff;border-color:#0f766e}' +
  '.fin-cal-ft{padding:10px 14px 14px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;gap:8px}' +
  '.fin-cal-tb{background:#f1f5f9;border:none;padding:8px 14px;border-radius:8px;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer}' +
  '.fin-cal-si{font-size:11px;color:#64748b;font-weight:700}';

  var s = document.createElement('style');
  s.id = 'fin-styles';
  s.textContent = css;
  document.head.appendChild(s);
}

/* ═══════════════════════════════════════════════
   Filter Box
   ═══════════════════════════════════════════════ */
function renderFilterBox(){
  var isOpen = !!uiState.filterBoxOpen;
  var allItems = [
    { id: 'all',     ic: '📋', name: 'همه تراکنش‌ها' },
    { id: 'income',  ic: '📈', name: 'درآمدها' },
    { id: 'expense', ic: '📉', name: 'هزینه‌ها' }
  ];

  var curItem = null;
  for(var i = 0; i < allItems.length; i++) if(allItems[i].id === uiState.filter) curItem = allItems[i];
  if(!curItem){
    var cat = getCategoryByName(uiState.filter);
    if(cat) curItem = { ic: cat.icon || '🏷️', name: cat.name };
  }
  if(!curItem) curItem = allItems[0];

  function countFor(type){
    var c = 0;
    var tx = getTransactions();
    for(var i = 0; i < tx.length; i++){
      var t = tx[i];
      var isInc = t.transType === 'income' || t.kind === 'finance_income';
      if((type === 'income' && isInc) || (type === 'expense' && !isInc)) c++;
    }
    return c;
  }
  function countForCat(name){
    var c = 0;
    var tx = getTransactions();
    for(var i = 0; i < tx.length; i++) if(tx[i].category === name) c++;
    return c;
  }

  function itemHtml(it){
    var on = uiState.filter === it.id;
    var count = '';
    if(it.id === 'all') count = fa(getTransactions().length);
    else if(it.id === 'income') count = fa(countFor('income'));
    else if(it.id === 'expense') count = fa(countFor('expense'));
    else count = fa(countForCat(it.id));

    return '<div class="fin-filter-item ' + (on ? 'on' : '') + '" data-fin="filter" data-f="' + esc(it.id) + '">' +
      '<span>' + it.ic + ' ' + esc(it.name) + '</span>' +
      '<span style="display:flex;align-items:center;gap:4px">' +
        (count && count !== '۰' ? '<span class="fi-count">' + count + '</span>' : '') +
        '<span class="fi-check">✓</span>' +
      '</span>' +
    '</div>';
  }

  var html = '';
  for(i = 0; i < allItems.length; i++) html += itemHtml(allItems[i]);

  var cats = getCategories();
  var incomeCats = cats.filter(function(c){ return c.type === 'income'; });
  var expenseCats = cats.filter(function(c){ return c.type === 'expense'; });

  if(incomeCats.length){
    html += '<div class="fin-filter-sec">📈 دسته‌های درآمد</div>';
    for(i = 0; i < incomeCats.length; i++){
      var c1 = incomeCats[i];
      html += itemHtml({ id: c1.name, ic: c1.icon || '🏷️', name: c1.name });
    }
  }
  if(expenseCats.length){
    html += '<div class="fin-filter-sec">📉 دسته‌های هزینه</div>';
    for(i = 0; i < expenseCats.length; i++){
      var c2 = expenseCats[i];
      html += itemHtml({ id: c2.name, ic: c2.icon || '🏷️', name: c2.name });
    }
  }

  return '<div class="fin-filter-box ' + (isOpen ? 'open' : '') + '" id="finFilterBox">' +
    '<button type="button" class="fin-filter-btn" data-fin="toggle-filter-box">' +
      '<span class="fb-left">' +
        '<span>🔍</span>' +
        '<span style="color:#64748b">فیلتر:</span>' +
        '<span class="fb-label">' + curItem.ic + ' ' + esc(curItem.name) + '</span>' +
      '</span>' +
      '<span class="fb-arrow">‹</span>' +
    '</button>' +
    '<div class="fin-filter-menu">' + html + '</div>' +
  '</div>';
}

/* ═══════════════════════════════════════════════
   Page Render
   ═══════════════════════════════════════════════ */
function renderPage(){
  var tx = getTransactions();
  var totalIncome = 0, totalExpense = 0;

  for(var i = 0; i < tx.length; i++){
    var t = tx[i];
    var isInc = t.transType === 'income' || t.kind === 'finance_income';
    if(isInc) totalIncome += t.amount || 0;
    else totalExpense += t.amount || 0;
  }
  var profit = totalIncome - totalExpense;

  return '<div class="page fin-page" data-fin-root>' +
    '<div class="fin-header">' +
      '<div><div class="fin-title">💰 مدیریت مالی</div>' +
      '<div class="fin-sub">' + fa(tx.length) + ' تراکنش • امروز ' + todayStr + '</div></div>' +
      '<div class="fin-header-actions">' +
        '<button class="fin-action-btn" data-fin="open-form">➕ <span>ثبت تراکنش</span></button>' +
      '</div>' +
    '</div>' +
    '<div class="fin-summary">' +
      '<div class="fin-sum g"><div class="fin-sum-ic">📈</div><div class="fin-sum-v">' + fmtShort(totalIncome) + '</div><div class="fin-sum-l">درآمد</div></div>' +
      '<div class="fin-sum r"><div class="fin-sum-ic">📉</div><div class="fin-sum-v">' + fmtShort(totalExpense) + '</div><div class="fin-sum-l">هزینه</div></div>' +
      '<div class="fin-sum ' + (profit >= 0 ? 'p' : 'r') + '"><div class="fin-sum-ic">💵</div><div class="fin-sum-v">' + fmtShort(Math.abs(profit)) + '</div><div class="fin-sum-l">' + (profit >= 0 ? 'سود' : 'زیان') + '</div></div>' +
      '<div class="fin-sum b"><div class="fin-sum-ic">📊</div><div class="fin-sum-v">' + fa(tx.length) + '</div><div class="fin-sum-l">تعداد</div></div>' +
    '</div>' +
    renderFilterBox() +
    '<div data-fin-list>' + renderListInner() + '</div>' +
  '</div>';
}

function renderListInner(){
  var list = getTransactions();
  if(uiState.filter !== 'all'){
    var filtered = [];
    for(var i = 0; i < list.length; i++){
      var t = list[i];
      var isInc = t.transType === 'income' || t.kind === 'finance_income';
      if(uiState.filter === 'income' && isInc) filtered.push(t);
      else if(uiState.filter === 'expense' && !isInc) filtered.push(t);
      else if(t.category === uiState.filter) filtered.push(t);
    }
    list = filtered;
  }
  if(!list.length){
    return '<div class="fin-empty">' +
      '<div class="fin-empty-ic">💼</div>' +
      '<div class="fin-empty-t">هنوز تراکنشی ثبت نشده</div>' +
      '<div class="fin-empty-x">برای شروع، اولین درآمد یا هزینه خود را ثبت کنید</div>' +
      '<button class="fin-action-btn" style="margin:0 auto" data-fin="open-form">➕ ثبت تراکنش</button>' +
    '</div>';
  }
  list.sort(function(a, b){ return jToC(b.date) - jToC(a.date); });
  var out = '';
  for(i = 0; i < list.length; i++) out += renderCard(list[i]);
  return out;
}

function renderCard(t){
  var cat = getCategoryByName(t.category) || { color: '#0f766e', icon: '🏷️' };
  var isInc = t.transType === 'income' || t.kind === 'finance_income';
  var badgeCls = isInc ? 'income' : 'expense';
  var badgeTxt = isInc ? 'درآمد' : 'هزینه';
  var amountFmt = fa(t.amount) + ' تومان';
  var isOpen = !!uiState.expanded[sid(t.id)];

  var stats =
    '<span class="fin-stat ' + (isInc ? 'g' : 'r') + '">💰 <strong>' + fmtShort(t.amount) + '</strong></span>' +
    '<span class="fin-stat b">📅 <strong>' + esc((t.date || '').slice(5)) + '</strong></span>';

  var chips = '';
  if(t.party) chips += '<span class="fin-chip party">🏪 ' + esc(t.party) + '</span>';
  if(t.method) chips += '<span class="fin-chip method">💳 ' + esc(t.method) + '</span>';

  return '<div class="fin-card ' + (isOpen ? 'expanded' : '') + ' ' + badgeCls + '" data-fid="' + sid(t.id) + '">' +
    '<div class="fin-card-hd" data-fin="toggle" data-id="' + sid(t.id) + '">' +
      '<div class="fin-hd-content">' +
        '<div class="fin-hd-row1">' +
          '<span class="fin-hd-ic">' + (cat.icon || '🏷️') + '</span>' +
          '<div class="fin-hd-name">' + esc(t.title || t.category || '—') + '</div>' +
          '<span class="fin-type-badge ' + badgeCls + '">' + badgeTxt + '</span>' +
        '</div>' +
        '<div class="fin-hd-row2">' + stats + '</div>' +
      '</div>' +
      '<button class="fin-toggle" type="button">▼</button>' +
    '</div>' +
    '<div class="fin-card-bd">' +
      '<div class="fin-amount ' + badgeCls + '">' + (isInc ? '+' : '−') + ' ' + amountFmt + '</div>' +
      '<div class="fin-grid">' +
        '<div class="fin-box b"><div class="fin-box-l">🏷️ دسته</div><div class="fin-box-v">' + esc(t.category || '—') + '</div></div>' +
        '<div class="fin-box o"><div class="fin-box-l">🏪 طرف حساب</div><div class="fin-box-v">' + esc(t.party || '—') + '</div></div>' +
        '<div class="fin-box p"><div class="fin-box-l">💳 روش</div><div class="fin-box-v">' + esc(t.method || '—') + '</div></div>' +
      '</div>' +
      '<div class="fin-chips">' +
        '<span class="fin-chip date">📅 ' + esc(t.date) + '</span>' +
        chips +
      '</div>' +
      (t.notes ? '<div class="fin-note"><span class="fin-note-l">📝 یادداشت:</span>' + esc(t.notes) + '</div>' : '') +
      '<div class="fin-actions">' +
        '<button class="fin-act-edit" data-fin="edit" data-id="' + sid(t.id) + '">✏️ ویرایش</button>' +
        '<button class="fin-act-copy" data-fin="copy" data-id="' + sid(t.id) + '">📋 کپی</button>' +
        '<button class="fin-act-del" data-fin="del" data-id="' + sid(t.id) + '">🗑️ حذف</button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function refreshList(){
  var el = document.querySelector('[data-fin-list]');
  if(el) el.innerHTML = renderListInner();

  var tx = getTransactions();
  var totalIncome = 0, totalExpense = 0;
  for(var i = 0; i < tx.length; i++){
    var t = tx[i];
    var isInc = t.transType === 'income' || t.kind === 'finance_income';
    if(isInc) totalIncome += t.amount || 0;
    else totalExpense += t.amount || 0;
  }
  var profit = totalIncome - totalExpense;

  var sv = document.querySelectorAll('[data-fin-root] .fin-sum-v');
  if(sv.length === 4){
    sv[0].textContent = fmtShort(totalIncome);
    sv[1].textContent = fmtShort(totalExpense);
    sv[2].textContent = fmtShort(Math.abs(profit));
    sv[3].textContent = fa(tx.length);
  }
  var sub = document.querySelector('[data-fin-root] .fin-sub');
  if(sub) sub.textContent = fa(tx.length) + ' تراکنش • امروز ' + todayStr;

  var box = document.getElementById('finFilterBox');
  if(box){
    var tmp = document.createElement('div');
    tmp.innerHTML = renderFilterBox();
    box.parentNode.replaceChild(tmp.firstElementChild, box);
  }
}

/* ═══════════════════════════════════════════════
   Options
   ═══════════════════════════════════════════════ */
function categoryOptions(type, cur){
  var filtered = getCategories().filter(function(c){ return c.type === type; });
  if(!filtered.length) return '<option value="">— دسته بسازید —</option>';
  var out = '';
  for(var i = 0; i < filtered.length; i++){
    var c = filtered[i];
    out += '<option value="' + esc(c.name) + '" ' + (cur === c.name ? 'selected' : '') + '>' + (c.icon || '🏷️') + ' ' + esc(c.name) + '</option>';
  }
  return out;
}
function partyOptions(cur){
  var parties = getParties();
  var out = '<option value="">— انتخاب —</option>';
  for(var i = 0; i < parties.length; i++){
    var p = parties[i];
    out += '<option value="' + esc(p.name) + '" ' + (cur === p.name ? 'selected' : '') + '>🏪 ' + esc(p.name) + (p.city ? ' (' + esc(p.city) + ')' : '') + '</option>';
  }
  return out;
}
function methodOptions(cur){
  var ms = getMethods();
  var out = '<option value="">— انتخاب —</option>';
  for(var i = 0; i < ms.length; i++){
    var m = ms[i];
    out += '<option value="' + esc(m.name) + '" ' + (cur === m.name ? 'selected' : '') + '>💳 ' + esc(m.name) + '</option>';
  }
  return out;
}

/* ═══════════════════════════════════════════════
   Form
   ═══════════════════════════════════════════════ */
function openFinForm(id){
  editingFinId = id ? sid(id) : null;
  var t = id ? Store.find('transactions', id) : null;
  var type = t ? (t.transType === 'expense' || t.kind === 'finance_expense' ? 'expense' : 'income') : 'income';
  var amountVal = (t && t.amount) ? Number(t.amount).toLocaleString('en-US') : '';

  var html = '<div class="fin-modal-hd">' +
    '<div class="fin-modal-t">' + (id ? '✏️ ویرایش تراکنش' : '💰 تراکنش جدید') + '</div>' +
    '<button class="fin-modal-x" data-fin="close-modal" data-mid="fin-form">✕</button>' +
  '</div>' +
  '<div class="fin-sec">' +
    '<div class="fin-sec-hd"><div class="fin-sec-ic" style="background:#f0fdfa">📋</div>' +
    '<div><div class="fin-sec-t" style="color:#0f766e">اطلاعات پایه</div></div></div>' +
    '<div class="fin-fr">' +
      '<div class="fin-fg"><label class="fin-fl">📅 تاریخ</label>' +
        '<div class="fin-date-field"><input class="fin-fi" type="text" id="finDate" readonly value="' + (t ? esc(t.date) : todayStr) + '">' +
        '<button type="button" class="fin-date-btn" data-fin="open-cal" data-target="finDate">📅</button></div></div>' +
      '<div class="fin-fg"><label class="fin-fl">⚙️ نوع</label>' +
        '<select class="fin-fs" id="finType">' +
          '<option value="income" ' + (type === 'income' ? 'selected' : '') + '>📈 درآمد</option>' +
          '<option value="expense" ' + (type === 'expense' ? 'selected' : '') + '>📉 هزینه</option>' +
        '</select></div>' +
    '</div>' +
  '</div>' +
  '<div class="fin-sec">' +
    '<div class="fin-sec-hd"><div class="fin-sec-ic" style="background:#ecfdf5">🏷️</div>' +
    '<div><div class="fin-sec-t" style="color:#10b981">دسته و عنوان</div></div></div>' +
    '<div class="fin-fg"><label class="fin-fl">🏷️ دسته <span class="fin-fl-hint" data-fin="open-cat-mgr">مدیریت</span></label>' +
      '<div class="fin-iwb">' +
        '<select class="fin-fs" id="finCategory">' + categoryOptions(type, t ? t.category : '') + '</select>' +
        '<button type="button" class="fin-ibtn" data-fin="open-add-cat">➕</button>' +
      '</div></div>' +
    '<div class="fin-fg"><label class="fin-fl">📝 عنوان</label>' +
      '<input class="fin-fi" type="text" id="finTitle" value="' + (t ? esc(t.title || '') : '') + '" placeholder="مثلاً: فروش ۵۰۰ جوجه"></div>' +
    '<div class="fin-fg"><label class="fin-fl">💰 مبلغ <span class="fin-fl-hint">تومان</span></label>' +
      '<input class="fin-fi" type="text" inputmode="numeric" id="finAmount" value="' + amountVal + '" placeholder="۶۰,۰۰۰,۰۰۰"></div>' +
  '</div>' +
  '<div class="fin-sec">' +
    '<div class="fin-sec-hd"><div class="fin-sec-ic" style="background:#eff6ff">🏪</div>' +
    '<div><div class="fin-sec-t" style="color:#3b82f6">طرف حساب و پرداخت</div></div></div>' +
    '<div class="fin-fr">' +
      '<div class="fin-fg"><label class="fin-fl">🏪 طرف حساب <span class="fin-fl-hint" data-fin="open-party-mgr">مدیریت</span></label>' +
        '<div class="fin-iwb">' +
          '<select class="fin-fs" id="finParty">' + partyOptions(t ? t.party : '') + '</select>' +
          '<button type="button" class="fin-ibtn" data-fin="open-add-party">➕</button>' +
        '</div></div>' +
      '<div class="fin-fg"><label class="fin-fl">💳 روش پرداخت <span class="fin-fl-hint" data-fin="open-method-mgr">مدیریت</span></label>' +
        '<div class="fin-iwb">' +
          '<select class="fin-fs" id="finMethod">' + methodOptions(t ? t.method : '') + '</select>' +
          '<button type="button" class="fin-ibtn" data-fin="open-add-method">➕</button>' +
        '</div></div>' +
    '</div>' +
  '</div>' +
  '<div class="fin-sec">' +
    '<div class="fin-sec-hd"><div class="fin-sec-ic" style="background:#f5f3ff">📝</div>' +
    '<div><div class="fin-sec-t" style="color:#8b5cf6">یادداشت</div></div></div>' +
    '<textarea class="fin-ft" id="finNotes">' + (t ? esc(t.notes || '') : '') + '</textarea>' +
  '</div>' +
  '<button class="fin-save" data-fin="save">💾 ذخیره تراکنش</button>';

  openModal('fin-form', html);
  setTimeout(function(){ updateFormTypeUI(); }, 30);
}

function updateFormTypeUI(){
  var sel = document.getElementById('finType');
  if(!sel) return;
  var type = sel.value;
  var catSel = document.getElementById('finCategory');
  var curCat = catSel ? catSel.value : '';
  if(catSel) catSel.innerHTML = categoryOptions(type, curCat);
}

function saveFin(){
  var date = document.getElementById('finDate').value.trim();
  if(!date){ toast('❌ تاریخ', 'error'); return; }
  var cat = document.getElementById('finCategory').value;
  if(!cat){ toast('❌ دسته', 'error'); return; }
  var amount = parseNum(document.getElementById('finAmount').value);
  if(amount <= 0){ toast('❌ مبلغ', 'error'); return; }

  var typeVal = document.getElementById('finType').value;

  var data = {
    kind: typeVal === 'income' ? 'finance_income' : 'finance_expense',
    transType: typeVal,
    date: date,
    category: cat,
    title: document.getElementById('finTitle').value.trim() || cat,
    amount: amount,
    party: document.getElementById('finParty').value,
    method: document.getElementById('finMethod').value,
    notes: document.getElementById('finNotes').value.trim()
  };

  /* اگر طرف حساب جدید، به parties اضافه کن */
  if(data.party){
    var existingParty = getPartyByName(data.party);
    if(!existingParty){
      Store.add('parties', {
        name: data.party,
        type: 'both',
        phone: '', city: '', notes: '',
        isLocked: false
      });
    }
  }

  if(editingFinId){
    Store.update('transactions', editingFinId, data);
    toast('✅ ویرایش شد', 'success');
  } else {
    Store.add('transactions', data);
    toast('✅ ثبت شد', 'success');
  }

  closeModal('fin-form');
  refreshList();
  editingFinId = null;
}

function deleteFin(id){
  var t = Store.find('transactions', id);
  if(!t) return;
  if(!confirm('تراکنش «' + (t.title || t.category) + '» حذف شود؟')) return;
  Store.remove('transactions', id);
  toast('🗑️ حذف شد');
  refreshList();
}

function copyFin(id){
  var t = Store.find('transactions', id);
  if(!t) return;
  var copy = JSON.parse(JSON.stringify(t));
  delete copy.id;
  delete copy.createdAt;
  copy.date = todayStr;
  Store.add('transactions', copy);
  toast('📋 کپی شد', 'success');
  refreshList();
}

/* ═══════════════════════════════════════════════
   Category Manager
   ═══════════════════════════════════════════════ */
function switchCatTab(t){
  catManagerTab = t;
  var tabs = document.querySelectorAll('.fin-cat-tab');
  for(var i = 0; i < tabs.length; i++) tabs[i].classList.toggle('on', tabs[i].dataset.tab === t);
  var el = document.querySelector('[data-modal-id="fin-cat-mgr"] .fin-list');
  if(el) el.innerHTML = renderCategoryListInner();
}

function renderCategoryListInner(){
  var filtered = getCategories().filter(function(c){ return c.type === catManagerTab; });
  if(!filtered.length) return '<div style="text-align:center;padding:20px;color:#64748b;font-size:12px">هنوز دسته‌ای نیست</div>';
  var out = '';
  var tx = getTransactions();
  for(var i = 0; i < filtered.length; i++){
    var c = filtered[i];
    var used = 0;
    for(var j = 0; j < tx.length; j++) if(tx[j].category === c.name) used++;
    var cls = 'fin-row' + (c.isLocked ? ' locked' : '');
    var ic = c.isLocked ? '🔒' : (c.icon || '🏷️');
    var badge = c.isLocked ? '<span class="fin-badge-locked">🔒</span>' : '';
    var acts = c.isLocked
      ? '<button class="fin-row-btn unlock" data-fin="unlock-cat" data-id="' + sid(c.id) + '">🔓</button>'
      : '<button class="fin-row-btn edit" data-fin="edit-cat" data-id="' + sid(c.id) + '">✏️</button>' +
        '<button class="fin-row-btn lock" data-fin="lock-cat" data-id="' + sid(c.id) + '">🔒</button>' +
        '<button class="fin-row-btn delete" data-fin="del-cat" data-id="' + sid(c.id) + '">🗑️</button>';
    out += '<div class="' + cls + '" style="border-right-color:' + (c.color || '#10b981') + '">' +
      '<div class="fin-row-ic" style="background:' + (c.color || '#10b981') + '22;color:' + (c.color || '#10b981') + '">' + ic + '</div>' +
      '<div class="fin-row-info"><div class="fin-row-n">' + esc(c.name) + ' ' + badge + '</div>' +
      '<div class="fin-row-u">' + fa(used) + ' تراکنش</div></div>' +
      '<div class="fin-row-acts">' + acts + '</div></div>';
  }
  return out;
}

function openCategoryManager(){
  var existing = _modals['fin-cat-mgr'];
  if(existing){ try{ existing.remove(); }catch(e){} delete _modals['fin-cat-mgr']; }
  var html = '<div class="fin-modal-hd"><div class="fin-modal-t">🏷️ مدیریت دسته‌ها</div>' +
    '<button class="fin-modal-x" data-fin="close-modal" data-mid="fin-cat-mgr">✕</button></div>' +
    '<div class="fin-cat-tabs">' +
      '<button class="fin-cat-tab ' + (catManagerTab === 'income' ? 'on' : '') + '" data-fin="cat-tab" data-tab="income">📈 درآمد</button>' +
      '<button class="fin-cat-tab ' + (catManagerTab === 'expense' ? 'on' : '') + '" data-fin="cat-tab" data-tab="expense">📉 هزینه</button>' +
    '</div>' +
    '<button class="fin-btn fin-btn-g" data-fin="open-add-cat" style="margin-bottom:12px">➕ دسته جدید</button>' +
    '<div class="fin-list">' + renderCategoryListInner() + '</div>';
  openModal('fin-cat-mgr', html);
}

function refreshCategoryMgr(){
  var el = document.querySelector('[data-modal-id="fin-cat-mgr"] .fin-list');
  if(el) el.innerHTML = renderCategoryListInner();
}

function openCategoryEdit(id){
  editingIds.category = id ? sid(id) : null;
  var c = id ? Store.find('categories', id) : null;
  if(c && c.isLocked){ toast('🔒', 'error'); return; }
  selectedCategoryColor = c ? (c.color || '#10b981') : '#10b981';

  var colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#0f766e'];
  var colorsHtml = '';
  for(var ci = 0; ci < colors.length; ci++){
    colorsHtml += '<div class="fin-color ' + (colors[ci] === selectedCategoryColor ? 'on' : '') + '" data-color="' + colors[ci] + '" style="background:' + colors[ci] + '"></div>';
  }

  var typeVal = c ? c.type : catManagerTab;
  var html = '<div class="fin-modal-hd"><div class="fin-modal-t">' + (id ? '✏️ ویرایش دسته' : '🏷️ دسته جدید') + '</div>' +
    '<button class="fin-modal-x" data-fin="close-modal" data-mid="fin-cat-edit">✕</button></div>' +
    '<div class="fin-fg"><label class="fin-fl">⚙️ نوع</label>' +
      '<select class="fin-fs" id="edCatType">' +
        '<option value="income" ' + (typeVal === 'income' ? 'selected' : '') + '>📈 درآمد</option>' +
        '<option value="expense" ' + (typeVal === 'expense' ? 'selected' : '') + '>📉 هزینه</option>' +
      '</select></div>' +
    '<div class="fin-fg"><label class="fin-fl">📝 نام</label>' +
      '<input class="fin-fi" id="edCatName" value="' + (c ? esc(c.name) : '') + '" placeholder="مثلاً: فروش جوجه"></div>' +
    '<div class="fin-fg"><label class="fin-fl">📌 آیکون</label>' +
      '<input class="fin-fi" id="edCatIcon" value="' + (c ? esc(c.icon || '') : '') + '" maxlength="2" placeholder="🐣"></div>' +
    '<div class="fin-fg"><label class="fin-fl">🎨 رنگ</label>' +
      '<div class="fin-colors" data-cat-colors>' + colorsHtml + '</div></div>' +
    '<div class="fin-fg"><label class="fin-check"><input type="checkbox" id="edCatLock" ' + (c && c.isLocked ? 'checked' : '') + '> <span>🔒 قفل</span></label></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">' +
      '<button class="fin-btn fin-btn-s" data-fin="close-modal" data-mid="fin-cat-edit">انصراف</button>' +
      '<button class="fin-btn fin-btn-p" data-fin="save-cat">💾 ذخیره</button>' +
    '</div>';
  openModal('fin-cat-edit', html, { sheet: true });
}

function saveCategoryEdit(){
  var type = document.getElementById('edCatType').value;
  var name = document.getElementById('edCatName').value.trim();
  var icon = document.getElementById('edCatIcon').value.trim();
  var shouldLock = document.getElementById('edCatLock').checked;
  if(!name){ toast('❌ نام', 'error'); return; }

  var all = getCategories();
  for(var i = 0; i < all.length; i++){
    if(all[i].name === name && all[i].type === type && !sameId(all[i].id, editingIds.category)){
      toast('⚠️ تکراری', 'error'); return;
    }
  }

  if(editingIds.category){
    var existing = Store.find('categories', editingIds.category);
    if(existing){
      var oldName = existing.name, oldType = existing.type;
      if(oldName !== name || oldType !== type){
        var tx = getTransactions();
        for(var k = 0; k < tx.length; k++){
          var isInc = tx[k].transType === 'income' || tx[k].kind === 'finance_income';
          if(tx[k].category === oldName && ((isInc && oldType === 'income') || (!isInc && oldType === 'expense'))){
            Store.update('transactions', tx[k].id, { category: name });
          }
        }
      }
      Store.update('categories', editingIds.category, {
        type: type, name: name,
        color: selectedCategoryColor,
        icon: icon || '🏷️',
        isLocked: shouldLock,
        scope: 'finance'
      });
    }
    toast('✅', 'success');
  } else {
    Store.add('categories', {
      type: type, name: name,
      color: selectedCategoryColor,
      icon: icon || '🏷️',
      isLocked: shouldLock,
      scope: 'finance'
    });
    toast('✅', 'success');
  }
  closeModal('fin-cat-edit');
  refreshCategoryMgr();
  refreshList();
  editingIds.category = null;
}

function lockCategory(id){
  var c = Store.find('categories', id);
  if(!c || c.isLocked) return;
  if(!confirm('قفل؟')) return;
  Store.update('categories', id, { isLocked: true });
  toast('🔒');
  refreshCategoryMgr();
}
function unlockCategory(id){
  var c = Store.find('categories', id);
  if(!c || !c.isLocked) return;
  if(!confirm('باز؟')) return;
  Store.update('categories', id, { isLocked: false });
  toast('🔓');
  refreshCategoryMgr();
}
function deleteCategory(id){
  var c = Store.find('categories', id);
  if(!c || c.isLocked){ toast('🔒', 'error'); return; }
  var used = 0;
  var tx = getTransactions();
  for(var i = 0; i < tx.length; i++) if(tx[i].category === c.name) used++;
  if(used > 0 && !confirm('در ' + fa(used) + ' تراکنش استفاده شده. حذف شود؟')) return;
  if(used === 0 && !confirm('حذف شود؟')) return;
  Store.remove('categories', id);
  toast('🗑️');
  refreshCategoryMgr();
  refreshList();
}

/* ═══════════════════════════════════════════════
   Party Manager
   ═══════════════════════════════════════════════ */
function getPartyStats(name){
  var tx = getTransactions();
  var count = 0, income = 0, expense = 0;
  for(var i = 0; i < tx.length; i++){
    if(tx[i].party !== name) continue;
    count++;
    var isInc = tx[i].transType === 'income' || tx[i].kind === 'finance_income';
    if(isInc) income += tx[i].amount || 0;
    else expense += tx[i].amount || 0;
  }
  return { count: count, income: income, expense: expense, balance: income - expense };
}

function renderPartyListInner(){
  var parties = getParties();
  if(!parties.length) return '<div style="text-align:center;padding:20px;color:#64748b;font-size:12px">هنوز طرف حسابی نیست</div>';
  var out = '';
  for(var i = 0; i < parties.length; i++){
    var p = parties[i];
    var st = getPartyStats(p.name);
    var cls = 'fin-row' + (p.isLocked ? ' locked' : '');
    var typeLabel = p.type === 'buyer' ? '🛒 خریدار' : p.type === 'seller' ? '💰 فروشنده' : '🔄 هر دو';
    var badge = p.isLocked ? '<span class="fin-badge-locked">🔒</span>' : '';
    var acts = p.isLocked
      ? '<button class="fin-row-btn unlock" data-fin="unlock-party" data-id="' + sid(p.id) + '">🔓</button>'
      : '<button class="fin-row-btn edit" data-fin="edit-party" data-id="' + sid(p.id) + '">✏️</button>' +
        '<button class="fin-row-btn lock" data-fin="lock-party" data-id="' + sid(p.id) + '">🔒</button>' +
        '<button class="fin-row-btn delete" data-fin="del-party" data-id="' + sid(p.id) + '">🗑️</button>';
    out += '<div class="' + cls + '" style="display:block;padding:10px 12px">' +
      '<div style="display:flex;align-items:center;gap:8px">' +
        '<div class="fin-row-ic" style="background:#eff6ff;color:#1e40af">' + (p.isLocked ? '🔒' : '🏪') + '</div>' +
        '<div class="fin-row-info">' +
          '<div class="fin-row-n">' + esc(p.name) + ' ' + badge + '</div>' +
          '<div class="fin-row-u">' + typeLabel + (p.city ? ' • 📍 ' + esc(p.city) : '') + (p.phone ? ' • 📞 ' + esc(p.phone) : '') + ' • ' + fa(st.count) + ' تراکنش</div>' +
        '</div>' +
        '<div class="fin-row-acts">' + acts + '</div>' +
      '</div>' +
      (st.count > 0 ?
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-top:8px;padding-top:8px;border-top:1px dashed #e2e8f0">' +
          '<div class="fin-box g" style="padding:5px 4px"><div class="fin-box-l">📈 درآمد</div><div class="fin-box-v">' + fmtShort(st.income) + '</div></div>' +
          '<div class="fin-box r" style="padding:5px 4px"><div class="fin-box-l">📉 هزینه</div><div class="fin-box-v">' + fmtShort(st.expense) + '</div></div>' +
          '<div class="fin-box ' + (st.balance >= 0 ? 'g' : 'r') + '" style="padding:5px 4px"><div class="fin-box-l">' + (st.balance >= 0 ? '✅ مانده' : '⚠️ بدهی') + '</div><div class="fin-box-v">' + fmtShort(Math.abs(st.balance)) + '</div></div>' +
        '</div>' : '') +
      (p.notes ? '<div style="font-size:10.5px;color:#64748b;font-weight:600;margin-top:6px;padding:5px 8px;background:#f1f5f9;border-radius:6px;border-right:2px solid #0f766e">📝 ' + esc(p.notes) + '</div>' : '') +
    '</div>';
  }
  return out;
}

function openPartyManager(){
  var existing = _modals['fin-party-mgr'];
  if(existing){ try{ existing.remove(); }catch(e){} delete _modals['fin-party-mgr']; }
  var html = '<div class="fin-modal-hd"><div class="fin-modal-t">🏪 مدیریت طرف حساب‌ها</div>' +
    '<button class="fin-modal-x" data-fin="close-modal" data-mid="fin-party-mgr">✕</button></div>' +
    '<div class="fin-info-box">💡 مشترک بین مالی، فروش، و پرونده‌ها</div>' +
    '<button class="fin-btn fin-btn-g" data-fin="open-add-party" style="margin-bottom:12px">➕ طرف حساب جدید</button>' +
    '<div class="fin-list">' + renderPartyListInner() + '</div>';
  openModal('fin-party-mgr', html);
}

function refreshPartyMgr(){
  var el = document.querySelector('[data-modal-id="fin-party-mgr"] .fin-list');
  if(el) el.innerHTML = renderPartyListInner();
}

function openPartyEdit(id){
  editingIds.party = id ? sid(id) : null;
  var p = id ? Store.find('parties', id) : null;
  if(p && p.isLocked){ toast('🔒', 'error'); return; }

  var html = '<div class="fin-modal-hd"><div class="fin-modal-t">' + (id ? '✏️ ویرایش' : '🏪 طرف حساب جدید') + '</div>' +
    '<button class="fin-modal-x" data-fin="close-modal" data-mid="fin-party-edit">✕</button></div>' +
    '<div class="fin-fg"><label class="fin-fl">🏪 نام</label>' +
      '<input class="fin-fi" id="edPartyName" value="' + (p ? esc(p.name) : '') + '"></div>' +
    '<div class="fin-fr">' +
      '<div class="fin-fg"><label class="fin-fl">📞 تلفن</label>' +
        '<input class="fin-fi" id="edPartyPhone" value="' + (p ? esc(p.phone || '') : '') + '"></div>' +
      '<div class="fin-fg"><label class="fin-fl">📍 شهر</label>' +
        '<input class="fin-fi" id="edPartyCity" value="' + (p ? esc(p.city || '') : '') + '"></div>' +
    '</div>' +
    '<div class="fin-fg"><label class="fin-fl">🏷️ نوع</label>' +
      '<select class="fin-fs" id="edPartyType">' +
        '<option value="buyer" ' + (p && p.type === 'buyer' ? 'selected' : '') + '>🛒 خریدار</option>' +
        '<option value="seller" ' + (p && p.type === 'seller' ? 'selected' : '') + '>💰 فروشنده</option>' +
        '<option value="both" ' + (p && p.type === 'both' ? 'selected' : '') + '>🔄 هر دو</option>' +
      '</select></div>' +
    '<div class="fin-fg"><label class="fin-fl">📝 یادداشت</label>' +
      '<input class="fin-fi" id="edPartyNotes" value="' + (p ? esc(p.notes || '') : '') + '"></div>' +
    '<div class="fin-fg"><label class="fin-check"><input type="checkbox" id="edPartyLock" ' + (p && p.isLocked ? 'checked' : '') + '> <span>🔒 قفل</span></label></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">' +
      '<button class="fin-btn fin-btn-s" data-fin="close-modal" data-mid="fin-party-edit">انصراف</button>' +
      '<button class="fin-btn fin-btn-p" data-fin="save-party">💾 ذخیره</button>' +
    '</div>';
  openModal('fin-party-edit', html, { sheet: true });
}

function savePartyEdit(){
  var name = document.getElementById('edPartyName').value.trim();
  if(!name){ toast('❌ نام', 'error'); return; }

  var all = getParties();
  for(var i = 0; i < all.length; i++){
    if(all[i].name === name && !sameId(all[i].id, editingIds.party)){
      toast('⚠️ تکراری', 'error'); return;
    }
  }
  var data = {
    name: name,
    phone: document.getElementById('edPartyPhone').value.trim(),
    city: document.getElementById('edPartyCity').value.trim(),
    type: document.getElementById('edPartyType').value,
    notes: document.getElementById('edPartyNotes').value.trim(),
    isLocked: document.getElementById('edPartyLock').checked
  };

  if(editingIds.party){
    var existing = Store.find('parties', editingIds.party);
    if(existing){
      var old = existing.name;
      if(old !== name){
        /* آپدیت نام در همه جا */
        var tx = Store.all('transactions');
        for(var k = 0; k < tx.length; k++){
          if(tx[k].party === old) Store.update('transactions', tx[k].id, { party: name });
        }
        var sales = Store.all('sales');
        for(k = 0; k < sales.length; k++){
          if(sales[k].party === old) Store.update('sales', sales[k].id, { party: name });
          if(sales[k].buyer === old) Store.update('sales', sales[k].id, { buyer: name });
        }
      }
      Store.update('parties', editingIds.party, data);
    }
    toast('✅', 'success');
  } else {
    Store.add('parties', data);
    toast('✅', 'success');
  }
  closeModal('fin-party-edit');
  refreshPartyMgr();
  refreshList();
  editingIds.party = null;
}

function lockParty(id){
  var p = Store.find('parties', id);
  if(!p || p.isLocked) return;
  if(!confirm('قفل؟')) return;
  Store.update('parties', id, { isLocked: true });
  toast('🔒');
  refreshPartyMgr();
}
function unlockParty(id){
  var p = Store.find('parties', id);
  if(!p || !p.isLocked) return;
  if(!confirm('باز؟')) return;
  Store.update('parties', id, { isLocked: false });
  toast('🔓');
  refreshPartyMgr();
}
function deleteParty(id){
  var p = Store.find('parties', id);
  if(!p || p.isLocked){ toast('🔒', 'error'); return; }
  var used = 0;
  var tx = Store.all('transactions');
  for(var i = 0; i < tx.length; i++) if(tx[i].party === p.name) used++;
  if(used > 0 && !confirm('در ' + fa(used) + ' تراکنش استفاده شده. حذف شود؟')) return;
  if(used === 0 && !confirm('حذف شود؟')) return;
  Store.remove('parties', id);
  toast('🗑️');
  refreshPartyMgr();
  refreshList();
}

/* ═══════════════════════════════════════════════
   Method Manager
   ═══════════════════════════════════════════════ */
function renderMethodListInner(){
  var ms = getMethods();
  if(!ms.length) return '<div style="text-align:center;padding:20px;color:#64748b;font-size:12px">هنوز روشی نیست</div>';
  var out = '';
  var tx = getTransactions();
  for(var i = 0; i < ms.length; i++){
    var m = ms[i];
    var used = 0;
    for(var j = 0; j < tx.length; j++) if(tx[j].method === m.name) used++;
    var cls = 'fin-row' + (m.isLocked ? ' locked' : '');
    var badge = m.isLocked ? '<span class="fin-badge-locked">🔒</span>' : '';
    var acts = m.isLocked
      ? '<button class="fin-row-btn unlock" data-fin="unlock-method" data-id="' + sid(m.id) + '">🔓</button>'
      : '<button class="fin-row-btn edit" data-fin="edit-method" data-id="' + sid(m.id) + '">✏️</button>' +
        '<button class="fin-row-btn lock" data-fin="lock-method" data-id="' + sid(m.id) + '">🔒</button>' +
        '<button class="fin-row-btn delete" data-fin="del-method" data-id="' + sid(m.id) + '">🗑️</button>';
    out += '<div class="' + cls + '" style="border-right-color:' + (m.color || '#10b981') + '">' +
      '<div class="fin-row-ic" style="background:' + (m.color || '#10b981') + '22;color:' + (m.color || '#10b981') + '">' + (m.isLocked ? '🔒' : '💳') + '</div>' +
      '<div class="fin-row-info"><div class="fin-row-n">' + esc(m.name) + ' ' + badge + '</div>' +
      '<div class="fin-row-u">' + fa(used) + ' تراکنش</div></div>' +
      '<div class="fin-row-acts">' + acts + '</div></div>';
  }
  return out;
}

function openMethodManager(){
  var existing = _modals['fin-method-mgr'];
  if(existing){ try{ existing.remove(); }catch(e){} delete _modals['fin-method-mgr']; }
  var html = '<div class="fin-modal-hd"><div class="fin-modal-t">💳 مدیریت روش‌ها</div>' +
    '<button class="fin-modal-x" data-fin="close-modal" data-mid="fin-method-mgr">✕</button></div>' +
    '<button class="fin-btn fin-btn-g" data-fin="open-add-method" style="margin-bottom:12px">➕ روش جدید</button>' +
    '<div class="fin-list">' + renderMethodListInner() + '</div>';
  openModal('fin-method-mgr', html);
}

function refreshMethodMgr(){
  var el = document.querySelector('[data-modal-id="fin-method-mgr"] .fin-list');
  if(el) el.innerHTML = renderMethodListInner();
}

function openMethodEdit(id){
  editingIds.method = id ? sid(id) : null;
  var m = id ? Store.find('financeMethods', id) : null;
  if(m && m.isLocked){ toast('🔒', 'error'); return; }
  selectedMethodColor = m ? (m.color || '#10b981') : '#10b981';

  var colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
  var colorsHtml = '';
  for(var ci = 0; ci < colors.length; ci++){
    colorsHtml += '<div class="fin-color ' + (colors[ci] === selectedMethodColor ? 'on' : '') + '" data-color="' + colors[ci] + '" style="background:' + colors[ci] + '"></div>';
  }
  var html = '<div class="fin-modal-hd"><div class="fin-modal-t">' + (id ? '✏️ ویرایش' : '💳 روش جدید') + '</div>' +
    '<button class="fin-modal-x" data-fin="close-modal" data-mid="fin-method-edit">✕</button></div>' +
    '<div class="fin-fg"><label class="fin-fl">📝 نام</label>' +
      '<input class="fin-fi" id="edMethodName" value="' + (m ? esc(m.name) : '') + '"></div>' +
    '<div class="fin-fg"><label class="fin-fl">🎨 رنگ</label>' +
      '<div class="fin-colors" data-method-colors>' + colorsHtml + '</div></div>' +
    '<div class="fin-fg"><label class="fin-check"><input type="checkbox" id="edMethodLock" ' + (m && m.isLocked ? 'checked' : '') + '> <span>🔒 قفل</span></label></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">' +
      '<button class="fin-btn fin-btn-s" data-fin="close-modal" data-mid="fin-method-edit">انصراف</button>' +
      '<button class="fin-btn fin-btn-p" data-fin="save-method">💾 ذخیره</button>' +
    '</div>';
  openModal('fin-method-edit', html, { sheet: true });
}

function saveMethodEdit(){
  var name = document.getElementById('edMethodName').value.trim();
  var shouldLock = document.getElementById('edMethodLock').checked;
  if(!name){ toast('❌ نام', 'error'); return; }

  var all = getMethods();
  for(var i = 0; i < all.length; i++){
    if(all[i].name === name && !sameId(all[i].id, editingIds.method)){
      toast('⚠️ تکراری', 'error'); return;
    }
  }

  if(editingIds.method){
    var existing = Store.find('financeMethods', editingIds.method);
    if(existing){
      var oldName = existing.name;
      if(oldName !== name){
        var tx = getTransactions();
        for(var k = 0; k < tx.length; k++){
          if(tx[k].method === oldName) Store.update('transactions', tx[k].id, { method: name });
        }
      }
      Store.update('financeMethods', editingIds.method, {
        name: name, color: selectedMethodColor, isLocked: shouldLock
      });
    }
    toast('✅', 'success');
  } else {
    Store.add('financeMethods', {
      name: name, color: selectedMethodColor, isLocked: shouldLock
    });
    toast('✅', 'success');
  }
  closeModal('fin-method-edit');
  refreshMethodMgr();
  refreshList();
  editingIds.method = null;
}

function lockMethod(id){
  var m = Store.find('financeMethods', id);
  if(!m || m.isLocked) return;
  if(!confirm('قفل؟')) return;
  Store.update('financeMethods', id, { isLocked: true });
  toast('🔒');
  refreshMethodMgr();
}
function unlockMethod(id){
  var m = Store.find('financeMethods', id);
  if(!m || !m.isLocked) return;
  if(!confirm('باز؟')) return;
  Store.update('financeMethods', id, { isLocked: false });
  toast('🔓');
  refreshMethodMgr();
}
function deleteMethod(id){
  var m = Store.find('financeMethods', id);
  if(!m || m.isLocked){ toast('🔒', 'error'); return; }
  var used = 0;
  var tx = getTransactions();
  for(var i = 0; i < tx.length; i++) if(tx[i].method === m.name) used++;
  if(used > 0 && !confirm('در ' + fa(used) + ' تراکنش استفاده شده. حذف شود؟')) return;
  if(used === 0 && !confirm('حذف شود؟')) return;
  Store.remove('financeMethods', id);
  toast('🗑️');
  refreshMethodMgr();
  refreshList();
}

/* ═══════════════════════════════════════════════
   Calendar
   ═══════════════════════════════════════════════ */
function openCalendar(targetId){
  if(UI.openCalendar){
    UI.openCalendar(targetId);
    return;
  }
}

/* ═══════════════════════════════════════════════
   Events
   ═══════════════════════════════════════════════ */
document.addEventListener('click', function(e){
  var catColor = e.target.closest ? e.target.closest('[data-cat-colors] .fin-color') : null;
  if(catColor){
    selectedCategoryColor = catColor.dataset.color;
    var sib1 = catColor.parentElement.querySelectorAll('.fin-color');
    for(var si = 0; si < sib1.length; si++) sib1[si].classList.toggle('on', sib1[si] === catColor);
    return;
  }
  var mColor = e.target.closest ? e.target.closest('[data-method-colors] .fin-color') : null;
  if(mColor){
    selectedMethodColor = mColor.dataset.color;
    var sib2 = mColor.parentElement.querySelectorAll('.fin-color');
    for(var sj = 0; sj < sib2.length; sj++) sib2[sj].classList.toggle('on', sib2[sj] === mColor);
    return;
  }

  var btn = e.target.closest ? e.target.closest('[data-fin]') : null;
  if(!btn) return;
  var act = btn.dataset.fin;
  var id = sid(btn.dataset.id);
  var mid = btn.dataset.mid;

  switch(act){
    case 'open-form': openFinForm(); break;
    case 'edit': e.stopPropagation(); openFinForm(id); break;
    case 'del': e.stopPropagation(); deleteFin(id); break;
    case 'copy': e.stopPropagation(); copyFin(id); break;
    case 'toggle': {
      e.stopPropagation();
      uiState.expanded[id] = !uiState.expanded[id];
      var card = document.querySelector('.fin-card[data-fid="' + id + '"]');
      if(card) card.classList.toggle('expanded', !!uiState.expanded[id]);
      break;
    }
    case 'close-modal': closeModal(mid); break;
    case 'save': saveFin(); break;

    case 'toggle-filter-box': {
      e.stopPropagation();
      uiState.filterBoxOpen = !uiState.filterBoxOpen;
      var fbox = document.getElementById('finFilterBox');
      if(fbox) fbox.classList.toggle('open', uiState.filterBoxOpen);
      break;
    }
    case 'filter': {
      e.stopPropagation();
      uiState.filter = btn.dataset.f;
      uiState.filterBoxOpen = false;
      var pageRoot = document.querySelector('[data-fin-root]');
      if(pageRoot){
        var tmp = document.createElement('div');
        tmp.innerHTML = renderPage();
        pageRoot.parentNode.replaceChild(tmp.firstElementChild, pageRoot);
      }
      break;
    }

    case 'open-cat-mgr': openCategoryManager(); break;
    case 'open-add-cat': openCategoryEdit(); break;
    case 'edit-cat': openCategoryEdit(id); break;
    case 'save-cat': saveCategoryEdit(); break;
    case 'lock-cat': lockCategory(id); break;
    case 'unlock-cat': unlockCategory(id); break;
    case 'del-cat': deleteCategory(id); break;
    case 'cat-tab': switchCatTab(btn.dataset.tab); break;

    case 'open-party-mgr': openPartyManager(); break;
    case 'open-add-party': openPartyEdit(); break;
    case 'edit-party': openPartyEdit(id); break;
    case 'save-party': savePartyEdit(); break;
    case 'lock-party': lockParty(id); break;
    case 'unlock-party': unlockParty(id); break;
    case 'del-party': deleteParty(id); break;

    case 'open-method-mgr': openMethodManager(); break;
    case 'open-add-method': openMethodEdit(); break;
    case 'edit-method': openMethodEdit(id); break;
    case 'save-method': saveMethodEdit(); break;
    case 'lock-method': lockMethod(id); break;
    case 'unlock-method': unlockMethod(id); break;
    case 'del-method': deleteMethod(id); break;

    case 'open-cal': openCalendar(btn.dataset.target); break;
  }
});

document.addEventListener('click', function(e){
  if(!uiState.filterBoxOpen) return;
  var box = document.getElementById('finFilterBox');
  if(box && !box.contains(e.target)){
    uiState.filterBoxOpen = false;
    box.classList.remove('open');
  }
});

document.addEventListener('change', function(e){
  var t = e.target;
  if(t.id === 'finType') updateFormTypeUI();
});

document.addEventListener('input', function(e){
  var t = e.target;
  if(t.id === 'finAmount'){
    var cursorPos = t.selectionStart || 0;
    var digitsBefore = toEnDigits(t.value.slice(0, cursorPos)).replace(/[^\d]/g, '').length;
    fmtThousandsInput(t);
    if(document.activeElement === t){
      var val = t.value;
      var count = 0, newPos = val.length;
      for(var i = 0; i < val.length; i++){
        if(/\d/.test(val[i])) count++;
        if(count === digitsBefore){ newPos = i + 1; break; }
      }
      try{ t.setSelectionRange(newPos, newPos); }catch(_){}
    }
  }
});

/* ═══════════════════════════════════════════════
   Public API
   ═══════════════════════════════════════════════ */
window.FinanceModule = {
  key: 'transactions',
  get: function(){ return getTransactions().slice(); },
  set: function(data){
    if(Array.isArray(data)){
      Store.set('finance', { transactions: data, categories: getCategories(), methods: getMethods() });
      Store.save();
      refreshList();
    }
  },
  save: function(){ Store.save(); },
  load: function(){ refreshList(); }
};

window.Finance = {
  openForm: openFinForm,
  closeForm: closeModal,
  save: saveFin,
  editFin: openFinForm,
  deleteFin: deleteFin,
  copyFin: copyFin,
  openCatManager: openCategoryManager,
  openPartyManager: openPartyManager,
  openMethodManager: openMethodManager,
  openCalendar: openCalendar
};

/* ═══════════════════════════════════════════════
   Init
   ═══════════════════════════════════════════════ */
injectStyles();

Router.register('finance', {
  title: 'مالی',
  navPage: 'finance',
  topLevel: true,
  render: function(){ return renderPage(); }
});

console.log('✅ finance route registered (v4.0 - Store v4)');

})();