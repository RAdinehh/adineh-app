/* ═══════════════════════════════════════════════
   MEDICINE — دارو و واکسن (v3.0)
   بازنویسی‌شده برای Store v4 + UI مشترک
   ═══════════════════════════════════════════════ */
(function(){
'use strict';

if(typeof Router === 'undefined' || typeof Router.register !== 'function'){ return; }
if(window.__medicineModuleLoaded) return;
window.__medicineModuleLoaded = true;

var sid = UI.sid, sameId = UI.sameId, findBy = UI.findBy;
var esc = UI.esc, fa = UI.fa, toFa = UI.toFa, toEnDigits = UI.toEnDigits;
var parseNum = UI.parseNum, fmtThousandsInput = UI.fmtThousandsInput;
var fmtShort = UI.formatShort, toast = UI.toast;
var jToC = UI.jToC, todayStr = UI.todayStr;

var uiState = { filter: 'all', expanded: {} };
var formItems = [];
var editingMedId = null;
var editingIds = { type: null, medicine: null, unit: null, method: null, reason: null };
var selectedTypeColor = '#8b5cf6';
var _modals = {};

/* ═══════ Data Access ═══════ */
function getRecords(){ return Store.all('medicineRecords'); }
function getMedicines(){
  var arr = Store.all('medicines');
  if(arr.length) return arr;
  return [
    { id: '1', name: 'نیوکاسل B1', desc: 'واکسن تنفسی', isLocked: false },
    { id: '2', name: 'برونشیت H120', desc: 'واکسن تنفسی', isLocked: false },
    { id: '3', name: 'ویتامین AD3E', desc: 'مکمل', isLocked: false }
  ];
}
function getUnits(){
  var arr = Store.all('units');
  if(arr.length) return arr;
  return [
    { id: '1', name: 'میلی‌لیتر', symbol: 'ml', isLocked: false },
    { id: '2', name: 'گرم', symbol: 'g', isLocked: false },
    { id: '3', name: 'ویال', symbol: 'vial', isLocked: false }
  ];
}
function getMethods(){
  var arr = Store.all('medMethods');
  if(arr.length) return arr;
  return [
    { id: '1', name: 'آب آشامیدنی', isLocked: false },
    { id: '2', name: 'تزریق', isLocked: false }
  ];
}
function getReasons(){
  var arr = Store.all('medReasons');
  if(arr.length) return arr;
  return [
    { id: '1', name: 'پیشگیری', isLocked: false },
    { id: '2', name: 'درمان', isLocked: false }
  ];
}
function getTypes(){
  var arr = Store.all('medTypes');
  if(arr.length) return arr;
  return [
    { id: '1', name: 'واکسن', color: '#8b5cf6', icon: '💉', isLocked: false },
    { id: '2', name: 'دارو', color: '#ef4444', icon: '💊', isLocked: false }
  ];
}
function getFlocks(){
  return Store.all('flocks').filter(function(f){ return !f.status || f.status === 'active'; });
}

/* ═══════ Modal ═══════ */
function openModal(id, html, opts){
  opts = opts || {};
  if(_modals[id]) return _modals[id];
  var wrap = document.createElement('div');
  wrap.className = 'med-modal-wrap';
  wrap.dataset.modalId = id;
  wrap.innerHTML = '<div class="med-modal-bg" data-med="close-modal" data-mid="' + id + '"></div>' +
    '<div class="med-modal-box' + (opts.sheet ? ' med-sheet' : '') + '">' + html + '</div>';
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

/* ═══════ Styles ═══════ */
function injectStyles(){
  if(document.getElementById('med-styles')) return;
  var css =
  '.med-page{padding:10px;max-width:760px;margin:0 auto}' +
  '.med-header{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}' +
  '.med-title{font-size:14px;font-weight:900}' +
  '.med-sub{font-size:10.5px;color:#64748b;font-weight:700;margin-top:1px}' +
  '.med-add{background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;border:none;padding:8px 14px;border-radius:9999px;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:4px}' +
  '.med-summary{background:#fff;border-radius:12px;padding:10px;margin-bottom:10px;border:1px solid #e2e8f0;display:grid;grid-template-columns:repeat(4,1fr);gap:6px}' +
  '.med-sum{background:#f1f5f9;border-radius:8px;padding:8px 4px;text-align:center;border-bottom:2px solid #0f766e}' +
  '.med-sum.g{border-color:#10b981}.med-sum.b{border-color:#3b82f6}.med-sum.o{border-color:#f59e0b}.med-sum.p{border-color:#8b5cf6}.med-sum.r{border-color:#ef4444}' +
  '.med-sum-ic{font-size:14px;line-height:1;margin-bottom:2px}' +
  '.med-sum-v{font-size:14px;font-weight:900;line-height:1.2}' +
  '.med-sum-l{font-size:9.5px;color:#64748b;font-weight:700;margin-top:1px}' +
  '.med-filters{display:flex;gap:4px;margin-bottom:10px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none}' +
  '.med-filters::-webkit-scrollbar{display:none}' +
  '.med-tab{background:#fff;border:1.5px solid #e2e8f0;color:#64748b;padding:5px 12px;border-radius:9999px;font-family:inherit;font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap;flex-shrink:0}' +
  '.med-tab.on{background:#0f766e;border-color:#0f766e;color:#fff}' +
  '.med-card{background:#fff;border-radius:12px;margin-bottom:6px;border:1px solid #e2e8f0;border-right:3px solid #0f766e;overflow:hidden}' +
  '.med-card-hd{display:flex;justify-content:space-between;align-items:flex-start;gap:6px;padding:8px 10px;cursor:pointer;user-select:none}' +
  '.med-hd-content{flex:1;min-width:0}' +
  '.med-hd-row1{display:flex;align-items:center;gap:6px;margin-bottom:5px;flex-wrap:wrap}' +
  '.med-hd-ic{font-size:14px;flex-shrink:0}' +
  '.med-hd-name{font-size:12.5px;font-weight:900;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60%}' +
  '.med-type-badge{font-size:9px;font-weight:800;padding:2px 7px;border-radius:9999px}' +
  '.med-hd-row2{display:flex;align-items:center;gap:5px;flex-wrap:wrap}' +
  '.med-stat{display:inline-flex;align-items:center;gap:2px;padding:2px 6px;border-radius:9999px;background:#f1f5f9;font-size:10px;font-weight:700;white-space:nowrap}' +
  '.med-stat.r{background:#fef2f2;color:#991b1b}.med-stat.g{background:#ecfdf5;color:#166534}' +
  '.med-stat.b{background:#eff6ff;color:#1e40af}.med-stat.o{background:#fffbeb;color:#92400e}' +
  '.med-stat.p{background:#f5f3ff;color:#6b21a8}' +
  '.med-toggle{background:#f1f5f9;border:none;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:#0f766e;cursor:pointer;flex-shrink:0;transition:transform .3s,background .2s}' +
  '.med-card.expanded .med-toggle{transform:rotate(180deg);background:#0f766e;color:#fff}' +
  '.med-card-bd{max-height:0;overflow:hidden;transition:max-height .35s,padding .35s;padding:0 10px}' +
  '.med-card.expanded .med-card-bd{max-height:1500px;padding:8px 10px 10px;border-top:1px dashed #e2e8f0}' +
  '.med-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:8px}' +
  '.med-box{background:#f1f5f9;border-radius:6px;padding:5px 6px;text-align:center;border-bottom:2px solid #cbd5e1}' +
  '.med-box.r{border-color:#ef4444}.med-box.g{border-color:#10b981}.med-box.b{border-color:#3b82f6}.med-box.o{border-color:#f59e0b}.med-box.p{border-color:#8b5cf6}' +
  '.med-box-l{font-size:9px;color:#64748b;font-weight:700;margin-bottom:1px}' +
  '.med-box-v{font-size:12px;font-weight:900}' +
  '.med-box.r .med-box-v{color:#ef4444}.med-box.g .med-box-v{color:#10b981}' +
  '.med-box.b .med-box-v{color:#3b82f6}.med-box.o .med-box-v{color:#f59e0b}.med-box.p .med-box-v{color:#8b5cf6}' +
  '.med-chips{display:flex;flex-wrap:wrap;gap:3px;margin-bottom:6px}' +
  '.med-chip{display:inline-flex;align-items:center;gap:3px;padding:3px 7px;border-radius:9999px;font-size:10px;font-weight:700;background:#f1f5f9}' +
  '.med-chip.date{background:#eff6ff;color:#1e40af}' +
  '.med-chip.money{background:#ecfdf5;color:#166534}' +
  '.med-chip.type{background:#f5f3ff;color:#6b21a8}' +
  '.med-chip.reason{background:#fffbeb;color:#92400e}' +
  '.med-items-box{background:#f5f3ff;border-radius:6px;padding:6px 8px;margin-bottom:6px}' +
  '.med-items-t{font-size:9.5px;font-weight:900;color:#6b21a8;margin-bottom:4px}' +
  '.med-note{background:#f1f5f9;padding:6px 8px;border-radius:6px;font-size:11px;color:#475569;border-right:2px solid #0f766e;margin-bottom:6px}' +
  '.med-actions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;padding-top:6px;border-top:1px dashed #e2e8f0}' +
  '.med-actions button{padding:6px;border:none;border-radius:6px;font-family:inherit;font-size:10.5px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:3px}' +
  '.med-act-edit{background:#eff6ff;color:#1e40af}' +
  '.med-act-copy{background:#f5f3ff;color:#6b21a8}' +
  '.med-act-del{background:#fef2f2;color:#991b1b}' +
  '.med-empty{text-align:center;padding:48px 24px;background:#fff;border-radius:12px;border:1px dashed #cbd5e1}' +
  '.med-empty-ic{font-size:56px;line-height:1;display:block;margin-bottom:12px;opacity:.6}' +
  '.med-empty-t{font-size:14px;font-weight:900;margin-bottom:6px}' +
  '.med-empty-x{font-size:12px;color:#64748b;font-weight:600;margin:0 auto 16px;max-width:280px}' +
  '.med-modal-wrap{position:fixed;inset:0;z-index:2000;display:flex;align-items:flex-end;justify-content:center;opacity:0;pointer-events:none;transition:opacity .2s}' +
  '.med-modal-wrap.on{opacity:1;pointer-events:auto}' +
  '.med-modal-bg{position:absolute;inset:0;background:rgba(15,23,42,.55)}' +
  '.med-modal-box{position:relative;background:#fff;width:100%;max-width:760px;border-radius:24px 24px 0 0;padding:14px;max-height:95vh;overflow-y:auto;transform:translateY(30px);transition:transform .3s;padding-bottom:calc(20px + env(safe-area-inset-bottom,0px))}' +
  '.med-modal-wrap.on .med-modal-box{transform:translateY(0)}' +
  '.med-modal-box.med-sheet{border-radius:16px;max-width:400px;margin:auto}' +
  '.med-modal-hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #e2e8f0}' +
  '.med-modal-t{font-size:14px;font-weight:800}' +
  '.med-modal-x{background:#f1f5f9;border:none;width:32px;height:32px;border-radius:50%;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center}' +
  '.med-sec{margin-bottom:16px}' +
  '.med-sec-hd{display:flex;align-items:center;gap:6px;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #e2e8f0}' +
  '.med-sec-ic{width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}' +
  '.med-sec-t{font-size:12.5px;font-weight:900}' +
  '.med-sec-s{font-size:10px;color:#64748b;font-weight:600;margin-top:1px}' +
  '.med-fg{margin-bottom:10px}' +
  '.med-fl{font-size:11px;font-weight:800;margin-bottom:4px;display:flex;align-items:center;gap:4px}' +
  '.med-fl-hint{font-size:9.5px;color:#0f766e;font-weight:700;margin-right:auto;cursor:pointer;text-decoration:underline}' +
  '.med-fi,.med-fs,.med-ft{width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:12px;font-size:13px;font-family:inherit;background:#f1f5f9;color:#0f172a;box-sizing:border-box}' +
  '.med-fi:focus,.med-fs:focus,.med-ft:focus{outline:none;border-color:#0f766e;background:#fff;box-shadow:0 0 0 3px #f0fdfa}' +
  '.med-ft{resize:vertical;min-height:55px;line-height:1.6}' +
  '.med-fr{display:grid;grid-template-columns:1fr 1fr;gap:8px}' +
  '.med-date-field{display:flex;gap:6px}' +
  '.med-date-field .med-fi{flex:1;text-align:left;direction:ltr;font-weight:700;cursor:pointer}' +
  '.med-date-btn{width:38px;flex-shrink:0;border:none;border-radius:12px;background:#0f766e;color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}' +
  '.med-iwb{display:flex;gap:6px}' +
  '.med-iwb .med-fs{flex:1;min-width:0}' +
  '.med-ibtn{width:38px;flex-shrink:0;border:none;border-radius:12px;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;background:#10b981;color:#fff}' +
  '.med-save{width:100%;padding:14px;border:none;border-radius:12px;background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;font-family:inherit;font-size:14px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:16px}' +
  '.med-btn{width:100%;padding:11px;border:none;border-radius:12px;font-size:13px;font-weight:800;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px}' +
  '.med-btn-s{background:#f1f5f9;color:#0f172a}' +
  '.med-btn-p{background:#0f766e;color:#fff}' +
  '.med-btn-g{background:#10b981;color:#fff}' +
  '.med-list{display:flex;flex-direction:column;gap:6px;max-height:55vh;overflow-y:auto;padding:2px}' +
  '.med-row{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#f1f5f9;border-radius:12px;border-right:3px solid #f59e0b;margin-bottom:6px}' +
  '.med-row.locked{background:linear-gradient(90deg,#ecfdf5 0%,#f1f5f9 30%)}' +
  '.med-row-ic{width:30px;height:30px;border-radius:8px;background:#fffbeb;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}' +
  '.med-row-info{flex:1;min-width:0}' +
  '.med-row-n{font-size:12.5px;font-weight:800;display:flex;align-items:center;gap:4px;flex-wrap:wrap}' +
  '.med-row-u{font-size:10px;color:#64748b;font-weight:600;margin-top:1px}' +
  '.med-row-acts{display:flex;gap:4px;flex-shrink:0}' +
  '.med-row-btn{width:30px;height:30px;border-radius:8px;border:none;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center}' +
  '.med-row-btn.edit{background:#eff6ff;color:#1e40af}' +
  '.med-row-btn.delete{background:#fef2f2;color:#ef4444}' +
  '.med-row-btn.lock{background:#ecfdf5;color:#10b981}' +
  '.med-row-btn.unlock{background:#fffbeb;color:#f59e0b}' +
  '.med-badge{display:inline-flex;align-items:center;gap:3px;font-size:9px;font-weight:800;padding:2px 6px;border-radius:9999px;background:#ecfdf5;color:#166534}' +
  '.med-info-box{background:#eff6ff;color:#1e40af;padding:10px 12px;border-radius:12px;font-size:11px;font-weight:700;margin-bottom:12px;line-height:1.7;border-right:3px solid #3b82f6}' +
  '.med-colors{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}' +
  '.med-color{width:26px;height:26px;border-radius:50%;cursor:pointer;border:2.5px solid transparent}' +
  '.med-color.on{border-color:#fff;box-shadow:0 0 0 1.5px #0f172a;transform:scale(1.1)}' +
  '.med-check{display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer}' +
  '.med-check input{width:18px;height:18px;accent-color:#0f766e}' +
  '.med-item-row{display:grid;grid-template-columns:2fr 1fr 1fr 30px;gap:6px;align-items:center}' +
  '@media (max-width:420px){.med-item-row{grid-template-columns:1fr 1fr 1fr 30px}}';

  var s = document.createElement('style');
  s.id = 'med-styles';
  s.textContent = css;
  document.head.appendChild(s);
}

/* ═══════ Render Page ═══════ */
function renderPage(){
  var records = getRecords();
  var vaxCount = 0, medCount = 0, cost = 0;
  for(var i = 0; i < records.length; i++){
    var r = records[i];
    if(r.type === 'واکسن') vaxCount++;
    if(r.type === 'دارو') medCount++;
    cost += r.cost || 0;
  }
  var daysSet = {};
  for(i = 0; i < records.length; i++) daysSet[records[i].date] = true;
  var daysCount = Object.keys(daysSet).length;

  var filterTabs = '<button class="med-tab ' + (uiState.filter === 'all' ? 'on' : '') + '" data-med="filter" data-f="all">همه</button>';
  var types = getTypes();
  for(i = 0; i < types.length; i++){
    var t = types[i];
    filterTabs += '<button class="med-tab ' + (uiState.filter === t.name ? 'on' : '') + '" data-med="filter" data-f="' + esc(t.name) + '">' + (t.icon || '🏷️') + ' ' + esc(t.name) + '</button>';
  }

  return '<div class="page med-page" data-med-root>' +
    '<div class="med-header">' +
      '<div><div class="med-title">💊 سوابق دارو و واکسن</div>' +
      '<div class="med-sub">' + fa(records.length) + ' رکورد • امروز ' + todayStr + '</div></div>' +
      '<button class="med-add" data-med="open-form">➕ <span>ثبت جدید</span></button>' +
    '</div>' +
    '<div class="med-summary">' +
      '<div class="med-sum p"><div class="med-sum-ic">💉</div><div class="med-sum-v">' + fa(vaxCount) + '</div><div class="med-sum-l">واکسن</div></div>' +
      '<div class="med-sum r"><div class="med-sum-ic">💊</div><div class="med-sum-v">' + fa(medCount) + '</div><div class="med-sum-l">دارو</div></div>' +
      '<div class="med-sum g"><div class="med-sum-ic">💰</div><div class="med-sum-v">' + fmtShort(cost) + '</div><div class="med-sum-l">هزینه</div></div>' +
      '<div class="med-sum b"><div class="med-sum-ic">📅</div><div class="med-sum-v">' + fa(daysCount) + '</div><div class="med-sum-l">روز فعال</div></div>' +
    '</div>' +
    '<div class="med-filters">' + filterTabs + '</div>' +
    '<div data-med-list>' + renderListInner() + '</div>' +
  '</div>';
}

function renderListInner(){
  var list = getRecords().slice();
  if(uiState.filter !== 'all'){
    list = list.filter(function(r){ return r.type === uiState.filter; });
  }
  list.sort(function(a, b){ return jToC(b.date) - jToC(a.date); });

  if(!list.length){
    return '<div class="med-empty">' +
      '<div class="med-empty-ic">💊</div>' +
      '<div class="med-empty-t">هنوز رکوردی ثبت نشده</div>' +
      '<div class="med-empty-x">برای شروع، اولین دارو یا واکسن را ثبت کنید</div>' +
      '<button class="med-add" style="margin:0 auto" data-med="open-form">➕ ثبت جدید</button>' +
    '</div>';
  }
  var out = '';
  for(var i = 0; i < list.length; i++) out += renderCard(list[i]);
  return out;
}

function renderCard(r){
  var types = getTypes();
  var type = null;
  for(var i = 0; i < types.length; i++) if(types[i].name === r.type) type = types[i];
  if(!type) type = { color: '#0f766e', icon: '💊' };

  var itemNames = '';
  for(i = 0; i < (r.items || []).length; i++){
    if(r.items[i].name){
      if(itemNames) itemNames += '، ';
      itemNames += r.items[i].name;
    }
  }

  var stats =
    '<span class="med-stat o">📅 <strong>' + esc((r.date || '').slice(5)) + '</strong></span>' +
    '<span class="med-stat p">⏰ <strong>' + fa(r.age || 0) + ' روز</strong></span>' +
    '<span class="med-stat g">💰 <strong>' + fmtShort(r.cost) + '</strong></span>' +
    ((r.items || []).length > 1 ? '<span class="med-stat b">📦 <strong>' + fa(r.items.length) + ' قلم</strong></span>' : '');

  var chips =
    '<span class="med-chip date">💧 ' + esc(r.method || '—') + '</span>' +
    (r.reason ? '<span class="med-chip reason">🎯 ' + esc(r.reason) + '</span>' : '') +
    '<span class="med-chip">📅 ' + esc(r.date || '') + '</span>';

  var itemsHtml = '';
  if((r.items || []).length){
    itemsHtml = '<div class="med-items-box"><div class="med-items-t">💊 اقلام:</div><div class="med-chips" style="margin:0">';
    for(i = 0; i < r.items.length; i++){
      var it = r.items[i];
      itemsHtml += '<span class="med-chip type">💊 ' + esc(it.name) + (it.dose ? ' · ' + esc(it.dose) + ' ' + esc(it.unit || '') : '') + '</span>';
    }
    itemsHtml += '</div></div>';
  }

  var isOpen = !!uiState.expanded[sid(r.id)];

  return '<div class="med-card ' + (isOpen ? 'expanded' : '') + '" data-med-id="' + sid(r.id) + '" style="border-right-color:' + type.color + '">' +
    '<div class="med-card-hd" data-med="toggle" data-id="' + sid(r.id) + '">' +
      '<div class="med-hd-content">' +
        '<div class="med-hd-row1">' +
          '<span class="med-hd-ic">' + (type.icon || '💊') + '</span>' +
          '<div class="med-hd-name">' + esc(itemNames || '—') + '</div>' +
          '<span class="med-type-badge" style="background:' + type.color + '22;color:' + type.color + '">' + esc(r.type) + '</span>' +
        '</div>' +
        '<div class="med-hd-row2">' + stats + '</div>' +
      '</div>' +
      '<button class="med-toggle" type="button">▼</button>' +
    '</div>' +
    '<div class="med-card-bd">' +
      '<div class="med-grid">' +
        '<div class="med-box b"><div class="med-box-l">🐔 گله</div><div class="med-box-v" style="font-size:11px">' + esc(r.flock || '—') + '</div></div>' +
        '<div class="med-box p"><div class="med-box-l">⏰ سن</div><div class="med-box-v">' + fa(r.age || 0) + ' روز</div></div>' +
        '<div class="med-box g"><div class="med-box-l">💰 هزینه</div><div class="med-box-v">' + fa(r.cost || 0) + '</div></div>' +
      '</div>' +
      '<div class="med-chips">' + chips + '</div>' +
      itemsHtml +
      (r.notes ? '<div class="med-note"><strong>📝</strong> ' + esc(r.notes) + '</div>' : '') +
      '<div class="med-actions">' +
        '<button class="med-act-edit" data-med="edit" data-id="' + sid(r.id) + '">✏️ ویرایش</button>' +
        '<button class="med-act-copy" data-med="copy" data-id="' + sid(r.id) + '">📋 کپی</button>' +
        '<button class="med-act-del" data-med="del" data-id="' + sid(r.id) + '">🗑️ حذف</button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function refreshList(){
  var el = document.querySelector('[data-med-list]');
  if(el) el.innerHTML = renderListInner();

  var records = getRecords();
  var vaxCount = 0, medCount = 0, cost = 0;
  for(var i = 0; i < records.length; i++){
    var r = records[i];
    if(r.type === 'واکسن') vaxCount++;
    if(r.type === 'دارو') medCount++;
    cost += r.cost || 0;
  }
  var daysSet = {};
  for(i = 0; i < records.length; i++) daysSet[records[i].date] = true;
  var daysCount = Object.keys(daysSet).length;

  var sumV = document.querySelectorAll('[data-med-root] .med-sum-v');
  if(sumV.length === 4){
    sumV[0].textContent = fa(vaxCount);
    sumV[1].textContent = fa(medCount);
    sumV[2].textContent = fmtShort(cost);
    sumV[3].textContent = fa(daysCount);
  }
}

/* ═══════ Options ═══════ */
function typeOptions(cur){
  var types = getTypes();
  var out = '';
  for(var i = 0; i < types.length; i++){
    var t = types[i];
    out += '<option value="' + esc(t.name) + '" ' + (cur === t.name ? 'selected' : '') + '>' + (t.icon || '🏷️') + ' ' + esc(t.name) + '</option>';
  }
  return out;
}
function medicineOptions(cur){
  var ms = getMedicines();
  var out = '';
  for(var i = 0; i < ms.length; i++){
    var m = ms[i];
    out += '<option value="' + esc(m.name) + '" ' + (cur === m.name ? 'selected' : '') + '>' + esc(m.name) + '</option>';
  }
  return out;
}
function unitOptions(cur){
  var units = getUnits();
  var out = '';
  for(var i = 0; i < units.length; i++){
    var u = units[i];
    out += '<option value="' + esc(u.name) + '" ' + (cur === u.name ? 'selected' : '') + '>' + esc(u.symbol || u.name) + '</option>';
  }
  return out;
}
function methodOptions(cur){
  var ms = getMethods();
  var out = '';
  for(var i = 0; i < ms.length; i++){
    var m = ms[i];
    out += '<option value="' + esc(m.name) + '" ' + (cur === m.name ? 'selected' : '') + '>' + esc(m.name) + '</option>';
  }
  return out;
}
function reasonOptions(cur){
  var rs = getReasons();
  var out = '<option value="">— انتخاب —</option>';
  for(var i = 0; i < rs.length; i++){
    var r = rs[i];
    out += '<option value="' + esc(r.name) + '" ' + (cur === r.name ? 'selected' : '') + '>🎯 ' + esc(r.name) + '</option>';
  }
  return out;
}
function flockOptions(cur){
  var flocks = getFlocks();
  if(!flocks.length) return '<option value="">— گله‌ای یافت نشد —</option>';
  var out = '';
  for(var i = 0; i < flocks.length; i++){
    var f = flocks[i];
    out += '<option value="' + esc(f.name) + '" ' + (cur === f.name ? 'selected' : '') + '>🐔 ' + esc(f.name) + '</option>';
  }
  return out;
}

/* ═══════ Items ═══════ */
function renderItemsInner(){
  var meds = getMedicines();
  if(!meds.length){
    return '<div style="text-align:center;padding:10px;color:#64748b;font-size:11px">هنوز دارویی نیست</div>';
  }
  if(!formItems.length){
    return '<div style="text-align:center;padding:10px;color:#64748b;font-size:11px">هنوز قلمی اضافه نشده</div>';
  }
  var out = '';
  for(var i = 0; i < formItems.length; i++){
    var it = formItems[i];
    out += '<div class="med-item-row">' +
      '<select class="med-fs" data-item-name="' + i + '">' + medicineOptions(it.name) + '</select>' +
      '<input class="med-fi" type="text" placeholder="مقدار" value="' + esc(it.dose || '') + '" data-item-dose="' + i + '">' +
      '<select class="med-fs" data-item-unit="' + i + '">' + unitOptions(it.unit) + '</select>' +
      '<button type="button" class="med-row-btn delete" data-med="del-item" data-i="' + i + '" style="width:30px;height:30px">✕</button>' +
    '</div>';
  }
  return out;
}
function refreshItems(){
  var el = document.getElementById('medItemsList');
  if(el) el.innerHTML = renderItemsInner();
}

/* ═══════ Form ═══════ */
function openMedForm(id){
  editingMedId = id ? sid(id) : null;
  var r = id ? Store.find('medicineRecords', id) : null;

  formItems = r ? (r.items || []).map(function(x){ return { name: x.name, dose: x.dose, unit: x.unit }; }) : [];
  if(!formItems.length){
    var meds = getMedicines();
    var units = getUnits();
    if(meds.length) formItems = [{ name: meds[0].name, dose: '', unit: units[0] ? units[0].name : '' }];
  }

  var costVal = (r && r.cost) ? Number(r.cost).toLocaleString('en-US') : '';

  var html = '<div class="med-modal-hd">' +
    '<div class="med-modal-t">' + (id ? '✏️ ویرایش' : '💊 ثبت جدید') + '</div>' +
    '<button class="med-modal-x" data-med="close-modal" data-mid="med-form">✕</button>' +
  '</div>' +

  '<div class="med-sec">' +
    '<div class="med-sec-hd"><div class="med-sec-ic" style="background:#f0fdfa">📋</div>' +
    '<div><div class="med-sec-t" style="color:#0f766e">اطلاعات پایه</div></div></div>' +
    '<div class="med-fr">' +
      '<div class="med-fg"><label class="med-fl">📅 تاریخ</label>' +
        '<div class="med-date-field"><input class="med-fi" type="text" id="medDate" readonly value="' + (r ? esc(r.date) : todayStr) + '">' +
        '<button type="button" class="med-date-btn" data-med="open-cal" data-target="medDate">📅</button></div></div>' +
      '<div class="med-fg"><label class="med-fl">🐔 گله</label>' +
        '<select class="med-fs" id="medFlock">' + flockOptions(r ? r.flock : '') + '</select></div>' +
    '</div>' +
    '<div class="med-fr">' +
      '<div class="med-fg"><label class="med-fl">🏷️ نوع <span class="med-fl-hint" data-med="open-type-mgr">مدیریت</span></label>' +
        '<div class="med-iwb"><select class="med-fs" id="medType">' + typeOptions(r ? r.type : '') + '</select>' +
        '<button type="button" class="med-ibtn" data-med="open-add-type">➕</button></div></div>' +
      '<div class="med-fg"><label class="med-fl">⏰ سن گله</label>' +
        '<input class="med-fi" type="number" id="medAge" value="' + (r ? r.age : 0) + '"></div>' +
    '</div>' +
  '</div>' +

  '<div class="med-sec">' +
    '<div class="med-sec-hd"><div class="med-sec-ic" style="background:#f5f3ff">💊</div>' +
      '<div style="flex:1"><div class="med-sec-t" style="color:#8b5cf6">اقلام دارویی ' +
      '<span class="med-fl-hint" data-med="open-med-mgr">مدیریت</span> ' +
      '<span class="med-fl-hint" data-med="open-unit-mgr">واحدها</span></div></div>' +
    '</div>' +
    '<div id="medItemsList" style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px">' + renderItemsInner() + '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">' +
      '<button type="button" class="med-btn med-btn-s" data-med="add-item">➕ افزودن قلم</button>' +
      '<button type="button" class="med-btn med-btn-g" data-med="open-add-medicine">🆕 داروی جدید</button>' +
    '</div>' +
  '</div>' +

  '<div class="med-sec">' +
    '<div class="med-sec-hd"><div class="med-sec-ic" style="background:#eff6ff">💧</div>' +
    '<div><div class="med-sec-t" style="color:#3b82f6">روش و علت</div></div></div>' +
    '<div class="med-fr">' +
      '<div class="med-fg"><label class="med-fl">💧 روش <span class="med-fl-hint" data-med="open-method-mgr">مدیریت</span></label>' +
        '<div class="med-iwb"><select class="med-fs" id="medMethod">' + methodOptions(r ? r.method : '') + '</select>' +
        '<button type="button" class="med-ibtn" data-med="open-add-method">➕</button></div></div>' +
      '<div class="med-fg"><label class="med-fl">🎯 علت <span class="med-fl-hint" data-med="open-reason-mgr">مدیریت</span></label>' +
        '<div class="med-iwb"><select class="med-fs" id="medReason">' + reasonOptions(r ? r.reason : '') + '</select>' +
        '<button type="button" class="med-ibtn" data-med="open-add-reason">➕</button></div></div>' +
    '</div>' +
    '<div class="med-fg"><label class="med-fl">💰 کل هزینه</label>' +
      '<input class="med-fi" type="text" inputmode="numeric" id="medCost" value="' + costVal + '" placeholder="۱۵۰,۰۰۰"></div>' +
  '</div>' +

  '<div class="med-sec">' +
    '<div class="med-sec-hd"><div class="med-sec-ic" style="background:#f0fdfa">📝</div>' +
    '<div><div class="med-sec-t" style="color:#0f766e">یادداشت</div></div></div>' +
    '<textarea class="med-ft" id="medNotes">' + (r ? esc(r.notes || '') : '') + '</textarea>' +
  '</div>' +

  '<button class="med-save" data-med="save">💾 ذخیره</button>';

  openModal('med-form', html);
}

function saveMed(){
  var date = document.getElementById('medDate').value.trim();
  if(!date){ toast('❌ تاریخ', 'error'); return; }
  if(!formItems.length || !formItems[0].name){ toast('❌ حداقل یک قلم', 'error'); return; }

  var data = {
    date: date,
    flock: document.getElementById('medFlock').value,
    type: document.getElementById('medType').value,
    age: parseNum(document.getElementById('medAge').value),
    items: formItems.filter(function(i){ return i.name; }).map(function(i){
      return { name: i.name, dose: i.dose || '', unit: i.unit || '' };
    }),
    method: document.getElementById('medMethod').value,
    reason: document.getElementById('medReason').value,
    cost: parseNum(document.getElementById('medCost').value),
    notes: document.getElementById('medNotes').value.trim()
  };

  if(editingMedId){
    Store.update('medicineRecords', editingMedId, data);
    toast('✅ ویرایش شد', 'success');
  } else {
    Store.add('medicineRecords', data);
    toast('✅ ثبت شد', 'success');
  }
  closeModal('med-form');
  refreshList();
  editingMedId = null;
}

function deleteMed(id){
  var r = Store.find('medicineRecords', id);
  if(!r) return;
  if(!confirm('این رکورد حذف شود؟')) return;
  Store.remove('medicineRecords', id);
  toast('🗑️'); refreshList();
}

function copyMed(id){
  var r = Store.find('medicineRecords', id);
  if(!r) return;
  var copy = JSON.parse(JSON.stringify(r));
  delete copy.id;
  delete copy.createdAt;
  copy.date = todayStr;
  Store.add('medicineRecords', copy);
  toast('📋 کپی شد'); refreshList();
}

/* ═══════ Type Mgr ═══════ */
function renderTypeListInner(){
  var types = getTypes();
  if(!types.length) return '<div style="text-align:center;padding:20px;color:#64748b;font-size:12px">هنوز نوعی نیست</div>';
  var out = '';
  for(var i = 0; i < types.length; i++){
    var t = types[i];
    var cls = 'med-row' + (t.isLocked ? ' locked' : '');
    var acts = t.isLocked
      ? '<button class="med-row-btn unlock" data-med="unlock-type" data-id="' + sid(t.id) + '">🔓</button>'
      : '<button class="med-row-btn edit" data-med="edit-type" data-id="' + sid(t.id) + '">✏️</button>' +
        '<button class="med-row-btn lock" data-med="lock-type" data-id="' + sid(t.id) + '">🔒</button>' +
        '<button class="med-row-btn delete" data-med="del-type" data-id="' + sid(t.id) + '">🗑️</button>';
    out += '<div class="' + cls + '" style="border-right-color:' + (t.color || '#8b5cf6') + '">' +
      '<div class="med-row-ic" style="background:' + (t.color || '#8b5cf6') + '22;color:' + (t.color || '#8b5cf6') + '">' + (t.isLocked ? '🔒' : (t.icon || '🏷️')) + '</div>' +
      '<div class="med-row-info"><div class="med-row-n">' + esc(t.name) + '</div></div>' +
      '<div class="med-row-acts">' + acts + '</div></div>';
  }
  return out;
}
function openTypeMgr(){
  var html = '<div class="med-modal-hd"><div class="med-modal-t">🏷️ مدیریت انواع</div>' +
    '<button class="med-modal-x" data-med="close-modal" data-mid="type-mgr">✕</button></div>' +
    '<button class="med-btn med-btn-g" data-med="open-add-type" style="margin-bottom:12px">➕ افزودن نوع</button>' +
    '<div class="med-list">' + renderTypeListInner() + '</div>';
  var ex = _modals['type-mgr'];
  if(ex){ try{ ex.remove(); }catch(e){} delete _modals['type-mgr']; }
  openModal('type-mgr', html);
}
function refreshTypeMgr(){
  var el = document.querySelector('[data-modal-id="type-mgr"] .med-list');
  if(el) el.innerHTML = renderTypeListInner();
}
function openTypeEdit(id){
  editingIds.type = id ? sid(id) : null;
  var t = id ? Store.find('medTypes', id) : null;
  if(t && t.isLocked){ toast('🔒', 'error'); return; }
  selectedTypeColor = t ? (t.color || '#8b5cf6') : '#8b5cf6';

  var colors = ['#8b5cf6', '#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#06b6d4', '#0f766e'];
  var colorsHtml = '';
  for(var ci = 0; ci < colors.length; ci++){
    colorsHtml += '<div class="med-color ' + (colors[ci] === selectedTypeColor ? 'on' : '') + '" data-color="' + colors[ci] + '" style="background:' + colors[ci] + '"></div>';
  }
  var html = '<div class="med-modal-hd"><div class="med-modal-t">' + (id ? '✏️' : '🏷️ نوع جدید') + '</div>' +
    '<button class="med-modal-x" data-med="close-modal" data-mid="type-edit">✕</button></div>' +
    '<div class="med-fg"><label class="med-fl">نام</label><input class="med-fi" id="edTypeName" value="' + (t ? esc(t.name) : '') + '"></div>' +
    '<div class="med-fg"><label class="med-fl">🎨 رنگ</label><div class="med-colors" data-type-colors>' + colorsHtml + '</div></div>' +
    '<div class="med-fg"><label class="med-check"><input type="checkbox" id="edTypeLock" ' + (t && t.isLocked ? 'checked' : '') + '> <span>🔒 قفل</span></label></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">' +
      '<button class="med-btn med-btn-s" data-med="close-modal" data-mid="type-edit">انصراف</button>' +
      '<button class="med-btn med-btn-p" data-med="save-type">💾 ذخیره</button>' +
    '</div>';
  openModal('type-edit', html, { sheet: true });
}
function saveTypeEdit(){
  var name = document.getElementById('edTypeName').value.trim();
  if(!name){ toast('❌ نام', 'error'); return; }
  var types = getTypes();
  for(var i = 0; i < types.length; i++){
    if(types[i].name === name && !sameId(types[i].id, editingIds.type)){ toast('⚠️ تکراری', 'error'); return; }
  }
  var isLocked = document.getElementById('edTypeLock').checked;
  if(editingIds.type){
    var existing = Store.find('medTypes', editingIds.type);
    if(existing){
      var old = existing.name;
      if(old !== name){
        var recs = getRecords();
        for(var k = 0; k < recs.length; k++) if(recs[k].type === old) Store.update('medicineRecords', recs[k].id, { type: name });
      }
      Store.update('medTypes', editingIds.type, { name: name, color: selectedTypeColor, isLocked: isLocked });
    }
    toast('✅', 'success');
  } else {
    Store.add('medTypes', { name: name, color: selectedTypeColor, icon: '🏷️', isLocked: isLocked });
    toast('✅', 'success');
  }
  closeModal('type-edit');
  refreshTypeMgr();
  refreshList();
  editingIds.type = null;
}
function lockType(id){ var t = Store.find('medTypes', id); if(!t || t.isLocked) return; if(!confirm('قفل؟')) return; Store.update('medTypes', id, { isLocked: true }); toast('🔒'); refreshTypeMgr(); }
function unlockType(id){ var t = Store.find('medTypes', id); if(!t || !t.isLocked) return; if(!confirm('باز؟')) return; Store.update('medTypes', id, { isLocked: false }); toast('🔓'); refreshTypeMgr(); }
function delType(id){
  var t = Store.find('medTypes', id);
  if(!t || t.isLocked){ toast('🔒', 'error'); return; }
  if(!confirm('حذف؟')) return;
  Store.remove('medTypes', id); toast('🗑️'); refreshTypeMgr(); refreshList();
}

/* ═══════ Medicine Mgr ═══════ */
function renderMedicineListInner(){
  var ms = getMedicines();
  if(!ms.length) return '<div style="text-align:center;padding:20px;color:#64748b;font-size:12px">هنوز دارویی نیست</div>';
  var out = '';
  for(var i = 0; i < ms.length; i++){
    var m = ms[i];
    var cls = 'med-row' + (m.isLocked ? ' locked' : '');
    var acts = m.isLocked
      ? '<button class="med-row-btn unlock" data-med="unlock-med" data-id="' + sid(m.id) + '">🔓</button>'
      : '<button class="med-row-btn edit" data-med="edit-med" data-id="' + sid(m.id) + '">✏️</button>' +
        '<button class="med-row-btn lock" data-med="lock-med" data-id="' + sid(m.id) + '">🔒</button>' +
        '<button class="med-row-btn delete" data-med="del-med" data-id="' + sid(m.id) + '">🗑️</button>';
    out += '<div class="' + cls + '"><div class="med-row-ic">' + (m.isLocked ? '🔒' : '💊') + '</div>' +
      '<div class="med-row-info"><div class="med-row-n">' + esc(m.name) + '</div>' +
      '<div class="med-row-u">' + esc(m.desc || '—') + '</div></div>' +
      '<div class="med-row-acts">' + acts + '</div></div>';
  }
  return out;
}
function openMedMgr(){
  var html = '<div class="med-modal-hd"><div class="med-modal-t">💊 مدیریت داروها</div>' +
    '<button class="med-modal-x" data-med="close-modal" data-mid="med-mgr">✕</button></div>' +
    '<button class="med-btn med-btn-g" data-med="open-add-medicine" style="margin-bottom:12px">➕ افزودن دارو</button>' +
    '<div class="med-list">' + renderMedicineListInner() + '</div>';
  var ex = _modals['med-mgr'];
  if(ex){ try{ ex.remove(); }catch(e){} delete _modals['med-mgr']; }
  openModal('med-mgr', html);
}
function refreshMedMgr(){
  var el = document.querySelector('[data-modal-id="med-mgr"] .med-list');
  if(el) el.innerHTML = renderMedicineListInner();
}
function openMedicineEdit(id){
  editingIds.medicine = id ? sid(id) : null;
  var m = id ? Store.find('medicines', id) : null;
  if(m && m.isLocked){ toast('🔒', 'error'); return; }
  var html = '<div class="med-modal-hd"><div class="med-modal-t">' + (id ? '✏️' : '💊 داروی جدید') + '</div>' +
    '<button class="med-modal-x" data-med="close-modal" data-mid="med-edit">✕</button></div>' +
    '<div class="med-fg"><label class="med-fl">نام</label><input class="med-fi" id="edMedicineName" value="' + (m ? esc(m.name) : '') + '"></div>' +
    '<div class="med-fg"><label class="med-fl">📝 توضیح</label><input class="med-fi" id="edMedicineDesc" value="' + (m ? esc(m.desc || '') : '') + '"></div>' +
    '<div class="med-fg"><label class="med-check"><input type="checkbox" id="edMedicineLock" ' + (m && m.isLocked ? 'checked' : '') + '> <span>🔒 قفل</span></label></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">' +
      '<button class="med-btn med-btn-s" data-med="close-modal" data-mid="med-edit">انصراف</button>' +
      '<button class="med-btn med-btn-p" data-med="save-medicine">💾 ذخیره</button>' +
    '</div>';
  openModal('med-edit', html, { sheet: true });
}
function saveMedicineEdit(){
  var name = document.getElementById('edMedicineName').value.trim();
  var desc = document.getElementById('edMedicineDesc').value.trim();
  if(!name){ toast('❌ نام', 'error'); return; }
  var ms = getMedicines();
  for(var i = 0; i < ms.length; i++){
    if(ms[i].name === name && !sameId(ms[i].id, editingIds.medicine)){ toast('⚠️ تکراری', 'error'); return; }
  }
  var isLocked = document.getElementById('edMedicineLock').checked;
  if(editingIds.medicine){
    var existing = Store.find('medicines', editingIds.medicine);
    if(existing){
      var old = existing.name;
      if(old !== name){
        var recs = getRecords();
        for(var k = 0; k < recs.length; k++){
          var items = recs[k].items || [];
          for(var j = 0; j < items.length; j++) if(items[j].name === old) items[j].name = name;
        }
      }
      Store.update('medicines', editingIds.medicine, { name: name, desc: desc, isLocked: isLocked });
    }
    toast('✅', 'success');
  } else {
    Store.add('medicines', { name: name, desc: desc, isLocked: isLocked });
    toast('✅', 'success');
  }
  closeModal('med-edit');
  refreshMedMgr();
  refreshItems();
  editingIds.medicine = null;
}
function lockMed(id){ var m = Store.find('medicines', id); if(!m || m.isLocked) return; if(!confirm('قفل؟')) return; Store.update('medicines', id, { isLocked: true }); toast('🔒'); refreshMedMgr(); }
function unlockMed(id){ var m = Store.find('medicines', id); if(!m || !m.isLocked) return; if(!confirm('باز؟')) return; Store.update('medicines', id, { isLocked: false }); toast('🔓'); refreshMedMgr(); }
function delMed(id){
  var m = Store.find('medicines', id);
  if(!m || m.isLocked){ toast('🔒', 'error'); return; }
  if(!confirm('حذف؟')) return;
  Store.remove('medicines', id); toast('🗑️'); refreshMedMgr(); refreshItems();
}

/* ═══════ Unit Mgr ═══════ */
function renderUnitListInner(){
  var units = getUnits();
  if(!units.length) return '<div style="text-align:center;padding:20px;color:#64748b;font-size:12px">هنوز واحدی نیست</div>';
  var out = '';
  for(var i = 0; i < units.length; i++){
    var u = units[i];
    var cls = 'med-row' + (u.isLocked ? ' locked' : '');
    var acts = u.isLocked
      ? '<button class="med-row-btn unlock" data-med="unlock-unit" data-id="' + sid(u.id) + '">🔓</button>'
      : '<button class="med-row-btn edit" data-med="edit-unit" data-id="' + sid(u.id) + '">✏️</button>' +
        '<button class="med-row-btn lock" data-med="lock-unit" data-id="' + sid(u.id) + '">🔒</button>' +
        '<button class="med-row-btn delete" data-med="del-unit" data-id="' + sid(u.id) + '">🗑️</button>';
    out += '<div class="' + cls + '"><div class="med-row-ic">' + (u.isLocked ? '🔒' : '⚖️') + '</div>' +
      '<div class="med-row-info"><div class="med-row-n">' + esc(u.name) + '</div>' +
      '<div class="med-row-u">' + esc(u.symbol || '—') + '</div></div>' +
      '<div class="med-row-acts">' + acts + '</div></div>';
  }
  return out;
}
function openUnitMgr(){
  var html = '<div class="med-modal-hd"><div class="med-modal-t">⚖️ مدیریت واحدها</div>' +
    '<button class="med-modal-x" data-med="close-modal" data-mid="unit-mgr">✕</button></div>' +
    '<div class="med-info-box">💡 مشترک با انبار و خوراک</div>' +
    '<button class="med-btn med-btn-g" data-med="open-add-unit" style="margin-bottom:12px">➕ واحد جدید</button>' +
    '<div class="med-list">' + renderUnitListInner() + '</div>';
  var ex = _modals['unit-mgr'];
  if(ex){ try{ ex.remove(); }catch(e){} delete _modals['unit-mgr']; }
  openModal('unit-mgr', html);
}
function refreshUnitMgr(){
  var el = document.querySelector('[data-modal-id="unit-mgr"] .med-list');
  if(el) el.innerHTML = renderUnitListInner();
}
function openUnitEdit(id){
  editingIds.unit = id ? sid(id) : null;
  var u = id ? Store.find('units', id) : null;
  if(u && u.isLocked){ toast('🔒', 'error'); return; }
  var html = '<div class="med-modal-hd"><div class="med-modal-t">' + (id ? '✏️' : '⚖️ واحد جدید') + '</div>' +
    '<button class="med-modal-x" data-med="close-modal" data-mid="unit-edit">✕</button></div>' +
    '<div class="med-fg"><label class="med-fl">نام</label><input class="med-fi" id="edUnitName" value="' + (u ? esc(u.name) : '') + '"></div>' +
    '<div class="med-fg"><label class="med-fl">🔤 نماد</label><input class="med-fi" id="edUnitSymbol" value="' + (u ? esc(u.symbol || '') : '') + '"></div>' +
    '<div class="med-fg"><label class="med-check"><input type="checkbox" id="edUnitLock" ' + (u && u.isLocked ? 'checked' : '') + '> <span>🔒 قفل</span></label></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">' +
      '<button class="med-btn med-btn-s" data-med="close-modal" data-mid="unit-edit">انصراف</button>' +
      '<button class="med-btn med-btn-p" data-med="save-unit">💾 ذخیره</button>' +
    '</div>';
  openModal('unit-edit', html, { sheet: true });
}
function saveUnitEdit(){
  var name = document.getElementById('edUnitName').value.trim();
  var symbol = document.getElementById('edUnitSymbol').value.trim();
  if(!name){ toast('❌ نام', 'error'); return; }
  var units = getUnits();
  for(var i = 0; i < units.length; i++){
    if(units[i].name === name && !sameId(units[i].id, editingIds.unit)){ toast('⚠️ تکراری', 'error'); return; }
  }
  var isLocked = document.getElementById('edUnitLock').checked;
  if(editingIds.unit){
    var existing = Store.find('units', editingIds.unit);
    if(existing) Store.update('units', editingIds.unit, { name: name, symbol: symbol, isLocked: isLocked });
    toast('✅', 'success');
  } else {
    Store.add('units', { name: name, symbol: symbol, isLocked: isLocked });
    toast('✅', 'success');
  }
  closeModal('unit-edit');
  refreshUnitMgr();
  refreshItems();
  editingIds.unit = null;
}
function lockUnit(id){ var u = Store.find('units', id); if(!u || u.isLocked) return; if(!confirm('قفل؟')) return; Store.update('units', id, { isLocked: true }); toast('🔒'); refreshUnitMgr(); }
function unlockUnit(id){ var u = Store.find('units', id); if(!u || !u.isLocked) return; if(!confirm('باز؟')) return; Store.update('units', id, { isLocked: false }); toast('🔓'); refreshUnitMgr(); }
function delUnit(id){
  var u = Store.find('units', id);
  if(!u || u.isLocked){ toast('🔒', 'error'); return; }
  if(!confirm('حذف؟')) return;
  Store.remove('units', id); toast('🗑️'); refreshUnitMgr(); refreshItems();
}

/* ═══════ Method Mgr ═══════ */
function renderMethodListInner(){
  var ms = getMethods();
  if(!ms.length) return '<div style="text-align:center;padding:20px;color:#64748b;font-size:12px">هنوز روشی نیست</div>';
  var out = '';
  for(var i = 0; i < ms.length; i++){
    var m = ms[i];
    var cls = 'med-row' + (m.isLocked ? ' locked' : '');
    var acts = m.isLocked
      ? '<button class="med-row-btn unlock" data-med="unlock-method" data-id="' + sid(m.id) + '">🔓</button>'
      : '<button class="med-row-btn edit" data-med="edit-method" data-id="' + sid(m.id) + '">✏️</button>' +
        '<button class="med-row-btn lock" data-med="lock-method" data-id="' + sid(m.id) + '">🔒</button>' +
        '<button class="med-row-btn delete" data-med="del-method" data-id="' + sid(m.id) + '">🗑️</button>';
    out += '<div class="' + cls + '"><div class="med-row-ic">' + (m.isLocked ? '🔒' : '💧') + '</div>' +
      '<div class="med-row-info"><div class="med-row-n">' + esc(m.name) + '</div></div>' +
      '<div class="med-row-acts">' + acts + '</div></div>';
  }
  return out;
}
function openMethodMgr(){
  var html = '<div class="med-modal-hd"><div class="med-modal-t">💧 مدیریت روش‌ها</div>' +
    '<button class="med-modal-x" data-med="close-modal" data-mid="method-mgr">✕</button></div>' +
    '<button class="med-btn med-btn-g" data-med="open-add-method" style="margin-bottom:12px">➕ روش جدید</button>' +
    '<div class="med-list">' + renderMethodListInner() + '</div>';
  var ex = _modals['method-mgr'];
  if(ex){ try{ ex.remove(); }catch(e){} delete _modals['method-mgr']; }
  openModal('method-mgr', html);
}
function refreshMethodMgr(){
  var el = document.querySelector('[data-modal-id="method-mgr"] .med-list');
  if(el) el.innerHTML = renderMethodListInner();
}
function openMethodEdit(id){
  editingIds.method = id ? sid(id) : null;
  var m = id ? Store.find('medMethods', id) : null;
  if(m && m.isLocked){ toast('🔒', 'error'); return; }
  var html = '<div class="med-modal-hd"><div class="med-modal-t">' + (id ? '✏️' : '💧 روش جدید') + '</div>' +
    '<button class="med-modal-x" data-med="close-modal" data-mid="method-edit">✕</button></div>' +
    '<div class="med-fg"><label class="med-fl">نام</label><input class="med-fi" id="edMethodName" value="' + (m ? esc(m.name) : '') + '"></div>' +
    '<div class="med-fg"><label class="med-check"><input type="checkbox" id="edMethodLock" ' + (m && m.isLocked ? 'checked' : '') + '> <span>🔒 قفل</span></label></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">' +
      '<button class="med-btn med-btn-s" data-med="close-modal" data-mid="method-edit">انصراف</button>' +
      '<button class="med-btn med-btn-p" data-med="save-method">💾 ذخیره</button>' +
    '</div>';
  openModal('method-edit', html, { sheet: true });
}
function saveMethodEdit(){
  var name = document.getElementById('edMethodName').value.trim();
  if(!name){ toast('❌', 'error'); return; }
  var ms = getMethods();
  for(var i = 0; i < ms.length; i++){
    if(ms[i].name === name && !sameId(ms[i].id, editingIds.method)){ toast('⚠️', 'error'); return; }
  }
  var isLocked = document.getElementById('edMethodLock').checked;
  if(editingIds.method){
    var existing = Store.find('medMethods', editingIds.method);
    if(existing){
      var old = existing.name;
      if(old !== name){
        var recs = getRecords();
        for(var k = 0; k < recs.length; k++) if(recs[k].method === old) Store.update('medicineRecords', recs[k].id, { method: name });
      }
      Store.update('medMethods', editingIds.method, { name: name, isLocked: isLocked });
    }
    toast('✅', 'success');
  } else {
    Store.add('medMethods', { name: name, isLocked: isLocked });
    toast('✅', 'success');
  }
  closeModal('method-edit');
  refreshMethodMgr();
  editingIds.method = null;
}
function lockMethod(id){ var m = Store.find('medMethods', id); if(!m || m.isLocked) return; if(!confirm('قفل؟')) return; Store.update('medMethods', id, { isLocked: true }); toast('🔒'); refreshMethodMgr(); }
function unlockMethod(id){ var m = Store.find('medMethods', id); if(!m || !m.isLocked) return; if(!confirm('باز؟')) return; Store.update('medMethods', id, { isLocked: false }); toast('🔓'); refreshMethodMgr(); }
function delMethod(id){
  var m = Store.find('medMethods', id);
  if(!m || m.isLocked){ toast('🔒', 'error'); return; }
  if(!confirm('حذف؟')) return;
  Store.remove('medMethods', id); toast('🗑️'); refreshMethodMgr();
}

/* ═══════ Reason Mgr ═══════ */
function renderReasonListInner(){
  var rs = getReasons();
  if(!rs.length) return '<div style="text-align:center;padding:20px;color:#64748b;font-size:12px">هنوز علتی نیست</div>';
  var out = '';
  for(var i = 0; i < rs.length; i++){
    var r = rs[i];
    var cls = 'med-row' + (r.isLocked ? ' locked' : '');
    var acts = r.isLocked
      ? '<button class="med-row-btn unlock" data-med="unlock-reason" data-id="' + sid(r.id) + '">🔓</button>'
      : '<button class="med-row-btn edit" data-med="edit-reason" data-id="' + sid(r.id) + '">✏️</button>' +
        '<button class="med-row-btn lock" data-med="lock-reason" data-id="' + sid(r.id) + '">🔒</button>' +
        '<button class="med-row-btn delete" data-med="del-reason" data-id="' + sid(r.id) + '">🗑️</button>';
    out += '<div class="' + cls + '"><div class="med-row-ic">' + (r.isLocked ? '🔒' : '🎯') + '</div>' +
      '<div class="med-row-info"><div class="med-row-n">' + esc(r.name) + '</div></div>' +
      '<div class="med-row-acts">' + acts + '</div></div>';
  }
  return out;
}
function openReasonMgr(){
  var html = '<div class="med-modal-hd"><div class="med-modal-t">🎯 مدیریت علل</div>' +
    '<button class="med-modal-x" data-med="close-modal" data-mid="reason-mgr">✕</button></div>' +
    '<button class="med-btn med-btn-g" data-med="open-add-reason" style="margin-bottom:12px">➕ علت جدید</button>' +
    '<div class="med-list">' + renderReasonListInner() + '</div>';
  var ex = _modals['reason-mgr'];
  if(ex){ try{ ex.remove(); }catch(e){} delete _modals['reason-mgr']; }
  openModal('reason-mgr', html);
}
function refreshReasonMgr(){
  var el = document.querySelector('[data-modal-id="reason-mgr"] .med-list');
  if(el) el.innerHTML = renderReasonListInner();
}
function openReasonEdit(id){
  editingIds.reason = id ? sid(id) : null;
  var r = id ? Store.find('medReasons', id) : null;
  if(r && r.isLocked){ toast('🔒', 'error'); return; }
  var html = '<div class="med-modal-hd"><div class="med-modal-t">' + (id ? '✏️' : '🎯 علت جدید') + '</div>' +
    '<button class="med-modal-x" data-med="close-modal" data-mid="reason-edit">✕</button></div>' +
    '<div class="med-fg"><label class="med-fl">نام</label><input class="med-fi" id="edReasonName" value="' + (r ? esc(r.name) : '') + '"></div>' +
    '<div class="med-fg"><label class="med-check"><input type="checkbox" id="edReasonLock" ' + (r && r.isLocked ? 'checked' : '') + '> <span>🔒 قفل</span></label></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">' +
      '<button class="med-btn med-btn-s" data-med="close-modal" data-mid="reason-edit">انصراف</button>' +
      '<button class="med-btn med-btn-p" data-med="save-reason">💾 ذخیره</button>' +
    '</div>';
  openModal('reason-edit', html, { sheet: true });
}
function saveReasonEdit(){
  var name = document.getElementById('edReasonName').value.trim();
  if(!name){ toast('❌', 'error'); return; }
  var rs = getReasons();
  for(var i = 0; i < rs.length; i++){
    if(rs[i].name === name && !sameId(rs[i].id, editingIds.reason)){ toast('⚠️', 'error'); return; }
  }
  var isLocked = document.getElementById('edReasonLock').checked;
  if(editingIds.reason){
    var existing = Store.find('medReasons', editingIds.reason);
    if(existing){
      var old = existing.name;
      if(old !== name){
        var recs = getRecords();
        for(var k = 0; k < recs.length; k++) if(recs[k].reason === old) Store.update('medicineRecords', recs[k].id, { reason: name });
      }
      Store.update('medReasons', editingIds.reason, { name: name, isLocked: isLocked });
    }
    toast('✅', 'success');
  } else {
    Store.add('medReasons', { name: name, isLocked: isLocked });
    toast('✅', 'success');
  }
  closeModal('reason-edit');
  refreshReasonMgr();
  editingIds.reason = null;
}
function lockReason(id){ var r = Store.find('medReasons', id); if(!r || r.isLocked) return; if(!confirm('قفل؟')) return; Store.update('medReasons', id, { isLocked: true }); toast('🔒'); refreshReasonMgr(); }
function unlockReason(id){ var r = Store.find('medReasons', id); if(!r || !r.isLocked) return; if(!confirm('باز؟')) return; Store.update('medReasons', id, { isLocked: false }); toast('🔓'); refreshReasonMgr(); }
function delReason(id){
  var r = Store.find('medReasons', id);
  if(!r || r.isLocked){ toast('🔒', 'error'); return; }
  if(!confirm('حذف؟')) return;
  Store.remove('medReasons', id); toast('🗑️'); refreshReasonMgr();
}

/* ═══════ Events ═══════ */
document.addEventListener('click', function(e){
  var colorOpt = e.target.closest ? e.target.closest('[data-type-colors] .med-color') : null;
  if(colorOpt){
    selectedTypeColor = colorOpt.dataset.color;
    var sibs = colorOpt.parentElement.querySelectorAll('.med-color');
    for(var si = 0; si < sibs.length; si++) sibs[si].classList.toggle('on', sibs[si] === colorOpt);
    return;
  }

  var btn = e.target.closest ? e.target.closest('[data-med]') : null;
  if(!btn) return;
  var act = btn.dataset.med;
  var id = sid(btn.dataset.id);
  var mid = btn.dataset.mid;
  var i = +btn.dataset.i;

  switch(act){
    case 'open-form': openMedForm(); break;
    case 'edit': e.stopPropagation(); openMedForm(id); break;
    case 'del': e.stopPropagation(); deleteMed(id); break;
    case 'copy': e.stopPropagation(); copyMed(id); break;
    case 'toggle': {
      e.stopPropagation();
      uiState.expanded[id] = !uiState.expanded[id];
      var card = document.querySelector('.med-card[data-med-id="' + id + '"]');
      if(card) card.classList.toggle('expanded', !!uiState.expanded[id]);
      break;
    }
    case 'filter': {
      uiState.filter = btn.dataset.f;
      var tabs = document.querySelectorAll('.med-tab');
      for(var ti = 0; ti < tabs.length; ti++) tabs[ti].classList.toggle('on', tabs[ti] === btn);
      refreshList();
      break;
    }
    case 'close-modal': closeModal(mid); break;
    case 'save': saveMed(); break;

    case 'add-item': {
      var meds = getMedicines();
      if(!meds.length){ toast('❌ اول دارو بسازید', 'error'); openMedicineEdit(); break; }
      var used = formItems.map(function(x){ return x.name; });
      var avail = null;
      for(var mi = 0; mi < meds.length; mi++){
        if(used.indexOf(meds[mi].name) < 0){ avail = meds[mi]; break; }
      }
      var units = getUnits();
      formItems.push({ name: avail ? avail.name : meds[0].name, dose: '', unit: units[0] ? units[0].name : '' });
      refreshItems();
      break;
    }
    case 'del-item': {
      formItems.splice(i, 1);
      if(!formItems.length){
        var m2 = getMedicines();
        var u2 = getUnits();
        if(m2.length) formItems.push({ name: m2[0].name, dose: '', unit: u2[0] ? u2[0].name : '' });
      }
      refreshItems();
      break;
    }

    case 'open-type-mgr': openTypeMgr(); break;
    case 'open-add-type': openTypeEdit(); break;
    case 'edit-type': openTypeEdit(id); break;
    case 'save-type': saveTypeEdit(); break;
    case 'lock-type': lockType(id); break;
    case 'unlock-type': unlockType(id); break;
    case 'del-type': delType(id); break;

    case 'open-med-mgr': openMedMgr(); break;
    case 'open-add-medicine': openMedicineEdit(); break;
    case 'edit-med': openMedicineEdit(id); break;
    case 'save-medicine': saveMedicineEdit(); break;
    case 'lock-med': lockMed(id); break;
    case 'unlock-med': unlockMed(id); break;
    case 'del-med': delMed(id); break;

    case 'open-unit-mgr': openUnitMgr(); break;
    case 'open-add-unit': openUnitEdit(); break;
    case 'edit-unit': openUnitEdit(id); break;
    case 'save-unit': saveUnitEdit(); break;
    case 'lock-unit': lockUnit(id); break;
    case 'unlock-unit': unlockUnit(id); break;
    case 'del-unit': delUnit(id); break;

    case 'open-method-mgr': openMethodMgr(); break;
    case 'open-add-method': openMethodEdit(); break;
    case 'edit-method': openMethodEdit(id); break;
    case 'save-method': saveMethodEdit(); break;
    case 'lock-method': lockMethod(id); break;
    case 'unlock-method': unlockMethod(id); break;
    case 'del-method': delMethod(id); break;

    case 'open-reason-mgr': openReasonMgr(); break;
    case 'open-add-reason': openReasonEdit(); break;
    case 'edit-reason': openReasonEdit(id); break;
    case 'save-reason': saveReasonEdit(); break;
    case 'lock-reason': lockReason(id); break;
    case 'unlock-reason': unlockReason(id); break;
    case 'del-reason': delReason(id); break;

    case 'open-cal':
      if(UI.openCalendar) UI.openCalendar(btn.dataset.target);
      break;
  }
});

document.addEventListener('change', function(e){
  var t = e.target;
  if(!t.dataset) return;
  if(t.dataset.itemName !== undefined){
    var idx = +t.dataset.itemName;
    if(formItems[idx]) formItems[idx].name = t.value;
  }
  if(t.dataset.itemUnit !== undefined){
    var idx2 = +t.dataset.itemUnit;
    if(formItems[idx2]) formItems[idx2].unit = t.value;
  }
});

document.addEventListener('input', function(e){
  var t = e.target;
  if(t.id === 'medCost'){
    var cursorPos = t.selectionStart || 0;
    var digitsBefore = toEnDigits(t.value.slice(0, cursorPos)).replace(/[^\d]/g, '').length;
    var formatted = fmtThousandsInput(t.value);
    t.value = formatted;
    if(document.activeElement === t){
      var count = 0, newPos = formatted.length;
      for(var i = 0; i < formatted.length; i++){
        if(/\d/.test(formatted[i])) count++;
        if(count === digitsBefore){ newPos = i + 1; break; }
      }
      try{ t.setSelectionRange(newPos, newPos); }catch(_){}
    }
    return;
  }
  if(t.dataset && t.dataset.itemDose !== undefined){
    var idx = +t.dataset.itemDose;
    if(formItems[idx]) formItems[idx].dose = t.value;
  }
});

/* ═══════ Init ═══════ */
injectStyles();

Router.register('medicine', {
  title: 'دارو و واکسن',
  navPage: 'more',
  topLevel: true,
  render: function(){ return renderPage(); }
});

window.MedicineModule = {
  key: 'medicineRecords',
  get: function(){ return getRecords().slice(); },
  save: function(){ Store.save(); },
  load: function(){ refreshList(); }
};

console.log('✅ medicine route registered (v3.0 - Store v4)');

})();