/* ═══════════════════════════════════════════════
   SALES — فروش (v4.0)
   بازنویسی‌شده برای Store v4 + UI مشترک
   ساخته شده توسط رضا آدینه
   ═══════════════════════════════════════════════ */
(function(){
'use strict';

console.log('🚀 sales.js start');

if(typeof Router === 'undefined' || typeof Router.register !== 'function'){
  console.error('❌ Router not available');
  return;
}
if(window.__salesModuleLoaded) return;
window.__salesModuleLoaded = true;

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
var todayStr        = UI.todayStr;

/* ═══════ State ═══════ */
var uiState = { filter: 'all', expanded: {}, filterBoxOpen: false };
var editingSaleId = null;
var editingIds = { type: null, party: null, method: null };
var selectedTypeColor = '#f59e0b';
var selectedMethodColor = '#10b981';
var calState = { y: UI.todayJ.y, m: UI.todayJ.m, sel: null, targetId: null };
var _modals = {};

/* ═══════════════════════════════════════════════
   Data Access
   ═══════════════════════════════════════════════ */
function getSales(){ return Store.all('sales'); }
function getSaleTypes(){ return Store.all('saleTypes'); }
function getParties(){ return Store.all('parties'); }
function getMethods(){ return Store.all('financeMethods'); }

function getTypeByName(n){
  var types = getSaleTypes();
  for(var i = 0; i < types.length; i++) if(types[i].name === n) return types[i];
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

/* گله‌ها از flocks */
function getFlocks(){
  return Store.all('flocks').filter(function(f){ return !f.isDeleted; });
}
function flockLabel(f){
  if(!f) return '';
  var name = f.name || '';
  var extra = [];
  var count = f.count || f.initialCount || 0;
  var alive = f.alive || f.aliveCount || 0;
  if(count) extra.push(fa(count) + ' قطعه');
  if(f.hall) extra.push(f.hall);
  if(alive && alive !== count) extra.push(fa(alive) + ' زنده');
  return extra.length ? (name + ' — ' + extra.join(' • ')) : name;
}
function flockValue(f){
  if(!f) return '';
  return String(f.id || f.name || '');
}

/* ═══════ Modal ═══════ */
function openModal(id, html, opts){
  opts = opts || {};
  if(_modals[id]) return _modals[id];
  var wrap = document.createElement('div');
  wrap.className = 'sl-modal-wrap';
  wrap.dataset.modalId = id;
  wrap.innerHTML = '<div class="sl-modal-bg" data-sl="close-modal" data-mid="' + id + '"></div>' +
    '<div class="sl-modal-box' + (opts.sheet ? ' sl-sheet' : '') + '">' + html + '</div>';
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
  if(document.getElementById('sl-styles')) return;
  var css =
  '.sl-page{padding:10px;max-width:760px;margin:0 auto}' +
  '.sl-header{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap}' +
  '.sl-title{font-size:14px;font-weight:900}' +
  '.sl-sub{font-size:10.5px;color:#64748b;font-weight:700;margin-top:1px}' +
  '.sl-action-btn{color:#fff;border:none;padding:8px 14px;border-radius:9999px;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:4px;white-space:nowrap;background:linear-gradient(135deg,#0f766e,#14b8a6);box-shadow:0 3px 10px rgba(15,118,110,.3)}' +
  '.sl-summary{background:#fff;border-radius:12px;padding:10px;margin-bottom:10px;border:1px solid #e2e8f0;display:grid;grid-template-columns:repeat(4,1fr);gap:6px}' +
  '.sl-sum{background:#f1f5f9;border-radius:8px;padding:8px 4px;text-align:center;border-bottom:2px solid #0f766e}' +
  '.sl-sum.g{border-color:#10b981}.sl-sum.b{border-color:#3b82f6}.sl-sum.o{border-color:#f59e0b}.sl-sum.p{border-color:#8b5cf6}' +
  '.sl-sum-ic{font-size:14px;line-height:1;margin-bottom:2px}' +
  '.sl-sum-v{font-size:14px;font-weight:900;line-height:1.2}' +
  '.sl-sum-l{font-size:9.5px;color:#64748b;font-weight:700;margin-top:1px}' +
  '.sl-filter-box{position:relative;margin-bottom:10px}' +
  '.sl-filter-btn{background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;padding:9px 12px;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:8px;width:100%;justify-content:space-between;color:#0f172a;box-sizing:border-box;text-align:right}' +
  '.sl-filter-btn .fb-left{display:flex;align-items:center;gap:6px;min-width:0;flex:1}' +
  '.sl-filter-btn .fb-label{color:#0f766e;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
  '.sl-filter-btn .fb-arrow{font-size:12px;color:#64748b;transition:transform .2s;flex-shrink:0}' +
  '.sl-filter-box.open .fb-arrow{transform:rotate(90deg)}' +
  '.sl-filter-menu{display:none;position:absolute;top:calc(100% + 6px);right:0;left:0;background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;box-shadow:0 8px 24px rgba(15,23,42,.14);z-index:80;overflow:hidden;max-height:60vh;overflow-y:auto}' +
  '.sl-filter-box.open .sl-filter-menu{display:block}' +
  '.sl-filter-sec{padding:8px 14px 4px;font-size:9.5px;font-weight:900;color:#94a3b8;background:#f8fafc;border-bottom:1px solid #f1f5f9}' +
  '.sl-filter-item{padding:11px 14px;font-size:12px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #f1f5f9;color:#0f172a}' +
  '.sl-filter-item:last-child{border-bottom:none}' +
  '.sl-filter-item.on{background:linear-gradient(135deg,#ecfdf5,#d1fae5);color:#0f766e}' +
  '.sl-filter-item .fi-check{color:#10b981;font-weight:900;opacity:0;font-size:13px}' +
  '.sl-filter-item.on .fi-check{opacity:1}' +
  '.sl-filter-item .fi-count{font-size:10px;color:#64748b;font-weight:700;background:#f1f5f9;padding:1px 7px;border-radius:9999px}' +
  '.sl-card{background:#fff;border-radius:12px;margin-bottom:6px;border:1px solid #e2e8f0;border-right:3px solid #0f766e;overflow:hidden}' +
  '.sl-card-hd{display:flex;justify-content:space-between;align-items:flex-start;gap:6px;padding:8px 10px;cursor:pointer;user-select:none}' +
  '.sl-hd-content{flex:1;min-width:0}' +
  '.sl-hd-row1{display:flex;align-items:center;gap:6px;margin-bottom:5px;flex-wrap:wrap}' +
  '.sl-hd-ic{font-size:14px;flex-shrink:0}' +
  '.sl-hd-name{font-size:12.5px;font-weight:900;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60%}' +
  '.sl-type-badge{font-size:9px;font-weight:800;padding:2px 7px;border-radius:9999px}' +
  '.sl-type-badge.paid{background:#ecfdf5;color:#166534}' +
  '.sl-type-badge.pending{background:#fffbeb;color:#92400e}' +
  '.sl-hd-row2{display:flex;align-items:center;gap:5px;flex-wrap:wrap}' +
  '.sl-stat{display:inline-flex;align-items:center;gap:2px;padding:2px 6px;border-radius:9999px;background:#f1f5f9;font-size:10px;font-weight:700;white-space:nowrap}' +
  '.sl-stat.r{background:#fef2f2;color:#991b1b}.sl-stat.g{background:#ecfdf5;color:#166534}' +
  '.sl-stat.b{background:#eff6ff;color:#1e40af}.sl-stat.o{background:#fffbeb;color:#92400e}.sl-stat.p{background:#f5f3ff;color:#6b21a8}' +
  '.sl-stat strong{font-weight:900;font-size:11px}' +
  '.sl-toggle{background:#f1f5f9;border:none;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:#0f766e;cursor:pointer;flex-shrink:0;transition:transform .3s,background .2s}' +
  '.sl-card.expanded .sl-toggle{transform:rotate(180deg);background:#0f766e;color:#fff}' +
  '.sl-card-bd{max-height:0;overflow:hidden;transition:max-height .35s,padding .35s;padding:0 10px}' +
  '.sl-card.expanded .sl-card-bd{max-height:1000px;padding:8px 10px 10px;border-top:1px dashed #e2e8f0}' +
  '.sl-amount{text-align:center;padding:8px;border-radius:10px;margin-bottom:8px;font-size:17px;font-weight:900;background:linear-gradient(135deg,#ecfdf5,#d1fae5);color:#065f46;border-right:3px solid #10b981}' +
  '.sl-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:8px}' +
  '.sl-box{background:#f1f5f9;border-radius:6px;padding:5px 6px;text-align:center;border-bottom:2px solid #cbd5e1}' +
  '.sl-box.r{border-color:#ef4444}.sl-box.g{border-color:#10b981}.sl-box.b{border-color:#3b82f6}.sl-box.o{border-color:#f59e0b}.sl-box.p{border-color:#8b5cf6}' +
  '.sl-box-l{font-size:9px;color:#64748b;font-weight:700;margin-bottom:1px}' +
  '.sl-box-v{font-size:11.5px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
  '.sl-box.r .sl-box-v{color:#ef4444}.sl-box.g .sl-box-v{color:#10b981}' +
  '.sl-box.b .sl-box-v{color:#3b82f6}.sl-box.o .sl-box-v{color:#f59e0b}.sl-box.p .sl-box-v{color:#8b5cf6}' +
  '.sl-chips{display:flex;flex-wrap:wrap;gap:3px;margin-bottom:6px}' +
  '.sl-chip{display:inline-flex;align-items:center;gap:3px;padding:3px 7px;border-radius:9999px;font-size:10px;font-weight:700;background:#f1f5f9}' +
  '.sl-chip.date{background:#eff6ff;color:#1e40af}' +
  '.sl-chip.money{background:#ecfdf5;color:#166534}' +
  '.sl-chip.method{background:#f5f3ff;color:#6b21a8}' +
  '.sl-chip.party{background:#fffbeb;color:#92400e}' +
  '.sl-chip.flock{background:#f0fdfa;color:#0f766e}' +
  '.sl-note{background:#f1f5f9;padding:6px 8px;border-radius:6px;font-size:11px;color:#475569;border-right:2px solid #0f766e;margin-bottom:6px}' +
  '.sl-note-l{font-size:9.5px;font-weight:900;color:#64748b;margin-bottom:2px;display:block}' +
  '.sl-actions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;padding-top:6px;border-top:1px dashed #e2e8f0}' +
  '.sl-actions button{padding:6px;border:none;border-radius:6px;font-family:inherit;font-size:10.5px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:3px}' +
  '.sl-act-edit{background:#eff6ff;color:#1e40af}' +
  '.sl-act-copy{background:#f5f3ff;color:#6b21a8}' +
  '.sl-act-del{background:#fef2f2;color:#991b1b}' +
  '.sl-empty{text-align:center;padding:48px 24px;background:#fff;border-radius:12px;border:1px dashed #cbd5e1}' +
  '.sl-empty-ic{font-size:56px;line-height:1;display:block;margin-bottom:12px;opacity:.6}' +
  '.sl-empty-t{font-size:14px;font-weight:900;margin-bottom:6px}' +
  '.sl-empty-x{font-size:12px;color:#64748b;font-weight:600;margin:0 auto 16px;max-width:280px}' +
  '.sl-modal-wrap{position:fixed;inset:0;z-index:2000;display:flex;align-items:flex-end;justify-content:center;opacity:0;pointer-events:none;transition:opacity .2s}' +
  '.sl-modal-wrap.on{opacity:1;pointer-events:auto}' +
  '.sl-modal-bg{position:absolute;inset:0;background:rgba(15,23,42,.55)}' +
  '.sl-modal-box{position:relative;background:#fff;width:100%;max-width:760px;border-radius:24px 24px 0 0;padding:14px;max-height:95vh;overflow-y:auto;transform:translateY(30px);transition:transform .3s;padding-bottom:calc(20px + env(safe-area-inset-bottom,0px))}' +
  '.sl-modal-wrap.on .sl-modal-box{transform:translateY(0)}' +
  '.sl-modal-box.sl-sheet{border-radius:16px;max-width:440px;margin:auto}' +
  '.sl-modal-hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #e2e8f0}' +
  '.sl-modal-t{font-size:14px;font-weight:800}' +
  '.sl-modal-x{background:#f1f5f9;border:none;width:32px;height:32px;border-radius:50%;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center}' +
  '.sl-sec{margin-bottom:16px}' +
  '.sl-sec-hd{display:flex;align-items:center;gap:6px;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #e2e8f0}' +
  '.sl-sec-ic{width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}' +
  '.sl-sec-t{font-size:12.5px;font-weight:900}' +
  '.sl-fg{margin-bottom:10px}' +
  '.sl-fl{font-size:11px;font-weight:800;margin-bottom:4px;display:flex;align-items:center;gap:4px}' +
  '.sl-fl-hint{font-size:9.5px;color:#0f766e;font-weight:700;margin-right:auto;cursor:pointer;text-decoration:underline}' +
  '.sl-fi,.sl-fs,.sl-ft{display:block;width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:12px;font-size:13px;font-family:inherit;background:#f1f5f9;color:#0f172a;box-sizing:border-box}' +
  '.sl-fi{height:42px;line-height:40px;padding:0 12px}' +
  '.sl-fs{height:42px;line-height:40px;padding:0 32px 0 12px;cursor:pointer;appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml;charset=utf8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2364748b\' stroke-width=\'2\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:left 10px center;background-size:16px 16px}' +
  '.sl-fi:focus,.sl-fs:focus,.sl-ft:focus{outline:none;border-color:#0f766e;background:#fff;box-shadow:0 0 0 3px #f0fdfa}' +
  '.sl-ft{resize:vertical;min-height:55px;line-height:1.6}' +
  '.sl-fr{display:grid;grid-template-columns:1fr 1fr;gap:8px}' +
  '.sl-fr3{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}' +
  '.sl-date-field{display:flex;gap:6px;align-items:stretch}' +
  '.sl-date-field .sl-fi{flex:1;min-width:0;text-align:left;direction:ltr;font-weight:700;cursor:pointer}' +
  '.sl-date-btn{width:42px;flex-shrink:0;border:none;border-radius:12px;background:#0f766e;color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}' +
  '.sl-iwb{display:flex;gap:6px;align-items:stretch}' +
  '.sl-iwb .sl-fs{flex:1;min-width:0}' +
  '.sl-ibtn{width:42px;flex-shrink:0;border:none;border-radius:12px;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;background:#10b981;color:#fff}' +
  '.sl-save{width:100%;padding:14px;border:none;border-radius:12px;background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;font-family:inherit;font-size:14px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:16px}' +
  '.sl-total-box{background:linear-gradient(135deg,#ecfdf5,#d1fae5);border-right:4px solid #10b981;padding:12px 14px;border-radius:12px;margin:10px 0;display:flex;justify-content:space-between;align-items:center}' +
  '.sl-total-box .tb-label{font-size:11.5px;font-weight:800;color:#065f46}' +
  '.sl-total-box .tb-value{font-size:16px;font-weight:900;color:#065f46;font-variant-numeric:tabular-nums}' +
  '.sl-btn{width:100%;padding:11px;border:none;border-radius:12px;font-size:13px;font-weight:800;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px}' +
  '.sl-btn-s{background:#f1f5f9;color:#0f172a}' +
  '.sl-btn-p{background:#0f766e;color:#fff}' +
  '.sl-btn-g{background:#10b981;color:#fff}' +
  '.sl-list{display:flex;flex-direction:column;gap:6px;max-height:55vh;overflow-y:auto;padding:2px}' +
  '.sl-row{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#f1f5f9;border-radius:12px;border-right:3px solid #f59e0b;margin-bottom:6px}' +
  '.sl-row.locked{border-right-color:#10b981;background:linear-gradient(90deg,#ecfdf5 0%,#f1f5f9 30%)}' +
  '.sl-row-ic{width:30px;height:30px;border-radius:8px;background:#fffbeb;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}' +
  '.sl-row-info{flex:1;min-width:0}' +
  '.sl-row-n{font-size:12.5px;font-weight:800;display:flex;align-items:center;gap:4px;flex-wrap:wrap}' +
  '.sl-row-u{font-size:10px;color:#64748b;font-weight:600;margin-top:1px}' +
  '.sl-row-acts{display:flex;gap:4px;flex-shrink:0}' +
  '.sl-row-btn{width:30px;height:30px;border-radius:8px;border:none;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center}' +
  '.sl-row-btn.edit{background:#eff6ff;color:#1e40af}' +
  '.sl-row-btn.delete{background:#fef2f2;color:#ef4444}' +
  '.sl-row-btn.lock{background:#ecfdf5;color:#10b981}' +
  '.sl-row-btn.unlock{background:#fffbeb;color:#f59e0b}' +
  '.sl-badge-locked{display:inline-flex;align-items:center;gap:3px;font-size:9px;font-weight:800;padding:2px 6px;border-radius:9999px;background:#ecfdf5;color:#166534}' +
  '.sl-info-box{background:#eff6ff;color:#1e40af;padding:10px 12px;border-radius:12px;font-size:11px;font-weight:700;margin-bottom:12px;line-height:1.7;border-right:3px solid #3b82f6}' +
  '.sl-check{display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer}' +
  '.sl-check input{width:18px;height:18px;accent-color:#0f766e}' +
  '.sl-colors{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}' +
  '.sl-color{width:26px;height:26px;border-radius:50%;cursor:pointer;border:2.5px solid transparent}' +
  '.sl-color.on{border-color:#fff;box-shadow:0 0 0 1.5px #0f172a;transform:scale(1.1)}';

  var s = document.createElement('style');
  s.id = 'sl-styles';
  s.textContent = css;
  document.head.appendChild(s);
}

/* ═══════════════════════════════════════════════
   Filter Box
   ═══════════════════════════════════════════════ */
function renderFilterBox(){
  var isOpen = !!uiState.filterBoxOpen;
  var allItems = [
    { id: 'all',     ic: '📋', name: 'همه فروش‌ها' },
    { id: 'paid',    ic: '✅', name: 'دریافت‌شده' },
    { id: 'pending', ic: '⏳', name: 'مانده (نسیه)' }
  ];

  var curItem = null;
  for(var i = 0; i < allItems.length; i++) if(allItems[i].id === uiState.filter) curItem = allItems[i];
  if(!curItem){
    var tp = getTypeByName(uiState.filter);
    if(tp) curItem = { ic: tp.icon || '📦', name: tp.name };
  }
  if(!curItem) curItem = allItems[0];

  function countFor(status){
    var c = 0;
    var sales = getSales();
    for(var i = 0; i < sales.length; i++){
      if(status === 'pending' && sales[i].status === 'pending') c++;
      else if(status === 'paid' && sales[i].status !== 'pending') c++;
    }
    return c;
  }
  function countForType(name){
    var c = 0;
    var sales = getSales();
    for(var i = 0; i < sales.length; i++) if(sales[i].type === name) c++;
    return c;
  }

  function itemHtml(it){
    var on = uiState.filter === it.id;
    var count = '';
    if(it.id === 'all') count = fa(getSales().length);
    else if(it.id === 'paid') count = fa(countFor('paid'));
    else if(it.id === 'pending') count = fa(countFor('pending'));
    else count = fa(countForType(it.id));

    return '<div class="sl-filter-item ' + (on ? 'on' : '') + '" data-sl="filter" data-f="' + esc(it.id) + '">' +
      '<span>' + it.ic + ' ' + esc(it.name) + '</span>' +
      '<span style="display:flex;align-items:center;gap:4px">' +
        (count && count !== '۰' ? '<span class="fi-count">' + count + '</span>' : '') +
        '<span class="fi-check">✓</span>' +
      '</span>' +
    '</div>';
  }

  var html = '';
  for(i = 0; i < allItems.length; i++) html += itemHtml(allItems[i]);

  var types = getSaleTypes();
  if(types.length){
    html += '<div class="sl-filter-sec">📦 انواع فروش</div>';
    for(i = 0; i < types.length; i++){
      var t = types[i];
      html += itemHtml({ id: t.name, ic: t.icon || '📦', name: t.name });
    }
  }

  return '<div class="sl-filter-box ' + (isOpen ? 'open' : '') + '" id="slFilterBox">' +
    '<button type="button" class="sl-filter-btn" data-sl="toggle-filter-box">' +
      '<span class="fb-left">' +
        '<span>🔍</span>' +
        '<span style="color:#64748b">فیلتر:</span>' +
        '<span class="fb-label">' + curItem.ic + ' ' + esc(curItem.name) + '</span>' +
      '</span>' +
      '<span class="fb-arrow">‹</span>' +
    '</button>' +
    '<div class="sl-filter-menu">' + html + '</div>' +
  '</div>';
}

/* ═══════════════════════════════════════════════
   Page Render
   ═══════════════════════════════════════════════ */
function renderPage(){
  var sales = getSales();
  var totalValue = 0, totalPaid = 0, totalPending = 0;

  for(var i = 0; i < sales.length; i++){
    var s = sales[i];
    var amt = s.total || (s.qty || 0) * (s.price || 0);
    totalValue += amt;
    if(s.status === 'pending') totalPending += amt;
    else totalPaid += amt;
  }

  return '<div class="page sl-page" data-sl-root>' +
    '<div class="sl-header">' +
      '<div><div class="sl-title">💰 مدیریت فروش</div>' +
      '<div class="sl-sub">' + fa(sales.length) + ' فروش • امروز ' + todayStr + '</div></div>' +
      '<button class="sl-action-btn" data-sl="open-form">➕ <span>ثبت فروش</span></button>' +
    '</div>' +
    '<div class="sl-summary">' +
      '<div class="sl-sum g"><div class="sl-sum-ic">💰</div><div class="sl-sum-v">' + fmtShort(totalValue) + '</div><div class="sl-sum-l">کل فروش</div></div>' +
      '<div class="sl-sum b"><div class="sl-sum-ic">✅</div><div class="sl-sum-v">' + fmtShort(totalPaid) + '</div><div class="sl-sum-l">دریافت‌شده</div></div>' +
      '<div class="sl-sum o"><div class="sl-sum-ic">⏳</div><div class="sl-sum-v">' + fmtShort(totalPending) + '</div><div class="sl-sum-l">مانده</div></div>' +
      '<div class="sl-sum p"><div class="sl-sum-ic">📊</div><div class="sl-sum-v">' + fa(sales.length) + '</div><div class="sl-sum-l">تعداد</div></div>' +
    '</div>' +
    renderFilterBox() +
    '<div data-sl-list>' + renderListInner() + '</div>' +
  '</div>';
}

function renderListInner(){
  var list = getSales();
  if(uiState.filter !== 'all'){
    var filtered = [];
    for(var i = 0; i < list.length; i++){
      var s = list[i];
      if(uiState.filter === 'paid' && s.status !== 'pending') filtered.push(s);
      else if(uiState.filter === 'pending' && s.status === 'pending') filtered.push(s);
      else if(s.type === uiState.filter) filtered.push(s);
    }
    list = filtered;
  }
  if(!list.length){
    return '<div class="sl-empty">' +
      '<div class="sl-empty-ic">💰</div>' +
      '<div class="sl-empty-t">هنوز فروشی ثبت نشده</div>' +
      '<div class="sl-empty-x">برای شروع، اولین فروش خود را ثبت کنید</div>' +
      '<button class="sl-action-btn" style="margin:0 auto" data-sl="open-form">➕ ثبت فروش</button>' +
    '</div>';
  }
  list.sort(function(a, b){ return jToC(b.date) - jToC(a.date); });
  var out = '';
  for(i = 0; i < list.length; i++) out += renderCard(list[i]);
  return out;
}

function renderCard(s){
  var t = getTypeByName(s.type) || { color: '#0f766e', icon: '📦' };
  var isPending = s.status === 'pending';
  var badgeCls = isPending ? 'pending' : 'paid';
  var badgeTxt = isPending ? '⏳ نسیه' : '✅ دریافت شد';
  var total = s.total || (s.qty || 0) * (s.price || 0);
  var totalFmt = fa(total) + ' تومان';
  var isOpen = !!uiState.expanded[sid(s.id)];

  var flocks = getFlocks();
  var flock = null;
  if(s.flockId){
    for(var fi = 0; fi < flocks.length; fi++){
      if(sameId(flockValue(flocks[fi]), s.flockId)){ flock = flocks[fi]; break; }
    }
  }

  var stats =
    '<span class="sl-stat g">💰 <strong>' + fmtShort(total) + '</strong></span>' +
    '<span class="sl-stat b">📅 <strong>' + esc((s.date || '').slice(5)) + '</strong></span>' +
    '<span class="sl-stat p">📦 <strong>' + fa(s.qty || 0) + ' ' + esc(s.unit || '') + '</strong></span>';

  var chips = '';
  if(s.party) chips += '<span class="sl-chip party">👤 ' + esc(s.party) + '</span>';
  if(s.method) chips += '<span class="sl-chip method">💳 ' + esc(s.method) + '</span>';
  if(flock) chips += '<span class="sl-chip flock">🏠 ' + esc(flockLabel(flock)) + '</span>';

  return '<div class="sl-card ' + (isOpen ? 'expanded' : '') + '" data-sid="' + sid(s.id) + '" style="border-right-color:' + (t.color || '#0f766e') + '">' +
    '<div class="sl-card-hd" data-sl="toggle" data-id="' + sid(s.id) + '">' +
      '<div class="sl-hd-content">' +
        '<div class="sl-hd-row1">' +
          '<span class="sl-hd-ic">' + (t.icon || '📦') + '</span>' +
          '<div class="sl-hd-name">' + esc(s.type || '—') + (s.party ? ' → ' + esc(s.party) : '') + '</div>' +
          '<span class="sl-type-badge ' + badgeCls + '">' + badgeTxt + '</span>' +
        '</div>' +
        '<div class="sl-hd-row2">' + stats + '</div>' +
      '</div>' +
      '<button class="sl-toggle" type="button">▼</button>' +
    '</div>' +
    '<div class="sl-card-bd">' +
      '<div class="sl-amount">+ ' + totalFmt + '</div>' +
      '<div class="sl-grid">' +
        '<div class="sl-box b"><div class="sl-box-l">📦 نوع</div><div class="sl-box-v">' + esc(s.type || '—') + '</div></div>' +
        '<div class="sl-box o"><div class="sl-box-l">👤 خریدار</div><div class="sl-box-v">' + esc(s.party || '—') + '</div></div>' +
        '<div class="sl-box p"><div class="sl-box-l">💳 روش</div><div class="sl-box-v">' + esc(s.method || '—') + '</div></div>' +
        '<div class="sl-box g"><div class="sl-box-l">💰 قیمت واحد</div><div class="sl-box-v">' + fa(s.price || 0) + '</div></div>' +
        '<div class="sl-box"><div class="sl-box-l">⚖️ واحد</div><div class="sl-box-v">' + esc(s.unit || '—') + '</div></div>' +
        '<div class="sl-box"><div class="sl-box-l">🏠 گله</div><div class="sl-box-v">' + (flock ? esc(flock.name || '') : '—') + '</div></div>' +
      '</div>' +
      '<div class="sl-chips">' +
        '<span class="sl-chip date">📅 ' + esc(s.date) + '</span>' +
        chips +
      '</div>' +
      (s.notes ? '<div class="sl-note"><span class="sl-note-l">📝 یادداشت:</span>' + esc(s.notes) + '</div>' : '') +
      '<div class="sl-actions">' +
        '<button class="sl-act-edit" data-sl="edit" data-id="' + sid(s.id) + '">✏️ ویرایش</button>' +
        '<button class="sl-act-copy" data-sl="copy" data-id="' + sid(s.id) + '">📋 کپی</button>' +
        '<button class="sl-act-del" data-sl="del" data-id="' + sid(s.id) + '">🗑️ حذف</button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function refreshList(){
  var el = document.querySelector('[data-sl-list]');
  if(el) el.innerHTML = renderListInner();

  var sales = getSales();
  var totalValue = 0, totalPaid = 0, totalPending = 0;
  for(var i = 0; i < sales.length; i++){
    var s = sales[i];
    var amt = s.total || (s.qty || 0) * (s.price || 0);
    totalValue += amt;
    if(s.status === 'pending') totalPending += amt;
    else totalPaid += amt;
  }

  var sv = document.querySelectorAll('[data-sl-root] .sl-sum-v');
  if(sv.length === 4){
    sv[0].textContent = fmtShort(totalValue);
    sv[1].textContent = fmtShort(totalPaid);
    sv[2].textContent = fmtShort(totalPending);
    sv[3].textContent = fa(sales.length);
  }
  var sub = document.querySelector('[data-sl-root] .sl-sub');
  if(sub) sub.textContent = fa(sales.length) + ' فروش • امروز ' + todayStr;

  var box = document.getElementById('slFilterBox');
  if(box){
    var tmp = document.createElement('div');
    tmp.innerHTML = renderFilterBox();
    box.parentNode.replaceChild(tmp.firstElementChild, box);
  }
}

/* ═══════════════════════════════════════════════
   Options
   ═══════════════════════════════════════════════ */
function typeOptions(cur){
  var types = getSaleTypes();
  if(!types.length) return '<option value="">— نوع بسازید —</option>';
  var out = '';
  for(var i = 0; i < types.length; i++){
    var t = types[i];
    out += '<option value="' + esc(t.name) + '" ' + (cur === t.name ? 'selected' : '') + '>' + (t.icon || '📦') + ' ' + esc(t.name) + '</option>';
  }
  return out;
}
function partyOptions(cur){
  var parties = getParties();
  var out = '<option value="">— انتخاب —</option>';
  for(var i = 0; i < parties.length; i++){
    var p = parties[i];
    out += '<option value="' + esc(p.name) + '" ' + (cur === p.name ? 'selected' : '') + '>👤 ' + esc(p.name) + (p.city ? ' (' + esc(p.city) + ')' : '') + '</option>';
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
function flockOptions(cur){
  var flocks = getFlocks();
  var out = '<option value="">— بدون گله —</option>';
  if(!flocks.length){
    out += '<option value="" disabled>⚠️ هنوز گله‌ای ثبت نشده</option>';
    return out;
  }
  for(var i = 0; i < flocks.length; i++){
    var f = flocks[i];
    var val = flockValue(f);
    out += '<option value="' + esc(val) + '" ' + (sameId(cur, val) ? 'selected' : '') + '>🏠 ' + esc(flockLabel(f)) + '</option>';
  }
  return out;
}

/* ═══════════════════════════════════════════════
   Form
   ═══════════════════════════════════════════════ */
function openForm(id){
  editingSaleId = id ? sid(id) : null;
  var s = id ? Store.find('sales', id) : null;
  var type = s ? s.type : (getSaleTypes()[0] ? getSaleTypes()[0].name : '');
  var unitDefault = 'عدد';
  var typeObj = getTypeByName(type);
  if(typeObj && typeObj.unit) unitDefault = typeObj.unit;
  var unit = s ? (s.unit || unitDefault) : unitDefault;
  var qtyVal = s ? (s.qty || '') : '';
  var priceVal = (s && s.price) ? Number(s.price).toLocaleString('en-US') : '';

  var html = '<div class="sl-modal-hd">' +
    '<div class="sl-modal-t">' + (id ? '✏️ ویرایش فروش' : '💰 فروش جدید') + '</div>' +
    '<button class="sl-modal-x" data-sl="close-modal" data-mid="sl-form">✕</button>' +
  '</div>' +

  '<div class="sl-sec">' +
    '<div class="sl-sec-hd"><div class="sl-sec-ic" style="background:#f0fdfa">📋</div>' +
    '<div><div class="sl-sec-t" style="color:#0f766e">اطلاعات فروش</div></div></div>' +
    '<div class="sl-fr">' +
      '<div class="sl-fg"><label class="sl-fl">📅 تاریخ</label>' +
        '<div class="sl-date-field"><input class="sl-fi" type="text" id="slDate" readonly value="' + (s ? esc(s.date) : todayStr) + '">' +
        '<button type="button" class="sl-date-btn" data-sl="open-cal" data-target="slDate">📅</button></div></div>' +
      '<div class="sl-fg"><label class="sl-fl">📦 نوع <span class="sl-fl-hint" data-sl="open-type-mgr">مدیریت</span></label>' +
        '<div class="sl-iwb">' +
          '<select class="sl-fs" id="slType">' + typeOptions(type) + '</select>' +
          '<button type="button" class="sl-ibtn" data-sl="open-add-type">➕</button>' +
        '</div></div>' +
    '</div>' +
    '<div class="sl-fr">' +
      '<div class="sl-fg"><label class="sl-fl">👤 خریدار <span class="sl-fl-hint" data-sl="open-party-mgr">مدیریت</span></label>' +
        '<div class="sl-iwb">' +
          '<select class="sl-fs" id="slParty">' + partyOptions(s ? s.party : '') + '</select>' +
          '<button type="button" class="sl-ibtn" data-sl="open-add-party">➕</button>' +
        '</div></div>' +
      '<div class="sl-fg"><label class="sl-fl">🏠 از کدام گله</label>' +
        '<select class="sl-fs" id="slFlock">' + flockOptions(s ? s.flockId : '') + '</select></div>' +
    '</div>' +
  '</div>' +

  '<div class="sl-sec">' +
    '<div class="sl-sec-hd"><div class="sl-sec-ic" style="background:#ecfdf5">💰</div>' +
    '<div><div class="sl-sec-t" style="color:#10b981">مقدار و قیمت</div></div></div>' +
    '<div class="sl-fr3">' +
      '<div class="sl-fg"><label class="sl-fl">🔢 تعداد</label>' +
        '<input class="sl-fi" type="text" inputmode="numeric" id="slQty" value="' + esc(qtyVal) + '" placeholder="۰"></div>' +
      '<div class="sl-fg"><label class="sl-fl">⚖️ واحد</label>' +
        '<select class="sl-fs" id="slUnit">' +
          '<option value="عدد" ' + (unit === 'عدد' ? 'selected' : '') + '>عدد</option>' +
          '<option value="کیلو" ' + (unit === 'کیلو' ? 'selected' : '') + '>کیلو</option>' +
          '<option value="تن" ' + (unit === 'تن' ? 'selected' : '') + '>تن</option>' +
          '<option value="بسته" ' + (unit === 'بسته' ? 'selected' : '') + '>بسته</option>' +
          '<option value="کارتن" ' + (unit === 'کارتن' ? 'selected' : '') + '>کارتن</option>' +
        '</select></div>' +
      '<div class="sl-fg"><label class="sl-fl">💵 قیمت واحد</label>' +
        '<input class="sl-fi" type="text" inputmode="numeric" id="slUnitPrice" value="' + priceVal + '" placeholder="۱۲۰,۰۰۰"></div>' +
    '</div>' +
    '<div class="sl-total-box"><span class="tb-label">💰 کل:</span><span class="tb-value" id="slTotal">۰ تومان</span></div>' +
  '</div>' +

  '<div class="sl-sec">' +
    '<div class="sl-sec-hd"><div class="sl-sec-ic" style="background:#eff6ff">💳</div>' +
    '<div><div class="sl-sec-t" style="color:#3b82f6">وضعیت پرداخت</div></div></div>' +
    '<div class="sl-fr">' +
      '<div class="sl-fg"><label class="sl-fl">💳 روش <span class="sl-fl-hint" data-sl="open-method-mgr">مدیریت</span></label>' +
        '<div class="sl-iwb">' +
          '<select class="sl-fs" id="slMethod">' + methodOptions(s ? s.method : '') + '</select>' +
          '<button type="button" class="sl-ibtn" data-sl="open-add-method">➕</button>' +
        '</div></div>' +
      '<div class="sl-fg"><label class="sl-fl">⚙️ وضعیت</label>' +
        '<select class="sl-fs" id="slStatus">' +
          '<option value="paid" ' + (!s || s.status !== 'pending' ? 'selected' : '') + '>✅ دریافت شد</option>' +
          '<option value="pending" ' + (s && s.status === 'pending' ? 'selected' : '') + '>⏳ مانده (نسیه)</option>' +
        '</select></div>' +
    '</div>' +
  '</div>' +

  '<div class="sl-sec">' +
    '<div class="sl-sec-hd"><div class="sl-sec-ic" style="background:#f5f3ff">📝</div>' +
    '<div><div class="sl-sec-t" style="color:#8b5cf6">یادداشت</div></div></div>' +
    '<textarea class="sl-ft" id="slNotes">' + (s ? esc(s.notes || '') : '') + '</textarea>' +
  '</div>' +

  '<button class="sl-save" data-sl="save">💾 ذخیره فروش</button>';

  openModal('sl-form', html);
  setTimeout(function(){ recalcTotal(); }, 30);
}

function onTypeChange(){
  var sel = document.getElementById('slType');
  if(!sel) return;
  var t = getTypeByName(sel.value);
  if(t && t.unit){
    var unitSel = document.getElementById('slUnit');
    if(unitSel) unitSel.value = t.unit;
  }
}

function recalcTotal(){
  var qtyEl = document.getElementById('slQty');
  var priceEl = document.getElementById('slUnitPrice');
  if(!qtyEl || !priceEl) return;
  var qty = parseNum(qtyEl.value);
  var price = parseNum(priceEl.value);
  var total = qty * price;
  var el = document.getElementById('slTotal');
  if(el) el.textContent = fa(total) + ' تومان';
}

function save(){
  var date = document.getElementById('slDate').value.trim();
  if(!date){ toast('❌ تاریخ', 'error'); return; }
  var type = document.getElementById('slType').value;
  if(!type){ toast('❌ نوع فروش', 'error'); return; }
  var qty = parseNum(document.getElementById('slQty').value);
  if(qty <= 0){ toast('❌ تعداد', 'error'); return; }
  var price = parseNum(document.getElementById('slUnitPrice').value);
  if(price <= 0){ toast('❌ قیمت واحد', 'error'); return; }
  var total = qty * price;

  var party = document.getElementById('slParty').value;

  var data = {
    date: date,
    type: type,
    party: party,
    buyer: party,
    flockId: document.getElementById('slFlock').value,
    qty: qty,
    quantity: qty,
    unit: document.getElementById('slUnit').value,
    price: price,
    unitPrice: price,
    total: total,
    method: document.getElementById('slMethod').value,
    status: document.getElementById('slStatus').value,
    payStatus: document.getElementById('slStatus').value === 'pending' ? 'نسیه' : 'نقدی',
    notes: document.getElementById('slNotes').value.trim()
  };

  /* اگر خریدار جدید، به parties اضافه کن */
  if(party){
    var existingParty = getPartyByName(party);
    if(!existingParty){
      Store.add('parties', {
        name: party, type: 'buyer',
        phone: '', city: '', notes: '',
        isLocked: false
      });
    }
  }

  if(editingSaleId){
    Store.update('sales', editingSaleId, data);
    toast('✅ ویرایش شد', 'success');
  } else {
    Store.add('sales', data);
    toast('✅ ثبت شد', 'success');
  }
  closeModal('sl-form');
  refreshList();
  editingSaleId = null;
}

function deleteSale(id){
  var s = Store.find('sales', id);
  if(!s) return;
  if(!confirm('فروش «' + (s.type || '') + '» به «' + (s.party || '—') + '» حذف شود؟')) return;
  Store.remove('sales', id);
  toast('🗑️ حذف شد');
  refreshList();
}

function copySale(id){
  var s = Store.find('sales', id);
  if(!s) return;
  var copy = JSON.parse(JSON.stringify(s));
  delete copy.id;
  delete copy.createdAt;
  copy.date = todayStr;
  Store.add('sales', copy);
  toast('📋 کپی شد', 'success');
  refreshList();
}

/* ═══════════════════════════════════════════════
   Type Manager
   ═══════════════════════════════════════════════ */
function renderTypeListInner(){
  var types = getSaleTypes();
  if(!types.length) return '<div style="text-align:center;padding:20px;color:#64748b;font-size:12px">هنوز نوعی نیست</div>';
  var sales = getSales();
  var out = '';
  for(var i = 0; i < types.length; i++){
    var t = types[i];
    var used = 0;
    for(var j = 0; j < sales.length; j++) if(sales[j].type === t.name) used++;
    var cls = 'sl-row' + (t.isLocked ? ' locked' : '');
    var ic = t.isLocked ? '🔒' : (t.icon || '📦');
    var badge = t.isLocked ? '<span class="sl-badge-locked">🔒</span>' : '';
    var acts = t.isLocked
      ? '<button class="sl-row-btn unlock" data-sl="unlock-type" data-id="' + sid(t.id) + '">🔓</button>'
      : '<button class="sl-row-btn edit" data-sl="edit-type" data-id="' + sid(t.id) + '">✏️</button>' +
        '<button class="sl-row-btn lock" data-sl="lock-type" data-id="' + sid(t.id) + '">🔒</button>' +
        '<button class="sl-row-btn delete" data-sl="del-type" data-id="' + sid(t.id) + '">🗑️</button>';
    out += '<div class="' + cls + '" style="border-right-color:' + (t.color || '#f59e0b') + '">' +
      '<div class="sl-row-ic" style="background:' + (t.color || '#f59e0b') + '22;color:' + (t.color || '#f59e0b') + '">' + ic + '</div>' +
      '<div class="sl-row-info"><div class="sl-row-n">' + esc(t.name) + ' ' + badge + '</div>' +
      '<div class="sl-row-u">واحد: ' + esc(t.unit || '—') + ' • ' + fa(used) + ' فروش</div></div>' +
      '<div class="sl-row-acts">' + acts + '</div></div>';
  }
  return out;
}

function openTypeManager(){
  var existing = _modals['sl-type-mgr'];
  if(existing){ try{ existing.remove(); }catch(e){} delete _modals['sl-type-mgr']; }
  var html = '<div class="sl-modal-hd"><div class="sl-modal-t">📦 مدیریت انواع فروش</div>' +
    '<button class="sl-modal-x" data-sl="close-modal" data-mid="sl-type-mgr">✕</button></div>' +
    '<button class="sl-btn sl-btn-g" data-sl="open-add-type" style="margin-bottom:12px">➕ نوع جدید</button>' +
    '<div class="sl-list">' + renderTypeListInner() + '</div>';
  openModal('sl-type-mgr', html);
}

function refreshTypeMgr(){
  var el = document.querySelector('[data-modal-id="sl-type-mgr"] .sl-list');
  if(el) el.innerHTML = renderTypeListInner();
}

function openTypeEdit(id){
  editingIds.type = id ? sid(id) : null;
  var t = id ? Store.find('saleTypes', id) : null;
  if(t && t.isLocked){ toast('🔒', 'error'); return; }
  selectedTypeColor = t ? (t.color || '#f59e0b') : '#f59e0b';

  var colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#0f766e'];
  var colorsHtml = '';
  for(var ci = 0; ci < colors.length; ci++){
    colorsHtml += '<div class="sl-color ' + (colors[ci] === selectedTypeColor ? 'on' : '') + '" data-color="' + colors[ci] + '" style="background:' + colors[ci] + '"></div>';
  }

  var html = '<div class="sl-modal-hd"><div class="sl-modal-t">' + (id ? '✏️ ویرایش نوع' : '📦 نوع جدید') + '</div>' +
    '<button class="sl-modal-x" data-sl="close-modal" data-mid="sl-type-edit">✕</button></div>' +
    '<div class="sl-fg"><label class="sl-fl">📝 نام</label>' +
      '<input class="sl-fi" id="edTypeName" value="' + (t ? esc(t.name) : '') + '" placeholder="مثلاً: جوجه یک‌روزه"></div>' +
    '<div class="sl-fr">' +
      '<div class="sl-fg"><label class="sl-fl">📌 آیکون</label>' +
        '<input class="sl-fi" id="edTypeIcon" value="' + (t ? esc(t.icon || '') : '') + '" maxlength="2" placeholder="🐣"></div>' +
      '<div class="sl-fg"><label class="sl-fl">⚖️ واحد</label>' +
        '<select class="sl-fs" id="edTypeUnit">' +
          '<option value="عدد" ' + (t && t.unit === 'عدد' ? 'selected' : '') + '>عدد</option>' +
          '<option value="کیلو" ' + (t && t.unit === 'کیلو' ? 'selected' : '') + '>کیلو</option>' +
          '<option value="تن" ' + (t && t.unit === 'تن' ? 'selected' : '') + '>تن</option>' +
          '<option value="بسته" ' + (t && t.unit === 'بسته' ? 'selected' : '') + '>بسته</option>' +
          '<option value="کارتن" ' + (t && t.unit === 'کارتن' ? 'selected' : '') + '>کارتن</option>' +
        '</select></div>' +
    '</div>' +
    '<div class="sl-fg"><label class="sl-fl">🎨 رنگ</label>' +
      '<div class="sl-colors" data-type-colors>' + colorsHtml + '</div></div>' +
    '<div class="sl-fg"><label class="sl-check"><input type="checkbox" id="edTypeLock" ' + (t && t.isLocked ? 'checked' : '') + '> <span>🔒 قفل</span></label></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">' +
      '<button class="sl-btn sl-btn-s" data-sl="close-modal" data-mid="sl-type-edit">انصراف</button>' +
      '<button class="sl-btn sl-btn-p" data-sl="save-type">💾 ذخیره</button>' +
    '</div>';
  openModal('sl-type-edit', html, { sheet: true });
}

function saveTypeEdit(){
  var name = document.getElementById('edTypeName').value.trim();
  var icon = document.getElementById('edTypeIcon').value.trim();
  var unit = document.getElementById('edTypeUnit').value;
  var shouldLock = document.getElementById('edTypeLock').checked;
  if(!name){ toast('❌ نام', 'error'); return; }

  var types = getSaleTypes();
  for(var i = 0; i < types.length; i++){
    if(types[i].name === name && !sameId(types[i].id, editingIds.type)){
      toast('⚠️ تکراری', 'error'); return;
    }
  }

  if(editingIds.type){
    var existing = Store.find('saleTypes', editingIds.type);
    if(existing){
      var oldName = existing.name;
      if(oldName !== name){
        var sales = getSales();
        for(var k = 0; k < sales.length; k++){
          if(sales[k].type === oldName) Store.update('sales', sales[k].id, { type: name });
        }
      }
      Store.update('saleTypes', editingIds.type, {
        name: name, color: selectedTypeColor, icon: icon || '📦', unit: unit, isLocked: shouldLock
      });
    }
    toast('✅', 'success');
  } else {
    Store.add('saleTypes', {
      name: name, color: selectedTypeColor, icon: icon || '📦', unit: unit, isLocked: shouldLock
    });
    toast('✅', 'success');
  }
  closeModal('sl-type-edit');
  refreshTypeMgr();
  refreshList();
  editingIds.type = null;
}

function lockType(id){
  var t = Store.find('saleTypes', id);
  if(!t || t.isLocked) return;
  if(!confirm('قفل؟')) return;
  Store.update('saleTypes', id, { isLocked: true });
  toast('🔒');
  refreshTypeMgr();
}
function unlockType(id){
  var t = Store.find('saleTypes', id);
  if(!t || !t.isLocked) return;
  if(!confirm('باز؟')) return;
  Store.update('saleTypes', id, { isLocked: false });
  toast('🔓');
  refreshTypeMgr();
}
function deleteType(id){
  var t = Store.find('saleTypes', id);
  if(!t || t.isLocked){ toast('🔒', 'error'); return; }
  var used = 0;
  var sales = getSales();
  for(var i = 0; i < sales.length; i++) if(sales[i].type === t.name) used++;
  if(used > 0 && !confirm('در ' + fa(used) + ' فروش استفاده شده. حذف شود؟')) return;
  if(used === 0 && !confirm('حذف شود؟')) return;
  Store.remove('saleTypes', id);
  toast('🗑️');
  refreshTypeMgr();
  refreshList();
}

/* ═══════════════════════════════════════════════
   Party Manager — مشترک با finance
   ═══════════════════════════════════════════════ */
function getPartyStats(name){
  var sales = getSales();
  var count = 0, total = 0, paid = 0, pending = 0, qty = 0;
  for(var i = 0; i < sales.length; i++){
    if(sales[i].party !== name && sales[i].buyer !== name) continue;
    count++;
    var amt = sales[i].total || (sales[i].qty || 0) * (sales[i].price || 0);
    total += amt;
    qty += sales[i].qty || 0;
    if(sales[i].status === 'pending') pending += amt;
    else paid += amt;
  }
  return { count: count, total: total, paid: paid, pending: pending, qty: qty };
}

function renderPartyListInner(){
  var parties = getParties();
  if(!parties.length) return '<div style="text-align:center;padding:20px;color:#64748b;font-size:12px">هنوز خریداری نیست</div>';
  var sorted = parties.slice().sort(function(a, b){
    return getPartyStats(b.name).total - getPartyStats(a.name).total;
  });
  var out = '';
  for(var i = 0; i < sorted.length; i++){
    var p = sorted[i];
    var st = getPartyStats(p.name);
    var cls = 'sl-row' + (p.isLocked ? ' locked' : '');
    var typeLabel = p.type === 'buyer' ? '🛒 خریدار' : p.type === 'seller' ? '💰 فروشنده' : '🔄 هر دو';
    var badge = p.isLocked ? '<span class="sl-badge-locked">🔒</span>' : '';
    var acts = p.isLocked
      ? '<button class="sl-row-btn unlock" data-sl="unlock-party" data-id="' + sid(p.id) + '">🔓</button>'
      : '<button class="sl-row-btn edit" data-sl="edit-party" data-id="' + sid(p.id) + '">✏️</button>' +
        '<button class="sl-row-btn lock" data-sl="lock-party" data-id="' + sid(p.id) + '">🔒</button>' +
        '<button class="sl-row-btn delete" data-sl="del-party" data-id="' + sid(p.id) + '">🗑️</button>';
    out += '<div class="' + cls + '" style="display:block;padding:10px 12px">' +
      '<div style="display:flex;align-items:center;gap:8px">' +
        '<div class="sl-row-ic" style="background:#eff6ff;color:#1e40af">' + (p.isLocked ? '🔒' : '👤') + '</div>' +
        '<div class="sl-row-info">' +
          '<div class="sl-row-n">' + esc(p.name) + ' ' + badge + '</div>' +
          '<div class="sl-row-u">' + typeLabel + (p.city ? ' • 📍 ' + esc(p.city) : '') + (p.phone ? ' • 📞 ' + esc(p.phone) : '') + ' • ' + fa(st.count) + ' فروش</div>' +
        '</div>' +
        '<div class="sl-row-acts">' + acts + '</div>' +
      '</div>' +
      (st.count > 0 ?
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-top:8px;padding-top:8px;border-top:1px dashed #e2e8f0">' +
          '<div class="sl-box g" style="padding:5px 4px"><div class="sl-box-l">💰 کل</div><div class="sl-box-v">' + fmtShort(st.total) + '</div></div>' +
          '<div class="sl-box b" style="padding:5px 4px"><div class="sl-box-l">✅ دریافت</div><div class="sl-box-v">' + fmtShort(st.paid) + '</div></div>' +
          '<div class="sl-box ' + (st.pending > 0 ? 'r' : 'g') + '" style="padding:5px 4px"><div class="sl-box-l">' + (st.pending > 0 ? '⚠️ مانده' : '✅ تسویه') + '</div><div class="sl-box-v">' + fmtShort(st.pending) + '</div></div>' +
        '</div>' : '') +
    '</div>';
  }
  return out;
}

function openPartyManager(){
  var existing = _modals['sl-party-mgr'];
  if(existing){ try{ existing.remove(); }catch(e){} delete _modals['sl-party-mgr']; }
  var html = '<div class="sl-modal-hd"><div class="sl-modal-t">👤 مدیریت خریداران</div>' +
    '<button class="sl-modal-x" data-sl="close-modal" data-mid="sl-party-mgr">✕</button></div>' +
    '<div class="sl-info-box">💡 مشترک بین فروش، مالی و پرونده‌ها</div>' +
    '<button class="sl-btn sl-btn-g" data-sl="open-add-party" style="margin-bottom:12px">➕ خریدار جدید</button>' +
    '<div class="sl-list">' + renderPartyListInner() + '</div>';
  openModal('sl-party-mgr', html);
}

function refreshPartyMgr(){
  var el = document.querySelector('[data-modal-id="sl-party-mgr"] .sl-list');
  if(el) el.innerHTML = renderPartyListInner();
}

function openPartyEdit(id){
  editingIds.party = id ? sid(id) : null;
  var p = id ? Store.find('parties', id) : null;
  if(p && p.isLocked){ toast('🔒', 'error'); return; }

  var html = '<div class="sl-modal-hd"><div class="sl-modal-t">' + (id ? '✏️ ویرایش' : '👤 خریدار جدید') + '</div>' +
    '<button class="sl-modal-x" data-sl="close-modal" data-mid="sl-party-edit">✕</button></div>' +
    '<div class="sl-fg"><label class="sl-fl">👤 نام</label>' +
      '<input class="sl-fi" id="edPartyName" value="' + (p ? esc(p.name) : '') + '" placeholder="مثلاً: آقای رضایی"></div>' +
    '<div class="sl-fr">' +
      '<div class="sl-fg"><label class="sl-fl">📞 تلفن</label>' +
        '<input class="sl-fi" id="edPartyPhone" value="' + (p ? esc(p.phone || '') : '') + '"></div>' +
      '<div class="sl-fg"><label class="sl-fl">📍 شهر</label>' +
        '<input class="sl-fi" id="edPartyCity" value="' + (p ? esc(p.city || '') : '') + '"></div>' +
    '</div>' +
    '<div class="sl-fg"><label class="sl-fl">🏷️ نوع</label>' +
      '<select class="sl-fs" id="edPartyType">' +
        '<option value="buyer" ' + (p && p.type === 'buyer' ? 'selected' : '') + '>🛒 خریدار</option>' +
        '<option value="seller" ' + (p && p.type === 'seller' ? 'selected' : '') + '>💰 فروشنده</option>' +
        '<option value="both" ' + (p && p.type === 'both' ? 'selected' : '') + '>🔄 هر دو</option>' +
      '</select></div>' +
    '<div class="sl-fg"><label class="sl-check"><input type="checkbox" id="edPartyLock" ' + (p && p.isLocked ? 'checked' : '') + '> <span>🔒 قفل</span></label></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">' +
      '<button class="sl-btn sl-btn-s" data-sl="close-modal" data-mid="sl-party-edit">انصراف</button>' +
      '<button class="sl-btn sl-btn-p" data-sl="save-party">💾 ذخیره</button>' +
    '</div>';
  openModal('sl-party-edit', html, { sheet: true });
}

function savePartyEdit(){
  var name = document.getElementById('edPartyName').value.trim();
  if(!name){ toast('❌ نام', 'error'); return; }
  var parties = getParties();
  for(var i = 0; i < parties.length; i++){
    if(parties[i].name === name && !sameId(parties[i].id, editingIds.party)){
      toast('⚠️ تکراری', 'error'); return;
    }
  }
  var data = {
    name: name,
    phone: document.getElementById('edPartyPhone').value.trim(),
    city: document.getElementById('edPartyCity').value.trim(),
    type: document.getElementById('edPartyType').value,
    isLocked: document.getElementById('edPartyLock').checked
  };

  if(editingIds.party){
    var existing = Store.find('parties', editingIds.party);
    if(existing){
      var old = existing.name;
      if(old !== name){
        var sales = getSales();
        for(var k = 0; k < sales.length; k++){
          if(sales[k].party === old) Store.update('sales', sales[k].id, { party: name });
          if(sales[k].buyer === old) Store.update('sales', sales[k].id, { buyer: name });
        }
        var tx = Store.all('transactions');
        for(k = 0; k < tx.length; k++){
          if(tx[k].party === old) Store.update('transactions', tx[k].id, { party: name });
        }
      }
      Store.update('parties', editingIds.party, data);
    }
    toast('✅', 'success');
  } else {
    Store.add('parties', data);
    toast('✅', 'success');
  }
  closeModal('sl-party-edit');
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
  var sales = getSales();
  for(var i = 0; i < sales.length; i++) if(sales[i].party === p.name) used++;
  if(used > 0 && !confirm('در ' + fa(used) + ' فروش استفاده شده. حذف شود؟')) return;
  if(used === 0 && !confirm('حذف شود؟')) return;
  Store.remove('parties', id);
  toast('🗑️');
  refreshPartyMgr();
  refreshList();
}

/* ═══════════════════════════════════════════════
   Method Manager — مشترک با finance
   ═══════════════════════════════════════════════ */
function renderMethodListInner(){
  var ms = getMethods();
  if(!ms.length) return '<div style="text-align:center;padding:20px;color:#64748b;font-size:12px">هنوز روشی نیست</div>';
  var out = '';
  var sales = getSales();
  for(var i = 0; i < ms.length; i++){
    var m = ms[i];
    var used = 0;
    for(var j = 0; j < sales.length; j++) if(sales[j].method === m.name) used++;
    var cls = 'sl-row' + (m.isLocked ? ' locked' : '');
    var badge = m.isLocked ? '<span class="sl-badge-locked">🔒</span>' : '';
    var acts = m.isLocked
      ? '<button class="sl-row-btn unlock" data-sl="unlock-method" data-id="' + sid(m.id) + '">🔓</button>'
      : '<button class="sl-row-btn edit" data-sl="edit-method" data-id="' + sid(m.id) + '">✏️</button>' +
        '<button class="sl-row-btn lock" data-sl="lock-method" data-id="' + sid(m.id) + '">🔒</button>' +
        '<button class="sl-row-btn delete" data-sl="del-method" data-id="' + sid(m.id) + '">🗑️</button>';
    out += '<div class="' + cls + '" style="border-right-color:' + (m.color || '#10b981') + '">' +
      '<div class="sl-row-ic" style="background:' + (m.color || '#10b981') + '22;color:' + (m.color || '#10b981') + '">' + (m.isLocked ? '🔒' : '💳') + '</div>' +
      '<div class="sl-row-info"><div class="sl-row-n">' + esc(m.name) + ' ' + badge + '</div>' +
      '<div class="sl-row-u">' + fa(used) + ' فروش</div></div>' +
      '<div class="sl-row-acts">' + acts + '</div></div>';
  }
  return out;
}

function openMethodManager(){
  var existing = _modals['sl-method-mgr'];
  if(existing){ try{ existing.remove(); }catch(e){} delete _modals['sl-method-mgr']; }
  var html = '<div class="sl-modal-hd"><div class="sl-modal-t">💳 مدیریت روش‌ها</div>' +
    '<button class="sl-modal-x" data-sl="close-modal" data-mid="sl-method-mgr">✕</button></div>' +
    '<div class="sl-info-box">💡 مشترک با ماژول مالی</div>' +
    '<button class="sl-btn sl-btn-g" data-sl="open-add-method" style="margin-bottom:12px">➕ روش جدید</button>' +
    '<div class="sl-list">' + renderMethodListInner() + '</div>';
  openModal('sl-method-mgr', html);
}

function refreshMethodMgr(){
  var el = document.querySelector('[data-modal-id="sl-method-mgr"] .sl-list');
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
    colorsHtml += '<div class="sl-color ' + (colors[ci] === selectedMethodColor ? 'on' : '') + '" data-color="' + colors[ci] + '" style="background:' + colors[ci] + '"></div>';
  }

  var html = '<div class="sl-modal-hd"><div class="sl-modal-t">' + (id ? '✏️ ویرایش' : '💳 روش جدید') + '</div>' +
    '<button class="sl-modal-x" data-sl="close-modal" data-mid="sl-method-edit">✕</button></div>' +
    '<div class="sl-fg"><label class="sl-fl">📝 نام</label>' +
      '<input class="sl-fi" id="edMethodName" value="' + (m ? esc(m.name) : '') + '"></div>' +
    '<div class="sl-fg"><label class="sl-fl">🎨 رنگ</label>' +
      '<div class="sl-colors" data-method-colors>' + colorsHtml + '</div></div>' +
    '<div class="sl-fg"><label class="sl-check"><input type="checkbox" id="edMethodLock" ' + (m && m.isLocked ? 'checked' : '') + '> <span>🔒 قفل</span></label></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">' +
      '<button class="sl-btn sl-btn-s" data-sl="close-modal" data-mid="sl-method-edit">انصراف</button>' +
      '<button class="sl-btn sl-btn-p" data-sl="save-method">💾 ذخیره</button>' +
    '</div>';
  openModal('sl-method-edit', html, { sheet: true });
}

function saveMethodEdit(){
  var name = document.getElementById('edMethodName').value.trim();
  var shouldLock = document.getElementById('edMethodLock').checked;
  if(!name){ toast('❌ نام', 'error'); return; }

  var ms = getMethods();
  for(var i = 0; i < ms.length; i++){
    if(ms[i].name === name && !sameId(ms[i].id, editingIds.method)){
      toast('⚠️ تکراری', 'error'); return;
    }
  }

  if(editingIds.method){
    var existing = Store.find('financeMethods', editingIds.method);
    if(existing){
      var oldName = existing.name;
      if(oldName !== name){
        var sales = getSales();
        for(var k = 0; k < sales.length; k++){
          if(sales[k].method === oldName) Store.update('sales', sales[k].id, { method: name });
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
  closeModal('sl-method-edit');
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
  if(!confirm('حذف شود؟')) return;
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
  var tColor = e.target.closest ? e.target.closest('[data-type-colors] .sl-color') : null;
  if(tColor){
    selectedTypeColor = tColor.dataset.color;
    var sib1 = tColor.parentElement.querySelectorAll('.sl-color');
    for(var si = 0; si < sib1.length; si++) sib1[si].classList.toggle('on', sib1[si] === tColor);
    return;
  }
  var mColor = e.target.closest ? e.target.closest('[data-method-colors] .sl-color') : null;
  if(mColor){
    selectedMethodColor = mColor.dataset.color;
    var sib2 = mColor.parentElement.querySelectorAll('.sl-color');
    for(var sj = 0; sj < sib2.length; sj++) sib2[sj].classList.toggle('on', sib2[sj] === mColor);
    return;
  }

  var btn = e.target.closest ? e.target.closest('[data-sl]') : null;
  if(!btn) return;
  var act = btn.dataset.sl;
  var id = sid(btn.dataset.id);
  var mid = btn.dataset.mid;

  switch(act){
    case 'open-form': openForm(); break;
    case 'edit': e.stopPropagation(); openForm(id); break;
    case 'del': e.stopPropagation(); deleteSale(id); break;
    case 'copy': e.stopPropagation(); copySale(id); break;
    case 'toggle': {
      e.stopPropagation();
      uiState.expanded[id] = !uiState.expanded[id];
      var card = document.querySelector('.sl-card[data-sid="' + id + '"]');
      if(card) card.classList.toggle('expanded', !!uiState.expanded[id]);
      break;
    }
    case 'close-modal': closeModal(mid); break;
    case 'save': save(); break;

    case 'toggle-filter-box': {
      e.stopPropagation();
      uiState.filterBoxOpen = !uiState.filterBoxOpen;
      var fbox = document.getElementById('slFilterBox');
      if(fbox) fbox.classList.toggle('open', uiState.filterBoxOpen);
      break;
    }
    case 'filter': {
      e.stopPropagation();
      uiState.filter = btn.dataset.f;
      uiState.filterBoxOpen = false;
      var pageRoot = document.querySelector('[data-sl-root]');
      if(pageRoot){
        var tmp = document.createElement('div');
        tmp.innerHTML = renderPage();
        pageRoot.parentNode.replaceChild(tmp.firstElementChild, pageRoot);
      }
      break;
    }

    case 'open-type-mgr': openTypeManager(); break;
    case 'open-add-type': openTypeEdit(); break;
    case 'edit-type': openTypeEdit(id); break;
    case 'save-type': saveTypeEdit(); break;
    case 'lock-type': lockType(id); break;
    case 'unlock-type': unlockType(id); break;
    case 'del-type': deleteType(id); break;

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
  var box = document.getElementById('slFilterBox');
  if(box && !box.contains(e.target)){
    uiState.filterBoxOpen = false;
    box.classList.remove('open');
  }
});

document.addEventListener('change', function(e){
  var t = e.target;
  if(t.id === 'slType') onTypeChange();
});

document.addEventListener('input', function(e){
  var t = e.target;
  if(t.id === 'slQty' || t.id === 'slUnitPrice'){
    var cursorPos = t.selectionStart || 0;
    var digitsBefore = toEnDigits(t.value.slice(0, cursorPos)).replace(/[^\d]/g, '').length;
    if(t.id === 'slUnitPrice') fmtThousandsInput(t);
    else t.value = t.value.replace(/[^\d]/g, '');
    if(document.activeElement === t){
      var val = t.value;
      var count = 0, newPos = val.length;
      for(var i = 0; i < val.length; i++){
        if(/\d/.test(val[i])) count++;
        if(count === digitsBefore){ newPos = i + 1; break; }
      }
      try{ t.setSelectionRange(newPos, newPos); }catch(_){}
    }
    recalcTotal();
  }
});

/* ═══════════════════════════════════════════════
   Public API
   ═══════════════════════════════════════════════ */
window.SalesModule = {
  key: 'sales',
  get: function(){ return getSales().slice(); },
  set: function(data){
    if(Array.isArray(data)){
      Store.set('sales', { sales: data, types: getSaleTypes(), methods: getMethods() });
      Store.save();
      refreshList();
    }
  },
  save: function(){ Store.save(); },
  load: function(){ refreshList(); }
};

/* ═══════════════════════════════════════════════
   Init
   ═══════════════════════════════════════════════ */
injectStyles();

Router.register('sales', {
  title: 'فروش',
  navPage: 'more',
  topLevel: true,
  render: function(){ return renderPage(); }
});

console.log('✅ sales route registered (v4.0 - Store v4)');

})();