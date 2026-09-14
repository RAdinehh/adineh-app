/* ═══════════════════════════════════════════════
   FLOCKS — گله + گروه + ادغام + سالن (v12.2)
   + چند پرنده در سالن (نوع + نژاد + گله + تعداد)
   + پر کردن خودکار تعداد از گله
   + پیکر رنگ سفارشی
   + فیلتر جمع‌وجور چندانتخابی
   + غیرفعال‌سازی موقت (آیکون پلی/توقف متوسط)
   ساخته شده توسط رضا آدینه
   ═══════════════════════════════════════════════ */
(function(){
'use strict';

console.log('🚀 flocks.js start');

if(typeof Router === 'undefined' || typeof Router.register !== 'function'){
  console.error('❌ Router not available');
  return;
}
if(window.__flocksModuleLoaded) return;
window.__flocksModuleLoaded = true;

var sid            = UI.sid;
var sameId         = UI.sameId;
var findBy         = UI.findBy;
var esc            = UI.esc;
var fa             = UI.fa;
var toFa           = UI.toFa;
var toEnDigits     = UI.toEnDigits;
var parseNum       = UI.parseNum;
var fmtThousandsInput = UI.fmtThousandsInput;
var toast          = UI.toast;

var jToC           = UI.jToC;
var jToG           = UI.jToG;
var daysInJMonth   = UI.daysInJMonth;
var FA_MONTHS      = UI.FA_MONTHS;
var todayJ         = UI.todayJ;
var todayStr       = UI.todayStr;
var todayC         = jToC(todayStr);

var NAMED_COLORS = {
  '#0f766e': 'سبز آدینه', '#3b82f6': 'آبی', '#f59e0b': 'نارنجی',
  '#ef4444': 'قرمز', '#8b5cf6': 'بنفش', '#10b981': 'سبز',
  '#ec4899': 'صورتی', '#06b6d4': 'فیروزه‌ای', '#a855f7': 'بنفش روشن'
};

var BUILTIN_FEATURES = [
  'تهویه', 'گرمایش', 'سرمایش', 'دانخوری خودکار', 'آبخوری خودکار',
  'روشنایی LED', 'پنجره', 'درب ضدعفونی', 'سیستم اتوماتیک', 'ژنراتور'
];

var uiState = {
  filters: [],
  sort: 'newest',
  expanded: {},
  groupExpanded: {},
  filterBoxOpen: false
};

var editingFlockId = null;
var editingHallId = null;
var editingBirdTypeId = null;
var hallFormEquipment = [];
var hallFormFeatures = [];
var hallFormBirds = [];
var hallActiveTab = 'base';
var selectedColor = '#3b82f6';
var isCustomColor = false;
var mergeSelectedIds = [];
var groupSelectedIds = [];
var calState = { y: todayJ.y, m: todayJ.m, sel: null, targetId: null };
var _modals = {};

/* ═══════════════════════════════════════════════
   Data Access
   ═══════════════════════════════════════════════ */
function getFlocks(){
  return Store.all('flocks').filter(function(f){ return !f.isDeleted; });
}
function getGroups(){ return Store.all('groups'); }
function getMerged(){ return Store.all('merged'); }
function getHalls(){ return Store.all('halls'); }
function getBirdTypes(){ return Store.all('birdTypes'); }
function getCustomFeatures(){ return Store.all('customFeatures'); }

function getFlockById(id){ return findBy(getFlocks(), id); }
function getGroupById(id){ return findBy(getGroups(), id); }
function getHallById(id){ return findBy(getHalls(), id); }
function getBirdTypeByName(name){
  var types = getBirdTypes();
  for(var i = 0; i < types.length; i++){
    if(types[i].name === name) return types[i];
  }
  return null;
}
function getBirdTypeColorByName(name){
  var types = getBirdTypes();
  for(var i = 0; i < types.length; i++){
    if(types[i].name === name) return types[i].color || '#3b82f6';
  }
  return '#94a3b8';
}

function getGroupMembers(g){
  var out = [];
  if(!g || !Array.isArray(g.flockIds)) return out;
  for(var i = 0; i < g.flockIds.length; i++){
    var f = getFlockById(g.flockIds[i]);
    if(f) out.push(f);
  }
  return out;
}
function getGroupStats(g){
  var m = getGroupMembers(g);
  var s = { alive: 0, deaths: 0, count: 0, maxAge: 0, minAge: 999999, members: m.length };
  for(var i = 0; i < m.length; i++){
    s.alive += m[i].alive || 0;
    s.deaths += m[i].deaths || 0;
    s.count += m[i].count || 0;
    var age = todayC - jToC(m[i].hatch || m[i].hatchDate);
    if(age > s.maxAge) s.maxAge = age;
    if(age < s.minAge) s.minAge = age;
  }
  if(s.minAge === 999999) s.minAge = 0;
  return s;
}
function isFlockInGroup(fid){
  var groups = getGroups();
  for(var i = 0; i < groups.length; i++){
    var ids = groups[i].flockIds || [];
    for(var j = 0; j < ids.length; j++){
      if(sameId(ids[j], fid)) return groups[i];
    }
  }
  return null;
}
function getUngroupedFlocks(){
  var all = getFlocks();
  var out = [];
  for(var i = 0; i < all.length; i++){
    if(!isFlockInGroup(all[i].id)) out.push(all[i]);
  }
  return out;
}
function getHallUsageCount(hallName){
  var flocks = getFlocks();
  var c = 0;
  for(var i = 0; i < flocks.length; i++){
    if(flocks[i].hall === hallName) c++;
  }
  return c;
}
function getAllFeatures(){
  var out = BUILTIN_FEATURES.slice();
  var custom = getCustomFeatures();
  for(var i = 0; i < custom.length; i++){
    if(out.indexOf(custom[i]) === -1) out.push(custom[i]);
  }
  return out;
}

/* ═══════════════════════════════════════════════
   فیلتر و مرتب‌سازی
   ═══════════════════════════════════════════════ */
function matchSingleFilter(f, filter){
  if(!filter || filter === 'all') return true;

  if(filter === 'status:active')   return !f.disabled;
  if(filter === 'status:inactive') return !!f.disabled;

  if(filter === 'groups')    return !!isFlockInGroup(f.id);
  if(filter === 'ungrouped') return !isFlockInGroup(f.id);
  if(filter === 'with-hall') return !!f.hall;
  if(filter === 'no-hall')   return !f.hall;

  if(filter.indexOf('hall:') === 0){
    return f.hall === filter.substring(5);
  }
  if(filter.indexOf('breed:') === 0){
    return f.birdType === filter.substring(6);
  }

  if(filter === 'age:young' || filter === 'age:mid' || filter === 'age:old'){
    var age = todayC - jToC(f.hatch || f.hatchDate);
    if(filter === 'age:young') return age <= 14;
    if(filter === 'age:mid')   return age > 14 && age <= 30;
    return age > 30;
  }

  if(filter.indexOf('health:') === 0){
    var cnt = f.count || f.initialCount || 0;
    var dth = f.deaths || 0;
    var pct = cnt > 0 ? (dth / cnt * 100) : 0;
    if(filter === 'health:good') return pct <= 5;
    if(filter === 'health:warn') return pct > 5 && pct <= 15;
    return pct > 15;
  }

  return true;
}

function matchFilters(f, filters){
  if(!filters || !filters.length) return true;
  for(var i = 0; i < filters.length; i++){
    if(matchSingleFilter(f, filters[i])) return true;
  }
  return false;
}

function sortFlocks(list, sortBy){
  var sorted = list.slice();
  if(sortBy === 'newest')         sorted.sort(function(a,b){ return jToC(b.hatch || b.hatchDate) - jToC(a.hatch || a.hatchDate); });
  else if(sortBy === 'oldest')    sorted.sort(function(a,b){ return jToC(a.hatch || a.hatchDate) - jToC(b.hatch || b.hatchDate); });
  else if(sortBy === 'count-desc')sorted.sort(function(a,b){ return (b.alive || 0) - (a.alive || 0); });
  else if(sortBy === 'count-asc') sorted.sort(function(a,b){ return (a.alive || 0) - (b.alive || 0); });
  else if(sortBy === 'name-asc')  sorted.sort(function(a,b){ return String(a.name || '').localeCompare(String(b.name || ''), 'fa'); });
  else if(sortBy === 'name-desc') sorted.sort(function(a,b){ return String(b.name || '').localeCompare(String(a.name || ''), 'fa'); });
  else if(sortBy === 'mortality-desc'){
    sorted.sort(function(a,b){
      var ca = a.count || a.initialCount || 0;
      var cb = b.count || b.initialCount || 0;
      var pa = ca > 0 ? (a.deaths || 0) / ca : 0;
      var pb = cb > 0 ? (b.deaths || 0) / cb : 0;
      return pb - pa;
    });
  }
  return sorted;
}

function getSingleFilterDisplay(filter){
  var labels = {
    'all':             { ic: '📋', name: 'همه' },
    'status:active':   { ic: '✅', name: 'فعال' },
    'status:inactive': { ic: '⏸️', name: 'غیرفعال' },
    'groups':          { ic: '🏠', name: 'گروه‌ها' },
    'ungrouped':       { ic: '🐔', name: 'بدون گروه' },
    'with-hall':       { ic: '🏢', name: 'با سالن' },
    'no-hall':         { ic: '🚫', name: 'بدون سالن' },
    'age:young':       { ic: '🐣', name: 'جوان' },
    'age:mid':         { ic: '🐔', name: 'میانسال' },
    'age:old':         { ic: '🐓', name: 'بالغ' },
    'health:good':     { ic: '✅', name: 'سالم' },
    'health:warn':     { ic: '⚠️', name: 'هشدار' },
    'health:bad':      { ic: '🚨', name: 'پرتلفات' }
  };
  if(labels[filter]) return labels[filter];
  if(filter.indexOf('hall:') === 0)  return { ic: '🏢', name: filter.substring(5) };
  if(filter.indexOf('breed:') === 0) return { ic: '🐔', name: filter.substring(6) };
  return labels.all;
}

function getFilterDisplay(filters){
  filters = filters || [];
  if(!filters.length) return { ic: '📋', name: 'همه' };
  if(filters.length === 1) return getSingleFilterDisplay(filters[0]);
  return { ic: '🎯', name: toFa(filters.length) + ' فیلتر' };
}

function getSortDisplay(sortBy){
  var labels = {
    'newest':         { ic: '⬇️', name: 'جدید' },
    'oldest':         { ic: '⬆️', name: 'قدیمی' },
    'count-desc':     { ic: '🔻', name: 'پرتعداد' },
    'count-asc':      { ic: '🔺', name: 'کم‌تعداد' },
    'name-asc':       { ic: '🔤', name: 'الف-ی' },
    'name-desc':      { ic: '🔤', name: 'ی-الف' },
    'mortality-desc': { ic: '📊', name: 'پرتلفات' }
  };
  return labels[sortBy] || labels.newest;
}

/* ═══════ Modal ═══════ */
function openModal(id, html, opts){
  opts = opts || {};
  if(_modals[id]) return _modals[id];
  var wrap = document.createElement('div');
  wrap.className = 'flk-modal-wrap';
  wrap.dataset.modalId = id;
  wrap.innerHTML = '<div class="flk-modal-bg" data-flk="close-modal" data-mid="' + id + '"></div>' +
    '<div class="flk-modal-box' + (opts.sheet ? ' flk-sheet' : '') + '">' + html + '</div>';
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
  if(document.getElementById('flk-styles')) return;
  var css =
  '.flk-page{padding:10px;max-width:760px;margin:0 auto}' +
  '.flk-header{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap}' +
  '.flk-title{font-size:14px;font-weight:900}' +
  '.flk-sub{font-size:10.5px;color:#64748b;font-weight:700;margin-top:1px}' +
  '.flk-header-actions{display:flex;gap:6px;align-items:center;flex-shrink:0;flex-wrap:wrap}' +
  '.flk-action-btn{color:#fff;border:none;padding:7px 11px;border-radius:9999px;font-family:inherit;font-size:11px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:4px;white-space:nowrap}' +
  '.flk-action-btn.group{background:linear-gradient(135deg,#3b82f6,#6366f1)}' +
  '.flk-action-btn.merge{background:linear-gradient(135deg,#f59e0b,#ef4444)}' +
  '.flk-action-btn.halls{background:linear-gradient(135deg,#8b5cf6,#a855f7)}' +
  '.flk-action-btn.birds{background:linear-gradient(135deg,#10b981,#059669)}' +
  '.flk-action-btn.add{background:linear-gradient(135deg,#0f766e,#14b8a6)}' +
  '.flk-summary{background:#fff;border-radius:12px;padding:10px;margin-bottom:10px;border:1px solid #e2e8f0;display:grid;grid-template-columns:repeat(4,1fr);gap:6px}' +
  '.flk-sum{background:#f1f5f9;border-radius:8px;padding:8px 4px;text-align:center;border-bottom:2px solid #0f766e}' +
  '.flk-sum.g{border-color:#10b981}.flk-sum.r{border-color:#ef4444}.flk-sum.b{border-color:#3b82f6}.flk-sum.o{border-color:#f59e0b}' +
  '.flk-sum-ic{font-size:14px;line-height:1;margin-bottom:2px}' +
  '.flk-sum-v{font-size:14px;font-weight:900;line-height:1.2}' +
  '.flk-sum-l{font-size:9.5px;color:#64748b;font-weight:700;margin-top:1px}' +
  '.flk-filter-box{position:relative;margin-bottom:10px}' +
  '.flk-filter-btn{background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;padding:8px 12px;font-family:inherit;font-size:11.5px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:6px;width:100%;justify-content:space-between;color:#0f172a;box-sizing:border-box;text-align:right}' +
  '.flk-filter-btn .fb-left{display:flex;align-items:center;gap:5px;min-width:0;flex:1}' +
  '.flk-filter-btn .fb-label{color:#0f766e;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
  '.flk-filter-btn .fb-sep{color:#cbd5e1;font-weight:300}' +
  '.flk-filter-btn .fb-sort{color:#64748b;font-weight:800;white-space:nowrap}' +
  '.flk-filter-btn .fb-count{font-size:9.5px;font-weight:900;background:#0f766e;color:#fff;padding:1px 6px;border-radius:9999px;flex-shrink:0}' +
  '.flk-filter-btn .fb-arrow{font-size:11px;color:#64748b;transition:transform .2s;flex-shrink:0}' +
  '.flk-filter-box.open .fb-arrow{transform:rotate(90deg)}' +
  '.flk-filter-menu{display:none;position:absolute;top:calc(100% + 5px);right:0;left:0;background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;box-shadow:0 8px 24px rgba(15,23,42,.14);z-index:80;padding:6px;max-height:58vh;overflow-y:auto}' +
  '.flk-filter-box.open .flk-filter-menu{display:block}' +
  '.flk-filter-sec{display:flex;align-items:center;gap:5px;padding:6px 4px 3px;font-size:9px;font-weight:900;color:#94a3b8;letter-spacing:.4px}' +
  '.flk-filter-sec:first-child{padding-top:2px}' +
  '.flk-filter-sec::after{content:"";flex:1;height:1px;background:#f1f5f9}' +
  '.flk-filter-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px}' +
  '.flk-fc{display:flex;align-items:center;justify-content:space-between;gap:4px;padding:7px 8px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:8px;font-size:10.5px;font-weight:800;color:#0f172a;cursor:pointer;min-width:0;transition:all .12s;user-select:none}' +
  '.flk-fc:active{transform:scale(.97)}' +
  '.flk-fc.on{background:linear-gradient(135deg,#ecfdf5,#d1fae5);border-color:#10b981;color:#065f46}' +
  '.flk-fc-lbl{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
  '.flk-fc-cnt{font-size:9px;font-weight:900;color:#64748b;background:#fff;padding:1px 5px;border-radius:9999px;flex-shrink:0;min-width:16px;text-align:center;border:1px solid #e2e8f0}' +
  '.flk-fc.on .flk-fc-cnt{background:#10b981;color:#fff;border-color:#10b981}' +
  '.flk-fc-badge{font-size:8.5px;font-weight:900;color:#10b981;flex-shrink:0}' +
  '.flk-filter-actions{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:6px 2px 2px;margin-top:4px;border-top:1px solid #f1f5f9}' +
  '.flk-filter-act{background:#f1f5f9;border:none;padding:7px;border-radius:8px;font-family:inherit;font-size:10.5px;font-weight:800;color:#64748b;cursor:pointer}' +
  '.flk-filter-act:hover{background:#e2e8f0}' +
  '.flk-filter-act.primary{background:#0f766e;color:#fff}' +
  '.flk-card{background:#fff;border-radius:12px;margin-bottom:6px;border:1px solid #e2e8f0;border-right:3px solid #0f766e;overflow:hidden;transition:opacity .2s,filter .2s}' +
  '.flk-card.disabled{opacity:.55;filter:grayscale(.35)}' +
  '.flk-card.disabled .flk-name{text-decoration:line-through;text-decoration-color:#94a3b8}' +
  '.flk-card-hd{display:flex;justify-content:space-between;align-items:flex-start;gap:6px;padding:8px 10px;cursor:pointer}' +
  '.flk-hd-content{flex:1;min-width:0}' +
  '.flk-hd-row1{display:flex;align-items:center;gap:6px;margin-bottom:5px;flex-wrap:wrap}' +
  '.flk-hd-btns{display:flex;gap:6px;align-items:center;flex-shrink:0}' +
  /* ✅ دکمه پلی/توقف — سایز متوسط */
  '.flk-disable-btn{background:#f1f5f9;border:none;width:32px;height:32px;border-radius:50%;font-size:16px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;padding:0;transition:background .15s,transform .1s}' +
  '.flk-disable-btn:active{transform:scale(.92)}' +
  '.flk-disable-btn.to-disable{background:#fffbeb}' +
  '.flk-disable-btn.to-disable:hover{background:#fef3c7}' +
  '.flk-disable-btn.to-enable{background:#ecfdf5}' +
  '.flk-disable-btn.to-enable:hover{background:#d1fae5}' +
  '.flk-disable-badge{font-size:8.5px;font-weight:900;background:#f1f5f9;color:#64748b;padding:1px 6px;border-radius:9999px;white-space:nowrap}' +
  '.flk-color-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;border:2px solid #fff;box-shadow:0 0 0 1px #e2e8f0}' +
  '.flk-name{font-size:12.5px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
  '.flk-hall-tag{font-size:9px;font-weight:800;background:#f5f3ff;color:#6b21a8;padding:1px 6px;border-radius:9999px}' +
  '.flk-merged-tag{font-size:9px;font-weight:800;background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:9999px}' +
  '.flk-hd-row2{display:flex;align-items:center;gap:5px;flex-wrap:wrap;font-size:10.5px}' +
  '.flk-stat{display:inline-flex;align-items:center;gap:2px;padding:2px 6px;border-radius:9999px;background:#f1f5f9;font-size:10px;font-weight:700;white-space:nowrap}' +
  '.flk-stat.r{background:#fef2f2;color:#991b1b}.flk-stat.g{background:#ecfdf5;color:#166534}' +
  '.flk-stat.b{background:#eff6ff;color:#1e40af}.flk-stat.o{background:#fffbeb;color:#92400e}.flk-stat.p{background:#f5f3ff;color:#6b21a8}' +
  '.flk-stat strong{font-weight:900;font-size:11px}' +
  '.flk-toggle{background:#f1f5f9;border:none;width:30px;height:30px;border-radius:50%;font-size:11px;font-weight:900;color:#0f766e;cursor:pointer;flex-shrink:0;transition:transform .3s,background .2s}' +
  '.flk-card.expanded .flk-toggle{transform:rotate(180deg);background:#0f766e;color:#fff}' +
  '.flk-card-bd{max-height:0;overflow:hidden;transition:max-height .35s,padding .35s;padding:0 10px}' +
  '.flk-card.expanded .flk-card-bd{max-height:900px;padding:8px 10px 10px;border-top:1px dashed #e2e8f0}' +
  '.flk-progress{margin-bottom:8px}' +
  '.flk-progress-info{display:flex;justify-content:space-between;font-size:10px;font-weight:800;color:#64748b;margin-bottom:4px}' +
  '.flk-progress-bar{height:6px;background:#f1f5f9;border-radius:3px;overflow:hidden}' +
  '.flk-progress-fill{height:100%;background:linear-gradient(90deg,#0f766e,#14b8a6);border-radius:3px;transition:width .3s}' +
  '.flk-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:8px}' +
  '.flk-box{background:#f1f5f9;border-radius:6px;padding:5px 6px;text-align:center;border-bottom:2px solid #cbd5e1}' +
  '.flk-box.r{border-color:#ef4444}.flk-box.g{border-color:#10b981}.flk-box.b{border-color:#3b82f6}.flk-box.o{border-color:#f59e0b}.flk-box.p{border-color:#8b5cf6}' +
  '.flk-box-l{font-size:9px;color:#64748b;font-weight:700;margin-bottom:1px}' +
  '.flk-box-v{font-size:12px;font-weight:900}' +
  '.flk-box.r .flk-box-v{color:#ef4444}.flk-box.g .flk-box-v{color:#10b981}.flk-box.b .flk-box-v{color:#3b82f6}.flk-box.o .flk-box-v{color:#f59e0b}.flk-box.p .flk-box-v{color:#8b5cf6}' +
  '.flk-chips{display:flex;flex-wrap:wrap;gap:3px;margin-bottom:6px}' +
  '.flk-chip{display:inline-flex;align-items:center;gap:3px;padding:3px 7px;border-radius:9999px;font-size:10px;font-weight:700;background:#f1f5f9}' +
  '.flk-chip.date{background:#eff6ff;color:#1e40af}.flk-chip.money{background:#ecfdf5;color:#166534}' +
  '.flk-actions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;padding-top:6px;border-top:1px dashed #e2e8f0}' +
  '.flk-actions button{padding:6px;border:none;border-radius:6px;font-family:inherit;font-size:10.5px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:3px}' +
  '.flk-act-edit{background:#eff6ff;color:#1e40af}' +
  '.flk-act-daily{background:#ecfdf5;color:#166534}' +
  '.flk-act-del{background:#fef2f2;color:#991b1b}' +
  '.flk-act-disable{background:#fffbeb;color:#92400e}' +
  '.flk-act-enable{background:#ecfdf5;color:#166534}' +
  '.flk-empty{text-align:center;padding:48px 24px;background:#fff;border-radius:12px;border:1px dashed #cbd5e1}' +
  '.flk-empty-ic{font-size:56px;line-height:1;display:block;margin-bottom:12px;opacity:.6}' +
  '.flk-empty-t{font-size:14px;font-weight:900;margin-bottom:6px}' +
  '.flk-empty-x{font-size:12px;color:#64748b;font-weight:600;margin:0 auto 16px;max-width:280px}' +
  '.flk-modal-wrap{position:fixed;inset:0;z-index:2000;display:flex;align-items:flex-end;justify-content:center;opacity:0;pointer-events:none;transition:opacity .2s}' +
  '.flk-modal-wrap.on{opacity:1;pointer-events:auto}' +
  '.flk-modal-bg{position:absolute;inset:0;background:rgba(15,23,42,.55)}' +
  '.flk-modal-box{position:relative;background:#fff;width:100%;max-width:760px;border-radius:24px 24px 0 0;padding:14px;max-height:95vh;overflow-y:auto;transform:translateY(30px);transition:transform .3s;padding-bottom:calc(20px + env(safe-area-inset-bottom,0px))}' +
  '.flk-modal-wrap.on .flk-modal-box{transform:translateY(0)}' +
  '.flk-modal-box.flk-sheet{border-radius:16px;max-width:500px;margin:auto}' +
  '.flk-modal-hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #e2e8f0}' +
  '.flk-modal-t{font-size:14px;font-weight:800}' +
  '.flk-modal-x{background:#f1f5f9;border:none;width:30px;height:30px;border-radius:50%;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center}' +
  '.flk-fg{margin-bottom:10px}' +
  '.flk-fl{font-size:11px;font-weight:800;margin-bottom:4px;display:flex;align-items:center;gap:4px}' +
  '.flk-req{color:#ef4444;font-weight:900}' +
  '.flk-fi{display:block;width:100%;height:42px;padding:0 12px;border:1.5px solid #e2e8f0;border-radius:12px;font-size:13px;font-family:inherit;background:#f1f5f9;color:#0f172a;box-sizing:border-box;line-height:40px;margin:0}' +
  '.flk-fi:focus{outline:none;border-color:#0f766e;background:#fff;box-shadow:0 0 0 3px #f0fdfa}' +
  '.flk-fi.err{border-color:#ef4444 !important;background:#fff5f5 !important}' +
  '.flk-sel{display:block;width:100%;height:42px;padding:0 32px 0 12px;border:1.5px solid #e2e8f0;border-radius:12px;font-size:13px;font-family:inherit;background:#f1f5f9;color:#0f172a;box-sizing:border-box;line-height:40px;margin:0;cursor:pointer;appearance:none;-webkit-appearance:none;-moz-appearance:none;background-image:url("data:image/svg+xml;charset=utf8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2364748b\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:left 10px center;background-size:16px 16px}' +
  '.flk-sel:focus{outline:none;border-color:#0f766e;background-color:#fff;box-shadow:0 0 0 3px #f0fdfa}' +
  '.flk-ft{display:block;width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:12px;font-size:13px;font-family:inherit;background:#f1f5f9;color:#0f172a;box-sizing:border-box;resize:vertical;min-height:55px;line-height:1.6}' +
  '.flk-err-msg{display:block;color:#ef4444;font-size:10px;font-weight:700;margin-top:4px}' +
  '.flk-fr{display:grid;grid-template-columns:1fr 1fr;gap:8px}' +
  '.flk-fr3{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}' +
  '.flk-date-field{display:flex;gap:6px;align-items:stretch}' +
  '.flk-date-field .flk-fi{flex:1;min-width:0;text-align:left;direction:ltr;font-weight:700;cursor:pointer}' +
  '.flk-date-btn{width:42px;flex-shrink:0;border:none;border-radius:12px;background:#0f766e;color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}' +
  '.flk-hall-field{display:flex;gap:6px;align-items:center}' +
  '.flk-hall-field .flk-sel{flex:1;min-width:0}' +
  '.flk-hall-field-btn{width:42px;height:42px;flex-shrink:0;border:none;border-radius:12px;background:#8b5cf6;color:#fff;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}' +
  '.flk-save{width:100%;padding:13px;border:none;border-radius:12px;background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;font-family:inherit;font-size:13.5px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:12px}' +
  '.flk-check{display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer}' +
  '.flk-check input{width:18px;height:18px;accent-color:#0f766e}' +
  '.flk-select-list{max-height:340px;overflow-y:auto;padding:2px;margin-bottom:12px}' +
  '.flk-select-item{display:flex;align-items:center;gap:8px;padding:8px 10px;background:#f1f5f9;border-radius:10px;margin-bottom:5px;cursor:pointer;border:2px solid transparent}' +
  '.flk-select-item.on{background:linear-gradient(135deg,#ecfdf5,#d1fae5);border-color:#10b981}' +
  '.flk-select-check{width:20px;height:20px;border-radius:6px;border:2px solid #cbd5e1;background:#fff;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:transparent}' +
  '.flk-select-item.on .flk-select-check{background:#10b981;border-color:#10b981;color:#fff}' +
  '.flk-select-info{flex:1;min-width:0}' +
  '.flk-select-name{font-size:12px;font-weight:800;color:#0f172a;margin-bottom:2px}' +
  '.flk-select-stats{display:flex;gap:3px;flex-wrap:wrap;font-size:10px}' +
  '.flk-selection-info{background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:6px 10px;margin-bottom:10px;font-size:10.5px;font-weight:700;color:#166534;text-align:center}' +
  '.flk-color-picker{display:flex;gap:6px;flex-wrap:wrap;padding:6px;background:#f1f5f9;border-radius:10px;align-items:center}' +
  '.flk-color-opt{width:28px;height:28px;border-radius:50%;cursor:pointer;border:2.5px solid transparent;display:flex;align-items:center;justify-content:center;padding:0;box-sizing:border-box;flex-shrink:0;position:relative}' +
  '.flk-color-opt.on{border-color:#fff;box-shadow:0 0 0 1.5px #0f172a;transform:scale(1.1)}' +
  '.flk-color-opt.custom{background:conic-gradient(from 0deg,#ef4444,#f59e0b,#eab308,#84cc16,#10b981,#06b6d4,#3b82f6,#8b5cf6,#ec4899,#ef4444);overflow:hidden}' +
  '.flk-color-opt.custom::after{content:"🎨";position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;pointer-events:none}' +
  '.flk-color-opt.custom.selected-custom::after{content:"";display:none}' +
  '.flk-explain{background:linear-gradient(135deg,#fef3c7,#fde68a);border:2px solid #fbbf24;border-radius:12px;padding:10px 12px;margin-bottom:12px}' +
  '.flk-explain-title{font-size:12px;font-weight:900;color:#92400e;margin-bottom:5px}' +
  '.flk-explain-body{font-size:10.5px;color:#78350f;font-weight:600;line-height:1.7}' +
  '.flk-explain.blue{background:linear-gradient(135deg,#dbeafe,#bfdbfe);border-color:#60a5fa}' +
  '.flk-explain.blue .flk-explain-title{color:#1e40af}' +
  '.flk-explain.blue .flk-explain-body{color:#1e3a8a}' +
  '.flk-info-box{background:#eff6ff;color:#1e40af;padding:8px 10px;border-radius:10px;font-size:10.5px;font-weight:700;margin-bottom:10px;line-height:1.6;border-right:3px solid #3b82f6}' +
  '.flk-cal-box{background:#fff;border-radius:20px;width:100%;max-width:360px;overflow:hidden}' +
  '.flk-cal-hd{background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;padding:16px;display:flex;justify-content:space-between;align-items:center}' +
  '.flk-cal-my{font-size:17px;font-weight:900}' +
  '.flk-cal-nav{display:flex;gap:6px}' +
  '.flk-cal-navb{background:rgba(255,255,255,.2);border:none;color:#fff;width:36px;height:36px;border-radius:8px;font-size:16px;cursor:pointer}' +
  '.flk-cal-wd{display:grid;grid-template-columns:repeat(7,1fr);background:#f1f5f9;padding:8px 0;border-bottom:1px solid #e2e8f0}' +
  '.flk-cal-wdc{text-align:center;font-size:11px;font-weight:900;color:#64748b}' +
  '.flk-cal-days{display:grid;grid-template-columns:repeat(7,1fr);padding:10px;gap:4px}' +
  '.flk-cal-d{aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:8px;font-size:13px;font-weight:800;cursor:pointer;border:2px solid transparent}' +
  '.flk-cal-d.empty{pointer-events:none}' +
  '.flk-cal-d.today{border-color:#0f766e;color:#0f766e}' +
  '.flk-cal-d.selected{background:#0f766e;color:#fff;border-color:#0f766e}' +
  '.flk-cal-ft{padding:10px 14px 14px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;gap:8px}' +
  '.flk-cal-tb{background:#f1f5f9;border:none;padding:8px 14px;border-radius:8px;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer}' +
  '.flk-cal-si{font-size:11px;color:#64748b;font-weight:700}' +
  '.flk-hall-row{display:block;background:#fff;border-radius:10px;padding:8px 10px;margin-bottom:6px;border:1px solid #e2e8f0;border-right:3px solid #8b5cf6}' +
  '.flk-hall-row.locked{border-right-color:#10b981;background:linear-gradient(90deg,#ecfdf5 0%,#fff 30%)}' +
  '.flk-hall-line1{display:flex;align-items:center;gap:6px;height:28px}' +
  '.flk-hall-icon-sm{width:26px;height:26px;border-radius:7px;background:#f5f3ff;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0}' +
  '.flk-hall-name{font-size:12px;font-weight:900;color:#0f172a;flex:1;min-width:0;display:flex;align-items:center;gap:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
  '.flk-hall-badge{display:inline-flex;align-items:center;gap:2px;font-size:8px;font-weight:800;padding:1px 5px;border-radius:9999px;background:#ecfdf5;color:#166534;flex-shrink:0}' +
  '.flk-hall-actions{display:flex;gap:3px;flex-shrink:0}' +
  '.flk-hall-btn{width:26px;height:26px;border-radius:7px;border:none;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;flex-shrink:0}' +
  '.flk-hall-btn.edit{background:#eff6ff;color:#1e40af}' +
  '.flk-hall-btn.delete{background:#fef2f2;color:#ef4444}' +
  '.flk-hall-btn.lock{background:#ecfdf5;color:#10b981}' +
  '.flk-hall-btn.unlock{background:#fffbeb;color:#f59e0b}' +
  '.flk-hall-btn.view{background:#f5f3ff;color:#6b21a8}' +
  '.flk-hall-line2{display:flex;flex-wrap:wrap;gap:6px;font-size:9.5px;font-weight:700;color:#64748b;margin-top:4px}' +
  '.flk-hall-feat-line{display:flex;flex-wrap:wrap;gap:3px;margin-top:4px}' +
  '.flk-hall-feat{font-size:8px;font-weight:800;background:#f5f3ff;color:#6b21a8;padding:1px 6px;border-radius:9999px;white-space:nowrap}' +
  '.flk-hall-empty{text-align:center;padding:20px 12px;background:#f5f3ff;border:1.5px dashed #c4b5fd;border-radius:10px;font-size:11.5px;color:#6b21a8;font-weight:700}' +
  '.flk-htabs{display:flex;gap:4px;background:#f1f5f9;padding:4px;border-radius:12px;margin-bottom:12px}' +
  '.flk-htab{flex:1;padding:8px 4px;border:none;background:transparent;border-radius:8px;font-size:10.5px;font-weight:800;color:#64748b;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:3px}' +
  '.flk-htab.on{background:#fff;color:#8b5cf6;box-shadow:0 1px 3px rgba(15,23,42,.08)}' +
  '.flk-hcontent{display:none}' +
  '.flk-hcontent.on{display:block}' +
  '.flk-eq-row{display:grid;grid-template-columns:1fr 60px 30px;gap:5px;align-items:center;margin-bottom:5px}' +
  '.flk-eq-row input{display:block;width:100%;height:38px;padding:0 10px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:12px;background:#f1f5f9;font-family:inherit;box-sizing:border-box;line-height:36px;margin:0}' +
  '.flk-eq-del{width:30px;height:38px;border-radius:8px;border:none;background:#fef2f2;color:#ef4444;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:900;padding:0}' +
  '.flk-eq-add{display:block;width:100%;padding:9px;border:1.5px dashed #10b981;background:#ecfdf5;color:#166534;border-radius:10px;font-family:inherit;font-size:11.5px;font-weight:800;cursor:pointer;margin-top:4px}' +
  '.flk-eq-add.flk-add-bird{background:linear-gradient(135deg,#ecfdf5,#d1fae5);border-color:#10b981;color:#065f46}' +
  '.flk-hall-bird-row{display:grid;grid-template-columns:1fr 1fr 1.2fr 70px 30px;gap:5px;align-items:center;padding:6px;background:#f8fafc;border-radius:8px;margin-bottom:5px;border-right:3px solid #8b5cf6}' +
  '.flk-hall-bird-sel{height:34px !important;line-height:32px !important;font-size:11px !important;padding:0 24px 0 8px !important;background-size:12px !important;background-position:left 8px center !important}' +
  '.flk-hall-bird-breed{height:34px !important;line-height:32px !important;padding:0 8px !important;font-size:11.5px !important;font-weight:700 !important;background:#fff !important;border-color:#c7d2fe !important}' +
  '.flk-hall-bird-count{height:34px !important;line-height:32px !important;padding:0 6px !important;font-size:12px !important;text-align:center !important;font-weight:800 !important;color:#0f766e !important}' +
  '.flk-hall-bird-del{height:34px !important;width:30px !important;padding:0 !important;border-radius:8px !important}' +
  '@media (max-width:520px){' +
    '.flk-hall-bird-row{grid-template-columns:1fr 1fr;grid-template-rows:auto auto;gap:5px}' +
    '.flk-hall-bird-breed{grid-column:1/3}' +
    '.flk-hall-bird-count{grid-column:1/2}' +
    '.flk-hall-bird-del{grid-column:2/3;justify-self:end}' +
  '}' +
  '.flk-feat-chips{display:flex;flex-wrap:wrap;gap:5px}' +
  '.flk-feat-chip{padding:6px 10px;border-radius:9999px;background:#f1f5f9;color:#64748b;font-size:11px;font-weight:800;cursor:pointer;border:1.5px solid #e2e8f0;user-select:none;display:inline-flex;align-items:center;gap:4px}' +
  '.flk-feat-chip.on{background:linear-gradient(135deg,#ecfdf5,#d1fae5);border-color:#10b981;color:#166534}' +
  '.flk-feat-chip.on::before{content:"✓ ";font-weight:900}' +
  '.flk-dim-info{background:#eff6ff;padding:8px 10px;border-radius:10px;font-size:10.5px;font-weight:700;color:#1e40af;text-align:center;margin-top:6px;line-height:1.6}' +
  '.flk-bt-row{display:flex;align-items:center;gap:8px;padding:8px 10px;background:#f1f5f9;border-radius:10px;border-right:3px solid #10b981;margin-bottom:5px}' +
  '.flk-bt-row.locked{background:linear-gradient(90deg,#ecfdf5 0%,#f1f5f9 30%)}' +
  '.flk-bt-icon{width:30px;height:30px;border-radius:8px;background:#ecfdf5;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}' +
  '.flk-bt-info{flex:1;min-width:0}' +
  '.flk-bt-name{font-size:12.5px;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:4px;flex-wrap:wrap}' +
  '.flk-bt-usage{font-size:9.5px;color:#64748b;font-weight:600;margin-top:1px}' +
  '.flk-bt-actions{display:flex;gap:3px;flex-shrink:0}';

  var s = document.createElement('style');
  s.id = 'flk-styles';
  s.textContent = css;
  document.head.appendChild(s);
}

/* ═══════════════════════════════════════════════
   Filter Box
   ═══════════════════════════════════════════════ */
function renderFilterBox(){
  var isOpen = !!uiState.filterBoxOpen;
  var filters = uiState.filters || [];
  var sortBy = uiState.sort;
  var cur = getFilterDisplay(filters);
  var curSort = getSortDisplay(sortBy);

  var allFlocks = getFlocks();
  var totalCount = allFlocks.length;

  var counts = { all: totalCount, active: 0, inactive: 0, groups: 0, ungrouped: 0, withHall: 0, noHall: 0, young: 0, mid: 0, old: 0, good: 0, warn: 0, bad: 0 };
  var hallsCounts = {};
  var breedsCounts = {};
  var halls = getHalls();
  var birdTypes = getBirdTypes();
  for(var hi = 0; hi < halls.length; hi++) hallsCounts[halls[hi].name] = 0;
  for(var bi = 0; bi < birdTypes.length; bi++) breedsCounts[birdTypes[bi].name] = 0;

  for(var i = 0; i < allFlocks.length; i++){
    var f = allFlocks[i];
    if(f.disabled) counts.inactive++; else counts.active++;
    if(isFlockInGroup(f.id)) counts.groups++; else counts.ungrouped++;
    if(f.hall){ counts.withHall++; if(hallsCounts[f.hall] !== undefined) hallsCounts[f.hall]++; }
    else counts.noHall++;
    if(f.birdType && breedsCounts[f.birdType] !== undefined) breedsCounts[f.birdType]++;
    var age = todayC - jToC(f.hatch || f.hatchDate);
    if(age <= 14) counts.young++; else if(age <= 30) counts.mid++; else counts.old++;
    var cnt = f.count || f.initialCount || 0;
    var dth = f.deaths || 0;
    var pct = cnt > 0 ? (dth / cnt * 100) : 0;
    if(pct <= 5) counts.good++; else if(pct <= 15) counts.warn++; else counts.bad++;
  }

  function chip(id, icon, name, count){
    var on;
    if(id === 'all'){
      on = !filters.length;
    } else {
      on = filters.indexOf(id) !== -1;
    }
    return '<div class="flk-fc ' + (on ? 'on' : '') + '" data-flk="filter" data-f="' + esc(id) + '">' +
      '<span class="flk-fc-lbl">' + icon + ' ' + esc(name) + '</span>' +
      '<span class="flk-fc-cnt">' + fa(count) + '</span>' +
    '</div>';
  }
  function schip(id, icon, name){
    var on = sortBy === id;
    return '<div class="flk-fc ' + (on ? 'on' : '') + '" data-flk="set-sort" data-s="' + esc(id) + '">' +
      '<span class="flk-fc-lbl">' + icon + ' ' + esc(name) + '</span>' +
      (on ? '<span class="flk-fc-badge">✓</span>' : '') +
    '</div>';
  }

  var m = '';

  m += '<div class="flk-filter-sec">📋 وضعیت</div><div class="flk-filter-grid">';
  m += chip('all', '📋', 'همه', counts.all);
  m += chip('status:active', '✅', 'فعال', counts.active);
  m += chip('status:inactive', '⏸️', 'غیرفعال', counts.inactive);
  m += '</div>';

  m += '<div class="flk-filter-sec">🏢 ساختار</div><div class="flk-filter-grid">';
  m += chip('groups', '🏠', 'گروه‌ها', counts.groups);
  m += chip('ungrouped', '🐔', 'بدون گروه', counts.ungrouped);
  m += chip('with-hall', '🏢', 'با سالن', counts.withHall);
  m += chip('no-hall', '🚫', 'بدون سالن', counts.noHall);
  m += '</div>';

  if(halls.length > 0){
    m += '<div class="flk-filter-sec">🏢 سالن</div><div class="flk-filter-grid">';
    for(hi = 0; hi < halls.length; hi++){
      m += chip('hall:' + halls[hi].name, '🏢', halls[hi].name, hallsCounts[halls[hi].name] || 0);
    }
    m += '</div>';
  }

  if(birdTypes.length > 0){
    m += '<div class="flk-filter-sec">🐔 نژاد</div><div class="flk-filter-grid">';
    for(bi = 0; bi < birdTypes.length; bi++){
      m += chip('breed:' + birdTypes[bi].name, birdTypes[bi].icon || '🐔', birdTypes[bi].name, breedsCounts[birdTypes[bi].name] || 0);
    }
    m += '</div>';
  }

  m += '<div class="flk-filter-sec">📅 سن</div><div class="flk-filter-grid">';
  m += chip('age:young', '🐣', 'جوان', counts.young);
  m += chip('age:mid', '🐔', 'میانسال', counts.mid);
  m += chip('age:old', '🐓', 'بالغ', counts.old);
  m += '</div>';

  m += '<div class="flk-filter-sec">💊 سلامت</div><div class="flk-filter-grid">';
  m += chip('health:good', '✅', 'سالم', counts.good);
  m += chip('health:warn', '⚠️', 'هشدار', counts.warn);
  m += chip('health:bad', '🚨', 'پرتلفات', counts.bad);
  m += '</div>';

  m += '<div class="flk-filter-sec">🔀 مرتب‌سازی</div><div class="flk-filter-grid">';
  m += schip('newest', '⬇️', 'جدید');
  m += schip('oldest', '⬆️', 'قدیمی');
  m += schip('count-desc', '🔻', 'پرتعداد');
  m += schip('count-asc', '🔺', 'کم‌تعداد');
  m += schip('name-asc', '🔤', 'الف-ی');
  m += schip('name-desc', '🔤', 'ی-الف');
  m += schip('mortality-desc', '📊', 'پرتلفات');
  m += '</div>';

  if(filters.length > 0){
    m += '<div class="flk-filter-actions">' +
      '<button class="flk-filter-act" data-flk="clear-filters">🧹 پاک کردن</button>' +
      '<button class="flk-filter-act primary" data-flk="close-filter">✓ بستن</button>' +
    '</div>';
  }

  var fbLabel = '<span class="fb-label">' + cur.ic + ' ' + esc(cur.name) + '</span>';
  var fbCount = filters.length > 1 ? '<span class="fb-count">' + toFa(filters.length) + '</span>' : '';

  return '<div class="flk-filter-box ' + (isOpen ? 'open' : '') + '" id="flkFilterBox">' +
    '<button type="button" class="flk-filter-btn" data-flk="toggle-filter-box">' +
      '<span class="fb-left">' +
        '<span>🔍</span>' +
        fbLabel +
        fbCount +
        '<span class="fb-sep">·</span>' +
        '<span class="fb-sort">' + curSort.ic + ' ' + esc(curSort.name) + '</span>' +
      '</span>' +
      '<span class="fb-arrow">‹</span>' +
    '</button>' +
    '<div class="flk-filter-menu">' + m + '</div>' +
  '</div>';
}

/* ═══════════════════════════════════════════════
   Render Page
   ═══════════════════════════════════════════════ */
function renderPage(){
  var flocks = getFlocks();
  var groups = getGroups();
  var halls = getHalls();

  var alive = 0, deaths = 0, i, activeCount = 0, inactiveCount = 0;
  for(i = 0; i < flocks.length; i++){
    if(flocks[i].disabled){
      inactiveCount++;
      continue;
    }
    activeCount++;
    alive += flocks[i].alive || 0;
    deaths += flocks[i].deaths || 0;
  }
  var avgAge = 0;
  if(activeCount > 0){
    var sa = 0, ac = 0;
    for(i = 0; i < flocks.length; i++){
      if(flocks[i].disabled) continue;
      sa += (todayC - jToC(flocks[i].hatch || flocks[i].hatchDate));
      ac++;
    }
    avgAge = ac > 0 ? Math.round(sa / ac) : 0;
  }
  var ungrouped = getUngroupedFlocks();

  return '<div class="page flk-page" data-flk-root>' +
    '<div class="flk-header">' +
      '<div><div class="flk-title">📊 مدیریت گله‌ها</div>' +
      '<div class="flk-sub">' + fa(activeCount) + ' فعال' +
        (inactiveCount > 0 ? ' • ' + fa(inactiveCount) + ' غیرفعال' : '') +
        ' • ' + fa(groups.length) + ' گروه • ' + fa(halls.length) + ' سالن' +
      '</div></div>' +
      '<div class="flk-header-actions">' +
        '<button class="flk-action-btn halls" data-flk="open-halls"><span>🏢</span><span>سالن</span></button>' +
        '<button class="flk-action-btn birds" data-flk="open-birds"><span>🐔</span><span>پرنده</span></button>' +
        (ungrouped.length >= 2 ? '<button class="flk-action-btn group" data-flk="open-group"><span>🏠</span><span>گروه</span></button>' : '') +
        (flocks.length >= 2 ? '<button class="flk-action-btn merge" data-flk="open-merge"><span>🔗</span><span>ادغام</span></button>' : '') +
        '<button class="flk-action-btn add" data-flk="open-form"><span>➕</span><span>گله</span></button>' +
      '</div>' +
    '</div>' +
    '<div class="flk-summary">' +
      '<div class="flk-sum g"><div class="flk-sum-ic">🐔</div><div class="flk-sum-v">' + fa(alive) + '</div><div class="flk-sum-l">زنده</div></div>' +
      '<div class="flk-sum r"><div class="flk-sum-ic">💀</div><div class="flk-sum-v">' + fa(deaths) + '</div><div class="flk-sum-l">تلفات</div></div>' +
      '<div class="flk-sum o"><div class="flk-sum-ic">📊</div><div class="flk-sum-v">' + fa(avgAge) + '</div><div class="flk-sum-l">میانگین سن</div></div>' +
      '<div class="flk-sum b"><div class="flk-sum-ic">🏢</div><div class="flk-sum-v">' + fa(halls.length) + '</div><div class="flk-sum-l">سالن</div></div>' +
    '</div>' +
    renderFilterBox() +
    '<div data-flk-list>' + renderListInner() + '</div>' +
  '</div>';
}

function renderListInner(){
  var filters = uiState.filters || [];
  var sortBy = uiState.sort;
  var allFlocks = getFlocks();
  var out = '';

  if(!filters.length){
    var groups = getGroups();
    for(var i = 0; i < groups.length; i++) out += renderGroupCard(groups[i]);

    var outside = [];
    var sorted = sortFlocks(allFlocks, sortBy);
    for(i = 0; i < sorted.length; i++){
      if(!isFlockInGroup(sorted[i].id)) outside.push(sorted[i]);
    }
    for(i = 0; i < outside.length; i++) out += renderCard(outside[i]);

    if(!out){
      return '<div class="flk-empty"><div class="flk-empty-ic">🐔</div>' +
        '<div class="flk-empty-t">هنوز گله‌ای ثبت نشده</div>' +
        '<div class="flk-empty-x">برای شروع، اولین گله خود را ثبت کنید</div>' +
        '<button class="flk-action-btn add" style="margin:0 auto" data-flk="open-form">➕ ثبت اولین گله</button></div>';
    }
    return out;
  }

  if(filters.length === 1 && filters[0] === 'groups'){
    var grps = getGroups();
    if(!grps.length){
      return '<div class="flk-empty"><div class="flk-empty-ic">🏠</div>' +
        '<div class="flk-empty-t">هنوز گروهی نداری</div>' +
        '<div class="flk-empty-x">برای ساخت گروه، حداقل ۲ گله بدون گروه لازمه</div></div>';
    }
    for(i = 0; i < grps.length; i++) out += renderGroupCard(grps[i]);
    return out;
  }

  var filtered = [];
  for(i = 0; i < allFlocks.length; i++){
    if(matchFilters(allFlocks[i], filters)) filtered.push(allFlocks[i]);
  }
  filtered = sortFlocks(filtered, sortBy);

  for(i = 0; i < filtered.length; i++) out += renderCard(filtered[i]);

  if(!out){
    var cur = getFilterDisplay(filters);
    return '<div class="flk-empty">' +
      '<div class="flk-empty-ic">🔍</div>' +
      '<div class="flk-empty-t">چیزی پیدا نشد</div>' +
      '<div class="flk-empty-x">هیچ گله‌ای با فیلترهای «' + esc(cur.name) + '» مطابقت نداره</div>' +
      '<button class="flk-action-btn add" style="margin:0 auto;background:#f1f5f9;color:#0f172a" data-flk="clear-filters">🧹 پاک کردن فیلترها</button>' +
    '</div>';
  }
  return out;
}

function renderGroupCard(g){
  var stats = getGroupStats(g);
  var isOpen = !!uiState.groupExpanded[sid(g.id)];
  var ageText = (stats.maxAge === stats.minAge) ? fa(stats.maxAge) + ' روز' : fa(stats.minAge) + ' تا ' + fa(stats.maxAge) + ' روز';
  var membersHtml = '';
  for(var i = 0; i < stats.members; i++){
    var m = getGroupMembers(g)[i];
    if(!m) continue;
    var age = todayC - jToC(m.hatch || m.hatchDate);
    membersHtml += '<div class="flk-gmember" style="border-right-color:' + (m.color || '#8b5cf6') + '">' +
      '<div class="flk-gmname"><span class="flk-color-dot" style="background:' + (m.color || '#8b5cf6') + '"></span>' + esc(m.name) + '</div>' +
      '<div class="flk-gmstats">' +
        '<span class="flk-stat g">🐔 <strong>' + fa(m.alive || 0) + '</strong></span>' +
        '<span class="flk-stat r">💀 <strong>' + fa(m.deaths || 0) + '</strong></span>' +
        '<span class="flk-stat b">📅 <strong>' + fa(age) + ' روز</strong></span>' +
        (m.hall ? '<span class="flk-stat p">🏢 ' + esc(m.hall) + '</span>' : '') +
      '</div></div>';
  }
  return '<div class="flk-gcard ' + (isOpen ? 'expanded' : '') + '" data-gid="' + sid(g.id) + '">' +
    '<div class="flk-ghd" data-flk="toggle-group" data-id="' + sid(g.id) + '">' +
      '<div style="flex:1;min-width:0">' +
        '<div class="flk-gtitle"><span style="font-size:16px">🏠</span>' +
          '<div class="flk-gname">' + esc(g.name) + '</div>' +
          '<span class="flk-gbadge">' + fa(stats.members) + ' گله</span>' +
          (g.hall ? '<span class="flk-ghall">📍 ' + esc(g.hall) + '</span>' : '') +
        '</div>' +
        '<div class="flk-gstats">' +
          '<span class="flk-stat g">🐔 <strong>' + fa(stats.alive) + '</strong></span>' +
          '<span class="flk-stat r">💀 <strong>' + fa(stats.deaths) + '</strong></span>' +
          '<span class="flk-stat b">📅 <strong>' + ageText + '</strong></span>' +
        '</div>' +
      '</div>' +
      '<button class="flk-gtoggle" type="button">▼</button>' +
    '</div>' +
    '<div class="flk-gbd">' + membersHtml +
      '<div class="flk-gactions">' +
        '<button class="flk-daily-group" data-flk="group-daily" data-id="' + sid(g.id) + '">📅 ثبت روزانه</button>' +
        '<button class="flk-merge-in-group" data-flk="merge-from-group" data-id="' + sid(g.id) + '">🔗 ادغام</button>' +
        '<button class="flk-unmerge" data-flk="unmerge" data-id="' + sid(g.id) + '">🔓 باز کردن</button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function renderCard(f){
  var age = todayC - jToC(f.hatch || f.hatchDate);
  var count = f.count || f.initialCount || 0;
  var alive = f.alive || f.aliveCount || 0;
  var totalDeaths = f.deaths || 0;
  var deathPct = count > 0 ? ((totalDeaths / count) * 100).toFixed(1) : '0';
  var alivePct = count > 0 ? Math.round((alive / count) * 100) : 0;
  var totalValue = count * (f.chickPrice || 0);
  var isOpen = !!uiState.expanded[sid(f.id)];
  var bc = f.color || '#0f766e';
  var isDisabled = !!f.disabled;

  var stats =
    '<span class="flk-stat g">🐔 <strong>' + fa(alive) + '</strong></span>' +
    '<span class="flk-stat r">💀 <strong>' + fa(totalDeaths) + '</strong></span>' +
    '<span class="flk-stat b">📅 <strong>' + fa(age) + ' روز</strong></span>' +
    '<span class="flk-stat o">📊 <strong>' + deathPct + '٪</strong></span>';

  return '<div class="flk-card ' + (isOpen ? 'expanded' : '') + (isDisabled ? ' disabled' : '') + '" data-fid="' + sid(f.id) + '" style="border-right-color:' + bc + '">' +
    '<div class="flk-card-hd" data-flk="toggle" data-id="' + sid(f.id) + '">' +
      '<div class="flk-hd-content">' +
        '<div class="flk-hd-row1">' +
          '<span class="flk-color-dot" style="background:' + bc + '"></span>' +
          '<div class="flk-name">' + esc(f.name) + '</div>' +
          (isDisabled ? '<span class="flk-disable-badge">⏸️ غیرفعال</span>' : '') +
          (f.hall ? '<span class="flk-hall-tag">🏢 ' + esc(f.hall) + '</span>' : '') +
          (f.mergedFrom ? '<span class="flk-merged-tag">🔗 ادغام‌شده</span>' : '') +
        '</div>' +
        '<div class="flk-hd-row2">' + stats + '</div>' +
      '</div>' +
      '<div class="flk-hd-btns">' +
        '<button class="flk-disable-btn ' + (isDisabled ? 'to-enable' : 'to-disable') + '" ' +
          'data-flk="toggle-disable" data-id="' + sid(f.id) + '" ' +
          'title="' + (isDisabled ? 'فعال کردن' : 'غیرفعال کردن موقت') + '">' +
          (isDisabled ? '▶️' : '⏸️') +
        '</button>' +
        '<button class="flk-toggle" type="button">▼</button>' +
      '</div>' +
    '</div>' +
    '<div class="flk-card-bd">' +
      '<div class="flk-progress">' +
        '<div class="flk-progress-info"><span>🐔 باقی‌مانده</span><span><strong>' + alivePct + '٪</strong></span></div>' +
        '<div class="flk-progress-bar"><div class="flk-progress-fill" style="width:' + alivePct + '%"></div></div>' +
      '</div>' +
      '<div class="flk-stats">' +
        '<div class="flk-box g"><div class="flk-box-l">🐔 زنده</div><div class="flk-box-v">' + fa(alive) + '</div></div>' +
        '<div class="flk-box r"><div class="flk-box-l">💀 تلفات</div><div class="flk-box-v">' + fa(totalDeaths) + '</div></div>' +
        '<div class="flk-box b"><div class="flk-box-l">📅 سن</div><div class="flk-box-v">' + fa(age) + ' روز</div></div>' +
        '<div class="flk-box o"><div class="flk-box-l">📊 تلفات</div><div class="flk-box-v">' + deathPct + '٪</div></div>' +
        '<div class="flk-box p"><div class="flk-box-l">🔢 اولیه</div><div class="flk-box-v">' + fa(count) + '</div></div>' +
        '<div class="flk-box"><div class="flk-box-l">💰 ارزش</div><div class="flk-box-v">' + fa(Math.round(totalValue / 1000)) + 'K</div></div>' +
      '</div>' +
      '<div class="flk-chips">' +
        '<span class="flk-chip date">📅 هچ: ' + esc(f.hatch || f.hatchDate || '—') + '</span>' +
        (f.hall ? '<span class="flk-chip" style="background:#f5f3ff;color:#6b21a8">🏢 ' + esc(f.hall) + '</span>' : '') +
        (f.chickPrice ? '<span class="flk-chip money">🐣 ' + fa(f.chickPrice) + '</span>' : '') +
        (f.feedPrice ? '<span class="flk-chip money">🌾 ' + fa(f.feedPrice) + '</span>' : '') +
        (f.transportCost ? '<span class="flk-chip money">🚚 ' + fa(f.transportCost) + '</span>' : '') +
      '</div>' +
      (f.notes ? '<div style="background:#f1f5f9;padding:6px 8px;border-radius:6px;font-size:11px;color:#475569;border-right:2px solid #0f766e;margin-bottom:6px"><strong>📝</strong> ' + esc(f.notes) + '</div>' : '') +
      '<div class="flk-actions">' +
        '<button class="flk-act-edit" data-flk="edit" data-id="' + sid(f.id) + '">✏️ ویرایش</button>' +
        '<button class="flk-act-daily" data-flk="daily" data-id="' + sid(f.id) + '">📅 ثبت روزانه</button>' +
        '<button class="flk-act-del" data-flk="del" data-id="' + sid(f.id) + '">🗑️ حذف</button>' +
      '</div>' +
      '<div style="margin-top:6px">' +
        '<button class="' + (isDisabled ? 'flk-act-enable' : 'flk-act-disable') + '" ' +
          'style="width:100%;padding:10px;border:none;border-radius:8px;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px" ' +
          'data-flk="toggle-disable" data-id="' + sid(f.id) + '">' +
          (isDisabled ? '▶️' : '⏸️') + ' ' + (isDisabled ? 'فعال کردن مجدد' : 'غیرفعال کردن موقت') +
        '</button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function refreshList(){
  var pageRoot = document.querySelector('[data-flk-root]');
  if(pageRoot){
    var tmp = document.createElement('div');
    tmp.innerHTML = renderPage();
    pageRoot.parentNode.replaceChild(tmp.firstElementChild, pageRoot);
  }
}

/* ═══════════════════════════════════════════════
   Halls Manager
   ═══════════════════════════════════════════════ */
function renderHallListInner(){
  var halls = getHalls();
  if(!halls.length){
    return '<div class="flk-hall-empty">🏢<br>هنوز سالنی نداری</div>';
  }
  var out = '';
  for(var i = 0; i < halls.length; i++){
    var h = halls[i];
    var usage = getHallUsageCount(h.name);
    var cls = 'flk-hall-row' + (h.isLocked ? ' locked' : '');
    var icon = h.isLocked ? '🔒' : '🏢';
    var badge = h.isLocked ? '<span class="flk-hall-badge">🔒</span>' : '';
    var area = (h.length && h.width) ? (h.length * h.width).toFixed(0) : '';

    var totalBirds = 0;
    if(Array.isArray(h.birds) && h.birds.length){
      for(var bi2 = 0; bi2 < h.birds.length; bi2++) totalBirds += h.birds[bi2].count || 0;
    } else {
      totalBirds = h.birdCount || 0;
    }

    var acts = '';
    if(h.isLocked){
      acts = '<button class="flk-hall-btn view" data-flk="view-hall" data-id="' + sid(h.id) + '">👁️</button>' +
             '<button class="flk-hall-btn unlock" data-flk="unlock-hall" data-id="' + sid(h.id) + '">🔓</button>';
    } else {
      acts = '<button class="flk-hall-btn edit" data-flk="edit-hall" data-id="' + sid(h.id) + '">✏️</button>' +
             '<button class="flk-hall-btn lock" data-flk="lock-hall" data-id="' + sid(h.id) + '">🔒</button>' +
             '<button class="flk-hall-btn delete" data-flk="del-hall" data-id="' + sid(h.id) + '">🗑️</button>';
    }

    var infoParts = [];
    if(area) infoParts.push('📐 ' + fa(area) + ' م²');
    if(totalBirds > 0) infoParts.push('🐔 ' + fa(totalBirds) + ' پرنده');
    if(h.equipment && h.equipment.length) infoParts.push('🔧 ' + fa(h.equipment.length));
    if(usage > 0) infoParts.push('🏠 ' + fa(usage) + ' گله');

    var birdsChipsHtml = '';
    if(Array.isArray(h.birds) && h.birds.length){
      for(var bci = 0; bci < h.birds.length; bci++){
        var bc = h.birds[bci];
        var btObj = getBirdTypeByName(bc.birdType);
        var bIcon = btObj ? btObj.icon : '🐔';
        var bColor = btObj ? (btObj.color || '#3b82f6') : '#94a3b8';
        var label = bIcon + ' ' + esc(bc.birdType || '—');
        if(bc.breed) label += ' <span style="opacity:.75">(' + esc(bc.breed) + ')</span>';
        label += ' ×' + fa(bc.count || 0);
        if(bc.flockName) label += ' <span style="opacity:.6">←' + esc(bc.flockName) + '</span>';
        birdsChipsHtml += '<span class="flk-hall-feat" style="background:' + bColor + '22;color:' + bColor + ';white-space:nowrap">' + label + '</span>';
      }
    } else if(h.birdType){
      var btO2 = getBirdTypeByName(h.birdType);
      var ic2 = btO2 ? btO2.icon : '🐔';
      var cl2 = btO2 ? (btO2.color || '#3b82f6') : '#94a3b8';
      birdsChipsHtml = '<span class="flk-hall-feat" style="background:' + cl2 + '22;color:' + cl2 + '">' +
        ic2 + ' ' + esc(h.birdType) + ' ×' + fa(h.birdCount || 0) +
      '</span>';
    }

    out += '<div class="' + cls + '">' +
      '<div class="flk-hall-line1">' +
        '<div class="flk-hall-icon-sm">' + icon + '</div>' +
        '<div class="flk-hall-name">' + esc(h.name) + ' ' + badge + '</div>' +
        '<div class="flk-hall-actions">' + acts + '</div>' +
      '</div>' +
      (infoParts.length ? '<div class="flk-hall-line2">' + infoParts.map(function(p){ return '<span>' + p + '</span>'; }).join('') + '</div>' : '') +
      (birdsChipsHtml ? '<div class="flk-hall-feat-line">' + birdsChipsHtml + '</div>' : '') +
      (h.features && h.features.length ? '<div class="flk-hall-feat-line">' + h.features.slice(0, 4).map(function(ft){ return '<span class="flk-hall-feat">' + esc(ft) + '</span>'; }).join('') + (h.features.length > 4 ? '<span class="flk-hall-feat">+' + (h.features.length - 4) + '</span>' : '') + '</div>' : '') +
    '</div>';
  }
  return out;
}

function openHallsMgr(){
  var html = '<div class="flk-modal-hd">' +
    '<div class="flk-modal-t">🏢 مدیریت سالن‌ها</div>' +
    '<button class="flk-modal-x" data-flk="close-modal" data-mid="flk-halls">✕</button>' +
  '</div>' +
  '<button class="flk-save" style="margin-top:0;margin-bottom:10px;background:linear-gradient(135deg,#8b5cf6,#a855f7)" data-flk="add-hall">➕ افزودن سالن جدید</button>' +
  '<div id="flkHallList">' + renderHallListInner() + '</div>';
  var ex = _modals['flk-halls'];
  if(ex){ try{ ex.remove(); }catch(e){} delete _modals['flk-halls']; }
  openModal('flk-halls', html);
}

function refreshHallsMgr(){
  var el = document.getElementById('flkHallList');
  if(el) el.innerHTML = renderHallListInner();
}

function openHallEdit(id, readOnly){
  editingHallId = id ? sid(id) : null;
  var h = id ? getHallById(id) : null;
  if(h && h.isLocked && !readOnly){ toast('🔒 سالن قفله', 'error'); return; }

  hallFormEquipment = h && Array.isArray(h.equipment) ? h.equipment.map(function(e){
    return { name: e.name || '', count: e.count || 0 };
  }) : [];
  hallFormFeatures = h && Array.isArray(h.features) ? h.features.slice() : [];
  if(!hallFormEquipment.length && !id) hallFormEquipment = [{ name: '', count: 0 }];

  if(h){
    if(Array.isArray(h.birds) && h.birds.length){
      hallFormBirds = h.birds.map(function(b){
        return {
          id: b.id || String(Date.now() + Math.random()),
          birdType: b.birdType || '',
          breed: b.breed || '',
          flockId: b.flockId || '',
          flockName: b.flockName || '',
          count: +b.count || 0
        };
      });
    } else if(h.birdType || h.birdCount){
      hallFormBirds = [{
        id: String(Date.now()),
        birdType: h.birdType || '',
        breed: '',
        flockId: '',
        flockName: '',
        count: +h.birdCount || 0
      }];
    } else {
      hallFormBirds = [];
    }
  } else {
    hallFormBirds = [];
  }

  hallActiveTab = 'base';
  isCustomColor = !!(h && h.color && !NAMED_COLORS[h.color]);
  selectedColor = h && h.color ? h.color : '#8b5cf6';

  var title = readOnly ? '👁️ مشاهده سالن' : (id ? '✏️ ویرایش سالن' : '🏢 سالن جدید');

  var html = '<div class="flk-modal-hd">' +
    '<div class="flk-modal-t">' + title + '</div>' +
    '<button class="flk-modal-x" data-flk="close-modal" data-mid="flk-hall-edit">✕</button>' +
  '</div>' +
  '<div class="flk-htabs">' +
    '<button class="flk-htab on" data-flk="hall-tab" data-tab="base">📋 پایه</button>' +
    '<button class="flk-htab" data-flk="hall-tab" data-tab="dims">📐 متراژ و لوازم</button>' +
    '<button class="flk-htab" data-flk="hall-tab" data-tab="feat">⚡ ویژگی‌ها</button>' +
  '</div>' +
  '<div id="flkHallTabContent">' + renderHallTabContent(h, readOnly) + '</div>' +
  (!readOnly ?
    '<div class="flk-fg" style="margin-top:10px"><label class="flk-check"><input type="checkbox" id="flkHallLock" ' + (h && h.isLocked ? 'checked' : '') + '> <span>🔒 بعد از ذخیره قفل کن</span></label></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">' +
      '<button class="flk-save" style="margin-top:0;background:#f1f5f9;color:#0f172a" data-flk="close-modal" data-mid="flk-hall-edit">انصراف</button>' +
      '<button class="flk-save" style="margin-top:0;background:linear-gradient(135deg,#8b5cf6,#a855f7)" data-flk="save-hall">💾 ذخیره</button>' +
    '</div>'
  : '<button class="flk-save" style="margin-top:0;background:#f1f5f9;color:#0f172a" data-flk="close-modal" data-mid="flk-hall-edit">بستن</button>');

  openModal('flk-hall-edit', html);
}

function renderHallTabContent(h, readOnly){
  var roAttr = readOnly ? ' readonly' : '';
  var roDis = readOnly ? ' disabled' : '';
  var out = '';

  out += '<div class="flk-hcontent' + (hallActiveTab === 'base' ? ' on' : '') + '" data-hcontent="base">';
  out += '<div class="flk-fg"><label class="flk-fl">🏢 نام سالن <span class="flk-req">*</span></label>' +
    '<input class="flk-fi" type="text" id="flkHallName" placeholder="مثلاً سالن شماره ۳" value="' + (h ? esc(h.name) : '') + '" ' + roAttr + '>' +
    '<span class="flk-err-msg" id="err-flkHallName" style="display:none"></span></div>';

  out += '<div class="flk-fg">' +
    '<label class="flk-fl">🐔 پرنده‌های داخل سالن' +
      (!readOnly ? ' <span style="cursor:pointer;color:#0f766e;font-size:9.5px;text-decoration:underline;margin-right:auto" data-flk="open-birds">مدیریت نوع‌ها</span>' : '') +
    '</label>' +
    '<div id="flkHallBirdsList">' + renderHallBirdsInner(readOnly) + '</div>' +
    (!readOnly ? '<button type="button" class="flk-eq-add flk-add-bird" data-flk="add-hall-bird">➕ افزودن پرنده به سالن</button>' : '') +
  '</div>';

  var colors = ['#8b5cf6', '#a855f7', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
  var colorsHtml = '';
  for(var ci = 0; ci < colors.length; ci++){
    colorsHtml += '<div class="flk-color-opt' + (selectedColor === colors[ci] && !isCustomColor ? ' on' : '') + '" style="background:' + colors[ci] + '" data-color="' + colors[ci] + '"></div>';
  }
  out += '<div class="flk-fg"><label class="flk-fl">🎨 رنگ سالن</label>' +
    '<div class="flk-color-picker" id="flkHallColorPicker">' + colorsHtml +
      '<div class="flk-color-opt custom' + (isCustomColor ? ' on selected-custom' : '') + '" id="flkHallCustomColor" style="position:relative' + (isCustomColor ? ';background:' + selectedColor : '') + '" title="رنگ سفارشی">' +
      '</div>' +
    '</div></div>';
  out += '</div>';

  out += '<div class="flk-hcontent' + (hallActiveTab === 'dims' ? ' on' : '') + '" data-hcontent="dims">';
  out += '<div class="flk-fr3">' +
    '<div class="flk-fg"><label class="flk-fl">📏 طول (م)</label>' +
      '<input class="flk-fi" type="text" inputmode="decimal" id="flkHallLength" placeholder="۳۰" value="' + (h && h.length ? h.length : '') + '" ' + roAttr + '></div>' +
    '<div class="flk-fg"><label class="flk-fl">📏 عرض (م)</label>' +
      '<input class="flk-fi" type="text" inputmode="decimal" id="flkHallWidth" placeholder="۱۰" value="' + (h && h.width ? h.width : '') + '" ' + roAttr + '></div>' +
    '<div class="flk-fg"><label class="flk-fl">📏 ارتفاع (م)</label>' +
      '<input class="flk-fi" type="text" inputmode="decimal" id="flkHallHeight" placeholder="۳" value="' + (h && h.height ? h.height : '') + '" ' + roAttr + '></div>' +
  '</div>';
  out += '<div class="flk-dim-info" id="flkHallDimInfo">—</div>';
  out += '<div style="margin-top:14px"><label class="flk-fl">🔧 لوازم سالن</label>';
  out += '<div id="flkEqList">' + renderEquipmentInner(readOnly) + '</div>';
  if(!readOnly) out += '<button type="button" class="flk-eq-add" data-flk="add-equip">➕ افزودن لوازم</button>';
  out += '</div>';
  out += '</div>';

  out += '<div class="flk-hcontent' + (hallActiveTab === 'feat' ? ' on' : '') + '" data-hcontent="feat">';
  out += '<div class="flk-fg"><label class="flk-fl">⚡ ویژگی‌های سالن' +
    (!readOnly ? ' <span style="cursor:pointer;color:#0f766e;font-size:9.5px;text-decoration:underline;margin-right:auto" data-flk="open-feat-mgr">مدیریت ویژگی‌ها</span>' : '') +
    '</label>' +
    '<div class="flk-feat-chips" id="flkFeatChips">' + renderFeaturesChipsInner(readOnly) + '</div></div>';
  out += '<div class="flk-fg"><label class="flk-fl">📝 یادداشت</label>' +
    '<textarea class="flk-ft" id="flkHallNotes" placeholder="توضیحات اضافه..." ' + roAttr + '>' + (h ? esc(h.notes || '') : '') + '</textarea></div>';
  out += '</div>';

  return out;
}

function renderHallBirdsInner(readOnly){
  var birdTypes = getBirdTypes();
  var flocks = getFlocks();

  if(!hallFormBirds.length){
    return '<div style="text-align:center;padding:14px;background:#ecfdf5;border:1.5px dashed #6ee7b7;border-radius:8px;font-size:10.5px;color:#065f46;font-weight:700;margin-bottom:6px">🐔 هنوز پرنده‌ای اضافه نشده</div>';
  }

  var out = '';
  for(var i = 0; i < hallFormBirds.length; i++){
    var b = hallFormBirds[i];

    var typeOpts = '<option value="">— نوع —</option>';
    for(var ti = 0; ti < birdTypes.length; ti++){
      var bt = birdTypes[ti];
      typeOpts += '<option value="' + esc(bt.name) + '" ' + (b.birdType === bt.name ? 'selected' : '') + '>' +
        (bt.icon || '🐔') + ' ' + esc(bt.name) + '</option>';
    }

    var flockOpts = '<option value="">— بدون گله —</option>';
    for(var fi = 0; fi < flocks.length; fi++){
      var f = flocks[fi];
      if(b.birdType && f.birdType && f.birdType !== b.birdType) continue;

      var cnt = f.alive || f.aliveCount || f.count || 0;
      var isSel = sameId(b.flockId, f.id);
      flockOpts += '<option value="' + sid(f.id) + '"' +
        ' data-count="' + cnt + '"' +
        ' data-name="' + esc(f.name) + '"' +
        ' data-type="' + esc(f.birdType || '') + '"' +
        ' ' + (isSel ? 'selected' : '') + '>' +
        '🐔 ' + esc(f.name) + ' (' + fa(cnt) + ')' +
      '</option>';
    }

    var color = getBirdTypeColorByName(b.birdType);
    var roAttr = readOnly ? 'readonly' : '';
    var roDis = readOnly ? 'disabled' : '';

    out += '<div class="flk-hall-bird-row" style="border-right-color:' + color + '">' +
      '<select class="flk-sel flk-hall-bird-sel" data-hall-bird-type="' + i + '" ' + roDis + '>' + typeOpts + '</select>' +
      '<input class="flk-fi flk-hall-bird-breed" type="text" placeholder="نژاد (راس ۳۰۸)" value="' + esc(b.breed || '') + '" data-hall-bird-breed="' + i + '" ' + roAttr + '>' +
      '<select class="flk-sel flk-hall-bird-sel" data-hall-bird-flock="' + i + '" ' + roDis + '>' + flockOpts + '</select>' +
      '<input class="flk-fi flk-hall-bird-count" type="number" inputmode="numeric" placeholder="تعداد" value="' + (b.count || 0) + '" data-hall-bird-count="' + i + '" ' + roAttr + '>' +
      (!readOnly
        ? '<button type="button" class="flk-eq-del flk-hall-bird-del" data-flk="del-hall-bird" data-i="' + i + '">✕</button>'
        : '<div></div>') +
    '</div>';
  }
  return out;
}

function renderEquipmentInner(readOnly){
  if(!hallFormEquipment.length){
    return '<div style="text-align:center;padding:10px;color:#94a3b8;font-size:10.5px;background:#fffbeb;border:1.5px dashed #fcd34d;border-radius:8px">هنوز لوازمی اضافه نشده</div>';
  }
  var out = '';
  for(var i = 0; i < hallFormEquipment.length; i++){
    var e = hallFormEquipment[i];
    if(readOnly){
      out += '<div style="padding:6px 10px;background:#f1f5f9;border-radius:8px;margin-bottom:4px;font-size:11.5px;display:flex;justify-content:space-between;gap:6px">' +
        '<span style="font-weight:800;flex:1">' + esc(e.name || '—') + '</span>' +
        (e.count ? '<span style="color:#64748b">×' + fa(e.count) + '</span>' : '') +
      '</div>';
    } else {
      out += '<div class="flk-eq-row">' +
        '<input type="text" placeholder="نام لوازم" value="' + esc(e.name || '') + '" data-eq-name="' + i + '">' +
        '<input type="number" placeholder="تعداد" value="' + (e.count || '') + '" data-eq-count="' + i + '">' +
        '<button type="button" class="flk-eq-del" data-flk="del-equip" data-i="' + i + '">✕</button>' +
      '</div>';
    }
  }
  return out;
}

function renderFeaturesChipsInner(readOnly){
  var all = getAllFeatures();
  var custom = getCustomFeatures();
  var out = '';
  for(var i = 0; i < all.length; i++){
    var ft = all[i];
    var on = hallFormFeatures.indexOf(ft) !== -1;
    var isBuiltin = BUILTIN_FEATURES.indexOf(ft) !== -1;
    out += '<div class="flk-feat-chip ' + (on ? 'on' : '') + '" data-flk="' + (readOnly ? '' : 'toggle-feat') + '" data-name="' + esc(ft) + '">' +
      esc(ft) +
      (!isBuiltin && !readOnly ? '<span style="font-size:9px;color:#ef4444;margin-right:2px;padding:0 4px;border-radius:50%;background:#fee2e2;cursor:pointer;font-weight:900" data-flk="del-feat" data-name="' + esc(ft) + '">×</span>' : '') +
    '</div>';
  }
  return out;
}

function updateHallDimInfo(){
  var info = document.getElementById('flkHallDimInfo');
  if(!info) return;
  var L = +toEnDigits(document.getElementById('flkHallLength').value) || 0;
  var W = +toEnDigits(document.getElementById('flkHallWidth').value) || 0;
  var H = +toEnDigits(document.getElementById('flkHallHeight').value) || 0;
  if(!L || !W || !H){ info.textContent = '— ابعاد کامل وارد نشده —'; return; }
  var area = L * W;
  var volume = L * W * H;
  var minBirds = Math.round(area * 8);
  var maxBirds = Math.round(area * 12);
  info.innerHTML = '📐 مساحت: <strong>' + fa(area.toFixed(1)) + '</strong> م² • ' +
    '📦 حجم: <strong>' + fa(volume.toFixed(1)) + '</strong> م³ • ' +
    '🐔 ظرفیت: <strong>' + fa(minBirds) + '–' + fa(maxBirds) + '</strong> پرنده';
}

function saveHallEdit(){
  var nameInput = document.getElementById('flkHallName');
  var errEl = document.getElementById('err-flkHallName');
  var name = (nameInput.value || '').trim();
  nameInput.classList.remove('err');
  if(errEl) errEl.style.display = 'none';

  if(!name){
    nameInput.classList.add('err');
    if(errEl){ errEl.style.display = 'block'; errEl.textContent = '❌ نام اجباری است'; }
    toast('❌ نام سالن را وارد کن', 'error');
    hallActiveTab = 'base';
    var tabs = document.querySelectorAll('.flk-htab');
    for(var ti = 0; ti < tabs.length; ti++) tabs[ti].classList.toggle('on', tabs[ti].dataset.tab === 'base');
    var cs = document.querySelectorAll('.flk-hcontent');
    for(var ci = 0; ci < cs.length; ci++) cs[ci].classList.toggle('on', cs[ci].dataset.hcontent === 'base');
    try{ nameInput.focus(); }catch(e){}
    return;
  }
  var halls = getHalls();
  for(var i = 0; i < halls.length; i++){
    if(halls[i].name === name && !sameId(halls[i].id, editingHallId)){
      toast('⚠️ این نام قبلاً استفاده شده', 'error');
      return;
    }
  }

  hallFormEquipment = hallFormEquipment.filter(function(e){ return e.name && e.name.trim(); });

  var cleanBirds = [];
  var totalBirds = 0;
  for(var bi = 0; bi < hallFormBirds.length; bi++){
    var b = hallFormBirds[bi];
    if(!b.birdType && !b.breed && !b.flockId && !(b.count > 0)) continue;
    cleanBirds.push({
      id: b.id || String(Date.now() + Math.random()),
      birdType: b.birdType || '',
      breed: (b.breed || '').trim(),
      flockId: b.flockId || '',
      flockName: b.flockName || '',
      count: +b.count || 0
    });
    totalBirds += +b.count || 0;
  }

  var data = {
    name: name,
    length: +toEnDigits(document.getElementById('flkHallLength').value) || 0,
    width: +toEnDigits(document.getElementById('flkHallWidth').value) || 0,
    height: +toEnDigits(document.getElementById('flkHallHeight').value) || 0,
    birds: cleanBirds,
    birdType: cleanBirds[0] ? cleanBirds[0].birdType : '',
    birdCount: totalBirds,
    equipment: hallFormEquipment.slice(),
    features: hallFormFeatures.slice(),
    notes: document.getElementById('flkHallNotes').value.trim(),
    color: selectedColor,
    isLocked: document.getElementById('flkHallLock').checked
  };

  if(editingHallId){
    var oldHall = getHallById(editingHallId);
    var oldName = oldHall ? oldHall.name : '';
    if(oldName !== name){
      var flocks = getFlocks();
      for(var fi = 0; fi < flocks.length; fi++){
        if(flocks[fi].hall === oldName) Store.update('flocks', flocks[fi].id, { hall: name });
      }
      var groups = getGroups();
      for(var gi = 0; gi < groups.length; gi++){
        if(groups[gi].hall === oldName) Store.update('groups', groups[gi].id, { hall: name });
      }
    }
    Store.update('halls', editingHallId, data);
    toast('✅ سالن ویرایش شد', 'success');
  } else {
    data.createdAt = Date.now();
    Store.add('halls', data);
    toast('✅ سالن اضافه شد', 'success');
  }

  closeModal('flk-hall-edit');
  refreshHallsMgr();
  refreshList();
  editingHallId = null;
  hallFormEquipment = [];
  hallFormFeatures = [];
  hallFormBirds = [];
  hallActiveTab = 'base';
  isCustomColor = false;
}

function lockHall(id){
  var h = getHallById(id);
  if(!h || h.isLocked) return;
  if(!confirm('سالن «' + h.name + '» قفل شود؟')) return;
  Store.update('halls', id, { isLocked: true });
  toast('🔒');
  refreshHallsMgr();
}
function unlockHall(id){
  var h = getHallById(id);
  if(!h || !h.isLocked) return;
  if(!confirm('سالن «' + h.name + '» باز شود؟')) return;
  Store.update('halls', id, { isLocked: false });
  toast('🔓');
  refreshHallsMgr();
}
function deleteHall(id){
  var h = getHallById(id);
  if(!h) return;
  if(h.isLocked){ toast('🔒', 'error'); return; }
  var usage = getHallUsageCount(h.name);
  var msg = usage > 0
    ? '⚠️ سالن «' + h.name + '» در ' + fa(usage) + ' گله استفاده شده.\nحذف شود؟'
    : 'سالن «' + h.name + '» حذف شود؟';
  if(!confirm(msg)) return;

  var flocks = getFlocks();
  for(var fi = 0; fi < flocks.length; fi++){
    if(flocks[fi].hall === h.name) Store.update('flocks', flocks[fi].id, { hall: '' });
  }
  var groups = getGroups();
  for(var gi = 0; gi < groups.length; gi++){
    if(groups[gi].hall === h.name) Store.update('groups', groups[gi].id, { hall: '' });
  }
  Store.remove('halls', id);
  toast('🗑️');
  refreshHallsMgr();
  refreshList();
}

/* ═══════════════════════════════════════════════
   Features Manager
   ═══════════════════════════════════════════════ */
function renderCustomFeaturesInner(){
  var custom = getCustomFeatures();
  if(!custom.length){
    return '<div style="text-align:center;padding:16px;background:#f5f3ff;border:1.5px dashed #c4b5fd;border-radius:10px;font-size:11px;color:#6b21a8;font-weight:700">هنوز ویژگی سفارشی نداری</div>';
  }
  var out = '';
  for(var i = 0; i < custom.length; i++){
    out += '<div class="flk-bt-row" style="border-right-color:#a855f7">' +
      '<div class="flk-bt-icon" style="background:#f5f3ff">⚡</div>' +
      '<div class="flk-bt-info"><div class="flk-bt-name">' + esc(custom[i]) + '</div></div>' +
      '<div class="flk-bt-actions">' +
        '<button class="flk-hall-btn edit" data-flk="edit-feat" data-idx="' + i + '">✏️</button>' +
        '<button class="flk-hall-btn delete" data-flk="del-custom-feat" data-idx="' + i + '">🗑️</button>' +
      '</div>' +
    '</div>';
  }
  return out;
}

function openFeaturesMgr(){
  var html = '<div class="flk-modal-hd">' +
    '<div class="flk-modal-t">⚡ مدیریت ویژگی‌های سالن</div>' +
    '<button class="flk-modal-x" data-flk="close-modal" data-mid="flk-feat-mgr">✕</button>' +
  '</div>' +
  '<div class="flk-info-box">💡 ویژگی‌های پیش‌فرض قابل حذف نیستن ولی می‌تونی ویژگی سفارشی اضافه کنی.</div>' +
  '<div class="flk-fg">' +
    '<label class="flk-fl">➕ افزودن ویژگی سفارشی</label>' +
    '<div class="flk-hall-field">' +
      '<input class="flk-fi" type="text" id="flkNewFeatName" placeholder="مثلاً: پنکه سقفی">' +
      '<button type="button" class="flk-hall-field-btn" data-flk="add-custom-feat">➕</button>' +
    '</div>' +
  '</div>' +
  '<div class="flk-fg" style="margin-top:16px"><label class="flk-fl">📋 ویژگی‌های سفارشی</label>' +
    '<div id="flkCustomFeatList">' + renderCustomFeaturesInner() + '</div>' +
  '</div>' +
  '<div class="flk-fg" style="margin-top:16px"><label class="flk-fl">⚙️ ویژگی‌های پیش‌فرض</label>' +
    '<div class="flk-feat-chips">' +
      BUILTIN_FEATURES.map(function(f){ return '<div class="flk-feat-chip on" style="cursor:default">' + esc(f) + '</div>'; }).join('') +
    '</div>' +
  '</div>' +
  '<button class="flk-save" style="margin-top:14px;background:#f1f5f9;color:#0f172a" data-flk="close-modal" data-mid="flk-feat-mgr">بستن</button>';

  var ex = _modals['flk-feat-mgr'];
  if(ex){ try{ ex.remove(); }catch(e){} delete _modals['flk-feat-mgr']; }
  openModal('flk-feat-mgr', html);
}
function refreshFeatMgr(){
  var el = document.getElementById('flkCustomFeatList');
  if(el) el.innerHTML = renderCustomFeaturesInner();
}

/* ═══════════════════════════════════════════════
   Bird Types
   ═══════════════════════════════════════════════ */
function renderBirdTypeListInner(){
  var types = getBirdTypes();
  if(!types.length){
    return '<div style="text-align:center;padding:20px;background:#ecfdf5;border:1.5px dashed #6ee7b7;border-radius:10px;font-size:11.5px;color:#065f46;font-weight:700">🐔<br>هنوز پرنده‌ای ثبت نشده</div>';
  }
  var out = '';
  for(var i = 0; i < types.length; i++){
    var bt = types[i];
    var usage = 0;
    var halls = getHalls();
    for(var hi = 0; hi < halls.length; hi++) if(halls[hi].birdType === bt.name) usage++;
    var cls = 'flk-bt-row' + (bt.isLocked ? ' locked' : '');
    var badge = bt.isLocked ? '<span class="flk-hall-badge">🔒</span>' : '';
    var acts = bt.isLocked
      ? '<button class="flk-hall-btn unlock" data-flk="unlock-bird" data-id="' + sid(bt.id) + '">🔓</button>'
      : '<button class="flk-hall-btn edit" data-flk="edit-bird" data-id="' + sid(bt.id) + '">✏️</button>' +
        '<button class="flk-hall-btn lock" data-flk="lock-bird" data-id="' + sid(bt.id) + '">🔒</button>' +
        '<button class="flk-hall-btn delete" data-flk="del-bird" data-id="' + sid(bt.id) + '">🗑️</button>';
    out += '<div class="' + cls + '">' +
      '<div class="flk-bt-icon">' + (bt.isLocked ? '🔒' : bt.icon) + '</div>' +
      '<div class="flk-bt-info">' +
        '<div class="flk-bt-name">' + esc(bt.name) + ' ' + badge + '</div>' +
        '<div class="flk-bt-usage">' + (usage > 0 ? 'در ' + fa(usage) + ' سالن' : 'استفاده نشده') + '</div>' +
      '</div>' +
      '<div class="flk-bt-actions">' + acts + '</div>' +
    '</div>';
  }
  return out;
}

function openBirdsMgr(){
  var html = '<div class="flk-modal-hd">' +
    '<div class="flk-modal-t">🐔 مدیریت انواع پرنده</div>' +
    '<button class="flk-modal-x" data-flk="close-modal" data-mid="flk-birds">✕</button>' +
  '</div>' +
  '<button class="flk-save" style="margin-top:0;margin-bottom:10px;background:linear-gradient(135deg,#10b981,#059669)" data-flk="add-bird">➕ افزودن پرنده</button>' +
  '<div id="flkBirdsList">' + renderBirdTypeListInner() + '</div>';
  var ex = _modals['flk-birds'];
  if(ex){ try{ ex.remove(); }catch(e){} delete _modals['flk-birds']; }
  openModal('flk-birds', html);
}
function refreshBirdsMgr(){
  var el = document.getElementById('flkBirdsList');
  if(el) el.innerHTML = renderBirdTypeListInner();
}

function openBirdTypeEdit(id){
  editingBirdTypeId = id ? sid(id) : null;
  var bt = id ? findBy(getBirdTypes(), id) : null;
  if(bt && bt.isLocked){ toast('🔒 پرنده قفله', 'error'); return; }

  var icons = ['🐔', '🦃', '🐦', '🦆', '🦢', '🐤', '🐣', '🦅'];
  var iconsHtml = '';
  for(var i = 0; i < icons.length; i++){
    iconsHtml += '<div class="flk-color-opt' + (bt && bt.icon === icons[i] ? ' on' : '') + '" data-flk="pick-bird-icon" data-icon="' + icons[i] + '" style="background:#f1f5f9;font-size:18px;display:flex;align-items:center;justify-content:center">' + icons[i] + '</div>';
  }

  var html = '<div class="flk-modal-hd">' +
    '<div class="flk-modal-t">' + (id ? '✏️ ویرایش پرنده' : '🐔 پرنده جدید') + '</div>' +
    '<button class="flk-modal-x" data-flk="close-modal" data-mid="flk-bt-edit">✕</button>' +
  '</div>' +
  '<div class="flk-fg"><label class="flk-fl">🐔 نام پرنده <span class="flk-req">*</span></label>' +
    '<input class="flk-fi" type="text" id="flkBtName" placeholder="مثلاً: مرغ" value="' + (bt ? esc(bt.name) : '') + '">' +
    '<span class="flk-err-msg" id="err-flkBtName" style="display:none"></span></div>' +
  '<div class="flk-fg"><label class="flk-fl">🎨 آیکون</label>' +
    '<div class="flk-color-picker" id="flkIconPicker">' + iconsHtml + '</div></div>' +
  '<div class="flk-fg"><label class="flk-check"><input type="checkbox" id="flkBtLock" ' + (bt && bt.isLocked ? 'checked' : '') + '> <span>🔒 قفل کن</span></label></div>' +
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">' +
    '<button class="flk-save" style="margin-top:0;background:#f1f5f9;color:#0f172a" data-flk="close-modal" data-mid="flk-bt-edit">انصراف</button>' +
    '<button class="flk-save" style="margin-top:0;background:linear-gradient(135deg,#10b981,#059669)" data-flk="save-bird">💾 ذخیره</button>' +
  '</div>';

  openModal('flk-bt-edit', html, { sheet: true });
  window.__flkSelectedIcon = bt ? bt.icon : '🐔';
}

function saveBirdTypeEdit(){
  var nameInput = document.getElementById('flkBtName');
  var errEl = document.getElementById('err-flkBtName');
  var name = (nameInput.value || '').trim();
  nameInput.classList.remove('err');
  if(errEl) errEl.style.display = 'none';
  if(!name){
    nameInput.classList.add('err');
    if(errEl){ errEl.style.display = 'block'; errEl.textContent = '❌ نام اجباری'; }
    try{ nameInput.focus(); }catch(e){}
    return;
  }
  var types = getBirdTypes();
  for(var i = 0; i < types.length; i++){
    if(types[i].name === name && !sameId(types[i].id, editingBirdTypeId)){
      toast('⚠️ تکراری', 'error');
      return;
    }
  }
  var icon = window.__flkSelectedIcon || '🐔';
  var isLocked = document.getElementById('flkBtLock').checked;

  if(editingBirdTypeId){
    var old = findBy(getBirdTypes(), editingBirdTypeId);
    if(old){
      var oldName = old.name;
      if(oldName !== name){
        var halls = getHalls();
        for(var hi = 0; hi < halls.length; hi++){
          var updates = {};
          var needsUpdate = false;

          if(halls[hi].birdType === oldName){
            updates.birdType = name;
            needsUpdate = true;
          }

          if(Array.isArray(halls[hi].birds)){
            var newBirds = [];
            var birdsChanged = false;
            for(var bi3 = 0; bi3 < halls[hi].birds.length; bi3++){
              var bb = halls[hi].birds[bi3];
              if(bb.birdType === oldName){
                newBirds.push(Object.assign({}, bb, { birdType: name }));
                birdsChanged = true;
              } else {
                newBirds.push(bb);
              }
            }
            if(birdsChanged){
              updates.birds = newBirds;
              needsUpdate = true;
            }
          }

          if(needsUpdate) Store.update('halls', halls[hi].id, updates);
        }
      }
      Store.update('birdTypes', editingBirdTypeId, { name: name, icon: icon, isLocked: isLocked });
    }
    toast('✅', 'success');
  } else {
    Store.add('birdTypes', { name: name, icon: icon, isLocked: isLocked, hatchDays: 21, transferDays: 18, color: '#3b82f6' });
    toast('✅', 'success');
  }

  closeModal('flk-bt-edit');
  refreshBirdsMgr();
  editingBirdTypeId = null;
}

function lockBirdType(id){
  var bt = findBy(getBirdTypes(), id);
  if(!bt || bt.isLocked) return;
  if(!confirm('قفل؟')) return;
  Store.update('birdTypes', id, { isLocked: true });
  toast('🔒');
  refreshBirdsMgr();
}
function unlockBirdType(id){
  var bt = findBy(getBirdTypes(), id);
  if(!bt || !bt.isLocked) return;
  if(!confirm('باز؟')) return;
  Store.update('birdTypes', id, { isLocked: false });
  toast('🔓');
  refreshBirdsMgr();
}
function deleteBirdType(id){
  var bt = findBy(getBirdTypes(), id);
  if(!bt || bt.isLocked){ toast('🔒', 'error'); return; }
  var usage = 0;
  var halls = getHalls();
  for(var hi = 0; hi < halls.length; hi++) if(halls[hi].birdType === bt.name) usage++;
  if(!confirm(usage > 0 ? '⚠️ در ' + fa(usage) + ' سالن استفاده شده. حذف شود؟' : 'حذف شود؟')) return;

  for(hi = 0; hi < halls.length; hi++){
    var updates2 = {};
    var needsUpdate2 = false;

    if(halls[hi].birdType === bt.name){
      updates2.birdType = '';
      needsUpdate2 = true;
    }

    if(Array.isArray(halls[hi].birds)){
      var newBirds2 = [];
      var birdsChanged2 = false;
      for(var bi4 = 0; bi4 < halls[hi].birds.length; bi4++){
        var bb2 = halls[hi].birds[bi4];
        if(bb2.birdType === bt.name){
          newBirds2.push(Object.assign({}, bb2, { birdType: '' }));
          birdsChanged2 = true;
        } else {
          newBirds2.push(bb2);
        }
      }
      if(birdsChanged2){
        updates2.birds = newBirds2;
        needsUpdate2 = true;
      }
    }

    if(needsUpdate2) Store.update('halls', halls[hi].id, updates2);
  }
  Store.remove('birdTypes', id);
  toast('🗑️');
  refreshBirdsMgr();
}

/* ═══════════════════════════════════════════════
   Flock Form
   ═══════════════════════════════════════════════ */
function openFlockForm(id){
  editingFlockId = id ? sid(id) : null;
  var f = id ? getFlockById(id) : null;
  selectedColor = f ? (f.color || '#3b82f6') : '#3b82f6';
  isCustomColor = !!(f && f.color && !NAMED_COLORS[f.color]);
  var chickVal = (f && f.chickPrice) ? Number(f.chickPrice).toLocaleString('en-US') : '';
  var feedVal = (f && f.feedPrice) ? Number(f.feedPrice).toLocaleString('en-US') : '';
  var transVal = (f && f.transportCost) ? Number(f.transportCost).toLocaleString('en-US') : '';

  var colors = ['#0f766e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981', '#ec4899', '#06b6d4'];
  var colorsHtml = '';
  for(var ci = 0; ci < colors.length; ci++){
    colorsHtml += '<div class="flk-color-opt' + (selectedColor === colors[ci] && !isCustomColor ? ' on' : '') + '" style="background:' + colors[ci] + '" data-color="' + colors[ci] + '"></div>';
  }

  var halls = getHalls();
  var hallOpts = '<option value="">— بدون سالن —</option>';
  for(var hi = 0; hi < halls.length; hi++){
    var hh = halls[hi];
    hallOpts += '<option value="' + esc(hh.name) + '" ' + (f && f.hall === hh.name ? 'selected' : '') + '>🏢 ' + esc(hh.name) + '</option>';
  }

  var hatchVal = f ? (f.hatch || f.hatchDate) : todayStr;
  var countVal = f ? (f.count || f.initialCount || 0) : 0;

  var html = '<div class="flk-modal-hd">' +
    '<div class="flk-modal-t">' + (id ? '✏️ ویرایش گله' : '🐔 گله جدید') + '</div>' +
    '<button class="flk-modal-x" data-flk="close-modal" data-mid="flk-form">✕</button>' +
  '</div>' +
  '<div class="flk-fg"><label class="flk-fl">📝 نام گله <span class="flk-req">*</span></label>' +
    '<input class="flk-fi" type="text" id="flkName" placeholder="مثلاً گله بهاره" value="' + (f ? esc(f.name) : '') + '">' +
    '<span class="flk-err-msg" id="err-flkName" style="display:none"></span></div>' +
  '<div class="flk-fr">' +
    '<div class="flk-fg"><label class="flk-fl">📅 تاریخ هچ <span class="flk-req">*</span></label>' +
      '<div class="flk-date-field">' +
        '<input class="flk-fi" type="text" id="flkHatch" readonly placeholder="1405/06/01" value="' + esc(hatchVal) + '">' +
        '<button type="button" class="flk-date-btn" data-flk="open-cal" data-target="flkHatch">📅</button>' +
      '</div><span class="flk-err-msg" id="err-flkHatch" style="display:none"></span></div>' +
    '<div class="flk-fg"><label class="flk-fl">🔢 تعداد اولیه <span class="flk-req">*</span></label>' +
      '<input class="flk-fi" type="number" id="flkCount" placeholder="مثلاً ۵۰۰" value="' + countVal + '">' +
      '<span class="flk-err-msg" id="err-flkCount" style="display:none"></span></div>' +
  '</div>' +
  '<div class="flk-fg"><label class="flk-fl">🏢 سالن</label>' +
    '<div class="flk-hall-field">' +
      '<select class="flk-sel" id="flkHall">' + hallOpts + '</select>' +
      '<button type="button" class="flk-hall-field-btn" data-flk="open-halls" title="مدیریت سالن‌ها">🏢</button>' +
    '</div></div>' +
  '<div class="flk-fg"><label class="flk-fl">🎨 رنگ</label>' +
    '<div class="flk-color-picker" id="flkColorPicker">' + colorsHtml +
      '<div class="flk-color-opt custom' + (isCustomColor ? ' on selected-custom' : '') + '" id="flkFlockCustomColor" style="position:relative' + (isCustomColor ? ';background:' + selectedColor : '') + '" title="رنگ سفارشی"></div>' +
    '</div></div>' +
  '<div class="flk-fr3">' +
    '<div class="flk-fg"><label class="flk-fl">🐣 جوجه</label><input class="flk-fi" type="text" inputmode="numeric" id="flkChickPrice" placeholder="۱۲۰,۰۰۰" value="' + chickVal + '"></div>' +
    '<div class="flk-fg"><label class="flk-fl">🌾 خوراک</label><input class="flk-fi" type="text" inputmode="numeric" id="flkFeedPrice" placeholder="۱۰۰,۰۰۰" value="' + feedVal + '"></div>' +
    '<div class="flk-fg"><label class="flk-fl">🚚 حمل</label><input class="flk-fi" type="text" inputmode="numeric" id="flkTransport" placeholder="۵۰۰,۰۰۰" value="' + transVal + '"></div>' +
  '</div>' +
  '<div class="flk-fg"><label class="flk-fl">📝 یادداشت</label>' +
    '<textarea class="flk-ft" id="flkNotes" placeholder="توضیحات اضافه...">' + (f ? esc(f.notes || '') : '') + '</textarea></div>' +
  '<button class="flk-save" data-flk="save">💾 ذخیره گله</button>';

  openModal('flk-form', html);
}

function updateColorUI(pickerId){
  var all = document.querySelectorAll('#' + pickerId + ' .flk-color-opt');
  for(var i = 0; i < all.length; i++){
    var opt = all[i];
    if(opt.classList.contains('custom')){
      if(isCustomColor){
        opt.classList.add('on', 'selected-custom');
        opt.style.background = selectedColor;
      } else {
        opt.classList.remove('on', 'selected-custom');
        opt.style.background = '';
      }
    } else {
      opt.classList.toggle('on', !isCustomColor && opt.dataset.color === selectedColor);
    }
  }
}

function openCustomColorPicker(el){
  var input = document.createElement('input');
  input.type = 'color';
  input.value = (selectedColor && /^#[0-9a-fA-F]{6}$/.test(selectedColor)) ? selectedColor : '#3b82f6';
  input.style.cssText = 'position:fixed;top:50%;left:50%;opacity:0;pointer-events:none;width:1px;height:1px;';
  document.body.appendChild(input);

  var cleaned = false;
  function cleanup(){
    if(cleaned) return;
    cleaned = true;
    setTimeout(function(){
      if(input.parentNode) input.parentNode.removeChild(input);
    }, 200);
  }

  input.addEventListener('input', function(){
    selectedColor = input.value;
    isCustomColor = true;
    var picker = el.closest('.flk-color-picker');
    if(picker) updateColorUI(picker.id);
  });

  input.addEventListener('change', cleanup);
  input.addEventListener('blur', cleanup);

  try{
    input.focus();
    input.click();
  }catch(e){
    cleanup();
    var val = prompt('کد رنگ را وارد کنید (مثل #ff0000):', selectedColor || '#3b82f6');
    if(val){
      val = val.trim();
      if(/^#[0-9a-fA-F]{6}$/.test(val) || /^#[0-9a-fA-F]{3}$/.test(val)){
        if(val.length === 4){
          val = '#' + val[1] + val[1] + val[2] + val[2] + val[3] + val[3];
        }
        selectedColor = val.toLowerCase();
        isCustomColor = true;
        var picker2 = el.closest('.flk-color-picker');
        if(picker2) updateColorUI(picker2.id);
      } else {
        toast('❌ کد رنگ نامعتبر', 'error');
      }
    }
  }
}

function clearErrors(){
  var ids = ['flkName', 'flkHatch', 'flkCount'];
  for(var i = 0; i < ids.length; i++){
    var el = document.getElementById(ids[i]);
    if(el) el.classList.remove('err');
    var er = document.getElementById('err-' + ids[i]);
    if(er){ er.style.display = 'none'; er.textContent = ''; }
  }
}
function showError(fid, msg){
  var el = document.getElementById(fid);
  if(el) el.classList.add('err');
  var er = document.getElementById('err-' + fid);
  if(er){ er.style.display = 'block'; er.textContent = msg; }
}
function focusFirstError(){
  var el = document.querySelector('.flk-fi.err');
  if(el && typeof el.focus === 'function'){
    try{ el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }catch(e){}
  }
}

function saveFlock(){
  clearErrors();
  var hasErr = false;
  var nameEl = document.getElementById('flkName');
  var name = (nameEl.value || '').trim();
  if(!name){ showError('flkName', '❌ نام گله اجباری است'); hasErr = true; }
  else if(name.length < 2){ showError('flkName', '❌ حداقل ۲ حرف'); hasErr = true; }

  var hatchEl = document.getElementById('flkHatch');
  var hatch = (hatchEl.value || '').trim();
  if(!hatch){ showError('flkHatch', '❌ تاریخ هچ اجباری'); hasErr = true; }
  else {
    var parts = hatch.replace(/-/g, '/').split('/');
    var ok = (parts.length === 3) && !isNaN(+parts[0]) && !isNaN(+parts[1]) && !isNaN(+parts[2]) &&
             (+parts[0] > 1300) && (+parts[1] >= 1 && +parts[1] <= 12) && (+parts[2] >= 1 && +parts[2] <= 31);
    if(!ok){ showError('flkHatch', '❌ نامعتبر'); hasErr = true; }
  }

  var countEl = document.getElementById('flkCount');
  var count = parseNum(countEl.value);
  if(!count || count <= 0){ showError('flkCount', '❌ تعداد بیشتر از صفر'); hasErr = true; }

  if(hasErr){ toast('❌ لطفاً خطاها را برطرف کنید', 'error'); focusFirstError(); return; }

  var hallEl = document.getElementById('flkHall');
  var hall = hallEl ? (hallEl.value || '') : '';

  var data = {
    name: name,
    hatch: hatch,
    hatchDate: hatch,
    count: count,
    initialCount: count,
    color: selectedColor,
    hall: hall,
    chickPrice: parseNum(document.getElementById('flkChickPrice').value),
    feedPrice: parseNum(document.getElementById('flkFeedPrice').value),
    transportCost: parseNum(document.getElementById('flkTransport').value),
    notes: document.getElementById('flkNotes').value.trim(),
    status: 'active'
  };

  if(editingFlockId){
    var existing = getFlockById(editingFlockId);
    if(existing){
      data.deaths = existing.deaths || 0;
      data.alive = existing.alive || existing.aliveCount || count;
      data.aliveCount = data.alive;
      data.mergedFrom = existing.mergedFrom;
      data.disabled = existing.disabled;
      Store.update('flocks', editingFlockId, data);
    }
    toast('✅ ویرایش شد', 'success');
  } else {
    data.deaths = 0;
    data.alive = count;
    data.aliveCount = count;
    data.disabled = false;
    Store.add('flocks', data);
    toast('✅ ثبت شد', 'success');
  }

  closeModal('flk-form');
  refreshList();
  editingFlockId = null;
  isCustomColor = false;
}

function deleteFlock(id){
  var f = getFlockById(id);
  if(!f) return;
  var g = isFlockInGroup(id);
  if(g){
    if(!confirm('گله «' + f.name + '» داخل گروه «' + g.name + '» است. از گروه خارج و حذف شود؟')) return;
    var newIds = g.flockIds.filter(function(x){ return !sameId(x, id); });
    if(newIds.length < 2){
      Store.remove('groups', g.id);
    } else {
      Store.update('groups', g.id, { flockIds: newIds });
    }
  } else {
    if(!confirm('گله «' + f.name + '» حذف شود؟')) return;
  }
  Store.remove('flocks', id);
  toast('🗑️');
  refreshList();
}

function toggleDisableFlock(id){
  var f = getFlockById(id);
  if(!f) return;
  var isCurrentlyDisabled = !!f.disabled;
  var msg = isCurrentlyDisabled
    ? 'گله «' + f.name + '» فعال شود؟\n(به آمار و محاسبات برمی‌گردد)'
    : 'گله «' + f.name + '» غیرفعال شود؟\n\n(⚠️ داده‌ها و رکوردها باقی می‌مونن، فقط از آمار و محاسبات خارج می‌شه)';
  if(!confirm(msg)) return;
  Store.update('flocks', id, { disabled: !isCurrentlyDisabled });
  Store.save();
  toast(isCurrentlyDisabled ? '✅ گله فعال شد' : '⏸️ گله غیرفعال شد', 'success');
  refreshList();
}

function goToDaily(fid){
  var f = getFlockById(fid);
  if(!f) return;
  if(f.disabled){
    toast('⚠️ این گله غیرفعاله — اول فعالش کن', 'warn');
    return;
  }
  toast('📅 ثبت روزانه');
  if(typeof Router !== 'undefined' && typeof Router.go === 'function') Router.go('daily');
}

/* ═══════════════════════════════════════════════
   Group Create
   ═══════════════════════════════════════════════ */
function openGroupCreate(){
  var ungrouped = getUngroupedFlocks();
  if(ungrouped.length < 2){ toast('❌ حداقل ۲ گله', 'error'); return; }
  groupSelectedIds = [];

  var listHtml = '';
  for(var i = 0; i < ungrouped.length; i++){
    var f = ungrouped[i];
    var age = todayC - jToC(f.hatch || f.hatchDate);
    listHtml += '<div class="flk-select-item" data-flk="toggle-group-select" data-id="' + sid(f.id) + '">' +
      '<div class="flk-select-check">✓</div>' +
      '<div class="flk-color-dot" style="background:' + (f.color || '#3b82f6') + '"></div>' +
      '<div class="flk-select-info">' +
        '<div class="flk-select-name">' + esc(f.name) + (f.hall ? ' <span style="font-size:9px;color:#6b21a8">🏢 ' + esc(f.hall) + '</span>' : '') + '</div>' +
        '<div class="flk-select-stats"><span class="flk-stat g">🐔 ' + fa(f.alive || 0) + '</span><span class="flk-stat b">📅 ' + fa(age) + ' روز</span></div>' +
      '</div></div>';
  }

  var halls = getHalls();
  var hallOpts = '<option value="">— بدون سالن —</option>';
  for(var hi = 0; hi < halls.length; hi++){
    hallOpts += '<option value="' + esc(halls[hi].name) + '">🏢 ' + esc(halls[hi].name) + '</option>';
  }

  var html = '<div class="flk-modal-hd"><div class="flk-modal-t">🏠 گروه کردن</div>' +
    '<button class="flk-modal-x" data-flk="close-modal" data-mid="flk-group">✕</button></div>' +
    '<div class="flk-explain blue"><div class="flk-explain-title">💡 گروه کردن چیکار می‌کنه؟</div>' +
    '<div class="flk-explain-body">چند گله کنار هم، هرکدوم مستقل.</div></div>' +
    '<div class="flk-fg"><label class="flk-fl">🏠 نام گروه <span class="flk-req">*</span></label>' +
      '<input class="flk-fi" type="text" id="flkGroupName" placeholder="مثلاً گروه بهاره">' +
      '<span class="flk-err-msg" id="err-flkGroupName" style="display:none"></span></div>' +
    '<div class="flk-fg"><label class="flk-fl">🏢 سالن</label><select class="flk-sel" id="flkGroupHall">' + hallOpts + '</select></div>' +
    '<div class="flk-fg"><label class="flk-fl">🐔 گله‌ها <span class="flk-req">*</span></label>' +
      '<div class="flk-selection-info" id="flkGroupSelectionInfo">هیچ گله‌ای انتخاب نشده</div>' +
      '<div class="flk-select-list">' + listHtml + '</div></div>' +
    '<button class="flk-save" data-flk="save-group">🏠 گروه کردن</button>';

  openModal('flk-group', html);
}

function saveGroup(){
  var nameInput = document.getElementById('flkGroupName');
  var errEl = document.getElementById('err-flkGroupName');
  var name = (nameInput.value || '').trim();
  nameInput.classList.remove('err');
  if(errEl) errEl.style.display = 'none';
  if(!name){
    nameInput.classList.add('err');
    if(errEl){ errEl.style.display = 'block'; errEl.textContent = '❌ نام اجباری'; }
    try{ nameInput.focus(); }catch(e){}
    return;
  }
  if(groupSelectedIds.length < 2){ toast('❌ حداقل ۲ گله', 'error'); return; }

  Store.add('groups', {
    name: name,
    hall: document.getElementById('flkGroupHall').value.trim(),
    flockIds: groupSelectedIds.map(function(x){ return String(x); })
  });

  closeModal('flk-group');
  toast('✅', 'success');
  groupSelectedIds = [];
  refreshList();
}

/* ═══════════════════════════════════════════════
   Merge
   ═══════════════════════════════════════════════ */
function openMerge(){
  if(getFlocks().length < 2){ toast('❌', 'error'); return; }
  mergeSelectedIds = [];
  renderMergeModal();
}

function renderMergeModal(){
  var flocks = getFlocks();
  var listHtml = '';
  for(var i = 0; i < flocks.length; i++){
    var f = flocks[i];
    var age = todayC - jToC(f.hatch || f.hatchDate);
    var inGroup = isFlockInGroup(f.id);
    listHtml += '<div class="flk-select-item" data-flk="toggle-merge-select" data-id="' + sid(f.id) + '">' +
      '<div class="flk-select-check">✓</div>' +
      '<div class="flk-color-dot" style="background:' + (f.color || '#3b82f6') + '"></div>' +
      '<div class="flk-select-info"><div class="flk-select-name">' + esc(f.name) +
      (inGroup ? ' <span style="font-size:9px;color:#6366f1">🏠 ' + esc(inGroup.name) + '</span>' : '') +
      (f.hall ? ' <span style="font-size:9px;color:#6b21a8">🏢 ' + esc(f.hall) + '</span>' : '') + '</div>' +
      '<div class="flk-select-stats"><span class="flk-stat g">🐔 ' + fa(f.alive || 0) + '</span><span class="flk-stat b">📅 ' + fa(age) + '</span><span class="flk-stat r">💀 ' + fa(f.deaths || 0) + '</span></div></div></div>';
  }

  var colors = ['#0f766e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981', '#ec4899', '#06b6d4'];
  var colorsHtml = '';
  for(var ci = 0; ci < colors.length; ci++){
    colorsHtml += '<div class="flk-color-opt' + (selectedColor === colors[ci] && !isCustomColor ? ' on' : '') + '" style="background:' + colors[ci] + '" data-color="' + colors[ci] + '"></div>';
  }

  var halls = getHalls();
  var hallOpts = '<option value="">— بدون سالن —</option>';
  for(var hi = 0; hi < halls.length; hi++){
    hallOpts += '<option value="' + esc(halls[hi].name) + '">🏢 ' + esc(halls[hi].name) + '</option>';
  }

  var html = '<div class="flk-modal-hd"><div class="flk-modal-t">🔗 ادغام گله‌ها</div>' +
    '<button class="flk-modal-x" data-flk="close-modal" data-mid="flk-merge">✕</button></div>' +
    '<div class="flk-explain"><div class="flk-explain-title">⚠️ ادغام فرقش با گروه چیه؟</div>' +
    '<div class="flk-explain-body">چند گله به یک گله واحد تبدیل می‌شن.</div></div>' +
    '<div class="flk-fg"><label class="flk-fl">🔗 نام گله <span class="flk-req">*</span></label>' +
      '<input class="flk-fi" type="text" id="flkMergeName" placeholder="مثلاً گله سالن ۳">' +
      '<span class="flk-err-msg" id="err-flkMergeName" style="display:none"></span></div>' +
    '<div class="flk-fg"><label class="flk-fl">🏢 سالن</label><select class="flk-sel" id="flkMergeHall">' + hallOpts + '</select></div>' +
    '<div class="flk-fg"><label class="flk-fl">🎨 رنگ</label><div class="flk-color-picker" id="flkMergeColorPicker">' + colorsHtml +
      '<div class="flk-color-opt custom' + (isCustomColor ? ' on selected-custom' : '') + '" id="flkMergeCustomColor" style="position:relative' + (isCustomColor ? ';background:' + selectedColor : '') + '"></div>' +
    '</div></div>' +
    '<div class="flk-fg"><label class="flk-fl">🐔 گله‌ها <span class="flk-req">*</span></label>' +
      '<div class="flk-selection-info" id="flkMergeSelectionInfo">هیچ گله‌ای انتخاب نشده</div>' +
      '<div class="flk-select-list">' + listHtml + '</div></div>' +
    '<button class="flk-save" data-flk="save-merge">🔗 ادغام کن</button>';

  var ex = _modals['flk-merge'];
  if(ex){ try{ ex.remove(); }catch(e){} delete _modals['flk-merge']; }
  openModal('flk-merge', html);
  setTimeout(function(){ updateMergeInfo(); }, 50);
}

function updateMergeInfo(){
  var el = document.getElementById('flkMergeSelectionInfo');
  if(!el) return;
  if(!mergeSelectedIds.length){ el.textContent = 'هیچ گله‌ای انتخاب نشده'; return; }
  var a = 0, d = 0, mx = 0;
  for(var i = 0; i < mergeSelectedIds.length; i++){
    var f = getFlockById(mergeSelectedIds[i]);
    if(!f) continue;
    a += f.alive || 0;
    d += f.deaths || 0;
    var age = todayC - jToC(f.hatch || f.hatchDate);
    if(age > mx) mx = age;
  }
  el.innerHTML = '✅ ' + fa(mergeSelectedIds.length) + ' گله — 🐔 ' + fa(a) + ' • 💀 ' + fa(d) + ' • 📅 ' + fa(mx) + ' روز';
}

function saveMerge(){
  var nameInput = document.getElementById('flkMergeName');
  var errEl = document.getElementById('err-flkMergeName');
  var name = (nameInput.value || '').trim();
  nameInput.classList.remove('err');
  if(errEl) errEl.style.display = 'none';
  if(!name){
    nameInput.classList.add('err');
    if(errEl){ errEl.style.display = 'block'; errEl.textContent = '❌ نام اجباری'; }
    try{ nameInput.focus(); }catch(e){}
    return;
  }
  if(mergeSelectedIds.length < 2){ toast('❌ حداقل ۲ گله', 'error'); return; }
  if(!confirm('⚠️ ' + fa(mergeSelectedIds.length) + ' گله ادغام می‌شن.\nادامه؟')) return;

  var totalCount = 0, totalAlive = 0, totalDeaths = 0;
  var oldestHatch = null, originals = [];
  var totalChick = 0, totalFeed = 0, totalTrans = 0, cCount = 0, fCount = 0;

  for(var i = 0; i < mergeSelectedIds.length; i++){
    var f = getFlockById(mergeSelectedIds[i]);
    if(!f) continue;
    totalCount += f.count || f.initialCount || 0;
    totalAlive += f.alive || f.aliveCount || 0;
    totalDeaths += f.deaths || 0;
    var h = f.hatch || f.hatchDate;
    if(!oldestHatch || jToC(h) < jToC(oldestHatch)) oldestHatch = h;
    if(f.chickPrice){ totalChick += f.chickPrice; cCount++; }
    if(f.feedPrice){ totalFeed += f.feedPrice; fCount++; }
    if(f.transportCost) totalTrans += f.transportCost;
    originals.push(JSON.parse(JSON.stringify(f)));
  }

  var groups = getGroups();
  for(i = 0; i < groups.length; i++){
    var newIds = (groups[i].flockIds || []).filter(function(x){
      return mergeSelectedIds.indexOf(sid(x)) === -1;
    });
    if(newIds.length < 2){
      Store.remove('groups', groups[i].id);
    } else {
      Store.update('groups', groups[i].id, { flockIds: newIds });
    }
  }

  var newFlock = {
    name: name,
    hatch: oldestHatch,
    hatchDate: oldestHatch,
    count: totalCount,
    initialCount: totalCount,
    alive: totalAlive,
    aliveCount: totalAlive,
    deaths: totalDeaths,
    color: selectedColor,
    hall: document.getElementById('flkMergeHall').value || '',
    chickPrice: cCount > 0 ? Math.round(totalChick / cCount) : 0,
    feedPrice: fCount > 0 ? Math.round(totalFeed / fCount) : 0,
    transportCost: totalTrans,
    notes: 'ادغام از: ' + originals.map(function(x){ return x.name; }).join(' + '),
    status: 'active',
    disabled: false,
    mergedFrom: originals.map(function(x){ return sid(x.id); }),
    mergedAt: Date.now()
  };
  var newFlockId = Store.add('flocks', newFlock).id;

  Store.add('merged', {
    newFlockId: newFlockId,
    originals: originals,
    createdAt: Date.now()
  });

  for(i = 0; i < mergeSelectedIds.length; i++){
    Store.remove('flocks', mergeSelectedIds[i]);
  }

  closeModal('flk-merge');
  toast('✅ ' + fa(originals.length) + ' گله ادغام شد', 'success');
  mergeSelectedIds = [];
  isCustomColor = false;
  refreshList();
}

function ungroup(groupId){
  var g = getGroupById(groupId);
  if(!g) return;
  if(!confirm('گروه «' + g.name + '» باز شود؟')) return;
  Store.remove('groups', groupId);
  toast('🔓');
  refreshList();
}

/* ═══════════════════════════════════════════════
   Calendar
   ═══════════════════════════════════════════════ */
function openCalendar(targetId){
  calState.targetId = targetId;
  var inp = document.getElementById(targetId);
  if(inp && inp.value){
    var p = inp.value.replace(/-/g, '/').split('/').map(Number);
    if(p.length === 3 && !isNaN(p[0])){
      calState.y = p[0]; calState.m = p[1];
      calState.sel = { y: p[0], m: p[1], d: p[2] };
    }
  } else {
    calState.y = todayJ.y; calState.m = todayJ.m; calState.sel = null;
  }

  var html = '<div class="flk-cal-box"><div class="flk-cal-hd"><div class="flk-cal-my" id="flkCalMY"></div>' +
    '<div class="flk-cal-nav"><button class="flk-cal-navb" data-flk="cal-prev">‹</button><button class="flk-cal-navb" data-flk="cal-next">›</button></div></div>' +
    '<div class="flk-cal-wd"><div class="flk-cal-wdc">ش</div><div class="flk-cal-wdc">ی</div><div class="flk-cal-wdc">د</div><div class="flk-cal-wdc">س</div><div class="flk-cal-wdc">چ</div><div class="flk-cal-wdc">پ</div><div class="flk-cal-wdc">ج</div></div>' +
    '<div class="flk-cal-days" id="flkCalDays"></div>' +
    '<div class="flk-cal-ft"><button class="flk-cal-tb" data-flk="cal-today">📍 امروز</button><div class="flk-cal-si" id="flkCalSel">—</div></div></div>';

  openModal('flk-cal', html, { sheet: true });
  renderCalendar();
}

function renderCalendar(){
  var my = document.getElementById('flkCalMY');
  if(!my) return;
  my.textContent = FA_MONTHS[calState.m - 1] + ' ' + fa(calState.y);
  var fd = jToG(calState.y, calState.m, 1);
  var so = (fd.getDay() + 1) % 7;
  var dc = daysInJMonth(calState.y, calState.m);
  var cells = '';
  for(var i = 0; i < so; i++) cells += '<div class="flk-cal-d empty"></div>';
  for(var d = 1; d <= dc; d++){
    var isT = calState.y === todayJ.y && calState.m === todayJ.m && d === todayJ.d;
    var isS = calState.sel && calState.sel.y === calState.y && calState.sel.m === calState.m && calState.sel.d === d;
    var cls = 'flk-cal-d';
    if(isT) cls += ' today';
    if(isS) cls += ' selected';
    cells += '<div class="' + cls + '" data-flk="cal-pick" data-d="' + d + '">' + toFa(d) + '</div>';
  }
  document.getElementById('flkCalDays').innerHTML = cells;
  var se = document.getElementById('flkCalSel');
  if(calState.sel) se.textContent = fa(calState.sel.y) + '/' + String(calState.sel.m).padStart(2, '0') + '/' + String(calState.sel.d).padStart(2, '0');
  else se.textContent = '—';
}

/* ═══════════════════════════════════════════════
   Events
   ═══════════════════════════════════════════════ */
document.addEventListener('click', function(e){
  var colorOpt = e.target.closest ? e.target.closest('#flkColorPicker .flk-color-opt, #flkHallColorPicker .flk-color-opt, #flkMergeColorPicker .flk-color-opt') : null;
  if(colorOpt){
    if(colorOpt.classList.contains('custom')){
      openCustomColorPicker(colorOpt);
    } else {
      selectedColor = colorOpt.dataset.color;
      isCustomColor = false;
      var picker = colorOpt.closest('.flk-color-picker');
      if(picker) updateColorUI(picker.id);
    }
    return;
  }

  var btn = e.target.closest ? e.target.closest('[data-flk]') : null;
  if(!btn) return;
  var act = btn.dataset.flk;
  var id = sid(btn.dataset.id);
  var mid = btn.dataset.mid;
  var idx = +btn.dataset.idx;

  switch(act){
    case 'open-form': openFlockForm(); break;
    case 'edit': e.stopPropagation(); openFlockForm(id); break;
    case 'del': e.stopPropagation(); deleteFlock(id); break;
    case 'daily': e.stopPropagation(); goToDaily(id); break;

    case 'toggle': {
      e.stopPropagation();
      uiState.expanded[id] = !uiState.expanded[id];
      var listEl = document.querySelector('[data-flk-list]');
      if(listEl) listEl.innerHTML = renderListInner();
      break;
    }
    case 'toggle-group': {
      e.stopPropagation();
      uiState.groupExpanded[id] = !uiState.groupExpanded[id];
      var l2 = document.querySelector('[data-flk-list]');
      if(l2) l2.innerHTML = renderListInner();
      break;
    }

    case 'toggle-disable': {
      e.stopPropagation();
      toggleDisableFlock(id);
      break;
    }

    case 'toggle-filter-box': {
      e.stopPropagation();
      uiState.filterBoxOpen = !uiState.filterBoxOpen;
      var fbox = document.getElementById('flkFilterBox');
      if(fbox) fbox.classList.toggle('open', uiState.filterBoxOpen);
      break;
    }

    case 'filter': {
      e.stopPropagation();
      var fId = btn.dataset.f;
      if(fId === 'all'){
        uiState.filters = [];
      } else {
        var fi = uiState.filters.indexOf(fId);
        if(fi === -1) uiState.filters.push(fId);
        else uiState.filters.splice(fi, 1);
      }
      uiState.filterBoxOpen = true;
      refreshList();
      var nb = document.getElementById('flkFilterBox');
      if(nb) nb.classList.add('open');
      break;
    }

    case 'clear-filters': {
      e.stopPropagation();
      uiState.filters = [];
      uiState.filterBoxOpen = false;
      refreshList();
      break;
    }

    case 'close-filter': {
      e.stopPropagation();
      uiState.filterBoxOpen = false;
      refreshList();
      break;
    }

    case 'set-sort': {
      e.stopPropagation();
      uiState.sort = btn.dataset.s;
      uiState.filterBoxOpen = false;
      refreshList();
      break;
    }

    case 'close-modal': closeModal(mid); break;
    case 'save': saveFlock(); break;

    case 'open-halls': openHallsMgr(); break;
    case 'add-hall': openHallEdit(); break;
    case 'edit-hall': openHallEdit(id); break;
    case 'view-hall': openHallEdit(id, true); break;
    case 'save-hall': saveHallEdit(); break;
    case 'lock-hall': lockHall(id); break;
    case 'unlock-hall': unlockHall(id); break;
    case 'del-hall': deleteHall(id); break;
    case 'add-equip': {
      hallFormEquipment.push({ name: '', count: 0 });
      var el2 = document.getElementById('flkEqList');
      if(el2) el2.innerHTML = renderEquipmentInner(false);
      break;
    }
    case 'del-equip': {
      hallFormEquipment.splice(+btn.dataset.i, 1);
      var el3 = document.getElementById('flkEqList');
      if(el3) el3.innerHTML = renderEquipmentInner(false);
      break;
    }
    case 'toggle-feat': {
      var fname = btn.dataset.name;
      var fIdx = hallFormFeatures.indexOf(fname);
      if(fIdx === -1){
        hallFormFeatures.push(fname);
        btn.classList.add('on');
      } else {
        hallFormFeatures.splice(fIdx, 1);
        btn.classList.remove('on');
      }
      break;
    }
    case 'hall-tab': {
      var tab = btn.dataset.tab;
      hallActiveTab = tab;
      var hTabs = document.querySelectorAll('.flk-htab');
      for(var hi = 0; hi < hTabs.length; hi++) hTabs[hi].classList.toggle('on', hTabs[hi].dataset.tab === tab);
      var cs = document.querySelectorAll('.flk-hcontent');
      for(var ci2 = 0; ci2 < cs.length; ci2++) cs[ci2].classList.toggle('on', cs[ci2].dataset.hcontent === tab);
      if(tab === 'dims') setTimeout(updateHallDimInfo, 30);
      break;
    }

    case 'add-hall-bird': {
      hallFormBirds.push({
        id: String(Date.now() + Math.random()),
        birdType: '',
        breed: '',
        flockId: '',
        flockName: '',
        count: 0
      });
      var elB = document.getElementById('flkHallBirdsList');
      if(elB) elB.innerHTML = renderHallBirdsInner(false);
      break;
    }
    case 'del-hall-bird': {
      hallFormBirds.splice(+btn.dataset.i, 1);
      var elB2 = document.getElementById('flkHallBirdsList');
      if(elB2) elB2.innerHTML = renderHallBirdsInner(false);
      break;
    }

    case 'open-feat-mgr': openFeaturesMgr(); break;
    case 'add-custom-feat': {
      var nEl = document.getElementById('flkNewFeatName');
      var nv = (nEl.value || '').trim();
      if(!nv){ toast('❌ نام', 'error'); try{ nEl.focus(); }catch(e){} break; }
      if(getAllFeatures().indexOf(nv) !== -1){ toast('⚠️ تکراری', 'error'); break; }
      Store.add('customFeatures', { name: nv });
      refreshFeatMgr();
      var chips = document.getElementById('flkFeatChips');
      if(chips) chips.innerHTML = renderFeaturesChipsInner(false);
      nEl.value = '';
      toast('✅', 'success');
      break;
    }
    case 'del-custom-feat': {
      var custom = getCustomFeatures();
      var cfName = custom[idx];
      if(!cfName) break;
      if(!confirm('ویژگی «' + cfName + '» حذف شود؟')) break;

      var halls = getHalls();
      for(var si = 0; si < halls.length; si++){
        var newFeats = (halls[si].features || []).filter(function(x){ return x !== cfName; });
        if(newFeats.length !== (halls[si].features || []).length){
          Store.update('halls', halls[si].id, { features: newFeats });
        }
      }
      hallFormFeatures = hallFormFeatures.filter(function(x){ return x !== cfName; });

      var customArr = getCustomFeatures();
      var targetId = customArr[idx] && customArr[idx].id;
      if(targetId) Store.remove('customFeatures', targetId);

      refreshFeatMgr();
      var chips2 = document.getElementById('flkFeatChips');
      if(chips2) chips2.innerHTML = renderFeaturesChipsInner(false);
      toast('🗑️');
      break;
    }
    case 'del-feat': {
      e.stopPropagation();
      var featName = btn.dataset.name;
      if(!confirm('ویژگی «' + featName + '» حذف شود؟')) break;

      var halls2 = getHalls();
      for(var sj = 0; sj < halls2.length; sj++){
        var newF = (halls2[sj].features || []).filter(function(x){ return x !== featName; });
        if(newF.length !== (halls2[sj].features || []).length){
          Store.update('halls', halls2[sj].id, { features: newF });
        }
      }
      hallFormFeatures = hallFormFeatures.filter(function(x){ return x !== featName; });

      var custList = getCustomFeatures();
      for(var ck = 0; ck < custList.length; ck++){
        if(custList[ck].name === featName){
          Store.remove('customFeatures', custList[ck].id);
          break;
        }
      }

      var chips3 = document.getElementById('flkFeatChips');
      if(chips3) chips3.innerHTML = renderFeaturesChipsInner(false);
      toast('🗑️');
      break;
    }

    case 'open-birds': openBirdsMgr(); break;
    case 'add-bird': openBirdTypeEdit(); break;
    case 'edit-bird': openBirdTypeEdit(id); break;
    case 'save-bird': saveBirdTypeEdit(); break;
    case 'lock-bird': lockBirdType(id); break;
    case 'unlock-bird': unlockBirdType(id); break;
    case 'del-bird': deleteBirdType(id); break;
    case 'pick-bird-icon': {
      window.__flkSelectedIcon = btn.dataset.icon;
      var btIcons = document.querySelectorAll('#flkIconPicker .flk-color-opt');
      for(var bi = 0; bi < btIcons.length; bi++) btIcons[bi].classList.toggle('on', btIcons[bi] === btn);
      break;
    }

    case 'open-group': openGroupCreate(); break;
    case 'toggle-group-select': {
      e.stopPropagation();
      var sidV = sid(btn.dataset.id);
      var gIdx = groupSelectedIds.indexOf(sidV);
      if(gIdx === -1){
        groupSelectedIds.push(sidV);
        btn.classList.add('on');
      } else {
        groupSelectedIds.splice(gIdx, 1);
        btn.classList.remove('on');
      }
      var info = document.getElementById('flkGroupSelectionInfo');
      if(info){
        if(!groupSelectedIds.length) info.textContent = 'هیچ گله‌ای انتخاب نشده';
        else {
          var tc = 0;
          for(var gi = 0; gi < groupSelectedIds.length; gi++){
            var gf = getFlockById(groupSelectedIds[gi]);
            if(gf) tc += gf.alive || 0;
          }
          info.textContent = '✅ ' + fa(groupSelectedIds.length) + ' گله — 🐔 ' + fa(tc) + ' زنده';
        }
      }
      break;
    }
    case 'save-group': saveGroup(); break;
    case 'unmerge': e.stopPropagation(); ungroup(id); break;
    case 'group-daily': e.stopPropagation(); toast('📅'); if(typeof Router !== 'undefined' && Router.go) Router.go('daily'); break;
    case 'merge-from-group': e.stopPropagation(); openMerge(); break;

    case 'open-merge': openMerge(); break;
    case 'toggle-merge-select': {
      e.stopPropagation();
      var mId = sid(btn.dataset.id);
      var mIdx = mergeSelectedIds.indexOf(mId);
      if(mIdx === -1){
        mergeSelectedIds.push(mId);
        btn.classList.add('on');
      } else {
        mergeSelectedIds.splice(mIdx, 1);
        btn.classList.remove('on');
      }
      updateMergeInfo();
      break;
    }
    case 'save-merge': saveMerge(); break;

    case 'open-cal': openCalendar(btn.dataset.target); break;
    case 'cal-prev': calState.m--; if(calState.m < 1){ calState.m = 12; calState.y--; } renderCalendar(); break;
    case 'cal-next': calState.m++; if(calState.m > 12){ calState.m = 1; calState.y++; } renderCalendar(); break;
    case 'cal-pick': {
      calState.sel = { y: calState.y, m: calState.m, d: +btn.dataset.d };
      renderCalendar();
      setTimeout(function(){
        var inp = document.getElementById(calState.targetId);
        if(inp) inp.value = calState.sel.y + '/' + String(calState.sel.m).padStart(2, '0') + '/' + String(calState.sel.d).padStart(2, '0');
        var el = document.getElementById('flkHatch');
        if(el) el.classList.remove('err');
        var er = document.getElementById('err-flkHatch');
        if(er){ er.style.display = 'none'; er.textContent = ''; }
        closeModal('flk-cal');
      }, 220);
      break;
    }
    case 'cal-today': {
      calState.y = todayJ.y; calState.m = todayJ.m;
      calState.sel = { y: todayJ.y, m: todayJ.m, d: todayJ.d };
      renderCalendar();
      setTimeout(function(){
        var inp = document.getElementById(calState.targetId);
        if(inp) inp.value = calState.sel.y + '/' + String(calState.sel.m).padStart(2, '0') + '/' + String(calState.sel.d).padStart(2, '0');
        var el = document.getElementById('flkHatch');
        if(el) el.classList.remove('err');
        var er = document.getElementById('err-flkHatch');
        if(er){ er.style.display = 'none'; er.textContent = ''; }
        closeModal('flk-cal');
      }, 220);
      break;
    }
  }
});

document.addEventListener('click', function(e){
  if(!uiState.filterBoxOpen) return;
  var box = document.getElementById('flkFilterBox');
  if(box && !box.contains(e.target)){
    uiState.filterBoxOpen = false;
    box.classList.remove('open');
  }
});

document.addEventListener('input', function(e){
  var t = e.target;
  var errIds = ['flkName', 'flkHatch', 'flkCount', 'flkGroupName', 'flkMergeName', 'flkHallName', 'flkBtName'];
  if(errIds.indexOf(t.id) !== -1){
    t.classList.remove('err');
    var er = document.getElementById('err-' + t.id);
    if(er){ er.style.display = 'none'; er.textContent = ''; }
  }
  if(t.id === 'flkHallLength' || t.id === 'flkHallWidth' || t.id === 'flkHallHeight'){
    var val = toEnDigits(t.value).replace(/[^\d.]/g, '');
    t.value = val;
    updateHallDimInfo();
    return;
  }
  if(t.dataset && t.dataset.eqName !== undefined){
    var i1 = +t.dataset.eqName;
    if(hallFormEquipment[i1]) hallFormEquipment[i1].name = t.value;
    return;
  }
  if(t.dataset && t.dataset.eqCount !== undefined){
    var i2 = +t.dataset.eqCount;
    if(hallFormEquipment[i2]) hallFormEquipment[i2].count = parseNum(t.value);
    return;
  }
  if(t.dataset && t.dataset.hallBirdCount !== undefined){
    var i3 = +t.dataset.hallBirdCount;
    if(hallFormBirds[i3]) hallFormBirds[i3].count = +t.value || 0;
    return;
  }
  if(t.dataset && t.dataset.hallBirdBreed !== undefined){
    var i4 = +t.dataset.hallBirdBreed;
    if(hallFormBirds[i4]) hallFormBirds[i4].breed = t.value || '';
    return;
  }
  if(t.id === 'flkChickPrice' || t.id === 'flkFeedPrice' || t.id === 'flkTransport'){
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
  }
});

/* ═══════ Hall Birds Events ═══════ */
document.addEventListener('change', function(e){
  var t = e.target;
  if(!t.dataset) return;

  if(t.dataset.hallBirdType !== undefined){
    var idx = +t.dataset.hallBirdType;
    if(!hallFormBirds[idx]) return;
    hallFormBirds[idx].birdType = t.value || '';

    if(hallFormBirds[idx].flockId){
      var flocks = getFlocks();
      for(var k = 0; k < flocks.length; k++){
        if(sameId(flocks[k].id, hallFormBirds[idx].flockId)){
          if(t.value && flocks[k].birdType && flocks[k].birdType !== t.value){
            hallFormBirds[idx].flockId = '';
            hallFormBirds[idx].flockName = '';
          }
          break;
        }
      }
    }

    var el = document.getElementById('flkHallBirdsList');
    if(el) el.innerHTML = renderHallBirdsInner(false);
    return;
  }

  if(t.dataset.hallBirdFlock !== undefined){
    var idx2 = +t.dataset.hallBirdFlock;
    if(!hallFormBirds[idx2]) return;

    var opt = t.options[t.selectedIndex];
    hallFormBirds[idx2].flockId = t.value || '';
    hallFormBirds[idx2].flockName = opt ? (opt.dataset.name || '') : '';

    if(t.value && opt && opt.dataset.count){
      hallFormBirds[idx2].count = +opt.dataset.count || 0;
    }

    if(t.value && !hallFormBirds[idx2].birdType && opt && opt.dataset.type){
      hallFormBirds[idx2].birdType = opt.dataset.type;
    }

    var el2 = document.getElementById('flkHallBirdsList');
    if(el2) el2.innerHTML = renderHallBirdsInner(false);
    return;
  }
});

/* ═══════════════════════════════════════════════
   Public API
   ═══════════════════════════════════════════════ */
window.FlocksModule = {
  key: 'flocks',
  get: function(){
    return {
      flocks: getFlocks(),
      groups: getGroups(),
      merged: getMerged(),
      halls: getHalls(),
      birdTypes: getBirdTypes(),
      customFeatures: getCustomFeatures()
    };
  },
  save: function(){ Store.save(); },
  load: function(){ refreshList(); }
};

/* ═══════════════════════════════════════════════
   Init
   ═══════════════════════════════════════════════ */
injectStyles();

Router.register('flocks', {
  title: 'گله‌ها',
  navPage: 'flocks',
  topLevel: true,
  render: function(){ return renderPage(); }
});

console.log('✅ flocks route registered (v12.2 — smaller play/pause)');

})();