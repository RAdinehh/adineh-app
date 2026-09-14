/* ═══════════════════════════════════════════════
   FEED — خوراک و فرمول (v4.0)
   بازنویسی‌شده برای Store v4 + UI مشترک
   ساخته شده توسط رضا آدینه
   ═══════════════════════════════════════════════ */
(function(){
'use strict';

if(typeof Router === 'undefined' || typeof Router.register !== 'function'){ return; }
if(window.__feedModuleLoaded) return;
window.__feedModuleLoaded = true;

var sid = UI.sid, sameId = UI.sameId, findBy = UI.findBy;
var esc = UI.esc, fa = UI.fa, toFa = UI.toFa;
var parseNum = UI.parseNum, fmtShort = UI.formatShort, toast = UI.toast;

var _state = { filter: 'all', expanded: {} };
var _editingFormulaId = null;
var _editingTypeId = null;
var _editingItemId = null;
var _editingItemCatId = null;
var _selectedTypeColor = '#10b981';
var _selectedItemCatColor = '#10b981';
var _formItems = [];
var _modals = {};

/* ═══════ Data Access ═══════ */
function getTypes(){ return Store.all('feedTypes'); }
function getItemCats(){ return Store.all('feedItemCats'); }
function getItems(){
  return Store.all('items').filter(function(i){
    return i.type === 'feed' || i.category === 'خوراک' || i.isFeed;
  });
}
function getFormulas(){ return Store.all('feedFormulas'); }

function ensureDefaults(){
  if(getTypes().length === 0){
    var types = [
      { name: 'آغازین', color: '#10b981', icon: '🐣', suitable: '۰-۳ هفته' },
      { name: 'رشد', color: '#3b82f6', icon: '🐔', suitable: '۳-۸ هفته' },
      { name: 'تخم‌گذار', color: '#f59e0b', icon: '🥚', suitable: 'بعد از ۱۸ هفته' },
      { name: 'پرواری', color: '#ef4444', icon: '🍗', suitable: 'گوشتی' }
    ];
    for(var i = 0; i < types.length; i++){
      types[i].isLocked = false;
      Store.add('feedTypes', types[i]);
    }
  }
  if(getItemCats().length === 0){
    var cats = [
      { name: 'انرژی‌زا', color: '#f59e0b', icon: '⚡' },
      { name: 'پروتئین', color: '#ef4444', icon: '🥩' },
      { name: 'معدنی', color: '#3b82f6', icon: '🦴' },
      { name: 'افزودنی', color: '#8b5cf6', icon: '🧪' }
    ];
    for(var j = 0; j < cats.length; j++){
      cats[j].isLocked = false;
      Store.add('feedItemCats', cats[j]);
    }
  }
}

/* ═══════ Modal ═══════ */
function openModal(id, html, opts){
  opts = opts || {};
  if(_modals[id]) return _modals[id];
  var wrap = document.createElement('div');
  wrap.className = 'fd-modal-wrap';
  wrap.dataset.modalId = id;
  wrap.innerHTML = '<div class="fd-modal-bg" data-fd="close-modal" data-mid="' + id + '"></div>' +
    '<div class="fd-modal-box' + (opts.sheet ? ' fd-sheet' : '') + '">' + html + '</div>';
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

/* ═══════ Styles (فشرده) ═══════ */
function injectStyles(){
  if(document.getElementById('fd-styles')) return;
  var css =
  '.fd-page{padding:10px;max-width:760px;margin:0 auto}' +
  '.fd-header{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap}' +
  '.fd-title{font-size:14px;font-weight:900}' +
  '.fd-sub{font-size:10.5px;color:#64748b;font-weight:700;margin-top:1px}' +
  '.fd-add{background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;border:none;padding:8px 14px;border-radius:9999px;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:4px;white-space:nowrap}' +
  '.fd-summary{background:#fff;border-radius:12px;padding:10px;margin-bottom:10px;border:1px solid #e2e8f0;display:grid;grid-template-columns:repeat(4,1fr);gap:6px}' +
  '.fd-sum{background:#f1f5f9;border-radius:8px;padding:8px 4px;text-align:center;border-bottom:2px solid #10b981}' +
  '.fd-sum.g{border-color:#10b981}.fd-sum.b{border-color:#3b82f6}.fd-sum.o{border-color:#f59e0b}.fd-sum.p{border-color:#8b5cf6}' +
  '.fd-sum-ic{font-size:14px;line-height:1;margin-bottom:2px}' +
  '.fd-sum-v{font-size:14px;font-weight:900;line-height:1.2}' +
  '.fd-sum-l{font-size:9.5px;color:#64748b;font-weight:700;margin-top:1px}' +
  '.fd-tabs{display:flex;gap:4px;margin-bottom:10px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none}' +
  '.fd-tabs::-webkit-scrollbar{display:none}' +
  '.fd-tab{background:#fff;border:1.5px solid #e2e8f0;color:#64748b;padding:6px 12px;border-radius:9999px;font-family:inherit;font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap;flex-shrink:0}' +
  '.fd-tab.on{background:#10b981;border-color:#10b981;color:#fff}' +
  '.fd-card{background:#fff;border-radius:12px;margin-bottom:6px;border:1px solid #e2e8f0;border-right:3px solid #10b981;overflow:hidden}' +
  '.fd-card-hd{display:flex;justify-content:space-between;align-items:flex-start;gap:6px;padding:10px 12px;cursor:pointer;user-select:none}' +
  '.fd-card-hd:active{background:#f1f5f9}' +
  '.fd-hd-content{flex:1;min-width:0}' +
  '.fd-hd-row1{display:flex;align-items:center;gap:6px;margin-bottom:5px;flex-wrap:wrap}' +
  '.fd-name{font-size:12.5px;font-weight:900;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60%}' +
  '.fd-type-badge{font-size:9px;font-weight:800;padding:2px 7px;border-radius:9999px;background:#ecfdf5;color:#166534}' +
  '.fd-hd-row2{display:flex;align-items:center;gap:5px;flex-wrap:wrap}' +
  '.fd-stat{display:inline-flex;align-items:center;gap:2px;padding:2px 6px;border-radius:9999px;background:#f1f5f9;font-size:10px;font-weight:700;white-space:nowrap}' +
  '.fd-stat.r{background:#fef2f2;color:#991b1b}.fd-stat.g{background:#ecfdf5;color:#166534}' +
  '.fd-stat.b{background:#eff6ff;color:#1e40af}.fd-stat.o{background:#fffbeb;color:#92400e}.fd-stat.p{background:#f5f3ff;color:#6b21a8}' +
  '.fd-stat strong{font-weight:900;font-size:11px}' +
  '.fd-toggle{background:#f1f5f9;border:none;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:#10b981;cursor:pointer;flex-shrink:0;transition:transform .3s,background .2s}' +
  '.fd-card.expanded .fd-toggle{transform:rotate(180deg);background:#10b981;color:#fff}' +
  '.fd-card-bd{max-height:0;overflow:hidden;transition:max-height .35s,padding .35s;padding:0 12px}' +
  '.fd-card.expanded .fd-card-bd{max-height:1500px;padding:8px 12px 12px;border-top:1px dashed #e2e8f0}' +
  '.fd-nutrients{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:8px}' +
  '.fd-nutrient{background:#f1f5f9;border-radius:6px;padding:5px 6px;text-align:center;border-bottom:2px solid #cbd5e1}' +
  '.fd-nutrient.r{border-color:#ef4444}.fd-nutrient.g{border-color:#10b981}.fd-nutrient.b{border-color:#3b82f6}.fd-nutrient.o{border-color:#f59e0b}.fd-nutrient.p{border-color:#8b5cf6}' +
  '.fd-nutrient-l{font-size:9px;color:#64748b;font-weight:700;margin-bottom:1px}' +
  '.fd-nutrient-v{font-size:12px;font-weight:900}' +
  '.fd-table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:8px;border-radius:6px;overflow:hidden;background:#f1f5f9}' +
  '.fd-table th{background:#0f766e;color:#fff;padding:5px 4px;font-size:10px;font-weight:800;text-align:right}' +
  '.fd-table td{border-bottom:1px solid #e2e8f0;padding:5px 4px;text-align:center;color:#0f172a}' +
  '.fd-table .name-col{text-align:right;padding-right:8px;font-weight:800;font-size:11px}' +
  '.fd-table .total-row td{background:#ecfdf5;font-weight:900;border-top:2px solid #10b981}' +
  '.fd-pct-bar{height:8px;background:#f1f5f9;border-radius:4px;overflow:hidden;margin-bottom:6px}' +
  '.fd-pct-fill{height:100%;border-radius:4px}' +
  '.fd-pct-fill.ok{background:linear-gradient(90deg,#10b981,#34d399)}' +
  '.fd-pct-fill.warn{background:linear-gradient(90deg,#f59e0b,#fbbf24)}' +
  '.fd-pct-fill.bad{background:linear-gradient(90deg,#ef4444,#f87171)}' +
  '.fd-alert{background:#fffbeb;border-radius:6px;padding:6px 8px;margin-bottom:6px;border-right:2px solid #f59e0b;font-size:10.5px;font-weight:700;color:#92400e}' +
  '.fd-alert.ok{background:#ecfdf5;color:#166534;border-color:#10b981}' +
  '.fd-alert.bad{background:#fef2f2;color:#991b1b;border-color:#ef4444}' +
  '.fd-actions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;padding-top:6px;border-top:1px dashed #e2e8f0}' +
  '.fd-actions button{padding:6px;border:none;border-radius:6px;font-family:inherit;font-size:10.5px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:3px}' +
  '.fd-act-edit{background:#eff6ff;color:#1e40af}' +
  '.fd-act-copy{background:#f5f3ff;color:#6b21a8}' +
  '.fd-act-del{background:#fef2f2;color:#991b1b}' +
  '.fd-empty{text-align:center;padding:48px 24px;background:#fff;border-radius:12px;border:1px dashed #cbd5e1}' +
  '.fd-empty-ic{font-size:56px;line-height:1;display:block;margin-bottom:12px;opacity:.6}' +
  '.fd-empty-t{font-size:14px;font-weight:900;margin-bottom:6px}' +
  '.fd-empty-x{font-size:12px;color:#64748b;font-weight:600;margin:0 auto 16px;max-width:280px}' +
  '.fd-modal-wrap{position:fixed;inset:0;z-index:2000;display:flex;align-items:flex-end;justify-content:center;opacity:0;pointer-events:none;transition:opacity .2s}' +
  '.fd-modal-wrap.on{opacity:1;pointer-events:auto}' +
  '.fd-modal-bg{position:absolute;inset:0;background:rgba(15,23,42,.55)}' +
  '.fd-modal-box{position:relative;background:#fff;width:100%;max-width:760px;border-radius:24px 24px 0 0;padding:14px;max-height:95vh;overflow-y:auto;transform:translateY(30px);transition:transform .3s;padding-bottom:calc(20px + env(safe-area-inset-bottom,0px))}' +
  '.fd-modal-wrap.on .fd-modal-box{transform:translateY(0)}' +
  '.fd-modal-box.fd-sheet{border-radius:16px;max-width:440px;margin:auto}' +
  '.fd-modal-hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #e2e8f0}' +
  '.fd-modal-t{font-size:14px;font-weight:800}' +
  '.fd-modal-x{background:#f1f5f9;border:none;width:32px;height:32px;border-radius:50%;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center}' +
  '.fd-sec{margin-bottom:16px}' +
  '.fd-sec-hd{display:flex;align-items:center;gap:6px;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #e2e8f0}' +
  '.fd-sec-ic{width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}' +
  '.fd-sec-t{font-size:12.5px;font-weight:900}' +
  '.fd-fg{margin-bottom:10px}' +
  '.fd-fl{font-size:11px;font-weight:800;margin-bottom:4px;display:flex;align-items:center;gap:4px}' +
  '.fd-fl-hint{font-size:9.5px;color:#0f766e;font-weight:700;margin-right:auto;cursor:pointer;text-decoration:underline}' +
  '.fd-fi,.fd-fs,.fd-ft{display:block;width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:12px;font-size:13px;font-family:inherit;background:#f1f5f9;color:#0f172a;box-sizing:border-box}' +
  '.fd-fi:focus,.fd-fs:focus,.fd-ft:focus{outline:none;border-color:#10b981;background:#fff;box-shadow:0 0 0 3px #ecfdf5}' +
  '.fd-fr{display:grid;grid-template-columns:1fr 1fr;gap:8px}' +
  '.fd-fr3{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}' +
  '.fd-iwb{display:flex;gap:6px;align-items:stretch}' +
  '.fd-iwb .fd-fs{flex:1;min-width:0}' +
  '.fd-ibtn{width:42px;flex-shrink:0;border:none;border-radius:12px;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;background:#10b981;color:#fff}' +
  '.fd-save{width:100%;padding:14px;border:none;border-radius:12px;background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;font-family:inherit;font-size:14px;font-weight:900;cursor:pointer;margin-top:16px}' +
  '.fd-btn{width:100%;padding:11px;border:none;border-radius:12px;font-size:13px;font-weight:800;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px}' +
  '.fd-btn-s{background:#f1f5f9;color:#0f172a}' +
  '.fd-btn-p{background:#0f766e;color:#fff}' +
  '.fd-btn-g{background:#10b981;color:#fff}' +
  '.fd-list{display:flex;flex-direction:column;gap:6px;max-height:55vh;overflow-y:auto;padding:2px}' +
  '.fd-row{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#f1f5f9;border-radius:12px;border-right:3px solid #f59e0b;margin-bottom:6px}' +
  '.fd-row.locked{background:linear-gradient(90deg,#ecfdf5 0%,#f1f5f9 30%)}' +
  '.fd-row-ic{width:30px;height:30px;border-radius:8px;background:#fffbeb;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}' +
  '.fd-row-info{flex:1;min-width:0}' +
  '.fd-row-n{font-size:12.5px;font-weight:800;display:flex;align-items:center;gap:4px;flex-wrap:wrap}' +
  '.fd-row-u{font-size:10px;color:#64748b;font-weight:600;margin-top:1px}' +
  '.fd-row-acts{display:flex;gap:4px;flex-shrink:0}' +
  '.fd-row-btn{width:30px;height:30px;border-radius:8px;border:none;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center}' +
  '.fd-row-btn.edit{background:#eff6ff;color:#1e40af}' +
  '.fd-row-btn.delete{background:#fef2f2;color:#ef4444}' +
  '.fd-row-btn.lock{background:#ecfdf5;color:#10b981}' +
  '.fd-row-btn.unlock{background:#fffbeb;color:#f59e0b}' +
  '.fd-badge-locked{display:inline-flex;align-items:center;gap:3px;font-size:9px;font-weight:800;padding:2px 6px;border-radius:9999px;background:#ecfdf5;color:#166534}' +
  '.fd-info-box{background:#eff6ff;color:#1e40af;padding:10px 12px;border-radius:12px;font-size:11px;font-weight:700;margin-bottom:12px;line-height:1.7;border-right:3px solid #3b82f6}' +
  '.fd-check{display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer}' +
  '.fd-check input{width:18px;height:18px;accent-color:#10b981}' +
  '.fd-colors{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}' +
  '.fd-color{width:26px;height:26px;border-radius:50%;cursor:pointer;border:2.5px solid transparent}' +
  '.fd-color.on{border-color:#fff;box-shadow:0 0 0 1.5px #0f172a;transform:scale(1.1)}' +
  '.fd-ing-row{display:grid;grid-template-columns:2fr 1fr 1fr 1fr 30px;gap:5px;align-items:center;margin-bottom:6px}' +
  '.fd-ing-row .fd-fs,.fd-ing-row .fd-fi{padding:8px 10px;font-size:11.5px;height:38px;line-height:36px}' +
  '.fd-ing-del{width:30px;height:38px;border-radius:8px;border:none;background:#fef2f2;color:#ef4444;font-size:11px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}' +
  '@media (max-width:480px){.fd-ing-row{grid-template-columns:1.5fr 1fr 1fr 30px}.fd-ing-row .fd-ing-price{display:none}}';

  var s = document.createElement('style');
  s.id = 'fd-styles';
  s.textContent = css;
  document.head.appendChild(s);
}

/* ═══════ Render Page ═══════ */
function renderPage(){
  ensureDefaults();

  var formulas = getFormulas();
  var feedItems = getItems();
  var avgPrice = feedItems.length > 0
    ? Math.round(feedItems.reduce(function(s, i){ return s + (i.price || 0); }, 0) / feedItems.length)
    : 0;
  var totalKg = formulas.reduce(function(s, f){ return s + (f.totalKg || 0); }, 0);

  var filtered = _state.filter === 'all'
    ? formulas
    : formulas.filter(function(f){ return f.type === _state.filter; });

  return '<div class="page fd-page" data-fd-root>' +
    '<div class="fd-header">' +
      '<div><div class="fd-title">📊 فرمول‌های جیره</div>' +
      '<div class="fd-sub">' + fa(formulas.length) + ' فرمول</div></div>' +
      '<button class="fd-add" data-fd="open-form">➕ <span>فرمول جدید</span></button>' +
    '</div>' +
    '<div class="fd-summary">' +
      '<div class="fd-sum g"><div class="fd-sum-ic">📊</div><div class="fd-sum-v">' + fa(formulas.length) + '</div><div class="fd-sum-l">فرمول</div></div>' +
      '<div class="fd-sum b"><div class="fd-sum-ic">🌾</div><div class="fd-sum-v">' + fa(feedItems.length) + '</div><div class="fd-sum-l">قلم</div></div>' +
      '<div class="fd-sum o"><div class="fd-sum-ic">💰</div><div class="fd-sum-v">' + fmtShort(avgPrice) + '</div><div class="fd-sum-l">میانگین</div></div>' +
      '<div class="fd-sum p"><div class="fd-sum-ic">⚖️</div><div class="fd-sum-v">' + fa(totalKg) + '</div><div class="fd-sum-l">وزن کل</div></div>' +
    '</div>' +
    '<div class="fd-tabs">' +
      '<button class="fd-tab ' + (_state.filter === 'all' ? 'on' : '') + '" data-fd="filter" data-f="all">همه</button>' +
      getTypes().map(function(t){
        return '<button class="fd-tab ' + (_state.filter === t.name ? 'on' : '') + '" data-fd="filter" data-f="' + esc(t.name) + '">' + (t.icon || '🏷️') + ' ' + esc(t.name) + '</button>';
      }).join('') +
    '</div>' +
    '<div data-fd-list>' + renderList(filtered) + '</div>' +
  '</div>';
}

function renderList(formulas){
  if(!formulas || formulas.length === 0){
    return '<div class="fd-empty">' +
      '<div class="fd-empty-ic">🌾</div>' +
      '<div class="fd-empty-t">هنوز فرمولی ثبت نشده</div>' +
      '<div class="fd-empty-x">اولین فرمول جیره‌ات رو بساز</div>' +
      '<button class="fd-add" style="margin:0 auto" data-fd="open-form">➕ فرمول جدید</button>' +
    '</div>';
  }
  var out = '';
  for(var i = 0; i < formulas.length; i++) out += renderCard(formulas[i]);
  return out;
}

function calcStats(f){
  var feedItems = getItems();
  var totalPct = 0, totalCost = 0, totalWeight = 0;
  var ingr = f.ingredients || [];
  for(var i = 0; i < ingr.length; i++){
    var it = ingr[i];
    var item = null;
    for(var k = 0; k < feedItems.length; k++) if(feedItems[k].name === it.name){ item = feedItems[k]; break; }
    if(!item) continue;
    var pct = +it.pct || 0;
    var kg = (f.totalKg || 100) * pct / 100;
    totalPct += pct;
    totalWeight += kg;
    totalCost += kg * (item.price || 0);
  }
  var avgPrice = totalWeight > 0 ? totalCost / totalWeight : 0;
  return { totalPct: totalPct, totalCost: totalCost, totalWeight: totalWeight, avgPrice: avgPrice };
}

function renderCard(f){
  var types = getTypes();
  var feedItems = getItems();
  var itemCats = getItemCats();
  var type = null;
  for(var i = 0; i < types.length; i++) if(types[i].name === f.type){ type = types[i]; break; }
  if(!type) type = { color: '#0f766e', icon: '🌾' };

  var stats = calcStats(f);
  var pctStatus = Math.abs(stats.totalPct - 100) < 0.5 ? 'ok' : Math.abs(stats.totalPct - 100) < 2 ? 'warn' : 'bad';

  var statsHtml =
    '<span class="fd-stat g">⚖️ <strong>' + fa(f.totalKg || 100) + 'kg</strong></span>' +
    '<span class="fd-stat p">📊 <strong>' + stats.totalPct.toFixed(1) + '٪</strong></span>' +
    '<span class="fd-stat o">💰 <strong>' + fmtShort(stats.totalCost) + '</strong></span>' +
    '<span class="fd-stat b">📦 <strong>' + fa((f.ingredients || []).length) + ' قلم</strong></span>';

  var rows = '';
  for(var r = 0; r < (f.ingredients || []).length; r++){
    var it = f.ingredients[r];
    var item = null;
    for(var k = 0; k < feedItems.length; k++) if(feedItems[k].name === it.name){ item = feedItems[k]; break; }
    if(!item) continue;
    var pct = +it.pct || 0;
    var kg = (f.totalKg || 100) * pct / 100;
    var cost = kg * (item.price || 0);
    var cat = null;
    for(var c = 0; c < itemCats.length; c++) if(itemCats[c].name === item.category){ cat = itemCats[c]; break; }
    rows += '<tr>' +
      '<td class="name-col"><span style="color:' + (cat ? cat.color : '#64748b') + '">' + (cat ? cat.icon : '🌾') + '</span> ' + esc(it.name) + '</td>' +
      '<td>' + pct.toFixed(1) + '٪</td>' +
      '<td>' + fa(item.price) + '</td>' +
      '<td>' + kg.toFixed(1) + '</td>' +
      '<td>' + fmtShort(cost) + '</td>' +
    '</tr>';
  }

  var table = '<table class="fd-table">' +
    '<thead><tr><th>قلم</th><th>٪</th><th>قیمت/kg</th><th>وزن</th><th>هزینه</th></tr></thead>' +
    '<tbody>' + rows +
    '<tr class="total-row"><td class="name-col">📊 جمع</td><td>' + stats.totalPct.toFixed(1) + '٪</td><td>—</td><td>' + stats.totalWeight.toFixed(1) + '</td><td>' + fmtShort(stats.totalCost) + '</td></tr>' +
    '</tbody></table>';

  var alertHtml = '';
  var diff = Math.abs(stats.totalPct - 100);
  if(diff <= 0.5) alertHtml = '<div class="fd-alert ok">✅ دقیقاً ۱۰۰٪</div>';
  else if(diff <= 2) alertHtml = '<div class="fd-alert">⚠️ ' + stats.totalPct.toFixed(1) + '٪ — کمی دور از ۱۰۰</div>';
  else alertHtml = '<div class="fd-alert bad">❌ ' + stats.totalPct.toFixed(1) + '٪ — اختلاف زیاد</div>';

  var isExpanded = !!_state.expanded[sid(f.id)];

  return '<div class="fd-card ' + (isExpanded ? 'expanded' : '') + '" data-fid="' + sid(f.id) + '" style="border-right-color:' + type.color + '">' +
    '<div class="fd-card-hd" data-fd="toggle" data-id="' + sid(f.id) + '">' +
      '<div class="fd-hd-content">' +
        '<div class="fd-hd-row1">' +
          '<span style="font-size:14px">' + (type.icon || '🌾') + '</span>' +
          '<div class="fd-name">' + esc(f.name) + '</div>' +
          '<span class="fd-type-badge">' + esc(f.type || '—') + '</span>' +
        '</div>' +
        '<div class="fd-hd-row2">' + statsHtml + '</div>' +
      '</div>' +
      '<button class="fd-toggle" type="button">▼</button>' +
    '</div>' +
    '<div class="fd-card-bd">' +
      '<div class="fd-nutrients">' +
        '<div class="fd-nutrient p"><div class="fd-nutrient-l">🥩 پروتئین</div><div class="fd-nutrient-v">' + (f.protein || '—') + '٪</div></div>' +
        '<div class="fd-nutrient o"><div class="fd-nutrient-l">🔥 انرژی</div><div class="fd-nutrient-v">' + (f.energy ? fa(f.energy) : '—') + '</div></div>' +
        '<div class="fd-nutrient b"><div class="fd-nutrient-l">🦴 کلسیم</div><div class="fd-nutrient-v">' + (f.calcium || '—') + '٪</div></div>' +
        '<div class="fd-nutrient g"><div class="fd-nutrient-l">⚗️ فسفر</div><div class="fd-nutrient-v">' + (f.phosphorus || '—') + '٪</div></div>' +
        '<div class="fd-nutrient"><div class="fd-nutrient-l">🌾 فیبر</div><div class="fd-nutrient-v">' + (f.fiber || '—') + '٪</div></div>' +
        '<div class="fd-nutrient"><div class="fd-nutrient-l">💰 میانگین</div><div class="fd-nutrient-v">' + fmtShort(stats.avgPrice) + '</div></div>' +
      '</div>' +
      alertHtml +
      '<div class="fd-pct-bar"><div class="fd-pct-fill ' + pctStatus + '" style="width:' + Math.min(100, stats.totalPct) + '%"></div></div>' +
      table +
      (f.suitable || f.notes ?
        '<div style="background:#f1f5f9;padding:6px 8px;border-radius:6px;margin-bottom:6px;border-right:2px solid #0f766e">' +
          (f.suitable ? '<div style="font-size:10.5px;font-weight:800;color:#0f766e;margin-bottom:' + (f.notes ? '4px' : '0') + '">🎯 مناسب برای: ' + esc(f.suitable) + '</div>' : '') +
          (f.notes ? '<div style="font-size:10.5px;color:#64748b;font-weight:600">📝 ' + esc(f.notes) + '</div>' : '') +
        '</div>' : '') +
      '<div class="fd-actions">' +
        '<button class="fd-act-edit" data-fd="edit" data-id="' + sid(f.id) + '">✏️ ویرایش</button>' +
        '<button class="fd-act-copy" data-fd="copy" data-id="' + sid(f.id) + '">📋 کپی</button>' +
        '<button class="fd-act-del" data-fd="delete" data-id="' + sid(f.id) + '">🗑️ حذف</button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function refreshList(){
  var el = document.querySelector('[data-fd-list]');
  if(!el) return;
  var formulas = getFormulas();
  var filtered = _state.filter === 'all' ? formulas : formulas.filter(function(f){ return f.type === _state.filter; });
  el.innerHTML = renderList(filtered);
}

function renderRoot(){
  var root = document.querySelector('[data-fd-root]');
  if(!root) return;
  var fresh = document.createElement('div');
  fresh.innerHTML = renderPage();
  root.parentNode.replaceChild(fresh.firstElementChild, root);
}

/* ═══════ Form ═══════ */
function openForm(editId){
  editId = editId ? sid(editId) : null;
  var edit = editId ? Store.find('feedFormulas', editId) : null;
  var feedItems = getItems();
  var types = getTypes();

  _editingFormulaId = editId;
  _formItems = edit && edit.ingredients
    ? edit.ingredients.map(function(i){ return { name: i.name, pct: i.pct }; })
    : [{ name: feedItems[0] ? feedItems[0].name : '', pct: 0 }];

  var html = '<div class="fd-modal-hd">' +
    '<div class="fd-modal-t">' + (edit ? '✏️ ویرایش فرمول' : '🌾 فرمول جدید') + '</div>' +
    '<button class="fd-modal-x" data-fd="close-modal" data-mid="fd-form">✕</button>' +
  '</div>' +

  '<div class="fd-sec">' +
    '<div class="fd-sec-hd"><div class="fd-sec-ic" style="background:#ecfdf5">📝</div>' +
    '<div><div class="fd-sec-t" style="color:#10b981">اطلاعات پایه</div></div></div>' +
    '<div class="fd-fr">' +
      '<div class="fd-fg"><label class="fd-fl">📝 نام فرمول</label>' +
        '<input class="fd-fi" type="text" id="fd-name" placeholder="مثلاً: جیره آغازین" value="' + (edit ? esc(edit.name || '') : '') + '"></div>' +
      '<div class="fd-fg"><label class="fd-fl">🏷️ نوع <span class="fd-fl-hint" data-fd="open-type-mgr">مدیریت</span></label>' +
        '<div class="fd-iwb">' +
          '<select class="fd-fs" id="fd-type">' +
            types.map(function(t){ return '<option value="' + esc(t.name) + '" ' + (edit && edit.type === t.name ? 'selected' : '') + '>' + (t.icon || '🏷️') + ' ' + esc(t.name) + '</option>'; }).join('') +
          '</select>' +
          '<button type="button" class="fd-ibtn" data-fd="open-add-type">➕</button>' +
        '</div></div>' +
    '</div>' +
  '</div>' +

  '<div class="fd-sec">' +
    '<div class="fd-sec-hd"><div class="fd-sec-ic" style="background:#fef3c7">🌾</div>' +
    '<div style="flex:1"><div class="fd-sec-t" style="color:#f59e0b">اقلام جیره ' +
      '<span class="fd-fl-hint" data-fd="open-item-mgr">مدیریت اقلام</span></div>' +
      '<div style="font-size:10px;color:#64748b">درصد هر قلم باید ۱۰۰ بشه</div></div></div>' +

    '<div class="fd-fg"><label class="fd-fl">⚖️ کل وزن جیره <span class="fd-fl-hint">کیلوگرم</span></label>' +
      '<input class="fd-fi" type="number" id="fd-total" placeholder="۱۰۰" value="' + (edit ? (edit.totalKg || 100) : 100) + '"></div>' +

    '<div id="fd-items-list" style="display:flex;flex-direction:column;gap:4px;margin-bottom:8px"></div>' +

    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">' +
      '<button type="button" class="fd-btn fd-btn-s" data-fd="add-item" style="font-size:12px;padding:8px">➕ افزودن قلم</button>' +
      '<button type="button" class="fd-btn fd-btn-g" data-fd="open-add-item" style="font-size:12px;padding:8px">🆕 قلم جدید</button>' +
    '</div>' +

    '<div style="margin-top:12px">' +
      '<div style="display:flex;justify-content:space-between;font-size:10px;font-weight:800;color:#64748b;margin-bottom:4px"><span>📊 جمع درصد</span><span id="fd-pct-display">۰٪</span></div>' +
      '<div class="fd-pct-bar"><div class="fd-pct-fill ok" id="fd-pct-bar" style="width:0%"></div></div>' +
      '<div id="fd-pct-alert"></div>' +
    '</div>' +
  '</div>' +

  '<div class="fd-sec">' +
    '<div class="fd-sec-hd"><div class="fd-sec-ic" style="background:#f5f3ff">🧪</div>' +
    '<div><div class="fd-sec-t" style="color:#8b5cf6">مواد مغذی</div></div></div>' +
    '<div class="fd-fr">' +
      '<div class="fd-fg"><label class="fd-fl">🥩 پروتئین %</label>' +
        '<input class="fd-fi" type="number" step="0.1" id="fd-protein" placeholder="۲۰" value="' + (edit ? (edit.protein || '') : '') + '"></div>' +
      '<div class="fd-fg"><label class="fd-fl">🔥 انرژی kcal/kg</label>' +
        '<input class="fd-fi" type="number" id="fd-energy" placeholder="۲۸۰۰" value="' + (edit ? (edit.energy || '') : '') + '"></div>' +
    '</div>' +
    '<div class="fd-fr3">' +
      '<div class="fd-fg"><label class="fd-fl">🦴 کلسیم %</label>' +
        '<input class="fd-fi" type="number" step="0.1" id="fd-calcium" value="' + (edit ? (edit.calcium || '') : '') + '"></div>' +
      '<div class="fd-fg"><label class="fd-fl">⚗️ فسفر %</label>' +
        '<input class="fd-fi" type="number" step="0.1" id="fd-phosphorus" value="' + (edit ? (edit.phosphorus || '') : '') + '"></div>' +
      '<div class="fd-fg"><label class="fd-fl">🌾 فیبر %</label>' +
        '<input class="fd-fi" type="number" step="0.1" id="fd-fiber" value="' + (edit ? (edit.fiber || '') : '') + '"></div>' +
    '</div>' +
    '<div class="fd-fg"><label class="fd-fl">🎯 مناسب برای</label>' +
      '<input class="fd-fi" type="text" id="fd-suitable" value="' + (edit ? esc(edit.suitable || '') : '') + '"></div>' +
  '</div>' +

  '<div class="fd-fg"><label class="fd-fl">📝 یادداشت</label>' +
    '<textarea class="fd-ft" id="fd-notes">' + (edit ? esc(edit.notes || '') : '') + '</textarea></div>' +

  '<button class="fd-save" data-fd="save" data-id="' + (editId || '') + '">💾 ذخیره فرمول</button>';

  openModal('fd-form', html);
  renderItemsList();
  setTimeout(function(){
    var totalInput = document.getElementById('fd-total');
    if(totalInput) totalInput.addEventListener('input', renderItemsList);
  }, 100);
}

function renderItemsList(){
  var el = document.getElementById('fd-items-list');
  if(!el) return;
  var feedItems = getItems();
  if(feedItems.length === 0){
    el.innerHTML = '<div style="padding:10px;text-align:center;color:#64748b;font-size:11px">اول قلم بساز</div>';
    return;
  }
  var totalInput = document.getElementById('fd-total');
  var totalKg = totalInput ? (+totalInput.value || 100) : 100;

  var out = '';
  for(var i = 0; i < _formItems.length; i++){
    var it = _formItems[i];
    var opts = '';
    for(var k = 0; k < feedItems.length; k++){
      var fi = feedItems[k];
      opts += '<option value="' + esc(fi.name) + '" ' + (it.name === fi.name ? 'selected' : '') + '>' + esc(fi.name) + '</option>';
    }
    var curPrice = 0;
    for(k = 0; k < feedItems.length; k++) if(feedItems[k].name === it.name){ curPrice = feedItems[k].price || 0; break; }
    var curCost = Math.round(((+it.pct || 0) / 100) * totalKg * curPrice);

    out += '<div class="fd-ing-row">' +
      '<select class="fd-fs" data-fd="ing-name" data-i="' + i + '">' + opts + '</select>' +
      '<input class="fd-fi" type="number" step="0.1" placeholder="٪" value="' + (it.pct || '') + '" data-fd="ing-pct" data-i="' + i + '">' +
      '<input class="fd-fi fd-ing-price" type="text" readonly value="' + fa(curPrice) + '" style="background:#f1f5f9;font-size:11px;text-align:center">' +
      '<input class="fd-fi fd-ing-cost" type="text" readonly value="' + fmtShort(curCost) + '" style="background:#f1f5f9;font-size:11px;text-align:center">' +
      '<button type="button" class="fd-ing-del" data-fd="remove-item" data-i="' + i + '">✕</button>' +
    '</div>';
  }
  el.innerHTML = out;
  updatePctBar();
}

function updatePctBar(){
  var total = 0;
  for(var i = 0; i < _formItems.length; i++) total += (+_formItems[i].pct || 0);
  var display = document.getElementById('fd-pct-display');
  var bar = document.getElementById('fd-pct-bar');
  var alertEl = document.getElementById('fd-pct-alert');
  if(display) display.textContent = total.toFixed(1) + '٪';
  if(bar){
    bar.style.width = Math.min(100, total) + '%';
    bar.className = 'fd-pct-fill ' + (Math.abs(total - 100) < 0.5 ? 'ok' : Math.abs(total - 100) < 2 ? 'warn' : 'bad');
  }
  if(alertEl){
    var diff = Math.abs(total - 100);
    if(diff <= 0.5) alertEl.innerHTML = '<div class="fd-alert ok">✅ دقیقاً ۱۰۰٪</div>';
    else if(diff <= 2) alertEl.innerHTML = '<div class="fd-alert">⚠️ ' + total.toFixed(1) + '٪</div>';
    else alertEl.innerHTML = '<div class="fd-alert bad">❌ ' + total.toFixed(1) + '٪</div>';
  }
}

function saveFormula(editId){
  editId = editId ? sid(editId) : null;
  var name = document.getElementById('fd-name').value.trim();
  if(!name){ toast('❌ نام فرمول', 'error'); return; }
  var totalKg = +document.getElementById('fd-total').value || 100;

  var cleanedItems = [];
  for(var i = 0; i < _formItems.length; i++){
    if(_formItems[i].name && (+_formItems[i].pct || 0) > 0){
      cleanedItems.push({ name: _formItems[i].name, pct: +_formItems[i].pct || 0 });
    }
  }
  if(cleanedItems.length === 0){ toast('❌ حداقل یک قلم', 'error'); return; }

  var payload = {
    name: name,
    type: document.getElementById('fd-type').value,
    totalKg: totalKg,
    ingredients: cleanedItems,
    protein: +document.getElementById('fd-protein').value || 0,
    energy: +document.getElementById('fd-energy').value || 0,
    calcium: +document.getElementById('fd-calcium').value || 0,
    phosphorus: +document.getElementById('fd-phosphorus').value || 0,
    fiber: +document.getElementById('fd-fiber').value || 0,
    suitable: document.getElementById('fd-suitable').value.trim(),
    notes: document.getElementById('fd-notes').value.trim()
  };

  if(editId){
    Store.update('feedFormulas', editId, payload);
    toast('✅ ویرایش شد', 'success');
  } else {
    Store.add('feedFormulas', payload);
    toast('✅ ثبت شد', 'success');
  }
  closeModal('fd-form');
  renderRoot();
}

function copyFormula(id){
  var f = Store.find('feedFormulas', id);
  if(!f) return;
  var copy = JSON.parse(JSON.stringify(f));
  delete copy.id;
  delete copy.createdAt;
  copy.name = (f.name || '') + ' (کپی)';
  Store.add('feedFormulas', copy);
  toast('📋 کپی شد', 'success');
  renderRoot();
}

function deleteFormula(id){
  var f = Store.find('feedFormulas', id);
  if(!f) return;
  if(!confirm('فرمول «' + f.name + '» حذف شود؟')) return;
  Store.remove('feedFormulas', id);
  toast('🗑️', 'success');
  renderRoot();
}

/* ═══════ Type Manager ═══════ */
function renderTypeRow(t){
  var cls = 'fd-row' + (t.isLocked ? ' locked' : '');
  var icon = t.isLocked ? '🔒' : (t.icon || '🏷️');
  var badge = t.isLocked ? '<span class="fd-badge-locked">🔒</span>' : '';
  var acts = t.isLocked
    ? '<button class="fd-row-btn unlock" data-fd="unlock-type" data-id="' + sid(t.id) + '">🔓</button>'
    : '<button class="fd-row-btn edit" data-fd="edit-type" data-id="' + sid(t.id) + '">✏️</button>' +
      '<button class="fd-row-btn lock" data-fd="lock-type" data-id="' + sid(t.id) + '">🔒</button>' +
      '<button class="fd-row-btn delete" data-fd="del-type" data-id="' + sid(t.id) + '">🗑️</button>';
  return '<div class="' + cls + '" style="border-right-color:' + (t.color || '#10b981') + '">' +
    '<div class="fd-row-ic" style="background:' + (t.color || '#10b981') + '22;color:' + (t.color || '#10b981') + '">' + icon + '</div>' +
    '<div class="fd-row-info"><div class="fd-row-n">' + esc(t.name) + ' ' + badge + '</div>' +
    '<div class="fd-row-u">' + esc(t.suitable || '—') + '</div></div>' +
    '<div class="fd-row-acts">' + acts + '</div></div>';
}
function openTypeManager(){
  var types = getTypes();
  var html = '<div class="fd-modal-hd"><div class="fd-modal-t">🏷️ مدیریت انواع فرمول</div>' +
    '<button class="fd-modal-x" data-fd="close-modal" data-mid="fd-type-mgr">✕</button></div>' +
    '<div class="fd-info-box">💡 مثل: آغازین، رشد، تخم‌گذار، پرواری</div>' +
    '<button class="fd-btn fd-btn-g" data-fd="open-add-type" style="margin-bottom:12px">➕ نوع جدید</button>' +
    '<div class="fd-list">' + types.map(renderTypeRow).join('') + '</div>';
  var ex = _modals['fd-type-mgr'];
  if(ex){ try{ ex.remove(); }catch(e){} delete _modals['fd-type-mgr']; }
  openModal('fd-type-mgr', html);
}
function refreshTypeMgr(){
  var el = document.querySelector('[data-modal-id="fd-type-mgr"] .fd-list');
  if(el) el.innerHTML = getTypes().map(renderTypeRow).join('');
}
function openTypeEdit(id){
  id = id ? sid(id) : null;
  _editingTypeId = id;
  var t = id ? Store.find('feedTypes', id) : null;
  if(t && t.isLocked){ toast('🔒', 'error'); return; }
  _selectedTypeColor = t ? (t.color || '#10b981') : '#10b981';
  var colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
  var colorsHtml = '';
  for(var i = 0; i < colors.length; i++) colorsHtml += '<div class="fd-color ' + (colors[i] === _selectedTypeColor ? 'on' : '') + '" data-color="' + colors[i] + '" style="background:' + colors[i] + '"></div>';

  var html = '<div class="fd-modal-hd"><div class="fd-modal-t">' + (id ? '✏️' : '🏷️ نوع جدید') + '</div>' +
    '<button class="fd-modal-x" data-fd="close-modal" data-mid="fd-type-edit">✕</button></div>' +
    '<div class="fd-fg"><label class="fd-fl">نام نوع</label><input class="fd-fi" id="t-name" value="' + (t ? esc(t.name) : '') + '"></div>' +
    '<div class="fd-fg"><label class="fd-fl">🎨 رنگ</label><div class="fd-colors" data-type-colors>' + colorsHtml + '</div></div>' +
    '<div class="fd-fg"><label class="fd-fl">🎯 مناسب برای</label><input class="fd-fi" id="t-suitable" value="' + (t ? esc(t.suitable || '') : '') + '"></div>' +
    '<div class="fd-fg"><label class="fd-check"><input type="checkbox" id="t-lock"> <span>🔒 قفل بعد از ذخیره</span></label></div>' +
    '<button class="fd-save" data-fd="save-type">💾 ذخیره</button>';
  openModal('fd-type-edit', html, { sheet: true });
}
function saveTypeEdit(){
  var name = document.getElementById('t-name').value.trim();
  var suitable = document.getElementById('t-suitable').value.trim();
  var lock = document.getElementById('t-lock').checked;
  if(!name){ toast('❌ نام', 'error'); return; }
  var all = getTypes();
  for(var i = 0; i < all.length; i++){
    if(all[i].name.trim() === name && !sameId(all[i].id, _editingTypeId)){ toast('⚠️ تکراری', 'error'); return; }
  }
  if(_editingTypeId){
    Store.update('feedTypes', _editingTypeId, { name: name, color: _selectedTypeColor, suitable: suitable, isLocked: lock });
    toast('✅', 'success');
  } else {
    Store.add('feedTypes', { name: name, color: _selectedTypeColor, icon: '🏷️', suitable: suitable, isLocked: lock });
    toast('✅', 'success');
  }
  closeModal('fd-type-edit');
  refreshTypeMgr();
  renderRoot();
  _editingTypeId = null;
}
function lockType(id){ var t = Store.find('feedTypes', id); if(!t || t.isLocked) return; Store.update('feedTypes', id, { isLocked: true }); toast('🔒'); refreshTypeMgr(); renderRoot(); }
function unlockType(id){ var t = Store.find('feedTypes', id); if(!t || !t.isLocked) return; Store.update('feedTypes', id, { isLocked: false }); toast('🔓'); refreshTypeMgr(); renderRoot(); }
function deleteType(id){
  var t = Store.find('feedTypes', id);
  if(!t || t.isLocked){ toast('🔒', 'error'); return; }
  var used = getFormulas().filter(function(f){ return f.type === t.name; }).length;
  if(used > 0 && !confirm('در ' + fa(used) + ' فرمول استفاده شده. حذف شود؟')) return;
  if(used === 0 && !confirm('حذف شود؟')) return;
  Store.remove('feedTypes', id); toast('🗑️', 'success'); refreshTypeMgr(); renderRoot();
}

/* ═══════ Item Manager ═══════ */
function renderItemRow(i){
  var cats = getItemCats();
  var cat = null;
  for(var k = 0; k < cats.length; k++) if(cats[k].name === i.category){ cat = cats[k]; break; }
  var cls = 'fd-row' + (i.isLocked ? ' locked' : '');
  var icon = i.isLocked ? '🔒' : (cat ? (cat.icon || '🌾') : '🌾');
  var badge = i.isLocked ? '<span class="fd-badge-locked">🔒</span>' : '';
  var acts = i.isLocked
    ? '<button class="fd-row-btn unlock" data-fd="unlock-item" data-id="' + sid(i.id) + '">🔓</button>'
    : '<button class="fd-row-btn edit" data-fd="edit-item" data-id="' + sid(i.id) + '">✏️</button>' +
      '<button class="fd-row-btn lock" data-fd="lock-item" data-id="' + sid(i.id) + '">🔒</button>' +
      '<button class="fd-row-btn delete" data-fd="del-item" data-id="' + sid(i.id) + '">🗑️</button>';
  return '<div class="' + cls + '" style="border-right-color:' + (cat ? cat.color : '#64748b') + '">' +
    '<div class="fd-row-ic" style="background:' + (cat ? cat.color : '#64748b') + '22;color:' + (cat ? cat.color : '#64748b') + '">' + icon + '</div>' +
    '<div class="fd-row-info"><div class="fd-row-n">' + esc(i.name) + ' ' + badge + '</div>' +
    '<div class="fd-row-u">' + (cat ? esc(cat.name) : '—') + ' | 💰 ' + fa(i.price || 0) + ' | 🥩 ' + (i.protein || 0) + '٪</div></div>' +
    '<div class="fd-row-acts">' + acts + '</div></div>';
}
function openItemManager(){
  var items = getItems();
  var html = '<div class="fd-modal-hd"><div class="fd-modal-t">🌾 مدیریت اقلام</div>' +
    '<button class="fd-modal-x" data-fd="close-modal" data-mid="fd-item-mgr">✕</button></div>' +
    '<div class="fd-info-box">💡 اقلام خوراک (ذرت، سویا، کنجاله...)</div>' +
    '<button class="fd-btn fd-btn-g" data-fd="open-add-item" style="margin-bottom:12px">➕ قلم جدید</button>' +
    '<div class="fd-list">' + items.map(renderItemRow).join('') + '</div>';
  var ex = _modals['fd-item-mgr'];
  if(ex){ try{ ex.remove(); }catch(e){} delete _modals['fd-item-mgr']; }
  openModal('fd-item-mgr', html);
}
function refreshItemMgr(){
  var el = document.querySelector('[data-modal-id="fd-item-mgr"] .fd-list');
  if(el) el.innerHTML = getItems().map(renderItemRow).join('');
}
function openItemEdit(id){
  id = id ? sid(id) : null;
  _editingItemId = id;
  var it = id ? Store.find('items', id) : null;
  if(it && it.isLocked){ toast('🔒', 'error'); return; }
  var cats = getItemCats();
  var html = '<div class="fd-modal-hd"><div class="fd-modal-t">' + (id ? '✏️' : '🌾 قلم جدید') + '</div>' +
    '<button class="fd-modal-x" data-fd="close-modal" data-mid="fd-item-edit">✕</button></div>' +
    '<div class="fd-fg"><label class="fd-fl">نام قلم</label><input class="fd-fi" id="it-name" value="' + (it ? esc(it.name) : '') + '"></div>' +
    '<div class="fd-fg"><label class="fd-fl">📂 دسته <span class="fd-fl-hint" data-fd="open-itemcat-mgr">مدیریت</span></label>' +
      '<div class="fd-iwb">' +
        '<select class="fd-fs" id="it-cat">' +
          cats.map(function(c){ return '<option value="' + esc(c.name) + '" ' + (it && it.category === c.name ? 'selected' : '') + '>' + (c.icon || '📂') + ' ' + esc(c.name) + '</option>'; }).join('') +
        '</select>' +
        '<button type="button" class="fd-ibtn" data-fd="open-add-itemcat">➕</button>' +
      '</div></div>' +
    '<div class="fd-fr">' +
      '<div class="fd-fg"><label class="fd-fl">💰 قیمت/kg</label>' +
        '<input class="fd-fi" type="text" inputmode="numeric" id="it-price" value="' + (it && it.price ? Number(it.price).toLocaleString('en-US') : '') + '"></div>' +
      '<div class="fd-fg"><label class="fd-fl">🥩 پروتئین %</label>' +
        '<input class="fd-fi" type="number" step="0.1" id="it-protein" value="' + (it ? (it.protein || 0) : 0) + '"></div>' +
    '</div>' +
    '<div class="fd-fg"><label class="fd-check"><input type="checkbox" id="it-lock"> <span>🔒 قفل بعد از ذخیره</span></label></div>' +
    '<button class="fd-save" data-fd="save-item">💾 ذخیره</button>';
  openModal('fd-item-edit', html, { sheet: true });
}
function saveItemEdit(){
  var name = document.getElementById('it-name').value.trim();
  var category = document.getElementById('it-cat').value;
  var price = +String(document.getElementById('it-price').value).replace(/[^\d]/g, '') || 0;
  var protein = +document.getElementById('it-protein').value || 0;
  var lock = document.getElementById('it-lock').checked;
  if(!name){ toast('❌ نام', 'error'); return; }
  var all = getItems();
  for(var i = 0; i < all.length; i++){
    if(all[i].name.trim() === name && !sameId(all[i].id, _editingItemId)){ toast('⚠️ تکراری', 'error'); return; }
  }
  if(_editingItemId){
    Store.update('items', _editingItemId, { name: name, category: category, price: price, protein: protein, isLocked: lock });
    toast('✅', 'success');
  } else {
    Store.add('items', { name: name, category: category, price: price, protein: protein, type: 'feed', unit: 'کیلوگرم', isLocked: lock });
    toast('✅', 'success');
  }
  closeModal('fd-item-edit');
  refreshItemMgr();
  renderRoot();
  _editingItemId = null;
}
function lockItem(id){ var it = Store.find('items', id); if(!it || it.isLocked) return; Store.update('items', id, { isLocked: true }); toast('🔒'); refreshItemMgr(); }
function unlockItem(id){ var it = Store.find('items', id); if(!it || !it.isLocked) return; Store.update('items', id, { isLocked: false }); toast('🔓'); refreshItemMgr(); }
function deleteItem(id){
  var it = Store.find('items', id);
  if(!it || it.isLocked){ toast('🔒', 'error'); return; }
  var used = getFormulas().filter(function(f){ return (f.ingredients || []).some(function(x){ return x.name === it.name; }); }).length;
  if(used > 0 && !confirm('در ' + fa(used) + ' فرمول استفاده شده. حذف شود؟')) return;
  if(used === 0 && !confirm('حذف شود؟')) return;
  Store.remove('items', id); toast('🗑️', 'success'); refreshItemMgr(); renderRoot();
}

/* ═══════ ItemCat Manager ═══════ */
function renderItemCatRow(c){
  var cnt = getItems().filter(function(i){ return i.category === c.name; }).length;
  var cls = 'fd-row' + (c.isLocked ? ' locked' : '');
  var acts = c.isLocked
    ? '<button class="fd-row-btn unlock" data-fd="unlock-itemcat" data-id="' + sid(c.id) + '">🔓</button>'
    : '<button class="fd-row-btn edit" data-fd="edit-itemcat" data-id="' + sid(c.id) + '">✏️</button>' +
      '<button class="fd-row-btn lock" data-fd="lock-itemcat" data-id="' + sid(c.id) + '">🔒</button>' +
      '<button class="fd-row-btn delete" data-fd="del-itemcat" data-id="' + sid(c.id) + '">🗑️</button>';
  return '<div class="' + cls + '" style="border-right-color:' + (c.color || '#10b981') + '">' +
    '<div class="fd-row-ic" style="background:' + (c.color || '#10b981') + '22;color:' + (c.color || '#10b981') + '">' + (c.icon || '📂') + '</div>' +
    '<div class="fd-row-info"><div class="fd-row-n">' + esc(c.name) + '</div>' +
    '<div class="fd-row-u">' + fa(cnt) + ' قلم</div></div>' +
    '<div class="fd-row-acts">' + acts + '</div></div>';
}
function openItemCatManager(){
  var cats = getItemCats();
  var html = '<div class="fd-modal-hd"><div class="fd-modal-t">📂 دسته‌های اقلام</div>' +
    '<button class="fd-modal-x" data-fd="close-modal" data-mid="fd-itemcat-mgr">✕</button></div>' +
    '<button class="fd-btn fd-btn-g" data-fd="open-add-itemcat" style="margin-bottom:12px">➕ دسته جدید</button>' +
    '<div class="fd-list">' + cats.map(renderItemCatRow).join('') + '</div>';
  var ex = _modals['fd-itemcat-mgr'];
  if(ex){ try{ ex.remove(); }catch(e){} delete _modals['fd-itemcat-mgr']; }
  openModal('fd-itemcat-mgr', html);
}
function refreshItemCatMgr(){
  var el = document.querySelector('[data-modal-id="fd-itemcat-mgr"] .fd-list');
  if(el) el.innerHTML = getItemCats().map(renderItemCatRow).join('');
}
function openItemCatEdit(id){
  id = id ? sid(id) : null;
  _editingItemCatId = id;
  var c = id ? Store.find('feedItemCats', id) : null;
  if(c && c.isLocked){ toast('🔒', 'error'); return; }
  _selectedItemCatColor = c ? (c.color || '#10b981') : '#10b981';
  var colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
  var colorsHtml = '';
  for(var i = 0; i < colors.length; i++) colorsHtml += '<div class="fd-color ' + (colors[i] === _selectedItemCatColor ? 'on' : '') + '" data-color="' + colors[i] + '" style="background:' + colors[i] + '"></div>';
  var html = '<div class="fd-modal-hd"><div class="fd-modal-t">' + (id ? '✏️' : '📂 دسته جدید') + '</div>' +
    '<button class="fd-modal-x" data-fd="close-modal" data-mid="fd-itemcat-edit">✕</button></div>' +
    '<div class="fd-fg"><label class="fd-fl">نام</label><input class="fd-fi" id="ic-name" value="' + (c ? esc(c.name) : '') + '"></div>' +
    '<div class="fd-fg"><label class="fd-fl">🎨 رنگ</label><div class="fd-colors" data-itemcat-colors>' + colorsHtml + '</div></div>' +
    '<button class="fd-save" data-fd="save-itemcat">💾 ذخیره</button>';
  openModal('fd-itemcat-edit', html, { sheet: true });
}
function saveItemCatEdit(){
  var name = document.getElementById('ic-name').value.trim();
  if(!name){ toast('❌ نام', 'error'); return; }
  var all = getItemCats();
  for(var i = 0; i < all.length; i++){
    if(all[i].name.trim() === name && !sameId(all[i].id, _editingItemCatId)){ toast('⚠️ تکراری', 'error'); return; }
  }
  if(_editingItemCatId){
    Store.update('feedItemCats', _editingItemCatId, { name: name, color: _selectedItemCatColor });
    toast('✅', 'success');
  } else {
    Store.add('feedItemCats', { name: name, color: _selectedItemCatColor, icon: '📂', isLocked: false });
    toast('✅', 'success');
  }
  closeModal('fd-itemcat-edit');
  refreshItemCatMgr();
  _editingItemCatId = null;
}
function lockItemCat(id){ var c = Store.find('feedItemCats', id); if(!c || c.isLocked) return; Store.update('feedItemCats', id, { isLocked: true }); toast('🔒'); refreshItemCatMgr(); }
function unlockItemCat(id){ var c = Store.find('feedItemCats', id); if(!c || !c.isLocked) return; Store.update('feedItemCats', id, { isLocked: false }); toast('🔓'); refreshItemCatMgr(); }
function deleteItemCat(id){
  var c = Store.find('feedItemCats', id);
  if(!c || c.isLocked){ toast('🔒', 'error'); return; }
  var used = getItems().filter(function(i){ return i.category === c.name; }).length;
  if(used > 0){ toast('❌ ' + fa(used) + ' قلم در این دسته', 'error'); return; }
  if(!confirm('حذف شود؟')) return;
  Store.remove('feedItemCats', id); toast('🗑️', 'success'); refreshItemCatMgr();
}

/* ═══════ Events ═══════ */
document.addEventListener('click', function(e){
  var colorOpt = e.target.closest ? e.target.closest('[data-type-colors] .fd-color') : null;
  if(colorOpt){
    _selectedTypeColor = colorOpt.dataset.color;
    var sib1 = colorOpt.parentElement.querySelectorAll('.fd-color');
    for(var i = 0; i < sib1.length; i++) sib1[i].classList.toggle('on', sib1[i] === colorOpt);
    return;
  }
  var colorOpt2 = e.target.closest ? e.target.closest('[data-itemcat-colors] .fd-color') : null;
  if(colorOpt2){
    _selectedItemCatColor = colorOpt2.dataset.color;
    var sib2 = colorOpt2.parentElement.querySelectorAll('.fd-color');
    for(var j = 0; j < sib2.length; j++) sib2[j].classList.toggle('on', sib2[j] === colorOpt2);
    return;
  }

  var btn = e.target.closest ? e.target.closest('[data-fd]') : null;
  if(!btn) return;
  var act = btn.dataset.fd;
  var id = sid(btn.dataset.id);
  var mid = btn.dataset.mid;
  var i = +btn.dataset.i;

  switch(act){
    case 'open-form': openForm(); break;
    case 'edit': e.stopPropagation(); openForm(id); break;
    case 'copy': e.stopPropagation(); copyFormula(id); break;
    case 'delete': e.stopPropagation(); deleteFormula(id); break;
    case 'toggle': {
      e.stopPropagation();
      _state.expanded[id] = !_state.expanded[id];
      var card = document.querySelector('.fd-card[data-fid="' + id + '"]');
      if(card) card.classList.toggle('expanded', !!_state.expanded[id]);
      break;
    }
    case 'filter': {
      e.stopPropagation();
      _state.filter = btn.dataset.f;
      renderRoot();
      break;
    }
    case 'close-modal': closeModal(mid); break;
    case 'save': saveFormula(btn.dataset.id); break;

    case 'add-item': {
      var feedItems = getItems();
      if(!feedItems.length){ toast('❌ اول قلم بساز', 'error'); openItemEdit(); break; }
      var used = _formItems.map(function(x){ return x.name; });
      var avail = null;
      for(var k = 0; k < feedItems.length; k++) if(used.indexOf(feedItems[k].name) < 0){ avail = feedItems[k]; break; }
      _formItems.push({ name: avail ? avail.name : feedItems[0].name, pct: 0 });
      renderItemsList();
      break;
    }
    case 'remove-item': {
      _formItems.splice(i, 1);
      if(_formItems.length === 0){
        var feedItems2 = getItems();
        _formItems.push({ name: feedItems2[0] ? feedItems2[0].name : '', pct: 0 });
      }
      renderItemsList();
      break;
    }

    case 'open-type-mgr': openTypeManager(); break;
    case 'open-add-type': openTypeEdit(); break;
    case 'edit-type': openTypeEdit(id); break;
    case 'save-type': saveTypeEdit(); break;
    case 'lock-type': lockType(id); break;
    case 'unlock-type': unlockType(id); break;
    case 'del-type': deleteType(id); break;

    case 'open-item-mgr': openItemManager(); break;
    case 'open-add-item': openItemEdit(); break;
    case 'edit-item': openItemEdit(id); break;
    case 'save-item': saveItemEdit(); break;
    case 'lock-item': lockItem(id); break;
    case 'unlock-item': unlockItem(id); break;
    case 'del-item': deleteItem(id); break;

    case 'open-itemcat-mgr': openItemCatManager(); break;
    case 'open-add-itemcat': openItemCatEdit(); break;
    case 'edit-itemcat': openItemCatEdit(id); break;
    case 'save-itemcat': saveItemCatEdit(); break;
    case 'lock-itemcat': lockItemCat(id); break;
    case 'unlock-itemcat': unlockItemCat(id); break;
    case 'del-itemcat': deleteItemCat(id); break;
  }
});

document.addEventListener('change', function(e){
  var t = e.target;
  if(t.dataset && t.dataset.fd === 'ing-name'){
    var idx = +t.dataset.i;
    if(_formItems[idx]) _formItems[idx].name = t.value;
    renderItemsList();
  }
});

document.addEventListener('input', function(e){
  var t = e.target;
  if(t.dataset && t.dataset.fd === 'ing-pct'){
    var idx = +t.dataset.i;
    if(_formItems[idx]) _formItems[idx].pct = +t.value || 0;
    updatePctBar();
  }
  if(t.id === 'it-price'){
    var v = String(t.value).replace(/[^\d]/g, '');
    t.value = v ? Number(v).toLocaleString('en-US') : '';
  }
});

/* ═══════ Init ═══════ */
injectStyles();

Router.register('feed', {
  title: 'خوراک',
  navPage: 'more',
  topLevel: true,
  render: function(){ return renderPage(); }
});

window.Feed = {
  openForm: openForm,
  save: saveFormula,
  edit: openForm,
  copy: copyFormula,
  deleteConfirm: deleteFormula,
  setFilter: function(f){ _state.filter = f; renderRoot(); },
  openTypeManager: openTypeManager,
  openItemManager: openItemManager,
  openItemCatManager: openItemCatManager
};

console.log('✅ feed route registered (v4.0 - Store v4)');

})();