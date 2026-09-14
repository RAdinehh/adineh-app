/* ═══════════════════════════════════════════════
   INVENTORY — انبار (v8.1)
   + ارزش کل به تفکیک واحد (per-unit value)
   + محدودیت نمایش: ۱۵ آیتم + دکمه «بیشتر»
   + جمع جداگانه بر اساس واحد
   + گروه‌بندی هوشمند (دسته، تاریخ، کالا)
   + مدیریت دسته + آیتم‌های هر دسته
   ساخته شده توسط رضا آدینه
   ═══════════════════════════════════════════════ */
(function(){
'use strict';

if(typeof Router === 'undefined' || typeof Router.register !== 'function'){ return; }
if(window.__inventoryModuleLoaded) return;
window.__inventoryModuleLoaded = true;

var sid = UI.sid, sameId = UI.sameId, findBy = UI.findBy;
var esc = UI.esc, fa = UI.fa, toFa = UI.toFa, toEnDigits = UI.toEnDigits;
var parseNum = UI.parseNum, fmtThousandsInput = UI.fmtThousandsInput;
var fmtShort = UI.formatShort, toast = UI.toast;
var jToC = UI.jToC, todayStr = UI.todayStr;

var PAGE_SIZE = 15;
var GROUP_ITEM_PREVIEW = 5;

var _filter = 'all';
var _groupBy = 'none';
var _expanded = {};
var _expandedGroupsSet = {};
var _expandedGroupItems = {};
var _showAll = false;
var editingInvId = null;
var editingVehicleId = null;
var editingCatId = null;
var _selectedCatColor = '#06b6d4';
var _modals = {};
var _pickerState = { q: '' };
var _mgrCat = null;

var DEFAULT_TRANSPORT_VEHICLES = [
  'تیبا','پژو','پراید','سمند','پیکان وانت','نیسان','خاور','کامیون',
  'کامیونت','تریلی','اتوبوس','مینی بوس','ون','وانت','موتور','موتور سه چرخ',
  'لودر','تراکتور','خودرو شخصی','پیک موتوری','پست','باربری'
];

function openModal(id, html, opts){
  opts = opts || {};
  if(_modals[id]) return _modals[id];
  var wrap = document.createElement('div');
  wrap.className = 'inv-modal-wrap';
  wrap.dataset.modalId = id;
  wrap.innerHTML = '<div class="inv-modal-bg" data-inv="close-modal" data-mid="' + id + '"></div>' +
    '<div class="inv-modal-box' + (opts.sheet ? ' inv-sheet' : '') + '">' + html + '</div>';
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
function getTransactions(){
  return Store.all('transactions').filter(function(t){
    return t.kind === 'inv_in' || t.kind === 'inv_out' || t.kind === 'inv_waste';
  });
}
function getItems(){ return Store.all('items'); }
function getUnits(){ return Store.all('units'); }
function getCategories(){
  return Store.all('categories').filter(function(c){ return c.scope === 'inventory'; });
}
function getVehicles(){ return Store.all('invTransportVehicles'); }
function getMedicines(){ return Store.all('medicines') || []; }

function getItemsByCategory(catName){
  var items = getItems();
  return items.filter(function(it){ return it.category === catName; });
}

function ensureVehicleDefaults(){
  if(getVehicles().length === 0){
    for(var i = 0; i < DEFAULT_TRANSPORT_VEHICLES.length; i++){
      Store.add('invTransportVehicles', { name: DEFAULT_TRANSPORT_VEHICLES[i], isLocked: false });
    }
  }
}

function isMedicineCategory(catName){
  if(!catName) return false;
  var n = String(catName);
  return n.indexOf('دارو') !== -1 || n.indexOf('واکسن') !== -1;
}

function getCatMeta(catName){
  var n = String(catName || '');
  if(!n) return { icon: '📦', label: 'نام کالا', placeholder: 'نام کالا', isMed: false, color: '#3b82f6', hint: '' };
  if(n.indexOf('دارو') !== -1 || n.indexOf('واکسن') !== -1){
    return { icon: '💊', label: 'نام دارو', placeholder: 'نام دارو یا واکسن', isMed: true, color: '#8b5cf6', hint: '💊 از لیست انتخاب کن یا نام جدید بنویس' };
  }
  if(n.indexOf('خوراک') !== -1 || n.indexOf('دان') !== -1){
    return { icon: '🌾', label: 'نام خوراک', placeholder: 'مثلاً: ذرت، سویا، کنسانتره', isMed: false, color: '#10b981', hint: '🌾 نام خوراک یا نهاده را وارد کن' };
  }
  if(n.indexOf('تجهیزات') !== -1 || n.indexOf('لوازم') !== -1 || n.indexOf('ابزار') !== -1){
    return { icon: '🔧', label: 'نام تجهیزات', placeholder: 'مثلاً: دانخوری، فن، لامپ', isMed: false, color: '#3b82f6', hint: '🔧 نام تجهیزات یا قطعه را وارد کن' };
  }
  if(n.indexOf('سایر') !== -1 || n.indexOf('متفرقه') !== -1){
    return { icon: '📦', label: 'نام کالا', placeholder: 'نام کالا', isMed: false, color: '#64748b', hint: '' };
  }
  return { icon: '📦', label: 'نام ' + n, placeholder: 'نام ' + n, isMed: false, color: '#3b82f6', hint: '' };
}

function getStockMap(){
  var map = {};
  var inv = getTransactions();
  for(var i = 0; i < inv.length; i++){
    var t = inv[i];
    var name = t.item || t.category;
    if(!name) continue;
    if(!map[name]){
      map[name] = { item: name, qty: 0, unit: t.unit || '', category: t.category || '', lastPrice: 0 };
    }
    var q = t.qty || 0;
    if(t.kind === 'inv_in') map[name].qty += q;
    else if(t.kind === 'inv_out') map[name].qty -= q;
    else if(t.kind === 'inv_waste') map[name].qty -= q;
    if(t.unit) map[name].unit = t.unit;
    if(t.price) map[name].lastPrice = t.price;
  }
  return map;
}

/* ✅ ارزش کل به تفکیک واحد
   برای هر واحد: مجموع (موجودی × آخرین قیمت) همه آیتم‌های اون واحد
*/
function calcTotalValueByUnit(){
  var stock = getStockMap();
  var byUnit = {};
  var counted = 0;
  var skipped = 0;
  var totalItems = Object.keys(stock).length;
  var grandTotal = 0;

  Object.keys(stock).forEach(function(name){
    var s = stock[name];
    var qty = s.qty || 0;
    var price = s.lastPrice || 0;
    var unit = s.unit || 'عدد';
    if(qty > 0 && price > 0){
      var val = qty * price;
      if(!byUnit[unit]) byUnit[unit] = 0;
      byUnit[unit] += val;
      grandTotal += val;
      counted++;
    } else {
      skipped++;
    }
  });

  return {
    byUnit: byUnit,
    total: grandTotal,
    counted: counted,
    skipped: skipped,
    totalItems: totalItems
  };
}

function calcTotalsByUnit(list){
  var map = {};
  for(var i = 0; i < list.length; i++){
    var t = list[i];
    var u = t.unit || 'عدد';
    if(!map[u]) map[u] = 0;
    map[u] += t.qty || 0;
  }
  return map;
}

function formatUnitsLine(unitMap){
  var keys = Object.keys(unitMap).filter(function(u){ return unitMap[u] > 0; });
  if(!keys.length) return '۰';
  keys.sort(function(a, b){ return unitMap[b] - unitMap[a]; });
  return keys.map(function(u){
    return fa(unitMap[u]) + ' ' + esc(u);
  }).join(' · ');
}

/* ═══════ Styles ═══════ */
function injectStyles(){
  if(document.getElementById('inv-styles')) return;
  var css =
  '.inv-page{padding:10px;max-width:760px;margin:0 auto}' +
  '.inv-header{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap}' +
  '.inv-title{font-size:14px;font-weight:900}' +
  '.inv-sub{font-size:10.5px;color:#64748b;font-weight:700;margin-top:1px}' +
  '.inv-action-btn{color:#fff;border:none;padding:8px 14px;border-radius:9999px;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:4px;white-space:nowrap;background:linear-gradient(135deg,#0f766e,#14b8a6);box-shadow:0 3px 10px rgba(15,118,110,.3)}' +
  '.inv-summary{background:#fff;border-radius:12px;padding:10px;margin-bottom:10px;border:1px solid #e2e8f0;display:grid;grid-template-columns:repeat(2,1fr);gap:8px}' +
  '.inv-sum{background:#f1f5f9;border-radius:8px;padding:8px 6px;text-align:center;border-bottom:2px solid #0f766e;display:flex;flex-direction:column;align-items:center;gap:3px}' +
  '.inv-sum.g{border-color:#10b981;background:#ecfdf5}.inv-sum.b{border-color:#3b82f6;background:#eff6ff}' +
  '.inv-sum.o{border-color:#f59e0b;background:#fffbeb}.inv-sum.p{border-color:#8b5cf6;background:#f5f3ff}' +
  '.inv-sum-ic{font-size:14px;line-height:1}' +
  '.inv-sum-l{font-size:9.5px;color:#64748b;font-weight:800}' +
  '.inv-sum-units{display:flex;flex-wrap:wrap;gap:3px;justify-content:center;margin-top:2px;width:100%}' +
  '.inv-sum-u{display:inline-flex;align-items:center;gap:3px;font-size:9.5px;font-weight:900;padding:2px 7px;border-radius:9999px;background:#fff;color:#0f766e;white-space:nowrap;border:1px solid #a7f3d0;max-width:100%;overflow:hidden;text-overflow:ellipsis}' +
  '.inv-sum-u-lbl{opacity:.7;font-weight:800}' +
  '.inv-sum-u-val{font-weight:900}' +
  '.inv-sum.g .inv-sum-u{color:#059669;border-color:#6ee7b7}' +
  '.inv-sum.b .inv-sum-u{color:#2563eb;border-color:#93c5fd}' +
  '.inv-sum.o .inv-sum-u{color:#d97706;border-color:#fcd34d}' +
  '.inv-sum.p .inv-sum-u{color:#7c3aed;border-color:#c4b5fd}' +
  '.inv-sum-big{font-size:13px;font-weight:900;color:#0f766e;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}' +
  '.inv-sum.g .inv-sum-big{color:#059669}.inv-sum.b .inv-sum-big{color:#2563eb}' +
  '.inv-sum.o .inv-sum-big{color:#d97706}.inv-sum.p .inv-sum-big{color:#7c3aed}' +
  '.inv-sum-note{font-size:8.5px;color:#94a3b8;font-weight:700;margin-top:1px;line-height:1.3}' +
  '.inv-tabs{display:flex;gap:4px;margin-bottom:8px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none}' +
  '.inv-tabs::-webkit-scrollbar{display:none}' +
  '.inv-tab{background:#fff;border:1.5px solid #e2e8f0;color:#64748b;padding:6px 12px;border-radius:9999px;font-family:inherit;font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap;flex-shrink:0}' +
  '.inv-tab.on{background:#0f766e;border-color:#0f766e;color:#fff}' +
  '.inv-group-tabs{display:flex;gap:4px;margin-bottom:10px;padding:4px;background:#f1f5f9;border-radius:10px}' +
  '.inv-gt{flex:1;padding:6px 4px;border:none;background:transparent;border-radius:7px;font-family:inherit;font-size:10px;font-weight:800;color:#64748b;cursor:pointer;white-space:nowrap;display:flex;align-items:center;justify-content:center;gap:3px}' +
  '.inv-gt.on{background:#fff;color:#0f766e;box-shadow:0 1px 3px rgba(15,23,42,.08)}' +
  '.inv-group{background:#fff;border-radius:12px;margin-bottom:8px;border:1px solid #e2e8f0;overflow:hidden}' +
  '.inv-group-hd{display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer;user-select:none;background:linear-gradient(135deg,#f8fafc,#f1f5f9)}' +
  '.inv-group-hd:active{background:#f1f5f9}' +
  '.inv-group-ic{width:34px;height:34px;border-radius:9px;background:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;border:1px solid #e2e8f0}' +
  '.inv-group-info{flex:1;min-width:0}' +
  '.inv-group-t{font-size:12.5px;font-weight:900;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px}' +
  '.inv-group-s{font-size:10px;color:#64748b;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
  '.inv-group-arrow{width:26px;height:26px;border-radius:50%;background:#fff;color:#0f766e;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;flex-shrink:0;transition:transform .3s,background .2s;border:1px solid #e2e8f0}' +
  '.inv-group.expanded .inv-group-arrow{transform:rotate(180deg);background:#0f766e;color:#fff;border-color:#0f766e}' +
  '.inv-group-bd{max-height:0;overflow:hidden;transition:max-height .35s,padding .35s;padding:0 8px}' +
  '.inv-group.expanded .inv-group-bd{max-height:5000px;padding:8px 8px 10px;border-top:1px dashed #e2e8f0}' +
  '.inv-group-bd .inv-card{margin-bottom:5px}' +
  '.inv-group-bd .inv-card:last-child{margin-bottom:0}' +
  '.inv-show-more{width:100%;padding:12px;margin-top:6px;background:linear-gradient(135deg,#f0fdfa,#ecfdf5);border:1.5px dashed #14b8a6;border-radius:10px;color:#0f766e;font-family:inherit;font-size:12.5px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;transition:all .15s}' +
  '.inv-show-more:hover{background:linear-gradient(135deg,#ecfdf5,#d1fae5);border-color:#0f766e}' +
  '.inv-show-more:active{transform:scale(.98)}' +
  '.inv-show-more-ic{font-size:14px}' +
  '.inv-show-more-count{font-size:10px;font-weight:800;padding:2px 8px;border-radius:9999px;background:#fff;color:#0f766e;border:1px solid #a7f3d0}' +
  '.inv-show-less{width:100%;padding:9px;margin-top:6px;background:#f1f5f9;border:1.5px solid #e2e8f0;border-radius:10px;color:#64748b;font-family:inherit;font-size:11.5px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px}' +
  '.inv-card{background:#fff;border-radius:12px;margin-bottom:6px;border:1px solid #e2e8f0;border-right:3px solid #0f766e;overflow:hidden}' +
  '.inv-card-hd{display:flex;justify-content:space-between;align-items:flex-start;gap:6px;padding:10px 12px;cursor:pointer;user-select:none}' +
  '.inv-card-hd:active{background:#f1f5f9}' +
  '.inv-hd-content{flex:1;min-width:0}' +
  '.inv-hd-row1{display:flex;align-items:center;gap:6px;margin-bottom:5px;flex-wrap:wrap}' +
  '.inv-hd-ic{font-size:14px;flex-shrink:0}' +
  '.inv-hd-name{font-size:12.5px;font-weight:900;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60%}' +
  '.inv-type-badge{font-size:9px;font-weight:800;padding:2px 7px;border-radius:9999px}' +
  '.inv-type-badge.in{background:#ecfdf5;color:#166534}' +
  '.inv-type-badge.out{background:#fef2f2;color:#991b1b}' +
  '.inv-type-badge.waste{background:#fffbeb;color:#92400e}' +
  '.inv-hd-row2{display:flex;align-items:center;gap:5px;flex-wrap:wrap}' +
  '.inv-stat{display:inline-flex;align-items:center;gap:2px;padding:2px 6px;border-radius:9999px;background:#f1f5f9;font-size:10px;font-weight:700;white-space:nowrap}' +
  '.inv-stat.r{background:#fef2f2;color:#991b1b}.inv-stat.g{background:#ecfdf5;color:#166534}' +
  '.inv-stat.b{background:#eff6ff;color:#1e40af}.inv-stat.o{background:#fffbeb;color:#92400e}' +
  '.inv-stat strong{font-weight:900;font-size:11px}' +
  '.inv-toggle{background:#f1f5f9;border:none;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:#0f766e;cursor:pointer;flex-shrink:0;transition:transform .3s,background .2s}' +
  '.inv-card.expanded .inv-toggle{transform:rotate(180deg);background:#0f766e;color:#fff}' +
  '.inv-card-bd{max-height:0;overflow:hidden;transition:max-height .35s,padding .35s;padding:0 12px}' +
  '.inv-card.expanded .inv-card-bd{max-height:1000px;padding:8px 12px 12px;border-top:1px dashed #e2e8f0}' +
  '.inv-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:8px}' +
  '.inv-box{background:#f1f5f9;border-radius:6px;padding:5px 6px;text-align:center;border-bottom:2px solid #cbd5e1}' +
  '.inv-box.r{border-color:#ef4444}.inv-box.g{border-color:#10b981}.inv-box.b{border-color:#3b82f6}.inv-box.o{border-color:#f59e0b}' +
  '.inv-box-l{font-size:9px;color:#64748b;font-weight:700;margin-bottom:1px}' +
  '.inv-box-v{font-size:12px;font-weight:900}' +
  '.inv-box.r .inv-box-v{color:#ef4444}.inv-box.g .inv-box-v{color:#10b981}' +
  '.inv-box.b .inv-box-v{color:#3b82f6}.inv-box.o .inv-box-v{color:#f59e0b}' +
  '.inv-chips{display:flex;flex-wrap:wrap;gap:3px;margin-bottom:6px}' +
  '.inv-chip{display:inline-flex;align-items:center;gap:3px;padding:3px 7px;border-radius:9999px;font-size:10px;font-weight:700;background:#f1f5f9}' +
  '.inv-chip.date{background:#eff6ff;color:#1e40af}' +
  '.inv-chip.sup{background:#fffbeb;color:#92400e}' +
  '.inv-chip.transport{background:#fef3c7;color:#92400e}' +
  '.inv-chip.expired{background:#fef2f2;color:#991b1b}' +
  '.inv-chip.expiry{background:#f0fdfa;color:#0f766e}' +
  '.inv-note{background:#f1f5f9;padding:6px 8px;border-radius:6px;font-size:11px;line-height:1.5;color:#475569;border-right:2px solid #0f766e;margin-bottom:6px}' +
  '.inv-note-l{font-size:9.5px;font-weight:900;color:#64748b;margin-bottom:2px;display:block}' +
  '.inv-actions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;padding-top:6px;border-top:1px dashed #e2e8f0}' +
  '.inv-actions button{padding:6px;border:none;border-radius:6px;font-family:inherit;font-size:10.5px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:3px}' +
  '.inv-act-edit{background:#eff6ff;color:#1e40af}' +
  '.inv-act-copy{background:#f5f3ff;color:#6b21a8}' +
  '.inv-act-del{background:#fef2f2;color:#991b1b}' +
  '.inv-empty{text-align:center;padding:48px 24px;background:#fff;border-radius:12px;border:1px dashed #cbd5e1}' +
  '.inv-empty-ic{font-size:56px;line-height:1;display:block;margin-bottom:12px;opacity:.6}' +
  '.inv-empty-t{font-size:14px;font-weight:900;margin-bottom:6px}' +
  '.inv-empty-x{font-size:12px;color:#64748b;font-weight:600;margin:0 auto 16px;max-width:280px}' +
  '.inv-modal-wrap{position:fixed;inset:0;z-index:2000;display:flex;align-items:flex-end;justify-content:center;opacity:0;pointer-events:none;transition:opacity .2s}' +
  '.inv-modal-wrap.on{opacity:1;pointer-events:auto}' +
  '.inv-modal-bg{position:absolute;inset:0;background:rgba(15,23,42,.55)}' +
  '.inv-modal-box{position:relative;background:#fff;width:100%;max-width:760px;border-radius:24px 24px 0 0;padding:14px;max-height:95vh;overflow-y:auto;transform:translateY(30px);transition:transform .3s;padding-bottom:calc(20px + env(safe-area-inset-bottom,0px))}' +
  '.inv-modal-wrap.on .inv-modal-box{transform:translateY(0)}' +
  '.inv-modal-box.inv-sheet{border-radius:18px;max-width:400px;margin:auto;padding:12px}' +
  '.inv-modal-hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #e2e8f0}' +
  '.inv-modal-t{font-size:14px;font-weight:800}' +
  '.inv-modal-x{background:#f1f5f9;border:none;width:30px;height:30px;border-radius:50%;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center}' +
  '.inv-sec{margin-bottom:12px}' +
  '.inv-sec-hd{display:flex;align-items:center;gap:6px;margin-bottom:8px;padding-bottom:4px;border-bottom:1.5px solid #e2e8f0}' +
  '.inv-sec-ic{width:22px;height:22px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0}' +
  '.inv-sec-t{font-size:11.5px;font-weight:900}' +
  '.inv-fg{margin-bottom:8px}' +
  '.inv-fl{font-size:10px;font-weight:800;margin-bottom:3px;display:flex;align-items:center;gap:4px;color:#475569}' +
  '.inv-fl .inv-req{color:#ef4444;font-weight:900}' +
  '.inv-fl .inv-hint{color:#94a3b8;font-weight:600;font-size:9.5px;margin-right:auto}' +
  '.inv-fl .inv-fl-hint{font-size:9.5px;color:#0f766e;font-weight:700;margin-right:auto;cursor:pointer;text-decoration:underline}' +
  '.inv-fi,.inv-fs,.inv-ft{display:block;width:100%;height:36px;padding:0 10px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:12.5px;font-family:inherit;background:#f8fafc;color:#0f172a;box-sizing:border-box;line-height:34px;margin:0}' +
  '.inv-fi:focus,.inv-fs:focus,.inv-ft:focus{outline:none;border-color:#0f766e;background:#fff;box-shadow:0 0 0 2px #f0fdfa}' +
  '.inv-fs{cursor:pointer;appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml;charset=utf8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2364748b\' stroke-width=\'2\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:left 8px center;background-size:14px 14px;padding-left:28px}' +
  '.inv-ft{height:auto;min-height:48px;padding:8px 10px;line-height:1.6;resize:vertical}' +
  '.inv-fr{display:grid;grid-template-columns:1fr 1fr;gap:8px}' +
  '.inv-fr4{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:8px}' +
  '.inv-date-field{display:flex;gap:6px;align-items:stretch}' +
  '.inv-date-field .inv-fi{flex:1;min-width:0;text-align:center;direction:ltr;font-weight:700;cursor:pointer}' +
  '.inv-date-btn{width:36px;flex-shrink:0;border:none;border-radius:10px;background:#0f766e;color:#fff;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}' +
  '.inv-save{width:100%;padding:12px;border:none;border-radius:12px;background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;font-family:inherit;font-size:13.5px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:8px}' +
  '.inv-transport-row{display:flex;gap:6px;align-items:stretch}' +
  '.inv-transport-row .inv-fi{flex:1;min-width:0}' +
  '.inv-transport-btn{width:36px;flex-shrink:0;border:none;border-radius:10px;background:#10b981;color:#fff;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}' +
  '.inv-picker-field{display:flex;gap:6px;align-items:stretch}' +
  '.inv-picker-field .inv-fi{flex:1;min-width:0}' +
  '.inv-picker-btn{width:36px;flex-shrink:0;border:1.5px solid #0f766e;border-radius:10px;background:#ecfdf5;color:#0f766e;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}' +
  '.inv-picker-search{width:100%;height:34px;padding:0 32px 0 12px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:12px;font-family:inherit;background:#f8fafc;color:#0f172a;box-sizing:border-box;outline:none;background-image:url("data:image/svg+xml;charset=utf8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2364748b\' stroke-width=\'2\'%3E%3Ccircle cx=\'11\' cy=\'11\' r=\'8\'/%3E%3Cline x1=\'21\' y1=\'21\' x2=\'16.65\' y2=\'16.65\'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:left 10px center;background-size:14px}' +
  '.inv-picker-search:focus{border-color:#0f766e;background-color:#fff}' +
  '.inv-picker-list{max-height:46vh;overflow-y:auto;padding:0;margin:0 -2px}' +
  '.inv-picker-item{display:flex;align-items:center;gap:8px;padding:7px 8px;border-radius:9px;cursor:pointer;margin-bottom:1px;border:1.5px solid transparent;transition:background .12s,border-color .12s}' +
  '.inv-picker-item:active{background:#f1f5f9}' +
  '.inv-picker-item.selected{background:linear-gradient(135deg,#ecfdf5,#d1fae5);border-color:#10b981}' +
  '.inv-picker-item-ic{width:26px;height:26px;border-radius:7px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;color:#0f766e}' +
  '.inv-picker-item.selected .inv-picker-item-ic{background:#fff}' +
  '.inv-picker-item-info{flex:1;min-width:0}' +
  '.inv-picker-item-name{font-size:11.5px;font-weight:800;color:#0f172a;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.25}' +
  '.inv-picker-item-meta{display:flex;align-items:center;gap:6px;font-size:9.5px;color:#64748b;font-weight:700;margin-top:1px;line-height:1.2}' +
  '.inv-picker-item-price{color:#059669;font-weight:900}' +
  '.inv-picker-item-check{width:18px;height:18px;border-radius:50%;border:1.5px solid #cbd5e1;background:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:transparent;flex-shrink:0;transition:all .15s}' +
  '.inv-picker-item.selected .inv-picker-item-check{background:#10b981;border-color:#10b981;color:#fff}' +
  '.inv-picker-empty{text-align:center;padding:28px 20px;color:#94a3b8;font-size:12px;font-weight:600}' +
  '.inv-picker-add{margin-top:6px;padding:9px 12px;background:linear-gradient(135deg,#ecfdf5,#d1fae5);border:1.5px dashed #10b981;border-radius:9px;text-align:center;font-size:11.5px;font-weight:800;color:#065f46;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px}' +
  '.inv-picker-count{font-size:9.5px;color:#94a3b8;font-weight:700;text-align:center;padding:6px 0 2px}' +
  '.inv-row{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#f1f5f9;border-radius:12px;border-right:3px solid #06b6d4;margin-bottom:6px}' +
  '.inv-row.locked{border-right-color:#10b981;background:linear-gradient(90deg,#ecfdf5 0%,#f1f5f9 30%)}' +
  '.inv-row.warn{border-right-color:#f59e0b}' +
  '.inv-row.danger{border-right-color:#ef4444}' +
  '.inv-row-ic{width:32px;height:32px;border-radius:8px;background:#ecfeff;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}' +
  '.inv-row-info{flex:1;min-width:0}' +
  '.inv-row-n{font-size:12.5px;font-weight:800}' +
  '.inv-row-u{font-size:10px;color:#64748b;font-weight:600;margin-top:1px}' +
  '.inv-row-val{font-size:14px;font-weight:900;color:#0f766e;flex-shrink:0}' +
  '.inv-row.warn .inv-row-val{color:#f59e0b}' +
  '.inv-row.danger .inv-row-val{color:#ef4444}' +
  '.inv-row-acts{display:flex;gap:4px;flex-shrink:0}' +
  '.inv-row-btn{width:30px;height:30px;border-radius:8px;border:none;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center}' +
  '.inv-row-btn.edit{background:#eff6ff;color:#1e40af}' +
  '.inv-row-btn.delete{background:#fef2f2;color:#ef4444}' +
  '.inv-row-btn.lock{background:#ecfdf5;color:#10b981}' +
  '.inv-row-btn.unlock{background:#fffbeb;color:#f59e0b}' +
  '.inv-cat-list{display:flex;flex-direction:column;gap:6px;max-height:55vh;overflow-y:auto;padding:2px}' +
  '.inv-cat-row{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#f1f5f9;border-radius:12px;border-right:3px solid #06b6d4;margin-bottom:6px}' +
  '.inv-cat-row.locked{border-right-color:#10b981;background:linear-gradient(90deg,#ecfdf5 0%,#f1f5f9 30%)}' +
  '.inv-cat-ic{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;color:#fff}' +
  '.inv-cat-info{flex:1;min-width:0}' +
  '.inv-cat-n{font-size:12.5px;font-weight:800}' +
  '.inv-cat-u{font-size:10px;color:#64748b;font-weight:600;margin-top:1px}' +
  '.inv-cat-acts{display:flex;gap:4px;flex-shrink:0}' +
  '.inv-color-picker{display:flex;gap:6px;flex-wrap:wrap;padding:6px;background:#f1f5f9;border-radius:10px}' +
  '.inv-color-opt{width:28px;height:28px;border-radius:50%;cursor:pointer;border:2.5px solid transparent;box-sizing:border-box}' +
  '.inv-color-opt.on{border-color:#fff;box-shadow:0 0 0 1.5px #0f172a;transform:scale(1.1)}' +
  '.inv-icon-picker{display:flex;gap:4px;flex-wrap:wrap;padding:6px;background:#f1f5f9;border-radius:10px}' +
  '.inv-icon-opt{width:34px;height:34px;border-radius:8px;cursor:pointer;border:2px solid transparent;display:flex;align-items:center;justify-content:center;font-size:17px;background:#fff;box-sizing:border-box}' +
  '.inv-icon-opt.on{border-color:#0f766e;background:#ecfdf5}' +
  '.inv-name-hint{font-size:10.5px;font-weight:700;padding:6px 10px;border-radius:8px;margin-bottom:8px;line-height:1.5;border-right:3px solid}' +
  '.inv-btn{width:100%;padding:11px;border:none;border-radius:12px;font-size:13px;font-weight:800;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px}' +
  '.inv-btn-s{background:#f1f5f9;color:#0f172a}' +
  '.inv-btn-p{background:#0f766e;color:#fff}' +
  '.inv-btn-g{background:#10b981;color:#fff}' +
  '.inv-btn-pu{background:linear-gradient(135deg,#8b5cf6,#a855f7);color:#fff}' +
  '.inv-info-box{background:#eff6ff;color:#1e40af;padding:10px 12px;border-radius:12px;font-size:11px;font-weight:700;margin-bottom:12px;line-height:1.7;border-right:3px solid #3b82f6}' +
  '.inv-mgr-cat-badge{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:9999px;font-size:10.5px;font-weight:900;margin-bottom:10px}';

  var s = document.createElement('style');
  s.id = 'inv-styles';
  s.textContent = css;
  document.head.appendChild(s);
}

/* ═══════ Render Page ═══════ */
function renderPage(){
  ensureVehicleDefaults();
  var inv = getTransactions();

  var inList = [], outList = [], wasteList = [];
  for(var i = 0; i < inv.length; i++){
    if(inv[i].kind === 'inv_in') inList.push(inv[i]);
    else if(inv[i].kind === 'inv_out') outList.push(inv[i]);
    else if(inv[i].kind === 'inv_waste') wasteList.push(inv[i]);
  }

  var inUnits = calcTotalsByUnit(inList);
  var outUnits = calcTotalsByUnit(outList);
  var wasteUnits = calcTotalsByUnit(wasteList);

  var valueInfo = calcTotalValueByUnit();

  /* ✅ کارت جمع مقدار (تعداد) — واحدها به صورت چیپ */
  function sumBox(cls, icon, label, unitMap){
    var keys = Object.keys(unitMap).filter(function(u){ return unitMap[u] > 0; });
    keys.sort(function(a, b){ return unitMap[b] - unitMap[a]; });

    var bigHtml = '';
    var restHtml = '';

    if(keys.length === 0){
      bigHtml = '<div class="inv-sum-big">۰</div>';
    } else if(keys.length === 1){
      bigHtml = '<div class="inv-sum-big">' + fa(unitMap[keys[0]]) + ' ' + esc(keys[0]) + '</div>';
    } else {
      bigHtml = '<div class="inv-sum-big">' + fa(keys.length) + ' واحد</div>';
      restHtml = '<div class="inv-sum-units">' +
        keys.slice(0, 3).map(function(u){
          return '<span class="inv-sum-u"><span class="inv-sum-u-lbl">' + esc(u) + ':</span> <span class="inv-sum-u-val">' + fa(unitMap[u]) + '</span></span>';
        }).join('') +
        (keys.length > 3 ? '<span class="inv-sum-u">+' + (keys.length - 3) + '</span>' : '') +
      '</div>';
    }

    return '<div class="inv-sum ' + cls + '">' +
      '<div class="inv-sum-ic">' + icon + '</div>' +
      bigHtml +
      restHtml +
      '<div class="inv-sum-l">' + label + '</div>' +
    '</div>';
  }

  /* ✅ کارت ارزش کل — به تفکیک واحد */
  function valueBox(info){
    var keys = Object.keys(info.byUnit).filter(function(u){ return info.byUnit[u] > 0; });
    keys.sort(function(a, b){ return info.byUnit[b] - info.byUnit[a]; });

    var note = '';
    if(info.totalItems === 0){
      note = 'موجودی خالی';
    } else if(info.counted === 0){
      note = 'قیمت ثبت نشده';
    } else {
      note = fa(info.counted) + ' از ' + fa(info.totalItems) + ' قلم';
    }

    if(keys.length === 0){
      return '<div class="inv-sum p">' +
        '<div class="inv-sum-ic">💰</div>' +
        '<div class="inv-sum-big">۰</div>' +
        '<div class="inv-sum-l">ارزش کل</div>' +
        '<div class="inv-sum-note">' + note + '</div>' +
      '</div>';
    }

    if(keys.length === 1){
      return '<div class="inv-sum p">' +
        '<div class="inv-sum-ic">💰</div>' +
        '<div class="inv-sum-big">' + fmtShort(info.byUnit[keys[0]]) + '</div>' +
        '<div class="inv-sum-l">ارزش (' + esc(keys[0]) + ')</div>' +
        '<div class="inv-sum-note">' + note + '</div>' +
      '</div>';
    }

    /* چند واحد → چیپ‌های رنگی */
    var chipsHtml = '<div class="inv-sum-units">' +
      keys.slice(0, 3).map(function(u){
        return '<span class="inv-sum-u"><span class="inv-sum-u-lbl">' + esc(u) + ':</span> <span class="inv-sum-u-val">' + fmtShort(info.byUnit[u]) + '</span></span>';
      }).join('') +
      (keys.length > 3 ? '<span class="inv-sum-u">+' + (keys.length - 3) + '</span>' : '') +
    '</div>';

    return '<div class="inv-sum p">' +
      '<div class="inv-sum-ic">💰</div>' +
      '<div class="inv-sum-big">' + fmtShort(info.total) + '</div>' +
      '<div class="inv-sum-l">ارزش کل · ' + fa(keys.length) + ' واحد</div>' +
      chipsHtml +
      '<div class="inv-sum-note">' + note + '</div>' +
    '</div>';
  }

  return '<div class="page inv-page" data-inv-root>' +
    '<div class="inv-header">' +
      '<div><div class="inv-title">📦 موجودی و تراکنش‌ها</div>' +
      '<div class="inv-sub">' + fa(inv.length) + ' رکورد • امروز ' + todayStr + '</div></div>' +
      '<button class="inv-action-btn" data-inv="open-form">➕ <span>ثبت تراکنش</span></button>' +
    '</div>' +

    '<div class="inv-summary">' +
      sumBox('g', '📥', 'ورودی', inUnits) +
      sumBox('b', '📤', 'خروجی', outUnits) +
      sumBox('o', '🗑️', 'ضایعات', wasteUnits) +
      valueBox(valueInfo) +
    '</div>' +

    '<div class="inv-tabs">' +
      '<button class="inv-tab ' + (_filter === 'all' ? 'on' : '') + '" data-inv="filter" data-f="all">همه</button>' +
      '<button class="inv-tab ' + (_filter === 'in' ? 'on' : '') + '" data-inv="filter" data-f="in">📥 ورود</button>' +
      '<button class="inv-tab ' + (_filter === 'out' ? 'on' : '') + '" data-inv="filter" data-f="out">📤 خروج</button>' +
      '<button class="inv-tab ' + (_filter === 'waste' ? 'on' : '') + '" data-inv="filter" data-f="waste">🗑️ ضایعات</button>' +
      '<button class="inv-tab ' + (_filter === 'stock' ? 'on' : '') + '" data-inv="filter" data-f="stock">📊 موجودی</button>' +
    '</div>' +

    (_filter !== 'stock' ?
      '<div class="inv-group-tabs">' +
        '<button class="inv-gt ' + (_groupBy === 'none' ? 'on' : '') + '" data-inv="set-group" data-g="none">📋 بدون گروه</button>' +
        '<button class="inv-gt ' + (_groupBy === 'category' ? 'on' : '') + '" data-inv="set-group" data-g="category">🏷️ دسته</button>' +
        '<button class="inv-gt ' + (_groupBy === 'date' ? 'on' : '') + '" data-inv="set-group" data-g="date">📅 تاریخ</button>' +
        '<button class="inv-gt ' + (_groupBy === 'item' ? 'on' : '') + '" data-inv="set-group" data-g="item">📦 کالا</button>' +
      '</div>' : '') +

    '<div data-inv-list>' + renderListInner(inv) + '</div>' +
  '</div>';
}

function renderListInner(items){
  if(_filter === 'stock') return renderStockView();

  var list = items.slice();
  if(_filter === 'in') list = list.filter(function(t){ return t.kind === 'inv_in'; });
  else if(_filter === 'out') list = list.filter(function(t){ return t.kind === 'inv_out'; });
  else if(_filter === 'waste') list = list.filter(function(t){ return t.kind === 'inv_waste'; });

  if(!list.length){
    return '<div class="inv-empty">' +
      '<div class="inv-empty-ic">📦</div>' +
      '<div class="inv-empty-t">هنوز تراکنشی ثبت نشده</div>' +
      '<div class="inv-empty-x">اولین ورود یا خروج کالا رو ثبت کن</div>' +
      '<button class="inv-action-btn" style="margin:0 auto" data-inv="open-form">➕ ثبت تراکنش</button>' +
    '</div>';
  }

  if(_groupBy === 'none'){
    return renderFlatList(list);
  }

  return renderGroupedList(list);
}

function renderFlatList(list){
  list.sort(function(a, b){ return jToC(b.date) - jToC(a.date); });

  var total = list.length;
  var limit = _showAll ? total : Math.min(total, PAGE_SIZE);
  var visible = list.slice(0, limit);

  var out = '';
  for(var i = 0; i < visible.length; i++) out += renderCard(visible[i]);

  if(total > PAGE_SIZE){
    if(!_showAll){
      var remaining = total - PAGE_SIZE;
      out += '<button class="inv-show-more" data-inv="show-more">' +
        '<span class="inv-show-more-ic">▼</span>' +
        '<span>نمایش موردهای بیشتر</span>' +
        '<span class="inv-show-more-count">' + fa(remaining) + ' مورد</span>' +
      '</button>';
    } else {
      out += '<button class="inv-show-less" data-inv="show-less">' +
        '▲ نمایش کمتر (اولین ' + fa(PAGE_SIZE) + ' مورد)' +
      '</button>';
    }
  }
  return out;
}

function renderGroupedList(list){
  var groups = {};
  for(var i = 0; i < list.length; i++){
    var t = list[i];
    var key;
    if(_groupBy === 'category') key = t.category || 'بدون دسته';
    else if(_groupBy === 'date') key = t.date || 'بدون تاریخ';
    else if(_groupBy === 'item') key = t.item || 'بدون نام';
    else key = 'سایر';

    if(!groups[key]) groups[key] = [];
    groups[key].push(t);
  }

  var keys = Object.keys(groups);
  if(_groupBy === 'date'){
    keys.sort(function(a, b){ return jToC(b) - jToC(a); });
  } else {
    keys.sort(function(a, b){
      var c = groups[b].length - groups[a].length;
      if(c !== 0) return c;
      return String(a).localeCompare(String(b), 'fa');
    });
  }

  var totalGroups = keys.length;
  var limitGroups = _showAll ? totalGroups : Math.min(totalGroups, PAGE_SIZE);
  var visibleKeys = keys.slice(0, limitGroups);

  var out = '';
  for(var k = 0; k < visibleKeys.length; k++){
    var key = visibleKeys[k];
    var grpItems = groups[key];
    grpItems.sort(function(a, b){ return jToC(b.date) - jToC(a.date); });

    var units = calcTotalsByUnit(grpItems);
    var unitsLine = formatUnitsLine(units);

    var icon = '📦';
    if(_groupBy === 'category') icon = getCatMeta(key).icon;
    else if(_groupBy === 'date') icon = '📅';
    else if(_groupBy === 'item') icon = '🏷️';

    var isExpanded = _expandedGroupsSet[key] === true;
    var expandClass = isExpanded ? 'expanded' : '';

    var showAllItems = _expandedGroupItems[key] === true;
    var itemsLimit = showAllItems ? grpItems.length : Math.min(grpItems.length, GROUP_ITEM_PREVIEW);
    var visibleItems = grpItems.slice(0, itemsLimit);

    var cardsHtml = '';
    for(var m = 0; m < visibleItems.length; m++) cardsHtml += renderCard(visibleItems[m]);

    if(grpItems.length > GROUP_ITEM_PREVIEW){
      if(!showAllItems){
        var remainingInGroup = grpItems.length - GROUP_ITEM_PREVIEW;
        cardsHtml += '<button class="inv-show-more" data-inv="show-more-in-group" data-key="' + esc(key) + '">' +
          '<span class="inv-show-more-ic">▼</span>' +
          '<span>نمایش بیشتر</span>' +
          '<span class="inv-show-more-count">' + fa(remainingInGroup) + ' مورد</span>' +
        '</button>';
      } else {
        cardsHtml += '<button class="inv-show-less" data-inv="show-less-in-group" data-key="' + esc(key) + '">' +
          '▲ نمایش کمتر' +
        '</button>';
      }
    }

    out += '<div class="inv-group ' + expandClass + '" data-gkey="' + esc(key) + '">' +
      '<div class="inv-group-hd" data-inv="toggle-group" data-key="' + esc(key) + '">' +
        '<div class="inv-group-ic">' + icon + '</div>' +
        '<div class="inv-group-info">' +
          '<div class="inv-group-t">' + esc(key) + '</div>' +
          '<div class="inv-group-s">' + fa(grpItems.length) + ' رکورد · ' + unitsLine + '</div>' +
        '</div>' +
        '<div class="inv-group-arrow">▼</div>' +
      '</div>' +
      '<div class="inv-group-bd">' + cardsHtml + '</div>' +
    '</div>';
  }

  if(totalGroups > PAGE_SIZE){
    if(!_showAll){
      var remainingGrp = totalGroups - PAGE_SIZE;
      out += '<button class="inv-show-more" data-inv="show-more">' +
        '<span class="inv-show-more-ic">▼</span>' +
        '<span>نمایش گروه‌های بیشتر</span>' +
        '<span class="inv-show-more-count">' + fa(remainingGrp) + ' گروه</span>' +
      '</button>';
    } else {
      out += '<button class="inv-show-less" data-inv="show-less">' +
        '▲ نمایش کمتر (اولین ' + fa(PAGE_SIZE) + ' گروه)' +
      '</button>';
    }
  }

  return out;
}

function renderCard(t){
  var isIn = t.kind === 'inv_in';
  var isOut = t.kind === 'inv_out';
  var total = (t.qty || 0) * (t.price || 0);
  var label = isIn ? 'ورود' : isOut ? 'خروج' : 'ضایعات';
  var icon = isIn ? '📥' : isOut ? '📤' : '🗑️';
  var badgeCls = isIn ? 'in' : isOut ? 'out' : 'waste';
  var bColor = isIn ? '#10b981' : isOut ? '#ef4444' : '#f59e0b';
  var isOpen = !!_expanded[sid(t.id)];
  var meta = getCatMeta(t.category);

  var stats =
    '<span class="inv-stat ' + (isIn ? 'g' : 'r') + '">' + (isIn ? '+' : '−') + ' <strong>' + fa(t.qty || 0) + '</strong> ' + esc(t.unit || '') + '</span>' +
    (t.price ? '<span class="inv-stat b">💰 <strong>' + fmtShort(t.price) + '</strong></span>' : '');

  var transportChips = '';
  if(t.transportVehicle) transportChips += '<span class="inv-chip transport">🚚 ' + esc(t.transportVehicle) + '</span>';
  if(t.transportCost) transportChips += '<span class="inv-chip transport">💰 ' + fmtShort(t.transportCost) + '</span>';

  var expiryChip = '';
  if(t.expiry){
    var isExpired = jToC(t.expiry) < jToC(todayStr);
    expiryChip = '<span class="inv-chip ' + (isExpired ? 'expired' : 'expiry') + '">📅 ' +
      (isExpired ? '⚠️ منقضی: ' : 'انقضا: ') + esc(t.expiry) + '</span>';
  }

  return '<div class="inv-card ' + (isOpen ? 'expanded' : '') + '" data-iid="' + sid(t.id) + '" style="border-right-color:' + (meta.isMed ? meta.color : bColor) + '">' +
    '<div class="inv-card-hd" data-inv="toggle" data-id="' + sid(t.id) + '">' +
      '<div class="inv-hd-content">' +
        '<div class="inv-hd-row1">' +
          '<span class="inv-hd-ic">' + (meta.isMed ? meta.icon : icon) + '</span>' +
          '<div class="inv-hd-name">' + esc(t.item || t.category || '—') + '</div>' +
          '<span class="inv-type-badge ' + badgeCls + '">' + label + '</span>' +
        '</div>' +
        '<div class="inv-hd-row2">' + stats + '</div>' +
      '</div>' +
      '<button class="inv-toggle" type="button">▼</button>' +
    '</div>' +
    '<div class="inv-card-bd">' +
      '<div class="inv-grid">' +
        '<div class="inv-box b"><div class="inv-box-l">📅 تاریخ</div><div class="inv-box-v">' + esc(t.date || '—') + '</div></div>' +
        '<div class="inv-box g"><div class="inv-box-l">💰 ارزش</div><div class="inv-box-v">' + fmtShort(total) + '</div></div>' +
        '<div class="inv-box o"><div class="inv-box-l">💵 قیمت واحد</div><div class="inv-box-v">' + fa(t.price || 0) + '</div></div>' +
      '</div>' +
      '<div class="inv-chips">' +
        '<span class="inv-chip date">📅 ' + esc(t.date) + '</span>' +
        (t.category ? '<span class="inv-chip">' + meta.icon + ' ' + esc(t.category) + '</span>' : '') +
        (t.supplier ? '<span class="inv-chip sup">🏪 ' + esc(t.supplier) + '</span>' : '') +
        transportChips + expiryChip +
      '</div>' +
      (t.notes ? '<div class="inv-note"><span class="inv-note-l">📝 یادداشت:</span>' + esc(t.notes) + '</div>' : '') +
      '<div class="inv-actions">' +
        '<button class="inv-act-edit" data-inv="edit" data-id="' + sid(t.id) + '">✏️ ویرایش</button>' +
        '<button class="inv-act-copy" data-inv="copy" data-id="' + sid(t.id) + '">📋 کپی</button>' +
        '<button class="inv-act-del" data-inv="del" data-id="' + sid(t.id) + '">🗑️ حذف</button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function renderStockView(){
  var stock = getStockMap();
  var items = [];
  Object.keys(stock).forEach(function(k){ items.push(stock[k]); });
  items.sort(function(a, b){ return (b.qty || 0) - (a.qty || 0); });

  if(!items.length){
    return '<div class="inv-empty">' +
      '<div class="inv-empty-ic">📊</div>' +
      '<div class="inv-empty-t">موجودی خالیه</div>' +
      '<div class="inv-empty-x">اول کالا وارد انبار کن</div>' +
    '</div>';
  }

  var total = items.length;
  var limit = _showAll ? total : Math.min(total, PAGE_SIZE);
  var visible = items.slice(0, limit);

  var out = '';
  for(var i = 0; i < visible.length; i++){
    var s = visible[i];
    var isLow = s.qty <= 0;
    var isWarn = s.qty < 50 && s.qty > 0;
    var cls = isLow ? 'danger' : (isWarn ? 'warn' : '');
    var meta = getCatMeta(s.category);
    out += '<div class="inv-row ' + cls + '">' +
      '<div class="inv-row-ic">' + (isLow ? '⚠️' : meta.icon) + '</div>' +
      '<div class="inv-row-info">' +
        '<div class="inv-row-n">' + esc(s.item) + '</div>' +
        '<div class="inv-row-u">' + esc(s.category || '—') + ' • 💰 ' + fa(s.lastPrice || 0) + ' تومان/' + esc(s.unit || '') + '</div>' +
      '</div>' +
      '<div style="text-align:left;flex-shrink:0">' +
        '<div class="inv-row-val">' + fa(s.qty || 0) + '</div>' +
        '<div style="font-size:10px;color:#64748b;font-weight:700">' + esc(s.unit || '') + '</div>' +
      '</div>' +
    '</div>';
  }

  if(total > PAGE_SIZE){
    if(!_showAll){
      var remaining = total - PAGE_SIZE;
      out += '<button class="inv-show-more" data-inv="show-more">' +
        '<span class="inv-show-more-ic">▼</span>' +
        '<span>نمایش موردهای بیشتر</span>' +
        '<span class="inv-show-more-count">' + fa(remaining) + ' قلم</span>' +
      '</button>';
    } else {
      out += '<button class="inv-show-less" data-inv="show-less">' +
        '▲ نمایش کمتر (اولین ' + fa(PAGE_SIZE) + ' قلم)' +
      '</button>';
    }
  }

  return out;
}

/* ═══════ Options ═══════ */
function unitOptions(cur){
  var units = getUnits();
  var out = '';
  for(var i = 0; i < units.length; i++){
    var u = units[i];
    out += '<option value="' + esc(u.name) + '" ' + (cur === u.name ? 'selected' : '') + '>' + esc(u.name) + '</option>';
  }
  return out;
}
function categoryOptions(cur){
  var cats = getCategories();
  var out = '';
  for(var i = 0; i < cats.length; i++){
    var c = cats[i];
    out += '<option value="' + esc(c.name) + '" ' + (cur === c.name ? 'selected' : '') + '>' + (c.icon || '📦') + ' ' + esc(c.name) + '</option>';
  }
  return out;
}

function renderNameField(catName, currentValue){
  var meta = getCatMeta(catName);
  var hintBox = '';
  if(meta.hint){
    hintBox = '<div class="inv-name-hint" style="background:' + meta.color + '11;color:' + meta.color + ';border-right-color:' + meta.color + '">' +
      meta.hint +
    '</div>';
  }
  var btnStyle = meta.isMed
    ? 'border-color:#8b5cf6;background:#f5f3ff;color:#8b5cf6'
    : 'border-color:' + meta.color + ';background:' + meta.color + '11;color:' + meta.color;

  return hintBox +
    '<div class="inv-fg">' +
      '<label class="inv-fl">' + meta.icon + ' ' + meta.label + ' <span class="inv-req">*</span>' +
        '<span class="inv-fl-hint" data-inv="open-name-mgr">مدیریت</span>' +
      '</label>' +
      '<div class="inv-picker-field">' +
        '<input class="inv-fi" type="text" id="iv-item" placeholder="' + meta.placeholder + '" ' +
          'value="' + (currentValue ? esc(currentValue) : '') + '" autocomplete="off">' +
        '<button type="button" class="inv-picker-btn" data-inv="open-name-picker" style="' + btnStyle + '">' +
          (meta.isMed ? '💊' : '📋') +
        '</button>' +
      '</div>' +
    '</div>';
}

/* ═══════ Form ═══════ */
function openForm(id){
  editingInvId = id ? sid(id) : null;
  var edit = id ? Store.find('transactions', id) : null;
  var transType = edit ? (edit.kind === 'inv_out' ? 'out' : edit.kind === 'inv_waste' ? 'waste' : 'in') : 'in';
  var initCat = edit ? (edit.category || '') : '';
  if(!initCat){
    var cats = getCategories();
    initCat = cats.length ? cats[0].name : '';
  }

  var transportCostVal = (edit && edit.transportCost) ? Number(edit.transportCost).toLocaleString('en-US') : '';
  var transportVehicle = edit ? (edit.transportVehicle || '') : '';

  var vehicleList = getVehicles();
  var vehicleDatalist = '<datalist id="iv-transport-vehicles">' +
    vehicleList.map(function(v){ return '<option value="' + esc(v.name) + '">'; }).join('') +
  '</datalist>';

  var html = '<div class="inv-modal-hd">' +
    '<div class="inv-modal-t">' + (id ? '✏️ ویرایش تراکنش' : '📦 تراکنش انبار') + '</div>' +
    '<button class="inv-modal-x" data-inv="close-modal" data-mid="inv-form">✕</button>' +
  '</div>' +

  '<div class="inv-sec">' +
    '<div class="inv-sec-hd"><div class="inv-sec-ic" style="background:#f0fdfa">📋</div>' +
    '<div><div class="inv-sec-t" style="color:#0f766e">اطلاعات پایه</div></div></div>' +
    '<div class="inv-fr">' +
      '<div class="inv-fg"><label class="inv-fl">📅 تاریخ <span class="inv-req">*</span></label>' +
        '<div class="inv-date-field"><input class="inv-fi" type="text" id="iv-date" readonly value="' + (edit ? esc(edit.date) : todayStr) + '">' +
        '<button type="button" class="inv-date-btn" data-inv="open-cal" data-target="iv-date">📅</button></div></div>' +
      '<div class="inv-fg"><label class="inv-fl">📋 نوع <span class="inv-req">*</span></label>' +
        '<select class="inv-fs" id="iv-type">' +
          '<option value="in" ' + (transType === 'in' ? 'selected' : '') + '>📥 ورود</option>' +
          '<option value="out" ' + (transType === 'out' ? 'selected' : '') + '>📤 خروج</option>' +
          '<option value="waste" ' + (transType === 'waste' ? 'selected' : '') + '>🗑️ ضایعات</option>' +
        '</select></div>' +
    '</div>' +
  '</div>' +

  '<div class="inv-sec">' +
    '<div class="inv-sec-hd"><div class="inv-sec-ic" style="background:#eff6ff">🏷️</div>' +
    '<div><div class="inv-sec-t" style="color:#3b82f6">دسته‌بندی و کالا</div></div></div>' +
    '<div class="inv-fg"><label class="inv-fl">🏷️ دسته‌بندی <span class="inv-req">*</span>' +
      '<span class="inv-fl-hint" data-inv="open-cat-mgr">مدیریت دسته‌ها</span>' +
      '</label>' +
      '<select class="inv-fs" id="iv-category">' + categoryOptions(initCat) + '</select></div>' +
    '<div id="ivNameFieldBox">' + renderNameField(initCat, edit ? (edit.item || '') : '') + '</div>' +
  '</div>' +

  '<div class="inv-sec">' +
    '<div class="inv-sec-hd"><div class="inv-sec-ic" style="background:#ecfdf5">🔢</div>' +
    '<div><div class="inv-sec-t" style="color:#10b981">مقدار و قیمت</div></div></div>' +
    '<div class="inv-fr4">' +
      '<div class="inv-fg"><label class="inv-fl">🔢 مقدار <span class="inv-req">*</span></label>' +
        '<input class="inv-fi" type="number" id="iv-qty" value="' + (edit ? edit.qty || '' : '') + '"></div>' +
      '<div class="inv-fg"><label class="inv-fl">⚖️ واحد</label>' +
        '<select class="inv-fs" id="iv-unit">' + unitOptions(edit ? edit.unit : '') + '</select></div>' +
      '<div class="inv-fg"><label class="inv-fl">💰 قیمت</label>' +
        '<input class="inv-fi" type="text" inputmode="numeric" id="iv-price" value="' + (edit && edit.price ? Number(edit.price).toLocaleString('en-US') : '') + '"></div>' +
    '</div>' +
  '</div>' +

  '<div class="inv-sec">' +
    '<div class="inv-sec-hd"><div class="inv-sec-ic" style="background:#fffbeb">🚚</div>' +
    '<div><div class="inv-sec-t" style="color:#f59e0b">حمل و نقل</div></div></div>' +
    '<div class="inv-fg"><label class="inv-fl">🚚 وسیله نقلیه <span class="inv-fl-hint" data-inv="open-vehicle-mgr">مدیریت</span></label>' +
      '<div class="inv-transport-row">' +
        '<input class="inv-fi" type="text" id="iv-transport-vehicle" list="iv-transport-vehicles" placeholder="مثلاً: تیبا، پست..." value="' + esc(transportVehicle) + '" autocomplete="off">' +
        '<button type="button" class="inv-transport-btn" data-inv="open-add-vehicle" title="افزودن سریع">➕</button>' +
      '</div>' + vehicleDatalist +
    '</div>' +
    '<div class="inv-fg"><label class="inv-fl">💰 هزینه حمل <span class="inv-hint">تومان</span></label>' +
      '<input class="inv-fi" type="text" inputmode="numeric" id="iv-transport-cost" value="' + transportCostVal + '"></div>' +
  '</div>' +

  '<div class="inv-sec">' +
    '<div class="inv-sec-hd"><div class="inv-sec-ic" style="background:#eff6ff">🏪</div>' +
    '<div><div class="inv-sec-t" style="color:#3b82f6">تأمین‌کننده و انقضا</div></div></div>' +
    '<div class="inv-fr">' +
      '<div class="inv-fg"><label class="inv-fl">🏪 تأمین‌کننده</label>' +
        '<input class="inv-fi" type="text" id="iv-supplier" value="' + (edit ? esc(edit.supplier || '') : '') + '"></div>' +
      '<div class="inv-fg"><label class="inv-fl">📅 انقضا</label>' +
        '<div class="inv-date-field"><input class="inv-fi" type="text" id="iv-expiry" readonly value="' + (edit ? esc(edit.expiry || '') : '') + '">' +
        '<button type="button" class="inv-date-btn" data-inv="open-cal" data-target="iv-expiry">📅</button></div></div>' +
    '</div>' +
  '</div>' +

  '<div class="inv-sec">' +
    '<div class="inv-sec-hd"><div class="inv-sec-ic" style="background:#f5f3ff">📝</div>' +
    '<div><div class="inv-sec-t" style="color:#8b5cf6">یادداشت</div></div></div>' +
    '<textarea class="inv-ft" id="iv-notes">' + (edit ? esc(edit.notes || '') : '') + '</textarea>' +
  '</div>' +

  '<button class="inv-save" data-inv="save">💾 ذخیره</button>';

  openModal('inv-form', html);
}

function updateNameFieldByCat(){
  var catSel = document.getElementById('iv-category');
  var box = document.getElementById('ivNameFieldBox');
  if(!catSel || !box) return;
  var cat = catSel.value || '';
  var oldInput = document.getElementById('iv-item');
  var currentVal = oldInput ? oldInput.value : '';
  box.innerHTML = renderNameField(cat, currentVal);
  setTimeout(function(){
    var newInput = document.getElementById('iv-item');
    if(newInput && !currentVal) newInput.focus();
  }, 50);
}

/* ═══════════════════════════════════════════════
   مدیریت دسته‌بندی
   ═══════════════════════════════════════════════ */
function renderCatListInner(){
  var cats = getCategories();
  if(!cats.length){
    return '<div style="text-align:center;padding:24px;background:#f1f5f9;border-radius:12px;font-size:12px;color:#64748b;font-weight:700">هنوز دسته‌ای نیست</div>';
  }
  var out = '';
  var inv = getTransactions();
  for(var i = 0; i < cats.length; i++){
    var c = cats[i];
    var used = 0;
    for(var j = 0; j < inv.length; j++){
      if(inv[j].category === c.name) used++;
    }
    var cls = 'inv-cat-row' + (c.isLocked ? ' locked' : '');
    var acts = c.isLocked
      ? '<button class="inv-row-btn unlock" data-inv="unlock-cat" data-id="' + sid(c.id) + '">🔓</button>'
      : '<button class="inv-row-btn edit" data-inv="edit-cat" data-id="' + sid(c.id) + '">✏️</button>' +
        '<button class="inv-row-btn lock" data-inv="lock-cat" data-id="' + sid(c.id) + '">🔒</button>' +
        '<button class="inv-row-btn delete" data-inv="del-cat" data-id="' + sid(c.id) + '">🗑️</button>';

    out += '<div class="' + cls + '" style="border-right-color:' + (c.color || '#06b6d4') + '">' +
      '<div class="inv-cat-ic" style="background:' + (c.color || '#06b6d4') + '">' + (c.isLocked ? '🔒' : (c.icon || '📦')) + '</div>' +
      '<div class="inv-cat-info">' +
        '<div class="inv-cat-n">' + esc(c.name) + (c.isLocked ? ' <span style="font-size:9px;color:#10b981">🔒</span>' : '') + '</div>' +
        '<div class="inv-cat-u">' + fa(used) + ' تراکنش</div>' +
      '</div>' +
      '<div class="inv-cat-acts">' + acts + '</div>' +
    '</div>';
  }
  return out;
}

function openCatManager(){
  var html = '<div class="inv-modal-hd">' +
    '<div class="inv-modal-t">🏷️ مدیریت دسته‌بندی‌ها</div>' +
    '<button class="inv-modal-x" data-inv="close-modal" data-mid="inv-cat-mgr">✕</button>' +
  '</div>' +
  '<div class="inv-info-box">💡 دسته‌ها برای گروه‌بندی کالاها هستن. هر دسته فیلد نام و مدیریت آیتم اختصاصی خودش رو داره.</div>' +
  '<button class="inv-btn inv-btn-pu" data-inv="open-add-cat" style="margin-bottom:12px">➕ افزودن دسته جدید</button>' +
  '<div id="invCatList" class="inv-cat-list">' + renderCatListInner() + '</div>';

  var ex = _modals['inv-cat-mgr'];
  if(ex){ try{ ex.remove(); }catch(e){} delete _modals['inv-cat-mgr']; }
  openModal('inv-cat-mgr', html);
}

function refreshCatMgr(){
  var el = document.getElementById('invCatList');
  if(el) el.innerHTML = renderCatListInner();
  var sel = document.getElementById('iv-category');
  if(sel){
    var cur = sel.value;
    sel.innerHTML = categoryOptions(cur);
  }
}

function openCatEdit(id){
  editingCatId = id ? sid(id) : null;
  var c = id ? Store.find('categories', id) : null;
  if(c && c.isLocked){ toast('🔒', 'error'); return; }

  _selectedCatColor = c ? (c.color || '#06b6d4') : '#06b6d4';
  var colors = ['#06b6d4', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#3b82f6', '#ec4899', '#0f766e'];
  var icons = ['📦', '💊', '🌾', '🔧', '🧪', '🍗', '🥚', '🐔', '💉', '🧴', '🧰', '📌'];

  var colorsHtml = '';
  for(var ci = 0; ci < colors.length; ci++){
    colorsHtml += '<div class="inv-color-opt ' + (colors[ci] === _selectedCatColor ? 'on' : '') + '" data-color="' + colors[ci] + '" style="background:' + colors[ci] + '"></div>';
  }
  var iconsHtml = '';
  for(var ii = 0; ii < icons.length; ii++){
    iconsHtml += '<div class="inv-icon-opt ' + (c && c.icon === icons[ii] ? 'on' : '') + '" data-icon="' + icons[ii] + '">' + icons[ii] + '</div>';
  }

  var html = '<div class="inv-modal-hd">' +
    '<div class="inv-modal-t">' + (id ? '✏️ ویرایش دسته' : '🏷️ دسته جدید') + '</div>' +
    '<button class="inv-modal-x" data-inv="close-modal" data-mid="inv-cat-edit">✕</button>' +
  '</div>' +
  '<div class="inv-fg"><label class="inv-fl">📝 نام دسته <span class="inv-req">*</span></label>' +
    '<input class="inv-fi" type="text" id="edCatName" placeholder="مثلاً: دارو، خوراک، تجهیزات، سایر" value="' + (c ? esc(c.name) : '') + '"></div>' +
  '<div class="inv-fg"><label class="inv-fl">🎨 آیکون</label>' +
    '<div class="inv-icon-picker" id="invCatIconPicker">' + iconsHtml + '</div></div>' +
  '<div class="inv-fg"><label class="inv-fl">🌈 رنگ</label>' +
    '<div class="inv-color-picker" id="invCatColorPicker">' + colorsHtml + '</div></div>' +
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">' +
    '<button class="inv-btn inv-btn-s" data-inv="close-modal" data-mid="inv-cat-edit">انصراف</button>' +
    '<button class="inv-btn inv-btn-pu" data-inv="save-cat">💾 ذخیره</button>' +
  '</div>';

  openModal('inv-cat-edit', html, { sheet: true });
}

function saveCatEdit(){
  var nameInput = document.getElementById('edCatName');
  var name = (nameInput.value || '').trim();
  if(!name){ toast('❌ نام اجباری', 'error'); nameInput.focus(); return; }

  var all = getCategories();
  for(var i = 0; i < all.length; i++){
    if(all[i].name.trim() === name && !sameId(all[i].id, editingCatId)){
      toast('⚠️ این نام قبلاً هست', 'error');
      return;
    }
  }

  var iconEl = document.querySelector('#invCatIconPicker .inv-icon-opt.on');
  var icon = iconEl ? iconEl.dataset.icon : '📦';

  if(editingCatId){
    var existing = Store.find('categories', editingCatId);
    if(existing){
      var oldName = existing.name;
      if(oldName !== name){
        var inv = getTransactions();
        for(var k = 0; k < inv.length; k++){
          if(inv[k].category === oldName){
            Store.update('transactions', inv[k].id, { category: name });
          }
        }
        var items = getItems();
        for(k = 0; k < items.length; k++){
          if(items[k].category === oldName){
            Store.update('items', items[k].id, { category: name });
          }
        }
      }
      Store.update('categories', editingCatId, {
        name: name, color: _selectedCatColor, icon: icon
      });
    }
    toast('✅ دسته ویرایش شد', 'success');
  } else {
    Store.add('categories', {
      name: name, color: _selectedCatColor, icon: icon,
      scope: 'inventory', isLocked: false, createdAt: Date.now()
    });
    toast('✅ دسته اضافه شد', 'success');
  }

  closeModal('inv-cat-edit');
  refreshCatMgr();
  renderRoot();
  editingCatId = null;
}

function lockCat(id){
  var c = Store.find('categories', id);
  if(!c || c.isLocked) return;
  if(!confirm('دسته «' + c.name + '» قفل شود؟')) return;
  Store.update('categories', id, { isLocked: true });
  toast('🔒');
  refreshCatMgr();
}
function unlockCat(id){
  var c = Store.find('categories', id);
  if(!c || !c.isLocked) return;
  if(!confirm('باز شود؟')) return;
  Store.update('categories', id, { isLocked: false });
  toast('🔓');
  refreshCatMgr();
}
function delCat(id){
  var c = Store.find('categories', id);
  if(!c) return;
  if(c.isLocked){ toast('🔒 قفله', 'error'); return; }
  var used = 0;
  var inv = getTransactions();
  for(var i = 0; i < inv.length; i++){
    if(inv[i].category === c.name) used++;
  }
  var msg = used > 0
    ? '⚠️ «' + c.name + '» در ' + fa(used) + ' تراکنش استفاده شده. حذف شود؟'
    : '«' + c.name + '» حذف شود؟';
  if(!confirm(msg)) return;
  Store.remove('categories', id);
  toast('🗑️');
  refreshCatMgr();
  renderRoot();
}

/* ═══════════════════════════════════════════════
   مدیریت آیتم‌ها
   ═══════════════════════════════════════════════ */
function openNameMgr(catName){
  if(!catName){ toast('❌ اول دسته‌بندی رو انتخاب کن', 'error'); return; }
  if(isMedicineCategory(catName)){ openMedMgr(); }
  else { openItemMgr(catName); }
}

function openNamePicker(catName){
  if(!catName){ toast('❌ اول دسته‌بندی رو انتخاب کن', 'error'); return; }
  if(isMedicineCategory(catName)){ openMedPicker(); }
  else { openItemPickerForCat(catName); }
}

function renderItemMgrList(catName){
  var items = getItemsByCategory(catName);
  if(!items.length){
    return '<div style="text-align:center;padding:24px;background:#f1f5f9;border-radius:12px;font-size:12px;color:#64748b;font-weight:700">هنوز آیتمی توی این دسته نیست</div>';
  }
  var meta = getCatMeta(catName);
  var out = '';
  var inv = getTransactions();
  for(var i = 0; i < items.length; i++){
    var it = items[i];
    var used = 0;
    for(var j = 0; j < inv.length; j++){
      if(inv[j].item === it.name) used++;
    }
    var cls = 'inv-cat-row' + (it.isLocked ? ' locked' : '');
    var acts = it.isLocked
      ? '<button class="inv-row-btn unlock" data-inv="unlock-item" data-id="' + sid(it.id) + '">🔓</button>'
      : '<button class="inv-row-btn edit" data-inv="edit-item" data-id="' + sid(it.id) + '">✏️</button>' +
        '<button class="inv-row-btn lock" data-inv="lock-item" data-id="' + sid(it.id) + '">🔒</button>' +
        '<button class="inv-row-btn delete" data-inv="del-item" data-id="' + sid(it.id) + '">🗑️</button>';

    out += '<div class="' + cls + '" style="border-right-color:' + meta.color + '">' +
      '<div class="inv-cat-ic" style="background:' + meta.color + '">' + (it.isLocked ? '🔒' : meta.icon) + '</div>' +
      '<div class="inv-cat-info">' +
        '<div class="inv-cat-n">' + esc(it.name) + (it.isLocked ? ' <span style="font-size:9px;color:#10b981">🔒</span>' : '') + '</div>' +
        '<div class="inv-cat-u">' + fa(used) + ' تراکنش' + (it.price ? ' • 💰 ' + fa(it.price) : '') + '</div>' +
      '</div>' +
      '<div class="inv-cat-acts">' + acts + '</div>' +
    '</div>';
  }
  return out;
}

function openItemMgr(catName){
  _mgrCat = catName;
  var meta = getCatMeta(catName);
  var html = '<div class="inv-modal-hd">' +
    '<div class="inv-modal-t">' + meta.icon + ' مدیریت آیتم‌های «' + esc(catName) + '»</div>' +
    '<button class="inv-modal-x" data-inv="close-modal" data-mid="inv-item-mgr">✕</button>' +
  '</div>' +
  '<div class="inv-mgr-cat-badge" style="background:' + meta.color + '22;color:' + meta.color + '">' + meta.icon + ' دسته: ' + esc(catName) + '</div>' +
  '<div class="inv-info-box">💡 می‌تونی آیتم اضافه کنی، اسمش رو ویرایش کنی، قفلش کنی یا حذفش کنی.</div>' +
  '<div class="inv-fg">' +
    '<label class="inv-fl">➕ افزودن سریع</label>' +
    '<div class="inv-picker-field">' +
      '<input class="inv-fi" type="text" id="invNewItemName" placeholder="' + meta.placeholder + '">' +
      '<button type="button" class="inv-picker-btn" data-inv="add-item-quick" style="border-color:' + meta.color + ';background:' + meta.color + '11;color:' + meta.color + '">➕</button>' +
    '</div>' +
  '</div>' +
  '<div id="invItemMgrList" style="max-height:50vh;overflow-y:auto;margin-top:10px">' + renderItemMgrList(catName) + '</div>' +
  '<button class="inv-btn inv-btn-s" data-inv="close-modal" data-mid="inv-item-mgr" style="margin-top:12px">بستن</button>';

  var ex = _modals['inv-item-mgr'];
  if(ex){ try{ ex.remove(); }catch(e){} delete _modals['inv-item-mgr']; }
  openModal('inv-item-mgr', html);
}

function refreshItemMgr(){
  if(!_mgrCat) return;
  var el = document.getElementById('invItemMgrList');
  if(el) el.innerHTML = renderItemMgrList(_mgrCat);
}

function addItemQuick(){
  if(!_mgrCat) return;
  var nEl = document.getElementById('invNewItemName');
  var nv = (nEl.value || '').trim();
  if(!nv){ toast('❌ نام اجباری', 'error'); nEl.focus(); return; }
  var items = getItems();
  for(var i = 0; i < items.length; i++){
    if(items[i].name === nv && items[i].category === _mgrCat){
      toast('⚠️ تکراری در این دسته', 'error'); return;
    }
  }
  Store.add('items', {
    name: nv, category: _mgrCat,
    unit: 'عدد', price: 0,
    type: 'material', minQty: 0, isLocked: false
  });
  nEl.value = '';
  toast('✅ اضافه شد', 'success');
  refreshItemMgr();
}

function editItem(id){
  var it = Store.find('items', id);
  if(!it) return;
  if(it.isLocked){ toast('🔒', 'error'); return; }
  var nv = prompt('نام آیتم:', it.name);
  if(nv === null) return;
  nv = nv.trim();
  if(!nv) return;
  if(nv !== it.name){
    var inv = getTransactions();
    for(var k = 0; k < inv.length; k++){
      if(inv[k].item === it.name && inv[k].category === it.category){
        Store.update('transactions', inv[k].id, { item: nv });
      }
    }
  }
  Store.update('items', id, { name: nv });
  toast('✅', 'success');
  refreshItemMgr();
}

function delItem(id){
  var it = Store.find('items', id);
  if(!it) return;
  if(it.isLocked){ toast('🔒', 'error'); return; }
  if(!confirm('«' + it.name + '» حذف شود؟')) return;
  Store.remove('items', id);
  toast('🗑️');
  refreshItemMgr();
}

function lockItem(id){
  var it = Store.find('items', id);
  if(!it || it.isLocked) return;
  Store.update('items', id, { isLocked: true });
  toast('🔒');
  refreshItemMgr();
}

function unlockItem(id){
  var it = Store.find('items', id);
  if(!it || !it.isLocked) return;
  Store.update('items', id, { isLocked: false });
  toast('🔓');
  refreshItemMgr();
}

/* ═══════════════════════════════════════════════
   مدیریت داروها
   ═══════════════════════════════════════════════ */
function openMedMgr(){
  var html = '<div class="inv-modal-hd">' +
    '<div class="inv-modal-t">💊 مدیریت داروها</div>' +
    '<button class="inv-modal-x" data-inv="close-modal" data-mid="inv-med-mgr">✕</button>' +
  '</div>' +
  '<div class="inv-info-box">💡 این لیست مشترک با ماژول دارو/واکسن هست.</div>' +
  '<div class="inv-fg">' +
    '<label class="inv-fl">➕ افزودن سریع</label>' +
    '<div class="inv-picker-field">' +
      '<input class="inv-fi" type="text" id="invNewMedName" placeholder="نام دارو">' +
      '<button type="button" class="inv-picker-btn" data-inv="add-med-quick" style="border-color:#8b5cf6;background:#f5f3ff;color:#8b5cf6">➕</button>' +
    '</div>' +
  '</div>' +
  '<div id="invMedMgrList" style="max-height:50vh;overflow-y:auto;margin-top:10px">' + renderMedMgrList() + '</div>' +
  '<button class="inv-btn inv-btn-s" data-inv="close-modal" data-mid="inv-med-mgr" style="margin-top:12px">بستن</button>';

  var ex = _modals['inv-med-mgr'];
  if(ex){ try{ ex.remove(); }catch(e){} delete _modals['inv-med-mgr']; }
  openModal('inv-med-mgr', html);
}

function renderMedMgrList(){
  var meds = getMedicines();
  if(!meds.length){
    return '<div style="text-align:center;padding:20px;background:#f5f3ff;border-radius:12px;font-size:12px;color:#6b21a8;font-weight:700">هنوز دارویی نیست</div>';
  }
  var out = '';
  for(var i = 0; i < meds.length; i++){
    var m = meds[i];
    var cls = 'inv-cat-row' + (m.isLocked ? ' locked' : '');
    var acts = m.isLocked
      ? '<button class="inv-row-btn unlock" data-inv="unlock-med" data-id="' + sid(m.id) + '">🔓</button>'
      : '<button class="inv-row-btn edit" data-inv="edit-med" data-id="' + sid(m.id) + '">✏️</button>' +
        '<button class="inv-row-btn lock" data-inv="lock-med" data-id="' + sid(m.id) + '">🔒</button>' +
        '<button class="inv-row-btn delete" data-inv="del-med" data-id="' + sid(m.id) + '">🗑️</button>';

    out += '<div class="' + cls + '" style="border-right-color:#8b5cf6">' +
      '<div class="inv-cat-ic" style="background:#8b5cf6">' + (m.isLocked ? '🔒' : '💊') + '</div>' +
      '<div class="inv-cat-info">' +
        '<div class="inv-cat-n">' + esc(m.name) + (m.isLocked ? ' <span style="font-size:9px;color:#10b981">🔒</span>' : '') + '</div>' +
        '<div class="inv-cat-u">' + esc(m.desc || 'دارو/واکسن') + '</div>' +
      '</div>' +
      '<div class="inv-cat-acts">' + acts + '</div>' +
    '</div>';
  }
  return out;
}

function refreshMedMgr(){
  var el = document.getElementById('invMedMgrList');
  if(el) el.innerHTML = renderMedMgrList();
}

function addMedQuick(){
  var nEl = document.getElementById('invNewMedName');
  var nv = (nEl.value || '').trim();
  if(!nv){ toast('❌ نام اجباری', 'error'); nEl.focus(); return; }
  var meds = getMedicines();
  for(var i = 0; i < meds.length; i++){
    if(meds[i].name === nv){ toast('⚠️ تکراری', 'error'); return; }
  }
  Store.add('medicines', { name: nv, desc: '', isLocked: false });
  nEl.value = '';
  toast('✅ اضافه شد', 'success');
  refreshMedMgr();
}

function editMed(id){
  var m = Store.find('medicines', id);
  if(!m) return;
  if(m.isLocked){ toast('🔒', 'error'); return; }
  var nv = prompt('نام دارو:', m.name);
  if(nv === null) return;
  nv = nv.trim();
  if(!nv) return;
  if(nv !== m.name){
    var inv = getTransactions();
    for(var k = 0; k < inv.length; k++){
      if(inv[k].item === m.name && isMedicineCategory(inv[k].category)){
        Store.update('transactions', inv[k].id, { item: nv });
      }
    }
  }
  Store.update('medicines', id, { name: nv });
  toast('✅', 'success');
  refreshMedMgr();
}

function delMed(id){
  var m = Store.find('medicines', id);
  if(!m) return;
  if(m.isLocked){ toast('🔒', 'error'); return; }
  if(!confirm('«' + m.name + '» حذف شود؟')) return;
  Store.remove('medicines', id);
  toast('🗑️');
  refreshMedMgr();
}

function lockMed(id){
  var m = Store.find('medicines', id);
  if(!m || m.isLocked) return;
  Store.update('medicines', id, { isLocked: true });
  toast('🔒');
  refreshMedMgr();
}
function unlockMed(id){
  var m = Store.find('medicines', id);
  if(!m || !m.isLocked) return;
  Store.update('medicines', id, { isLocked: false });
  toast('🔓');
  refreshMedMgr();
}

/* ═══════════════════════════════════════════════
   Pickers
   ═══════════════════════════════════════════════ */
function openMedPicker(){
  var input = document.getElementById('iv-item');
  var currentName = input ? input.value.trim() : '';
  _pickerState.q = '';

  var html =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
      '<div style="font-size:13.5px;font-weight:900;color:#0f172a">💊 انتخاب دارو</div>' +
      '<button data-inv="close-modal" data-mid="inv-med-picker" style="background:#f1f5f9;border:none;width:28px;height:28px;border-radius:50%;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#64748b">✕</button>' +
    '</div>' +
    '<input type="text" id="ivMedSearch" class="inv-picker-search" placeholder="جستجوی دارو..." autocomplete="off" style="margin-bottom:8px">' +
    '<div id="ivMedList" class="inv-picker-list"></div>' +
    '<div id="ivMedFooter"></div>';

  var ex = _modals['inv-med-picker'];
  if(ex){ try{ ex.remove(); }catch(e){} delete _modals['inv-med-picker']; }
  openModal('inv-med-picker', html, { sheet: true });
  renderMedPickerList(currentName);

  setTimeout(function(){
    var search = document.getElementById('ivMedSearch');
    if(search){
      search.focus();
      search.addEventListener('input', function(){
        _pickerState.q = this.value.trim();
        renderMedPickerList(currentName);
      });
    }
  }, 50);
}

function renderMedPickerList(currentName){
  var listEl = document.getElementById('ivMedList');
  var footerEl = document.getElementById('ivMedFooter');
  if(!listEl) return;

  var meds = getMedicines();
  var q = (_pickerState.q || '').toLowerCase();

  var filtered = meds.filter(function(m){
    if(!q) return true;
    return String(m.name || '').toLowerCase().indexOf(q) !== -1;
  });
  filtered.sort(function(a, b){
    return String(a.name || '').localeCompare(String(b.name || ''), 'fa');
  });

  if(!filtered.length){
    listEl.innerHTML = '<div class="inv-picker-empty">' +
      '<div style="font-size:30px;margin-bottom:6px;opacity:.5">💊</div>' +
      (q ? 'دارویی پیدا نشد' : 'هنوز دارویی ثبت نشده') +
    '</div>';
    footerEl.innerHTML = '<div class="inv-picker-add" data-inv="create-new-med" data-name="' + esc(q) + '">➕ افزودن «' + esc(q || 'داروی جدید') + '»</div>';
    return;
  }

  var html = '';
  for(var i = 0; i < filtered.length; i++){
    var m = filtered[i];
    var isSelected = currentName && m.name === currentName;
    html += '<div class="inv-picker-item ' + (isSelected ? 'selected' : '') + '" data-inv="pick-med" data-name="' + esc(m.name) + '">' +
      '<div class="inv-picker-item-ic" style="background:#f5f3ff;color:#7c3aed">💊</div>' +
      '<div class="inv-picker-item-info">' +
        '<div class="inv-picker-item-name">' + esc(m.name) + '</div>' +
      '</div>' +
      '<div class="inv-picker-item-check">✓</div>' +
    '</div>';
  }
  listEl.innerHTML = html;

  footerEl.innerHTML =
    '<div class="inv-picker-add" data-inv="create-new-med" data-name="' + esc(q) + '">➕ ' + (q ? 'افزودن «' + esc(q) + '»' : 'افزودن داروی جدید') + '</div>' +
    '<div class="inv-picker-count">' + fa(filtered.length) + ' دارو' + (q ? ' از ' + fa(meds.length) : '') + '</div>';
}

function pickMed(name){
  var input = document.getElementById('iv-item');
  if(input) input.value = name;
  closeModal('inv-med-picker');
}

function createNewMed(name){
  closeModal('inv-med-picker');
  if(name){
    var meds = getMedicines();
    var exists = false;
    for(var i = 0; i < meds.length; i++){
      if(meds[i].name === name){ exists = true; break; }
    }
    if(!exists){
      Store.add('medicines', { name: name, desc: '', isLocked: false });
      toast('✅ دارو اضافه شد', 'success');
    }
    var input = document.getElementById('iv-item');
    if(input){ input.value = name; input.focus(); }
  } else {
    var input2 = document.getElementById('iv-item');
    if(input2) input2.focus();
  }
}

function openItemPickerForCat(catName){
  var input = document.getElementById('iv-item');
  var currentName = input ? input.value.trim() : '';
  _pickerState.q = '';
  _mgrCat = catName;

  var meta = getCatMeta(catName);
  var html =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
      '<div style="font-size:13.5px;font-weight:900;color:#0f172a">' + meta.icon + ' انتخاب ' + esc(catName) + '</div>' +
      '<button data-inv="close-modal" data-mid="inv-picker" style="background:#f1f5f9;border:none;width:28px;height:28px;border-radius:50%;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#64748b">✕</button>' +
    '</div>' +
    '<input type="text" id="ivPickerSearch" class="inv-picker-search" placeholder="جستجو..." autocomplete="off" style="margin-bottom:8px">' +
    '<div id="ivPickerList" class="inv-picker-list"></div>' +
    '<div id="ivPickerFooter"></div>';

  var ex = _modals['inv-picker'];
  if(ex){ try{ ex.remove(); }catch(e){} delete _modals['inv-picker']; }
  openModal('inv-picker', html, { sheet: true });
  renderItemPickerListForCat(catName, currentName);

  setTimeout(function(){
    var search = document.getElementById('ivPickerSearch');
    if(search){
      search.focus();
      search.addEventListener('input', function(){
        _pickerState.q = this.value.trim();
        renderItemPickerListForCat(catName, currentName);
      });
    }
  }, 50);
}

function renderItemPickerListForCat(catName, currentName){
  var listEl = document.getElementById('ivPickerList');
  var footerEl = document.getElementById('ivPickerFooter');
  if(!listEl) return;

  var items = getItemsByCategory(catName);
  var q = (_pickerState.q || '').toLowerCase();

  var filtered = items.filter(function(it){
    if(!q) return true;
    return String(it.name || '').toLowerCase().indexOf(q) !== -1;
  });
  filtered.sort(function(a, b){
    return String(a.name || '').localeCompare(String(b.name || ''), 'fa');
  });

  var meta = getCatMeta(catName);

  if(!filtered.length){
    listEl.innerHTML = '<div class="inv-picker-empty">' +
      '<div style="font-size:30px;margin-bottom:6px;opacity:.5">' + meta.icon + '</div>' +
      (q ? 'موردی پیدا نشد' : 'هنوز آیتمی توی این دسته نیست') +
    '</div>';
    footerEl.innerHTML = '<div class="inv-picker-add" data-inv="create-new-item" data-name="' + esc(q) + '">➕ افزودن «' + esc(q || 'آیتم جدید') + '»</div>';
    return;
  }

  var html = '';
  for(var i = 0; i < filtered.length; i++){
    var it = filtered[i];
    var isSelected = currentName && it.name === currentName;
    html += '<div class="inv-picker-item ' + (isSelected ? 'selected' : '') + '" data-inv="pick-item" data-name="' + esc(it.name) + '">' +
      '<div class="inv-picker-item-ic" style="background:' + meta.color + '22;color:' + meta.color + '">' + meta.icon + '</div>' +
      '<div class="inv-picker-item-info">' +
        '<div class="inv-picker-item-name">' + esc(it.name) + '</div>' +
        '<div class="inv-picker-item-meta">' +
          (it.price ? '<span class="inv-picker-item-price">💰 ' + fa(it.price) + '</span>' : '') +
          (it.unit ? '<span>' + esc(it.unit) + '</span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="inv-picker-item-check">✓</div>' +
    '</div>';
  }
  listEl.innerHTML = html;

  footerEl.innerHTML =
    '<div class="inv-picker-add" data-inv="create-new-item" data-name="' + esc(q) + '">➕ ' + (q ? 'افزودن «' + esc(q) + '»' : 'افزودن آیتم جدید') + '</div>' +
    '<div class="inv-picker-count">' + fa(filtered.length) + ' آیتم' + (q ? ' از ' + fa(items.length) : '') + '</div>';
}

function pickItem(name){
  var input = document.getElementById('iv-item');
  if(input) input.value = name;
  closeModal('inv-picker');

  var items = getItems();
  var selected = null;
  for(var i = 0; i < items.length; i++) if(items[i].name === name){ selected = items[i]; break; }
  if(selected){
    var priceInput = document.getElementById('iv-price');
    if(priceInput && !priceInput.value && selected.price){
      priceInput.value = Number(selected.price).toLocaleString('en-US');
    }
    var unitSel = document.getElementById('iv-unit');
    if(unitSel && selected.unit) unitSel.value = selected.unit;
  }
}

function createNewItem(name){
  closeModal('inv-picker');
  var catSel = document.getElementById('iv-category');
  var cat = catSel ? catSel.value : '';
  if(name && cat && !isMedicineCategory(cat)){
    var items = getItems();
    var exists = false;
    for(var i = 0; i < items.length; i++){
      if(items[i].name === name && items[i].category === cat){ exists = true; break; }
    }
    if(!exists){
      Store.add('items', {
        name: name, category: cat,
        unit: 'عدد', price: 0,
        type: 'material', minQty: 0, isLocked: false
      });
    }
  }
  var input = document.getElementById('iv-item');
  if(input && name){ input.value = name; input.focus(); }
  toast('✅ اضافه شد', 'success');
}

/* ═══════ Save ═══════ */
function save(){
  var date = document.getElementById('iv-date').value.trim();
  var type = document.getElementById('iv-type').value;
  var category = document.getElementById('iv-category').value;
  var itemInput = document.getElementById('iv-item');
  var item = itemInput ? itemInput.value.trim() : '';
  var qty = Number(document.getElementById('iv-qty').value) || 0;
  var unitEl = document.getElementById('iv-unit');
  var unit = unitEl ? unitEl.value : '';
  var price = Number(String(document.getElementById('iv-price').value).replace(/[^\d]/g, '')) || 0;
  var supplier = document.getElementById('iv-supplier').value.trim();
  var expiry = document.getElementById('iv-expiry').value.trim();
  var notes = document.getElementById('iv-notes').value.trim();
  var transportVehicle = document.getElementById('iv-transport-vehicle').value.trim();
  var transportCost = Number(String(document.getElementById('iv-transport-cost').value).replace(/[^\d]/g, '')) || 0;

  var meta = getCatMeta(category);
  var isMed = meta.isMed;

  if(!date){ toast('❌ تاریخ اجباری', 'error'); return; }
  if(!item || item.length < 2){
    toast('❌ ' + meta.label + ' را وارد کن', 'error');
    if(itemInput) itemInput.focus();
    return;
  }
  if(qty <= 0){ toast('❌ مقدار باید بیشتر از صفر', 'error'); return; }

  var kindMap = { in: 'inv_in', out: 'inv_out', waste: 'inv_waste' };

  var data = {
    kind: kindMap[type],
    date: date, category: category, item: item,
    qty: qty, unit: unit, price: price,
    supplier: supplier, expiry: expiry, notes: notes,
    transportVehicle: transportVehicle, transportCost: transportCost,
    amount: qty * price,
    isMedicine: isMed
  };

  if(editingInvId){
    Store.update('transactions', editingInvId, data);
    toast('✅ ویرایش شد', 'success');
  } else {
    Store.add('transactions', data);
    toast('✅ ثبت شد', 'success');
  }

  if(item){
    if(isMed){
      var meds = getMedicines();
      var existsMed = false;
      for(var mi = 0; mi < meds.length; mi++){
        if(meds[mi].name === item){ existsMed = true; break; }
      }
      if(!existsMed){
        Store.add('medicines', { name: item, desc: '', isLocked: false });
      }
    } else {
      var items = getItems();
      var exists = null;
      for(var k = 0; k < items.length; k++){
        if(items[k].name === item && items[k].category === category){ exists = items[k]; break; }
      }
      if(!exists){
        Store.add('items', {
          name: item, category: category || 'سایر',
          unit: unit, price: price,
          type: 'material', minQty: 0, isLocked: false
        });
      } else if(price > 0 && exists.price !== price){
        Store.update('items', exists.id, { price: price });
      }
    }
  }

  if(transportVehicle){
    var vehicles = getVehicles();
    var exists2 = null;
    for(var v = 0; v < vehicles.length; v++){
      if(vehicles[v].name === transportVehicle){ exists2 = vehicles[v]; break; }
    }
    if(!exists2){
      Store.add('invTransportVehicles', { name: transportVehicle, isLocked: false });
    }
  }

  closeModal('inv-form');
  renderRoot();
}

function copyInv(id){
  var t = Store.find('transactions', id);
  if(!t) return;
  var copy = JSON.parse(JSON.stringify(t));
  delete copy.id;
  delete copy.createdAt;
  Store.add('transactions', copy);
  toast('📋 کپی شد', 'success');
  renderRoot();
}

function deleteInv(id){
  var t = Store.find('transactions', id);
  if(!t) return;
  var label = t.kind === 'inv_in' ? 'ورود' : t.kind === 'inv_out' ? 'خروج' : 'ضایعات';
  if(!confirm('تراکنش «' + label + ' ' + t.item + '» حذف شود؟')) return;
  Store.remove('transactions', id);
  toast('🗑️ حذف شد', 'success');
  renderRoot();
}

/* ═══════ Vehicle Manager ═══════ */
function renderVehicleListInner(){
  var vehicles = getVehicles();
  if(!vehicles.length){
    return '<div style="text-align:center;padding:20px;color:#64748b;font-size:12px">هنوز وسیله‌ای نیست</div>';
  }
  var out = '';
  var trans = getTransactions();
  for(var i = 0; i < vehicles.length; i++){
    var v = vehicles[i];
    var used = 0;
    for(var j = 0; j < trans.length; j++){
      if(trans[j].transportVehicle === v.name) used++;
    }
    var cls = 'inv-row' + (v.isLocked ? ' locked' : '');
    var acts = v.isLocked
      ? '<button class="inv-row-btn unlock" data-inv="unlock-vehicle" data-id="' + sid(v.id) + '">🔓</button>'
      : '<button class="inv-row-btn edit" data-inv="edit-vehicle" data-id="' + sid(v.id) + '">✏️</button>' +
        '<button class="inv-row-btn lock" data-inv="lock-vehicle" data-id="' + sid(v.id) + '">🔒</button>' +
        '<button class="inv-row-btn delete" data-inv="del-vehicle" data-id="' + sid(v.id) + '">🗑️</button>';
    out += '<div class="' + cls + '" style="border-right-color:#f59e0b">' +
      '<div class="inv-row-ic">' + (v.isLocked ? '🔒' : '🚚') + '</div>' +
      '<div class="inv-row-info">' +
        '<div class="inv-row-n">' + esc(v.name) + '</div>' +
        '<div class="inv-row-u">' + fa(used) + ' تراکنش</div>' +
      '</div>' +
      '<div class="inv-row-acts">' + acts + '</div>' +
    '</div>';
  }
  return out;
}

function openVehicleMgr(){
  var html = '<div class="inv-modal-hd">' +
    '<div class="inv-modal-t">🚚 مدیریت وسایل نقلیه</div>' +
    '<button class="inv-modal-x" data-inv="close-modal" data-mid="inv-vehicle-mgr">✕</button>' +
  '</div>' +
  '<div class="inv-info-box">💡 لیست پیشنهادی وسایل نقلیه.</div>' +
  '<button class="inv-save" style="margin-top:0;margin-bottom:12px;background:linear-gradient(135deg,#10b981,#059669)" data-inv="open-add-vehicle">➕ وسیله جدید</button>' +
  '<div id="invVehicleList" style="max-height:55vh;overflow-y:auto">' + renderVehicleListInner() + '</div>';

  var existing = _modals['inv-vehicle-mgr'];
  if(existing){ try{ existing.remove(); }catch(e){} delete _modals['inv-vehicle-mgr']; }
  openModal('inv-vehicle-mgr', html);
}

function refreshVehicleMgr(){
  var el = document.getElementById('invVehicleList');
  if(el) el.innerHTML = renderVehicleListInner();
}

function openVehicleEdit(id){
  editingVehicleId = id ? sid(id) : null;
  var v = id ? Store.find('invTransportVehicles', id) : null;
  if(v && v.isLocked){ toast('🔒 قفله', 'error'); return; }

  var html = '<div class="inv-modal-hd">' +
    '<div class="inv-modal-t">' + (id ? '✏️ ویرایش وسیله' : '🚚 وسیله جدید') + '</div>' +
    '<button class="inv-modal-x" data-inv="close-modal" data-mid="inv-vehicle-edit">✕</button>' +
  '</div>' +
  '<div class="inv-fg"><label class="inv-fl">🚚 نام وسیله نقلیه <span class="inv-req">*</span></label>' +
    '<input class="inv-fi" type="text" id="edVehicleName" value="' + (v ? esc(v.name) : '') + '" placeholder="مثلاً: تیبا، پست، نیسان..."></div>' +
  '<div class="inv-fg"><label class="inv-fl" style="display:flex;align-items:center;gap:6px;cursor:pointer">' +
    '<input type="checkbox" id="edVehicleLock" ' + (v && v.isLocked ? 'checked' : '') + ' style="width:18px;height:18px;accent-color:#0f766e"> 🔒 قفل بعد از ذخیره</label></div>' +
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">' +
    '<button class="inv-save" style="margin-top:0;background:#f1f5f9;color:#0f172a" data-inv="close-modal" data-mid="inv-vehicle-edit">انصراف</button>' +
    '<button class="inv-save" style="margin-top:0" data-inv="save-vehicle">💾 ذخیره</button>' +
  '</div>';

  openModal('inv-vehicle-edit', html, { sheet: true });
}

function saveVehicleEdit(){
  var nameInput = document.getElementById('edVehicleName');
  var name = (nameInput.value || '').trim();
  if(!name){ toast('❌ نام اجباری', 'error'); return; }

  var all = getVehicles();
  for(var i = 0; i < all.length; i++){
    if(all[i].name.trim() === name && !sameId(all[i].id, editingVehicleId)){
      toast('⚠️ این نام قبلاً هست', 'error'); return;
    }
  }

  var isLocked = document.getElementById('edVehicleLock').checked;

  if(editingVehicleId){
    var existing = Store.find('invTransportVehicles', editingVehicleId);
    if(existing){
      var oldName = existing.name;
      if(oldName !== name){
        var trans = getTransactions();
        for(var k = 0; k < trans.length; k++){
          if(trans[k].transportVehicle === oldName){
            Store.update('transactions', trans[k].id, { transportVehicle: name });
          }
        }
      }
      Store.update('invTransportVehicles', editingVehicleId, { name: name, isLocked: isLocked });
    }
    toast('✅ ویرایش شد', 'success');
  } else {
    Store.add('invTransportVehicles', { name: name, isLocked: isLocked });
    toast('✅ اضافه شد', 'success');
  }

  closeModal('inv-vehicle-edit');
  refreshVehicleMgr();
  editingVehicleId = null;
}

function lockVehicle(id){
  var v = Store.find('invTransportVehicles', id);
  if(!v || v.isLocked) return;
  if(!confirm('«' + v.name + '» قفل شود؟')) return;
  Store.update('invTransportVehicles', id, { isLocked: true });
  toast('🔒');
  refreshVehicleMgr();
}

function unlockVehicle(id){
  var v = Store.find('invTransportVehicles', id);
  if(!v || !v.isLocked) return;
  if(!confirm('باز شود؟')) return;
  Store.update('invTransportVehicles', id, { isLocked: false });
  toast('🔓');
  refreshVehicleMgr();
}

function deleteVehicle(id){
  var v = Store.find('invTransportVehicles', id);
  if(!v) return;
  if(v.isLocked){ toast('🔒 قفله', 'error'); return; }
  var used = 0;
  var trans = getTransactions();
  for(var i = 0; i < trans.length; i++){
    if(trans[i].transportVehicle === v.name) used++;
  }
  var msg = used > 0
    ? '«' + v.name + '» در ' + fa(used) + ' تراکنش استفاده شده. حذف شود؟'
    : '«' + v.name + '» حذف شود؟';
  if(!confirm(msg)) return;
  Store.remove('invTransportVehicles', id);
  toast('🗑️');
  refreshVehicleMgr();
}

/* ═══════ Re-render ═══════ */
function renderRoot(){
  var root = document.querySelector('[data-inv-root]');
  if(!root) return;
  var fresh = document.createElement('div');
  fresh.innerHTML = renderPage();
  root.parentNode.replaceChild(fresh.firstElementChild, root);
}

/* ═══════ Events ═══════ */
document.addEventListener('click', function(e){
  var catColor = e.target.closest ? e.target.closest('#invCatColorPicker .inv-color-opt') : null;
  if(catColor){
    _selectedCatColor = catColor.dataset.color;
    var sibs = catColor.parentElement.querySelectorAll('.inv-color-opt');
    for(var si = 0; si < sibs.length; si++) sibs[si].classList.toggle('on', sibs[si] === catColor);
    return;
  }
  var catIcon = e.target.closest ? e.target.closest('#invCatIconPicker .inv-icon-opt') : null;
  if(catIcon){
    var sibs2 = catIcon.parentElement.querySelectorAll('.inv-icon-opt');
    for(var sj = 0; sj < sibs2.length; sj++) sibs2[sj].classList.toggle('on', sibs2[sj] === catIcon);
    return;
  }

  var btn = e.target.closest ? e.target.closest('[data-inv]') : null;
  if(!btn) return;
  var act = btn.dataset.inv;
  var id = sid(btn.dataset.id);
  var mid = btn.dataset.mid;
  var name = btn.dataset.name;
  var cat = btn.dataset.cat || '';
  var key = btn.dataset.key || '';

  switch(act){
    case 'open-form': openForm(); break;
    case 'edit': e.stopPropagation(); openForm(id); break;
    case 'del': e.stopPropagation(); deleteInv(id); break;
    case 'copy': e.stopPropagation(); copyInv(id); break;
    case 'toggle': {
      e.stopPropagation();
      _expanded[id] = !_expanded[id];
      var card = document.querySelector('.inv-card[data-iid="' + id + '"]');
      if(card) card.classList.toggle('expanded', !!_expanded[id]);
      break;
    }
    case 'close-modal': closeModal(mid); break;
    case 'save': save(); break;

    case 'filter': {
      e.stopPropagation();
      _filter = btn.dataset.f;
      _expandedGroupsSet = {};
      _expandedGroupItems = {};
      _showAll = false;
      renderRoot();
      break;
    }

    case 'set-group': {
      e.stopPropagation();
      _groupBy = btn.dataset.g;
      _expandedGroupsSet = {};
      _expandedGroupItems = {};
      _showAll = false;
      renderRoot();
      break;
    }

    case 'toggle-group': {
      e.stopPropagation();
      _expandedGroupsSet[key] = !_expandedGroupsSet[key];
      var grp = document.querySelector('.inv-group[data-gkey="' + CSS.escape(key) + '"]');
      if(grp) grp.classList.toggle('expanded', !!_expandedGroupsSet[key]);
      break;
    }

    case 'show-more': {
      e.stopPropagation();
      _showAll = true;
      renderRoot();
      break;
    }
    case 'show-less': {
      e.stopPropagation();
      _showAll = false;
      renderRoot();
      try{ window.scrollTo({ top: 0, behavior: 'smooth' }); }catch(_){}
      break;
    }
    case 'show-more-in-group': {
      e.stopPropagation();
      _expandedGroupItems[key] = true;
      renderRoot();
      break;
    }
    case 'show-less-in-group': {
      e.stopPropagation();
      _expandedGroupItems[key] = false;
      renderRoot();
      break;
    }

    case 'open-cal':
      if(UI.openCalendar) UI.openCalendar(btn.dataset.target);
      break;

    case 'open-name-picker': {
      var catSel1 = document.getElementById('iv-category');
      openNamePicker(catSel1 ? catSel1.value : '');
      break;
    }
    case 'open-name-mgr': {
      var catSel2 = document.getElementById('iv-category');
      openNameMgr(catSel2 ? catSel2.value : '');
      break;
    }

    case 'open-item-mgr': openItemMgr(cat || _mgrCat); break;
    case 'add-item-quick': addItemQuick(); break;
    case 'edit-item': editItem(id); break;
    case 'del-item': delItem(id); break;
    case 'lock-item': lockItem(id); break;
    case 'unlock-item': unlockItem(id); break;
    case 'pick-item': pickItem(name); break;
    case 'create-new-item': createNewItem(name); break;

    case 'open-med-mgr': openMedMgr(); break;
    case 'add-med-quick': addMedQuick(); break;
    case 'edit-med': editMed(id); break;
    case 'del-med': delMed(id); break;
    case 'lock-med': lockMed(id); break;
    case 'unlock-med': unlockMed(id); break;
    case 'pick-med': pickMed(name); break;
    case 'create-new-med': createNewMed(name); break;

    case 'open-cat-mgr': openCatManager(); break;
    case 'open-add-cat': openCatEdit(); break;
    case 'edit-cat': openCatEdit(id); break;
    case 'save-cat': saveCatEdit(); break;
    case 'lock-cat': lockCat(id); break;
    case 'unlock-cat': unlockCat(id); break;
    case 'del-cat': delCat(id); break;

    case 'open-vehicle-mgr': openVehicleMgr(); break;
    case 'open-add-vehicle': openVehicleEdit(); break;
    case 'edit-vehicle': openVehicleEdit(id); break;
    case 'save-vehicle': saveVehicleEdit(); break;
    case 'lock-vehicle': lockVehicle(id); break;
    case 'unlock-vehicle': unlockVehicle(id); break;
    case 'del-vehicle': deleteVehicle(id); break;
  }
});

document.addEventListener('change', function(e){
  var t = e.target;
  if(t.id === 'iv-category'){
    updateNameFieldByCat();
  }
});

document.addEventListener('input', function(e){
  var t = e.target;
  if(t.id === 'iv-price' || t.id === 'iv-transport-cost'){
    var v = String(t.value).replace(/[^\d]/g, '');
    if(v === ''){ t.value = ''; return; }
    t.value = Number(v).toLocaleString('en-US');
  }
});

/* ═══════ Init ═══════ */
injectStyles();
ensureVehicleDefaults();

Router.register('inventory', {
  title: 'انبار',
  navPage: 'more',
  topLevel: true,
  render: function(){ return renderPage(); }
});

window.Inventory = {
  openForm: openForm,
  save: save,
  edit: openForm,
  deleteConfirm: deleteInv,
  setFilter: function(f){ _filter = f; _showAll = false; renderRoot(); },
  setGroup: function(g){ _groupBy = g; _showAll = false; renderRoot(); },
  openVehicleMgr: openVehicleMgr,
  openCatManager: openCatManager,
  openMedMgr: openMedMgr,
  openItemMgr: openItemMgr,
  _state: function(){ return { filter: _filter, groupBy: _groupBy, showAll: _showAll }; }
};

console.log('✅ inventory route registered (v8.1 — per-unit value)');

})();