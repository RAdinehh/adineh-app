/* ═══════════════════════════════════════════════
   DAILY — ثبت روزانه (v19.0)
   • همه سایزها مثل v17
   • تاریخ و گله کمی بزرگ‌تر + تاریخ بی‌رنگ
   • کادر کارت‌ها بزرگ‌تر از v17
   ═══════════════════════════════════════════════ */
(function(){
'use strict';

console.log('🚀 daily.js start');

if(typeof Router === 'undefined' || typeof Router.register !== 'function'){ return; }
if(window.__dailyModuleLoaded) return;
window.__dailyModuleLoaded = true;

var sid = UI.sid, sameId = UI.sameId, findBy = UI.findBy;
var esc = UI.esc, fa = UI.fa, toFa = UI.toFa, toEnDigits = UI.toEnDigits;
var parseNum = UI.parseNum, fmtThousandsInput = UI.fmtThousandsInput;
var toast = UI.toast;
var gToJ = UI.gToJ, jToG = UI.jToG, jToC = UI.jToC;
var daysInJMonth = UI.daysInJMonth, FA_MONTHS = UI.FA_MONTHS;
var todayJ = UI.todayJ, todayStr = UI.todayStr;

var PAGE_SIZE = 10;

var uiState = {
  expanded: {},
  filter: 'all',
  filterBoxOpen: false,
  sortBy: 'date_desc',
  showAll: false
};
var editingRecordId = null;
var editingCauseId = null;
var formDeathsList = [];
var _formInput = { count: 0, causeId: '' };
var calState = { y: todayJ.y, m: todayJ.m, sel: null, targetId: null, pickerStep: null };
var _modals = {};

function getRecords(){ try{ return Store.all('dailyRecords') || []; }catch(e){ return []; } }
function getCauses(){ try{ return Store.all('causes') || []; }catch(e){ return []; } }
function getFlocks(){
  try{
    return (Store.all('flocks') || []).filter(function(f){
      return !f.status || f.status === 'active';
    });
  }catch(e){ return []; }
}

var FLOCK_COLORS = ['#0f766e','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16','#f97316','#a855f7','#14b8a6','#6366f1'];

function getFlockColor(flockName){
  if(!flockName) return '#94a3b8';
  var flocks = getFlocks();
  for(var i = 0; i < flocks.length; i++){
    if(flocks[i].name === flockName && flocks[i].color) return flocks[i].color;
  }
  var hash = 0;
  for(var j = 0; j < flockName.length; j++){
    hash = flockName.charCodeAt(j) + ((hash << 5) - hash);
  }
  return FLOCK_COLORS[Math.abs(hash) % FLOCK_COLORS.length];
}

function findRecordByDateFlock(date, flockName, excludeId){
  if(!date || !flockName) return null;
  var records = getRecords();
  for(var i = 0; i < records.length; i++){
    var r = records[i];
    if(r.date !== date) continue;
    if(r.flock !== flockName) continue;
    if(excludeId && sameId(r.id, excludeId)) continue;
    return r;
  }
  return null;
}

function getFilteredCauses(){
  var flockName = '';
  var flockEl = document.getElementById('dayFlock');
  if(flockEl) flockName = flockEl.value || '';

  var allCauses = getCauses();
  var filtered = [];
  var extras = [];

  for(var i = 0; i < allCauses.length; i++){
    var c = allCauses[i];
    if(!Array.isArray(c.flockNames) || c.flockNames.length === 0){ filtered.push(c); continue; }
    if(flockName && c.flockNames.indexOf(flockName) !== -1){ filtered.push(c); continue; }
    for(var j = 0; j < formDeathsList.length; j++){
      if(sameId(formDeathsList[j].causeId, c.id)){ extras.push(c); break; }
    }
  }
  return filtered.concat(extras);
}

function removeLinkedMedicineRecords(dailyRecordId){
  var allMed = Store.all('medicineRecords') || [];
  for(var i = allMed.length - 1; i >= 0; i--){
    if(allMed[i].linkedDailyId && sameId(allMed[i].linkedDailyId, dailyRecordId)){
      Store.remove('medicineRecords', allMed[i].id);
    }
  }
}

function getDefaultMedType(){
  var types = Store.all('medTypes') || [];
  if(!types.length) return 'دارو';
  for(var i = 0; i < types.length; i++){ if(types[i].name === 'دارو') return 'دارو'; }
  return types[0].name;
}

function getDefaultMedReason(){
  var reasons = Store.all('medReasons') || [];
  if(!reasons.length) return 'درمان';
  for(var i = 0; i < reasons.length; i++){ if(reasons[i].name === 'درمان') return 'درمان'; }
  return reasons[0].name;
}

function syncMedicineRecords(dailyRecord){
  if(!dailyRecord || !dailyRecord.id) return;
  removeLinkedMedicineRecords(dailyRecord.id);

  var deathsList = dailyRecord.deathsList || [];
  var diseaseCauses = [];
  for(var j = 0; j < deathsList.length; j++){
    var item = deathsList[j];
    var causes = getCauses();
    for(var k = 0; k < causes.length; k++){
      if(causes[k].name === item.cause && causes[k].isDisease === true){
        diseaseCauses.push({ name: item.cause, count: item.count });
        break;
      }
    }
  }
  if(diseaseCauses.length === 0) return;

  var medType = getDefaultMedType();
  var medReason = getDefaultMedReason();
  for(var m = 0; m < diseaseCauses.length; m++){
    var dc = diseaseCauses[m];
    Store.add('medicineRecords', {
      date: dailyRecord.date,
      flock: dailyRecord.flock || '',
      type: medType,
      age: 0,
      items: [{ name: dc.name, dose: '', unit: '' }],
      method: '',
      reason: medReason,
      cost: 0,
      notes: '⚠️ خودکار از ثبت روزانه — ' + dc.count + ' جوجه تلفات',
      linkedDailyId: dailyRecord.id,
      linkedCauseName: dc.name,
      isAutoLinked: true
    });
  }
}

function openModal(id, html, opts){
  opts = opts || {};
  if(_modals[id]){
    var old = _modals[id];
    if(old.parentNode) old.parentNode.removeChild(old);
    delete _modals[id];
  }
  var wrap = document.createElement('div');
  wrap.className = 'day-modal-wrap';
  wrap.dataset.modalId = id;
  wrap.innerHTML = '<div class="day-modal-bg" data-day="close-modal" data-mid="' + id + '"></div>' +
    '<div class="day-modal-box' + (opts.sheet ? ' day-sheet' : '') + '">' + html + '</div>';
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
function forceCloseModal(id){
  var el = _modals[id];
  if(el && el.parentNode) el.parentNode.removeChild(el);
  delete _modals[id];
}

function injectStyles(){
  if(document.getElementById('day-styles')) return;
  var css =
  '.day-page{padding:10px;max-width:760px;margin:0 auto}' +
  '.day-header{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}' +
  '.day-title{font-size:14px;font-weight:900;color:var(--text,#0f172a)}' +
  '.day-sub{font-size:10.5px;color:var(--muted,#64748b);font-weight:700;margin-top:1px}' +
  '.day-add{background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;border:none;padding:8px 14px;border-radius:9999px;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:4px;white-space:nowrap}' +
  '.day-summary{background:#fff;border-radius:12px;padding:10px;margin-bottom:10px;border:1px solid #e2e8f0;display:grid;grid-template-columns:repeat(4,1fr);gap:6px}' +
  '.day-sum{background:#f1f5f9;border-radius:8px;padding:8px 4px;text-align:center;border-bottom:2px solid #0f766e}' +
  '.day-sum.g{border-color:#10b981}.day-sum.r{border-color:#ef4444}.day-sum.b{border-color:#3b82f6}.day-sum.o{border-color:#f59e0b}' +
  '.day-sum-ic{font-size:14px;line-height:1;margin-bottom:2px}' +
  '.day-sum-v{font-size:14px;font-weight:900;line-height:1.2}' +
  '.day-sum-l{font-size:9.5px;color:#64748b;font-weight:700;margin-top:1px}' +

  '.day-filter-bar{display:flex;gap:6px;margin-bottom:10px;align-items:center}' +
  '.day-filter-box{position:relative;flex:1;min-width:0}' +
  '.day-filter-btn{background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;padding:9px 12px;font-family:inherit;font-size:11.5px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:8px;width:100%;justify-content:space-between;color:#0f172a;box-sizing:border-box;text-align:right}' +
  '.day-filter-btn .fb-left{display:flex;align-items:center;gap:6px;min-width:0;flex:1}' +
  '.day-filter-btn .fb-label{color:#0f766e;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
  '.day-filter-btn .fb-count{font-size:9.5px;font-weight:800;background:#f0fdfa;color:#0f766e;padding:1px 7px;border-radius:9999px;flex-shrink:0}' +
  '.day-filter-btn .fb-arrow{font-size:12px;color:#64748b;transition:transform .2s;flex-shrink:0}' +
  '.day-filter-box.open .fb-arrow{transform:rotate(90deg)}' +
  '.day-filter-menu{display:none;position:absolute;top:calc(100% + 6px);right:0;left:0;background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;box-shadow:0 8px 24px rgba(15,23,42,.14);z-index:80;overflow:hidden;max-height:60vh;overflow-y:auto}' +
  '.day-filter-box.open .day-filter-menu{display:block}' +
  '.day-filter-sec{padding:8px 14px 4px;font-size:9.5px;font-weight:900;color:#94a3b8;background:#f8fafc;border-bottom:1px solid #f1f5f9;text-transform:uppercase;letter-spacing:.3px}' +
  '.day-filter-item{padding:11px 14px;font-size:12px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #f1f5f9;color:#0f172a}' +
  '.day-filter-item:last-child{border-bottom:none}' +
  '.day-filter-item.on{background:linear-gradient(135deg,#ecfdf5,#d1fae5);color:#0f766e}' +
  '.day-filter-item .fi-check{color:#10b981;font-weight:900;opacity:0;font-size:13px}' +
  '.day-filter-item.on .fi-check{opacity:1}' +
  '.day-filter-item .fi-count{font-size:10px;color:#64748b;font-weight:700;background:#f1f5f9;padding:1px 7px;border-radius:9999px}' +
  '.day-filter-item.on .fi-count{background:#fff;color:#0f766e}' +
  '.day-sort-btn{background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;padding:9px 12px;font-family:inherit;font-size:11.5px;font-weight:800;cursor:pointer;color:#0f172a;white-space:nowrap;flex-shrink:0;display:flex;align-items:center;gap:5px}' +
  '.day-sort-btn:active{background:#f1f5f9}' +

  /* ═══ کارت — کادر بزرگ‌تر ═══ */
  '.day-card{background:#fff;border-radius:14px;margin-bottom:8px;border:1px solid #e2e8f0;border-right:4px solid #0f766e;overflow:hidden}' +
  '.day-card-hd{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding:14px 16px;cursor:pointer;user-select:none}' +
  '.day-card-hd:active{background:#f1f5f9}' +
  '.day-hd-content{flex:1;min-width:0}' +
  '.day-hd-row1{display:flex;align-items:center;gap:8px;margin-bottom:7px;flex-wrap:wrap}' +

  /* ✅ تاریخ — بی‌رنگ، یه خورده بزرگ‌تر */
  '.day-date{font-size:13px;font-weight:900;display:flex;align-items:center;gap:4px;white-space:nowrap;color:#0f172a;padding:0}' +

  /* ✅ گله — یه خورده بزرگ‌تر */
  '.day-flock{font-size:11px;font-weight:800;padding:4px 11px;border-radius:9999px;white-space:nowrap;border:1px solid transparent}' +

  '.day-hd-row2{display:flex;align-items:center;gap:5px;flex-wrap:wrap;font-size:10.5px;font-weight:700}' +
  '.day-stat{display:inline-flex;align-items:center;gap:2px;padding:3px 8px;border-radius:9999px;background:#f1f5f9;font-size:10.5px;font-weight:700;line-height:1.4;white-space:nowrap}' +
  '.day-stat.r{background:#fef2f2;color:#991b1b}.day-stat.g{background:#ecfdf5;color:#166534}' +
  '.day-stat.b{background:#eff6ff;color:#1e40af}.day-stat.o{background:#fffbeb;color:#92400e}.day-stat.p{background:#f5f3ff;color:#6b21a8}' +
  '.day-stat strong{font-weight:900;font-size:12px}' +
  '.day-toggle{background:#f1f5f9;border:none;width:30px;height:30px;border-radius:50%;font-size:11px;font-weight:900;color:#0f766e;cursor:pointer;flex-shrink:0;transition:transform .3s,background .2s,color .2s}' +
  '.day-card.expanded .day-toggle{transform:rotate(180deg);background:#0f766e;color:#fff}' +
  '.day-card-bd{max-height:0;overflow:hidden;transition:max-height .35s,padding .35s;padding:0 16px}' +
  '.day-card.expanded .day-card-bd{max-height:2000px;padding:10px 16px 14px;border-top:1px dashed #e2e8f0}' +
  '.day-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:8px}' +
  '.day-box{background:#f1f5f9;border-radius:6px;padding:6px 7px;text-align:center;border-bottom:2px solid #cbd5e1}' +
  '.day-box.r{border-color:#ef4444}.day-box.g{border-color:#10b981}.day-box.b{border-color:#3b82f6}.day-box.o{border-color:#f59e0b}.day-box.p{border-color:#8b5cf6}' +
  '.day-box-l{font-size:9.5px;color:#64748b;font-weight:700;margin-bottom:1px}' +
  '.day-box-v{font-size:12.5px;font-weight:900}' +
  '.day-box.r .day-box-v{color:#ef4444}.day-box.g .day-box-v{color:#10b981}.day-box.b .day-box-v{color:#3b82f6}.day-box.o .day-box-v{color:#f59e0b}.day-box.p .day-box-v{color:#8b5cf6}' +
  '.day-chips{display:flex;flex-wrap:wrap;gap:3px;margin-bottom:6px}' +
  '.day-chip{display:inline-flex;align-items:center;gap:3px;padding:3px 8px;border-radius:9999px;font-size:10.5px;font-weight:700;background:#f1f5f9}' +
  '.day-chip.medicine{background:#fef2f2;color:#991b1b}.day-chip.money{background:#ecfdf5;color:#166534}' +
  '.day-note{background:#f1f5f9;padding:7px 10px;border-radius:7px;font-size:11.5px;line-height:1.6;color:#475569;border-right:2px solid #0f766e;margin-bottom:8px}' +
  '.day-note-l{font-size:10px;font-weight:900;color:#64748b;margin-bottom:2px;display:block}' +
  '.day-deaths-box{background:#fef2f2;border-radius:8px;padding:9px 11px;margin-bottom:8px;border-right:2px solid #ef4444}' +
  '.day-deaths-head{font-size:10.5px;font-weight:900;color:#991b1b;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center}' +
  '.day-deaths-total{background:#fff;padding:2px 9px;border-radius:9999px;font-size:10.5px;color:#dc2626}' +
  '.day-deaths-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;font-size:11.5px;font-weight:700;color:#7f1d1d;border-bottom:1px dashed rgba(239,68,68,.15)}' +
  '.day-deaths-row:last-child{border-bottom:none}' +
  '.day-deaths-count{background:#fff;padding:2px 9px;border-radius:9999px;font-weight:900;color:#dc2626}' +
  '.day-deaths-row.disease .day-deaths-count{background:#dc2626;color:#fff}' +
  '.day-deaths-disease-tag{font-size:9px;background:#fff;color:#dc2626;padding:1px 6px;border-radius:9999px;margin-right:4px;font-weight:800;border:1px solid #fecaca}' +
  '.day-actions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;padding-top:8px;border-top:1px dashed #e2e8f0}' +
  '.day-actions button{padding:8px;border:none;border-radius:7px;font-family:inherit;font-size:11px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px}' +
  '.day-act-edit{background:#eff6ff;color:#1e40af}' +
  '.day-act-del{background:#fef2f2;color:#991b1b}' +
  '.day-act-close{background:#f1f5f9;color:#64748b}' +
  '.day-empty{text-align:center;padding:48px 24px;background:#fff;border-radius:12px;border:1px dashed #cbd5e1}' +
  '.day-empty-ic{font-size:56px;line-height:1;display:block;margin-bottom:12px;opacity:.6}' +
  '.day-empty-t{font-size:14px;font-weight:900;margin-bottom:6px}' +
  '.day-empty-x{font-size:12px;color:#64748b;font-weight:600;margin:0 auto 16px;max-width:280px}' +

  '.day-show-more{width:100%;padding:13px;background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:12px;color:#0f766e;font-family:inherit;font-size:12.5px;font-weight:900;cursor:pointer;margin-top:8px;display:flex;align-items:center;justify-content:center;gap:7px;transition:all .15s}' +
  '.day-show-more:active{background:#f1f5f9}' +
  '.day-show-more:hover{background:#f0fdfa;border-color:#14b8a6}' +

  '.day-modal-wrap{position:fixed;inset:0;z-index:2000;display:flex;align-items:flex-end;justify-content:center;opacity:0;pointer-events:none;transition:opacity .2s}' +
  '.day-modal-wrap.on{opacity:1;pointer-events:auto}' +
  '.day-modal-bg{position:absolute;inset:0;background:rgba(15,23,42,.55)}' +
  '.day-modal-box{position:relative;background:#fff;width:100%;max-width:760px;border-radius:24px 24px 0 0;padding:14px;max-height:95vh;overflow-y:auto;transform:translateY(30px);transition:transform .3s;padding-bottom:calc(20px + env(safe-area-inset-bottom,0px))}' +
  '.day-modal-wrap.on .day-modal-box{transform:translateY(0)}' +
  '.day-modal-box.day-sheet{border-radius:16px;max-width:400px;margin:auto}' +
  '.day-modal-hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #e2e8f0}' +
  '.day-modal-t{font-size:14px;font-weight:800}' +
  '.day-modal-x{background:#f1f5f9;border:none;width:32px;height:32px;border-radius:50%;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center}' +
  '.day-sec{margin-bottom:16px}' +
  '.day-sec-hd{display:flex;align-items:center;gap:6px;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #e2e8f0}' +
  '.day-sec-ic{width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}' +
  '.day-sec-t{font-size:12.5px;font-weight:900}' +
  '.day-sec-s{font-size:10px;color:#64748b;font-weight:600;margin-top:1px}' +
  '.day-fg{margin-bottom:10px}' +
  '.day-fl{font-size:11px;font-weight:800;margin-bottom:4px;display:flex;align-items:center;gap:4px}' +
  '.day-fl .day-req{color:#ef4444;font-weight:900}' +
  '.day-fl-hint{font-size:9.5px;color:#0f766e;font-weight:700;margin-right:auto;cursor:pointer;text-decoration:underline}' +
  '.day-fi,.day-fs,.day-ft{width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:12px;font-size:13px;font-family:inherit;background:#f1f5f9;color:#0f172a;box-sizing:border-box;transition:border-color .15s,background .15s,box-shadow .15s}' +
  '.day-fi:focus,.day-fs:focus,.day-ft:focus{outline:none;border-color:#0f766e;background:#fff;box-shadow:0 0 0 3px #f0fdfa}' +
  '.day-ft{resize:vertical;min-height:55px;line-height:1.6}' +
  '.day-fi.err,.day-fs.err,.day-ft.err{border-color:#ef4444 !important;background:#fff5f5 !important;box-shadow:0 0 0 3px #fee2e2 !important}' +
  '.day-err-msg{display:block;color:#ef4444;font-size:10px;font-weight:700;margin-top:4px;padding-right:2px}' +
  '.day-fr{display:grid;grid-template-columns:1fr 1fr;gap:8px}' +
  '.day-fr3{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}' +
  '.day-date-field{display:flex;gap:6px}' +
  '.day-date-field .day-fi{flex:1;text-align:left;direction:ltr;font-weight:700;cursor:pointer}' +
  '.day-date-btn{width:38px;flex-shrink:0;border:none;border-radius:12px;background:#0f766e;color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}' +

  '.day-dup-warn{background:linear-gradient(135deg,#fffbeb,#fef3c7);border:2px solid #fbbf24;border-radius:12px;padding:12px 14px;margin-bottom:12px;display:flex;gap:10px;align-items:flex-start}' +
  '.day-dup-warn-ic{font-size:22px;flex-shrink:0;line-height:1.2}' +
  '.day-dup-warn-body{flex:1;min-width:0}' +
  '.day-dup-warn-title{font-size:12.5px;font-weight:900;color:#92400e;margin-bottom:4px}' +
  '.day-dup-warn-text{font-size:11px;color:#78350f;font-weight:600;line-height:1.6;margin-bottom:10px}' +
  '.day-dup-preview{background:#fff;border:1.5px solid #fcd34d;border-radius:9px;padding:10px;margin-bottom:10px}' +
  '.day-dup-preview-title{font-size:10.5px;font-weight:900;color:#92400e;margin-bottom:8px;display:flex;align-items:center;gap:4px}' +
  '.day-dup-preview-row{display:flex;justify-content:space-between;align-items:flex-start;padding:5px 0;font-size:11.5px;border-bottom:1px dashed rgba(251,191,36,.3);gap:8px}' +
  '.day-dup-preview-row:last-child{border-bottom:none}' +
  '.day-dup-preview-row > span:first-child{color:#78350f;font-weight:800;flex-shrink:0}' +
  '.day-dup-preview-row > span:last-child{color:#0f172a;font-weight:900;text-align:left;direction:ltr;font-variant-numeric:tabular-nums;flex:1;min-width:0}' +
  '.day-dup-warn-btn{background:#f59e0b;color:#fff;border:none;padding:10px 16px;border-radius:9px;font-family:inherit;font-size:12px;font-weight:900;cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 2px 6px rgba(245,158,11,.3);width:100%;justify-content:center}' +
  '.day-dup-warn-btn:active{transform:scale(.97)}' +

  '.day-deaths-editor{background:#fef2f2;border-radius:12px;padding:10px;border:1px solid #fecaca}' +
  '.day-deaths-editor-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #fecaca;gap:8px}' +
  '.day-deaths-editor-title{font-size:11.5px;font-weight:900;color:#991b1b;display:flex;align-items:center;gap:5px}' +
  '.day-di-form{background:#fff;border-radius:10px;padding:10px;margin-bottom:10px;border:1.5px solid #fecaca}' +
  '.day-di-label{font-size:10.5px;font-weight:900;color:#991b1b;margin-bottom:8px;display:flex;align-items:center;gap:5px}' +
  '.day-di-row{display:flex;gap:6px;align-items:center}' +
  '.day-di-count{width:72px;flex-shrink:0;padding:8px 4px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:15px;text-align:center;font-weight:900;font-family:inherit;background:#f8fafc;color:#0f172a;box-sizing:border-box;height:42px;line-height:24px}' +
  '.day-di-count:focus{outline:none;border-color:#dc2626;background:#fff;box-shadow:0 0 0 3px #fee2e2}' +
  '.day-di-count::placeholder{font-size:11px;font-weight:700;color:#94a3b8}' +
  '.day-di-cause{flex:1;min-width:0;padding:8px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:12.5px;background:#f8fafc;height:42px;line-height:24px;box-sizing:border-box;font-family:inherit;cursor:pointer;color:#0f172a}' +
  '.day-di-cause:focus{outline:none;border-color:#dc2626;background:#fff;box-shadow:0 0 0 3px #fee2e2}' +
  '.day-di-add{width:52px;height:42px;flex-shrink:0;border:none;border-radius:9px;background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;font-size:20px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;box-shadow:0 2px 6px rgba(220,38,38,.3)}' +
  '.day-di-add:active{transform:scale(.95)}' +
  '.day-di-add:disabled{opacity:.4;cursor:not-allowed;box-shadow:none}' +
  '.day-di-hint{font-size:9.5px;color:#94a3b8;font-weight:700;margin-top:6px;text-align:center}' +
  '.day-di-hint.ready{color:#dc2626}' +
  '.day-deaths-list{display:flex;flex-direction:column;gap:5px;margin-bottom:10px;min-height:40px}' +
  '.day-dl-empty{text-align:center;padding:16px 10px;background:#fff;border:1.5px dashed #fecaca;border-radius:10px;font-size:11px;font-weight:700;color:#991b1b}' +
  '.day-dl-item{display:flex;align-items:center;gap:10px;padding:9px 12px;background:#fff;border-radius:10px;border:1px solid #fecaca}' +
  '.day-dl-item.disease{border-color:#fca5a5;background:linear-gradient(135deg,#fff,#fef2f2)}' +
  '.day-dl-num{width:26px;height:26px;flex-shrink:0;border-radius:50%;background:#fef2f2;color:#dc2626;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900}' +
  '.day-dl-item.disease .day-dl-num{background:#dc2626;color:#fff}' +
  '.day-dl-info{flex:1;min-width:0}' +
  '.day-dl-name{font-size:12.5px;font-weight:800;color:#0f172a;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:5px}' +
  '.day-dl-disease-tag{font-size:8.5px;font-weight:800;padding:1px 6px;border-radius:9999px;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;flex-shrink:0}' +
  '.day-dl-count{font-size:11px;color:#dc2626;font-weight:900}' +
  '.day-dl-actions{display:flex;gap:4px;flex-shrink:0}' +
  '.day-dl-edit{width:30px;height:30px;border-radius:8px;border:none;background:#eff6ff;color:#1e40af;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}' +
  '.day-dl-del{width:30px;height:30px;border-radius:8px;border:none;background:#fee2e2;color:#dc2626;font-size:12px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}' +
  '.day-deaths-sum{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:linear-gradient(135deg,#dc2626,#ef4444);border-radius:10px;color:#fff;font-size:12.5px;font-weight:900;margin-bottom:8px;box-shadow:0 2px 8px rgba(220,38,38,.25)}' +
  '.day-deaths-sum-l{display:flex;align-items:center;gap:6px}' +
  '.day-deaths-sum-val{background:#fff;color:#dc2626;padding:3px 12px;border-radius:9999px;font-size:14px;font-weight:900}' +
  '.day-deaths-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}' +
  '.day-deaths-btn{padding:9px;border:none;border-radius:9px;font-family:inherit;font-size:11.5px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px}' +
  '.day-deaths-btn.new{background:#fff;color:#dc2626;border:1.5px dashed #fecaca}' +
  '.day-deaths-btn.mgr{background:#fff;color:#0f766e;border:1.5px dashed #a7f3d0}' +

  '.day-flock-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}' +
  '.day-flock-chip{padding:5px 10px;border-radius:9999px;background:#f1f5f9;border:1.5px solid #e2e8f0;color:#64748b;font-size:11px;font-weight:800;cursor:pointer;user-select:none;transition:all .15s;display:flex;align-items:center;gap:5px}' +
  '.day-flock-chip.on{background:linear-gradient(135deg,#ecfdf5,#d1fae5);border-color:#10b981;color:#166534}' +
  '.day-flock-chip.on::before{content:"✓ ";font-weight:900}' +
  '.day-cause-flocks-info{font-size:9.5px;color:#64748b;font-weight:700;margin-top:3px}' +
  '.day-disease-box{background:#fef2f2;border:1.5px solid #fecaca;border-radius:12px;padding:12px;margin-bottom:10px}' +
  '.day-disease-check{display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;font-weight:800;color:#991b1b}' +
  '.day-disease-check input{width:20px;height:20px;accent-color:#dc2626}' +
  '.day-disease-info{font-size:10px;color:#7f1d1d;font-weight:600;margin-top:6px;line-height:1.5;padding-right:28px;opacity:.85}' +

  '.day-save{width:100%;padding:14px;border:none;border-radius:12px;background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;font-family:inherit;font-size:14px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:16px}' +
  '.day-btn{width:100%;padding:11px;border:none;border-radius:12px;font-size:13px;font-weight:800;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px}' +
  '.day-btn-s{background:#f1f5f9;color:#0f172a}' +
  '.day-btn-p{background:#0f766e;color:#fff}' +
  '.day-btn-g{background:#10b981;color:#fff}' +
  '.day-list{display:flex;flex-direction:column;gap:6px;max-height:55vh;overflow-y:auto;padding:2px}' +
  '.day-row{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#f1f5f9;border-radius:12px;border-right:3px solid #f59e0b}' +
  '.day-row.disease{border-right-color:#dc2626;background:linear-gradient(90deg,#fef2f2 0%,#f1f5f9 30%)}' +
  '.day-row.locked{border-right-color:#10b981;background:linear-gradient(90deg,#ecfdf5 0%,#f1f5f9 30%)}' +
  '.day-row-ic{width:30px;height:30px;border-radius:8px;background:#fffbeb;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}' +
  '.day-row.disease .day-row-ic{background:#fef2f2}' +
  '.day-row.locked .day-row-ic{background:#ecfdf5}' +
  '.day-row-info{flex:1;min-width:0}' +
  '.day-row-n{font-size:12.5px;font-weight:800;display:flex;align-items:center;gap:4px;flex-wrap:wrap}' +
  '.day-row-u{font-size:10px;color:#64748b;font-weight:600;margin-top:1px}' +
  '.day-row-acts{display:flex;gap:4px;flex-shrink:0}' +
  '.day-row-btn{width:30px;height:30px;border-radius:8px;border:none;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center}' +
  '.day-row-btn.edit{background:#eff6ff;color:#1e40af}' +
  '.day-row-btn.delete{background:#fef2f2;color:#ef4444}' +
  '.day-row-btn.lock{background:#ecfdf5;color:#10b981}' +
  '.day-row-btn.unlock{background:#fffbeb;color:#f59e0b}' +
  '.day-badge{display:inline-flex;align-items:center;gap:3px;font-size:9px;font-weight:800;padding:2px 6px;border-radius:9999px;background:#ecfdf5;color:#166534}' +
  '.day-badge.disease{background:#fef2f2;color:#dc2626;border:1px solid #fecaca}' +
  '.day-info-box{background:#eff6ff;color:#1e40af;padding:10px 12px;border-radius:12px;font-size:11px;font-weight:700;margin-bottom:12px;line-height:1.7;border-right:3px solid #3b82f6}' +
  '.day-check{display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer}' +
  '.day-check input{width:18px;height:18px;accent-color:#0f766e}' +
  '.day-cal-box{background:#fff;border-radius:20px;width:100%;max-width:400px;overflow:hidden}' +
  '.day-cal-hd{background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;padding:14px 12px;display:flex;justify-content:space-between;align-items:center;gap:8px}' +
  '.day-cal-nav-btn{background:rgba(255,255,255,.2);border:none;color:#fff;width:38px;height:38px;border-radius:10px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-weight:900}' +
  '.day-cal-my{display:flex;flex-direction:column;align-items:center;cursor:pointer;user-select:none;flex:1;min-width:0;padding:2px}' +
  '.day-cal-my-row{display:flex;align-items:center;gap:6px;font-size:16px;font-weight:900;white-space:nowrap}' +
  '.day-cal-my-hint{font-size:8.5px;opacity:.75;margin-top:3px;font-weight:600}' +
  '.day-cal-wd{display:grid;grid-template-columns:repeat(7,1fr);background:#f1f5f9;padding:8px 0;border-bottom:1px solid #e2e8f0}' +
  '.day-cal-wdc{text-align:center;font-size:11px;font-weight:900;color:#64748b}' +
  '.day-cal-days{display:grid;grid-template-columns:repeat(7,1fr);padding:10px;gap:4px}' +
  '.day-cal-d{aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:8px;font-size:13px;font-weight:800;cursor:pointer;border:2px solid transparent;position:relative;transition:background .12s,color .12s}' +
  '.day-cal-d.empty{pointer-events:none}' +
  '.day-cal-d.today{border-color:#0f766e;color:#0f766e}' +
  '.day-cal-d.selected{background:#0f766e;color:#fff;border-color:#0f766e}' +
  '.day-cal-d.future{color:#94a3b8;opacity:.4}' +
  '.day-cal-d.has-data{background:#f0fdfa;color:#0f766e;font-weight:900}' +
  '.day-cal-d.has-data::after{content:"";position:absolute;bottom:3px;left:50%;transform:translateX(-50%);width:5px;height:5px;border-radius:50%;background:#10b981}' +
  '.day-cal-d.selected.has-data{background:#0f766e;color:#fff}' +
  '.day-cal-d.selected.has-data::after{background:#fff}' +
  '.day-cal-ft{padding:10px 14px 14px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;gap:8px}' +
  '.day-cal-tb{background:#f1f5f9;border:none;padding:9px 16px;border-radius:10px;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer;color:#0f172a}' +
  '.day-cal-si{font-size:11px;color:#64748b;font-weight:700}' +
  '.day-cal-picker{background:#fff;border-radius:20px;width:100%;max-width:400px;overflow:hidden}' +
  '.day-cal-picker-hd{background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;padding:16px;text-align:center;font-size:14px;font-weight:900}' +
  '.day-cal-picker-body{padding:14px}' +
  '.day-cal-year-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;max-height:280px;overflow-y:auto;padding:2px}' +
  '.day-cal-year-btn{padding:11px 4px;border:1.5px solid #e2e8f0;border-radius:10px;background:#f1f5f9;color:#0f172a;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer}' +
  '.day-cal-year-btn.on{background:#0f766e;border-color:#0f766e;color:#fff}' +
  '.day-cal-month-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}' +
  '.day-cal-month-btn{padding:14px 4px;border:1.5px solid #e2e8f0;border-radius:10px;background:#f1f5f9;color:#0f172a;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer}' +
  '.day-cal-month-btn.on{background:#0f766e;border-color:#0f766e;color:#fff}' +
  '.day-cal-picker-foot{padding:10px 14px 16px;border-top:1px solid #e2e8f0;text-align:center}' +
  '.day-cal-back-btn{background:#f1f5f9;border:none;padding:9px 20px;border-radius:10px;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer;color:#0f172a;width:100%}';

  var s = document.createElement('style');
  s.id = 'day-styles';
  s.textContent = css;
  document.head.appendChild(s);
}

function applyFilter(records){
  if(uiState.filter === 'all') return records;
  if(uiState.filter === 'deaths') return records.filter(function(r){ return (r.deaths || 0) > 0; });
  if(uiState.filter === 'eggs') return records.filter(function(r){ return (r.eggs || 0) > 0; });
  if(uiState.filter.indexOf('flock:') === 0){
    var fname = uiState.filter.substring(6);
    return records.filter(function(r){ return r.flock === fname; });
  }
  if(uiState.filter.indexOf('cause:') === 0){
    var cname = uiState.filter.substring(6);
    return records.filter(function(r){
      if(r.cause === cname) return true;
      if(Array.isArray(r.deathsList)){
        for(var i = 0; i < r.deathsList.length; i++){
          if(r.deathsList[i].cause === cname) return true;
        }
      }
      return false;
    });
  }
  return records;
}

function applySort(records){
  var sorted = records.slice();
  if(uiState.sortBy === 'date_asc'){ sorted.sort(function(a, b){ return jToC(a.date) - jToC(b.date); }); }
  else { sorted.sort(function(a, b){ return jToC(b.date) - jToC(a.date); }); }
  return sorted;
}

function getFilterLabel(){
  if(uiState.filter === 'all') return { icon: '📋', label: 'همه رکوردها' };
  if(uiState.filter === 'deaths') return { icon: '💀', label: 'فقط تلفات' };
  if(uiState.filter === 'eggs') return { icon: '🥚', label: 'فقط تخم' };
  if(uiState.filter.indexOf('flock:') === 0) return { icon: '🐔', label: uiState.filter.substring(6) };
  if(uiState.filter.indexOf('cause:') === 0) return { icon: '🩺', label: uiState.filter.substring(6) };
  return { icon: '📋', label: 'همه' };
}

function renderFilterBar(records){
  var totalCount = records.length;
  var deathsCount = 0, eggsCount = 0;
  var flockMap = {}, causeMap = {};

  for(var i = 0; i < records.length; i++){
    var r = records[i];
    if((r.deaths || 0) > 0) deathsCount++;
    if((r.eggs || 0) > 0) eggsCount++;
    if(r.flock) flockMap[r.flock] = (flockMap[r.flock] || 0) + 1;
    if(Array.isArray(r.deathsList)){
      for(var j = 0; j < r.deathsList.length; j++){
        var cn = r.deathsList[j].cause;
        if(cn) causeMap[cn] = (causeMap[cn] || 0) + 1;
      }
    } else if(r.cause){
      causeMap[r.cause] = (causeMap[r.cause] || 0) + 1;
    }
  }

  var cur = getFilterLabel();
  var curCount = '';
  if(uiState.filter === 'all') curCount = totalCount;
  else if(uiState.filter === 'deaths') curCount = deathsCount;
  else if(uiState.filter === 'eggs') curCount = eggsCount;

  function itemHtml(id, icon, name, count){
    var on = uiState.filter === id;
    return '<div class="day-filter-item ' + (on ? 'on' : '') + '" data-day="set-filter" data-f="' + esc(id) + '">' +
      '<span>' + icon + ' ' + esc(name) + '</span>' +
      '<span style="display:flex;align-items:center;gap:4px">' +
        (count !== null && count !== undefined ? '<span class="fi-count">' + fa(count) + '</span>' : '') +
        '<span class="fi-check">✓</span>' +
      '</span>' +
    '</div>';
  }

  var menuHtml = '';
  menuHtml += '<div class="day-filter-sec">📋 سریع</div>';
  menuHtml += itemHtml('all', '📋', 'همه رکوردها', totalCount);
  menuHtml += itemHtml('deaths', '💀', 'فقط تلفات', deathsCount);
  menuHtml += itemHtml('eggs', '🥚', 'فقط تخم', eggsCount);

  var flockKeys = Object.keys(flockMap);
  if(flockKeys.length){
    menuHtml += '<div class="day-filter-sec">🐔 بر اساس گله</div>';
    for(var f = 0; f < flockKeys.length; f++){
      var fname = flockKeys[f];
      var fcolor = getFlockColor(fname);
      var on = uiState.filter === 'flock:' + fname;
      menuHtml += '<div class="day-filter-item ' + (on ? 'on' : '') + '" data-day="set-filter" data-f="flock:' + esc(fname) + '">' +
        '<span style="display:flex;align-items:center;gap:6px">' +
          '<span style="width:10px;height:10px;border-radius:50%;background:' + fcolor + ';flex-shrink:0"></span>' +
          '<span>' + esc(fname) + '</span>' +
        '</span>' +
        '<span style="display:flex;align-items:center;gap:4px">' +
          '<span class="fi-count">' + fa(flockMap[fname]) + '</span>' +
          '<span class="fi-check">✓</span>' +
        '</span>' +
      '</div>';
    }
  }

  var causeKeys = Object.keys(causeMap);
  if(causeKeys.length){
    menuHtml += '<div class="day-filter-sec">🩺 بر اساس علت</div>';
    for(var c = 0; c < causeKeys.length; c++){
      menuHtml += itemHtml('cause:' + causeKeys[c], '🩺', causeKeys[c], causeMap[causeKeys[c]]);
    }
  }

  var sortIcon = uiState.sortBy === 'date_asc' ? '⬆️' : '⬇️';
  var sortLabel = uiState.sortBy === 'date_asc' ? 'قدیمی' : 'جدید';

  return '<div class="day-filter-bar">' +
    '<div class="day-filter-box ' + (uiState.filterBoxOpen ? 'open' : '') + '" id="dayFilterBox">' +
      '<button type="button" class="day-filter-btn" data-day="toggle-filter-box">' +
        '<span class="fb-left">' +
          '<span>' + cur.icon + '</span>' +
          '<span class="fb-label">' + esc(cur.label) + '</span>' +
        '</span>' +
        (curCount !== '' ? '<span class="fb-count">' + fa(curCount) + '</span>' : '') +
        '<span class="fb-arrow">‹</span>' +
      '</button>' +
      '<div class="day-filter-menu">' + menuHtml + '</div>' +
    '</div>' +
    '<button type="button" class="day-sort-btn" data-day="toggle-sort">' +
      '<span>' + sortIcon + '</span>' +
      '<span>' + sortLabel + '</span>' +
    '</button>' +
  '</div>';
}

function renderPage(){
  var records = getRecords();
  var allSorted = records.slice().sort(function(a, b){ return jToC(b.date) - jToC(a.date); });

  var totalDeaths = 0, totalEggs = 0;
  for(var i = 0; i < records.length; i++){
    totalDeaths += records[i].deaths || 0;
    totalEggs += records[i].eggs || 0;
  }

  var lastAlive = 0;
  for(i = 0; i < allSorted.length; i++){
    if(allSorted[i].alive){ lastAlive = allSorted[i].alive; break; }
  }

  return '<div class="page day-page" data-day-root>' +
    '<div class="day-header">' +
      '<div><div class="day-title">📅 رکوردهای روزانه</div>' +
      '<div class="day-sub">' + fa(records.length) + ' رکورد • امروز ' + todayStr + '</div></div>' +
      '<button class="day-add" data-day="open-form">➕ <span>ثبت جدید</span></button>' +
    '</div>' +
    '<div class="day-summary">' +
      '<div class="day-sum g"><div class="day-sum-ic">🐔</div><div class="day-sum-v">' + fa(lastAlive) + '</div><div class="day-sum-l">زنده</div></div>' +
      '<div class="day-sum r"><div class="day-sum-ic">💀</div><div class="day-sum-v">' + fa(totalDeaths) + '</div><div class="day-sum-l">تلفات</div></div>' +
      '<div class="day-sum b"><div class="day-sum-ic">🥚</div><div class="day-sum-v">' + fa(totalEggs) + '</div><div class="day-sum-l">تخم</div></div>' +
      '<div class="day-sum o"><div class="day-sum-ic">📅</div><div class="day-sum-v">' + fa(records.length) + '</div><div class="day-sum-l">روز</div></div>' +
    '</div>' +
    renderFilterBar(records) +
    '<div data-day-list>' + renderListInner() + '</div>' +
  '</div>';
}

function renderListInner(){
  var records = getRecords();
  if(!records.length){
    return '<div class="day-empty">' +
      '<div class="day-empty-ic">📅</div>' +
      '<div class="day-empty-t">هنوز رکوردی ثبت نشده</div>' +
      '<div class="day-empty-x">برای شروع، اولین رکورد روزانه خود را ثبت کنید</div>' +
      '<button class="day-add" style="margin:0 auto" data-day="open-form">➕ ثبت اولین رکورد</button>' +
    '</div>';
  }

  var filtered = applyFilter(records);
  var sorted = applySort(filtered);

  if(!sorted.length){
    return '<div class="day-empty">' +
      '<div class="day-empty-ic">🔍</div>' +
      '<div class="day-empty-t">چیزی پیدا نشد</div>' +
      '<div class="day-empty-x">فیلتر رو عوض کن یا رکورد جدید ثبت کن</div>' +
    '</div>';
  }

  var out = '';
  var total = sorted.length;

  var limit = uiState.showAll ? total : Math.min(total, PAGE_SIZE);
  var visible = sorted.slice(0, limit);

  for(var i = 0; i < visible.length; i++) out += renderCard(visible[i]);

  if(total > PAGE_SIZE){
    if(!uiState.showAll){
      var remaining = total - PAGE_SIZE;
      out += '<button type="button" class="day-show-more" data-day="show-more">' +
        '▼ نمایش ' + fa(remaining) + ' رکورد دیگر' +
      '</button>';
    } else {
      out += '<button type="button" class="day-show-more" data-day="show-less">' +
        '▲ نمایش کمتر' +
      '</button>';
    }
  }

  return out;
}

function renderCard(r){
  var borderColor = '#0f766e';
  if((r.deaths || 0) >= 5) borderColor = '#ef4444';
  else if((r.deaths || 0) > 0) borderColor = '#f59e0b';
  else if((r.eggs || 0) > 0) borderColor = '#3b82f6';
  else borderColor = '#10b981';

  var flockColor = getFlockColor(r.flock);

  var inlineStats = [];
  if(r.deaths > 0) inlineStats.push('<span class="day-stat r">💀 <strong>' + fa(r.deaths) + '</strong></span>');
  if(r.alive) inlineStats.push('<span class="day-stat g">🐔 <strong>' + fa(r.alive) + '</strong></span>');
  if(r.eggs > 0) inlineStats.push('<span class="day-stat b">🥚 <strong>' + fa(r.eggs) + '</strong></span>');
  if(r.broken > 0) inlineStats.push('<span class="day-stat o">💔 <strong>' + fa(r.broken) + '</strong></span>');
  if(r.dirty > 0) inlineStats.push('<span class="day-stat p">🧹 <strong>' + fa(r.dirty) + '</strong></span>');
  if(r.temp) inlineStats.push('<span class="day-stat">🌡️ <strong>' + fa(r.temp) + '°</strong></span>');
  if(r.humidity) inlineStats.push('<span class="day-stat">💧 <strong>' + fa(r.humidity) + '٪</strong></span>');
  if(r.feed > 0) inlineStats.push('<span class="day-stat">🌾 <strong>' + fa(r.feed) + 'kg</strong></span>');
  if(r.weight > 0) inlineStats.push('<span class="day-stat">⚖️ <strong>' + fa(r.weight) + 'g</strong></span>');

  var deathsBox = '';
  var deathsList = r.deathsList || [];
  if(deathsList.length > 0){
    var allCauses = getCauses();
    deathsBox = '<div class="day-deaths-box">' +
      '<div class="day-deaths-head">' +
        '<span>💀 علل تلفات</span>' +
        '<span class="day-deaths-total">' + fa(r.deaths || 0) + ' جوجه</span>' +
      '</div>';
    for(var k = 0; k < deathsList.length; k++){
      var item = deathsList[k];
      var isDisease = false;
      for(var c = 0; c < allCauses.length; c++){
        if(allCauses[c].name === item.cause && allCauses[c].isDisease === true){ isDisease = true; break; }
      }
      deathsBox += '<div class="day-deaths-row' + (isDisease ? ' disease' : '') + '">' +
        '<span>' + (isDisease ? '🩺 ' : '🔍 ') + esc(item.cause || 'نامعلوم') +
          (isDisease ? '<span class="day-deaths-disease-tag">بیماری</span>' : '') +
        '</span>' +
        '<span class="day-deaths-count">' + fa(item.count || 0) + '</span>' +
      '</div>';
    }
    deathsBox += '</div>';
  }

  var stats = [];
  if(r.deaths > 0) stats.push('<div class="day-box r"><div class="day-box-l">💀 تلفات</div><div class="day-box-v">' + fa(r.deaths) + '</div></div>');
  if(r.alive) stats.push('<div class="day-box g"><div class="day-box-l">🐔 مانده</div><div class="day-box-v">' + fa(r.alive) + '</div></div>');
  if(r.eggs > 0) stats.push('<div class="day-box b"><div class="day-box-l">🥚 تخم</div><div class="day-box-v">' + fa(r.eggs) + '</div></div>');
  if(r.broken > 0) stats.push('<div class="day-box o"><div class="day-box-l">💔 شکسته</div><div class="day-box-v">' + fa(r.broken) + '</div></div>');
  if(r.dirty > 0) stats.push('<div class="day-box p"><div class="day-box-l">🧹 کثیف</div><div class="day-box-v">' + fa(r.dirty) + '</div></div>');
  if(r.weight > 0) stats.push('<div class="day-box"><div class="day-box-l">⚖️ وزن</div><div class="day-box-v">' + fa(r.weight) + 'g</div></div>');
  if(r.feed > 0) stats.push('<div class="day-box"><div class="day-box-l">🌾 خوراک</div><div class="day-box-v">' + fa(r.feed) + 'kg</div></div>');
  if(r.water > 0) stats.push('<div class="day-box"><div class="day-box-l">💧 آب</div><div class="day-box-v">' + fa(r.water) + 'L</div></div>');

  var chips = [];
  if(r.medicine) chips.push('<span class="day-chip medicine">💊 ' + esc(r.medicine) + '</span>');
  if(r.medCost > 0) chips.push('<span class="day-chip money">💰 ' + fa(r.medCost) + '</span>');

  var isOpen = !!uiState.expanded[sid(r.id)];

  return '<div class="day-card ' + (isOpen ? 'expanded' : '') + '" data-day-id="' + sid(r.id) + '" style="border-right-color:' + borderColor + '">' +
    '<div class="day-card-hd" data-day="toggle" data-id="' + sid(r.id) + '">' +
      '<div class="day-hd-content">' +
        '<div class="day-hd-row1">' +
          '<div class="day-date">📅 ' + esc(r.date) + '</div>' +
          '<div class="day-flock" style="background:' + flockColor + '20;color:' + flockColor + ';border-color:' + flockColor + '40">🐔 ' + esc(r.flock || '—') + '</div>' +
        '</div>' +
        '<div class="day-hd-row2">' + inlineStats.join('') + '</div>' +
      '</div>' +
      '<button class="day-toggle" type="button">▼</button>' +
    '</div>' +
    '<div class="day-card-bd">' +
      deathsBox +
      (stats.length ? '<div class="day-stats">' + stats.join('') + '</div>' : '') +
      (chips.length ? '<div class="day-chips">' + chips.join('') + '</div>' : '') +
      (r.notes ? '<div class="day-note"><span class="day-note-l">📝 یادداشت:</span>' + esc(r.notes) + '</div>' : '') +
      '<div class="day-actions">' +
        '<button class="day-act-edit" data-day="edit" data-id="' + sid(r.id) + '">✏️ ویرایش</button>' +
        '<button class="day-act-del" data-day="del" data-id="' + sid(r.id) + '">🗑️ حذف</button>' +
        '<button class="day-act-close" data-day="toggle" data-id="' + sid(r.id) + '">📁 بستن</button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function refreshList(){
  var pageRoot = document.querySelector('[data-day-root]');
  if(pageRoot){
    var tmp = document.createElement('div');
    tmp.innerHTML = renderPage();
    pageRoot.parentNode.replaceChild(tmp.firstElementChild, pageRoot);
  }
}

function flockOptions(cur){
  var flocks = getFlocks();
  if(!flocks.length) return '<option value="">— گله‌ای نیست —</option>';
  var out = '';
  for(var i = 0; i < flocks.length; i++){
    var f = flocks[i];
    out += '<option value="' + esc(f.name) + '" ' + (cur === f.name ? 'selected' : '') + '>🐔 ' + esc(f.name) + '</option>';
  }
  return out;
}

function getTotalDeaths(){
  var t = 0;
  for(var i = 0; i < formDeathsList.length; i++){ t += formDeathsList[i].count || 0; }
  return t;
}

function renderDeathsEditor(){
  var causes = getFilteredCauses();
  var total = getTotalDeaths();

  var causeOptions = '<option value="">— انتخاب علت —</option>';
  for(var j = 0; j < causes.length; j++){
    var c = causes[j];
    var disIcon = c.isDisease ? '🩺 ' : '';
    var selected = sameId(_formInput.causeId, c.id) ? ' selected' : '';
    causeOptions += '<option value="' + esc(c.id) + '"' + selected + '>' + disIcon + esc(c.name) + '</option>';
  }

  var hasCount = _formInput.count > 0;
  var hasCause = !!_formInput.causeId;
  var canAdd = hasCount && hasCause;

  var formHtml = '<div class="day-di-form">' +
    '<div class="day-di-label">➕ افزودن تلفات جدید</div>' +
    '<div class="day-di-row">' +
      '<input type="text" inputmode="numeric" class="day-di-count" id="dayDiCount" placeholder="تعداد" value="' + (hasCount ? toFa(_formInput.count) : '') + '">' +
      '<select class="day-di-cause" id="dayDiCause">' + causeOptions + '</select>' +
      '<button type="button" class="day-di-add" id="dayDiAdd" data-day="death-add-item" ' + (canAdd ? '' : 'disabled') + '>➕</button>' +
    '</div>' +
    '<div class="day-di-hint ' + (canAdd ? 'ready' : '') + '">' +
      (canAdd ? '✓ آماده افزودن — دکمه <b>➕</b> رو بزن'
        : (!hasCount ? 'تعداد تلفات رو وارد کن' : 'علت رو انتخاب کن'))
    + '</div>' +
  '</div>';

  var listHtml = '<div class="day-deaths-list">';
  if(formDeathsList.length === 0){
    listHtml += '<div class="day-dl-empty">📭 هنوز تلفاتی اضافه نشده</div>';
  } else {
    for(var i = 0; i < formDeathsList.length; i++){
      var item = formDeathsList[i];
      var causeObj = null;
      for(var k = 0; k < causes.length; k++){
        if(sameId(causes[k].id, item.causeId)){ causeObj = causes[k]; break; }
      }
      if(!causeObj){
        for(k = 0; k < getCauses().length; k++){
          if(sameId(getCauses()[k].id, item.causeId)){ causeObj = getCauses()[k]; break; }
        }
      }
      var name = causeObj ? causeObj.name : '—';
      var isDisease = causeObj && causeObj.isDisease === true;

      listHtml += '<div class="day-dl-item' + (isDisease ? ' disease' : '') + '">' +
        '<div class="day-dl-num">' + toFa(i + 1) + '</div>' +
        '<div class="day-dl-info">' +
          '<div class="day-dl-name">' +
            (isDisease ? '🩺 ' : '🔍 ') + esc(name) +
            (isDisease ? '<span class="day-dl-disease-tag">بیماری</span>' : '') +
          '</div>' +
          '<div class="day-dl-count">' + fa(item.count || 0) + ' جوجه</div>' +
        '</div>' +
        '<div class="day-dl-actions">' +
          '<button type="button" class="day-dl-edit" data-day="death-edit-item" data-i="' + i + '">✏️</button>' +
          '<button type="button" class="day-dl-del" data-day="death-del" data-i="' + i + '">✕</button>' +
        '</div>' +
      '</div>';
    }
  }
  listHtml += '</div>';

  var sumHtml = '';
  if(formDeathsList.length > 0){
    sumHtml = '<div class="day-deaths-sum">' +
      '<div class="day-deaths-sum-l">📊 جمع کل تلفات</div>' +
      '<div class="day-deaths-sum-val">' + fa(total) + ' جوجه</div>' +
    '</div>';
  }

  var actionsHtml = '<div class="day-deaths-actions">' +
    '<button type="button" class="day-deaths-btn new" data-day="open-add-cause">🆕 علت جدید</button>' +
    '<button type="button" class="day-deaths-btn mgr" data-day="open-cause-mgr">⚙️ مدیریت علت‌ها</button>' +
  '</div>';

  return '<div class="day-deaths-editor">' +
    '<div class="day-deaths-editor-head">' +
      '<div class="day-deaths-editor-title">💀 ثبت تلفات</div>' +
      (total > 0 ? '<div style="background:#dc2626;color:#fff;padding:3px 10px;border-radius:9999px;font-size:11px;font-weight:900;white-space:nowrap">جمع: ' + fa(total) + '</div>' : '') +
    '</div>' +
    formHtml + listHtml + sumHtml + actionsHtml +
  '</div>';
}

function refreshDeathsEditor(){
  var el = document.getElementById('dayDeathsEditor');
  if(el) el.innerHTML = renderDeathsEditor();
}

function deathAddItem(){
  if(_formInput.count <= 0 || !_formInput.causeId){
    toast('❌ تعداد و علت رو وارد کن', 'error');
    return;
  }
  for(var i = 0; i < formDeathsList.length; i++){
    if(sameId(formDeathsList[i].causeId, _formInput.causeId)){
      toast('⚠️ این علت قبلاً اضافه شده', 'warn');
      return;
    }
  }
  formDeathsList.push({ causeId: sid(_formInput.causeId), count: _formInput.count });
  _formInput.count = 0;
  _formInput.causeId = '';
  refreshDeathsEditor();
  setTimeout(function(){
    var el = document.getElementById('dayDiCount');
    if(el) el.focus();
  }, 50);
}

function deathEditItem(i){
  var item = formDeathsList[i];
  if(!item) return;
  _formInput.count = item.count || 0;
  _formInput.causeId = sid(item.causeId);
  formDeathsList.splice(i, 1);
  refreshDeathsEditor();
  setTimeout(function(){
    var el = document.getElementById('dayDiCount');
    if(el) el.focus();
  }, 50);
}

function deathDel(i){
  formDeathsList.splice(i, 1);
  refreshDeathsEditor();
}

function buildRecordPreview(rec){
  var parts = [];

  if((rec.deaths || 0) > 0){
    var deathsList = rec.deathsList || [];
    var causesStr = '';
    if(deathsList.length){
      var causeParts = [];
      for(var i = 0; i < deathsList.length; i++){
        causeParts.push(deathsList[i].cause + ' ×' + deathsList[i].count);
      }
      causesStr = causeParts.join(' • ');
    } else if(rec.cause){
      causesStr = rec.cause;
    }
    parts.push('<div class="day-dup-preview-row"><span>💀 تلفات</span><span>' + fa(rec.deaths) + ' جوجه' + (causesStr ? '<br><small style="font-size:10px;color:#64748b;font-weight:700">' + esc(causesStr) + '</small>' : '') + '</span></div>');
  }
  if((rec.alive || 0) > 0) parts.push('<div class="day-dup-preview-row"><span>🐔 زنده</span><span>' + fa(rec.alive) + '</span></div>');
  if((rec.eggs || 0) > 0) parts.push('<div class="day-dup-preview-row"><span>🥚 تخم</span><span>' + fa(rec.eggs) + '</span></div>');
  if((rec.broken || 0) > 0) parts.push('<div class="day-dup-preview-row"><span>💔 شکسته</span><span>' + fa(rec.broken) + '</span></div>');
  if((rec.feed || 0) > 0) parts.push('<div class="day-dup-preview-row"><span>🌾 خوراک</span><span>' + fa(rec.feed) + ' kg</span></div>');
  if((rec.weight || 0) > 0) parts.push('<div class="day-dup-preview-row"><span>⚖️ وزن</span><span>' + fa(rec.weight) + ' g</span></div>');
  if((rec.temp || 0) > 0) parts.push('<div class="day-dup-preview-row"><span>🌡️ دما</span><span>' + fa(rec.temp) + '°</span></div>');
  if((rec.humidity || 0) > 0) parts.push('<div class="day-dup-preview-row"><span>💧 رطوبت</span><span>' + fa(rec.humidity) + '٪</span></div>');
  if((rec.medicine || '').trim()) parts.push('<div class="day-dup-preview-row"><span>💊 دارو</span><span>' + esc(rec.medicine) + '</span></div>');

  if(!parts.length) parts.push('<div class="day-dup-preview-row"><span>—</span><span>رکورد خالی</span></div>');

  return '<div class="day-dup-preview">' +
    '<div class="day-dup-preview-title">📋 اطلاعات رکورد قبلی:</div>' +
    parts.join('') +
  '</div>';
}

function refreshDupWarning(){
  var el = document.getElementById('dayDupWarning');
  if(!el) return;

  if(editingRecordId){
    el.innerHTML = '';
    el.style.display = 'none';
    return;
  }

  var dateEl = document.getElementById('dayDate');
  var flockEl = document.getElementById('dayFlock');
  var date = dateEl ? (dateEl.value || '').trim() : '';
  var flock = flockEl ? (flockEl.value || '').trim() : '';

  if(!date || !flock){ el.innerHTML = ''; el.style.display = 'none'; return; }

  var existing = findRecordByDateFlock(date, flock, null);
  if(!existing){ el.innerHTML = ''; el.style.display = 'none'; return; }

  el.style.display = 'block';
  el.innerHTML = '<div class="day-dup-warn">' +
    '<div class="day-dup-warn-ic">⚠️</div>' +
    '<div class="day-dup-warn-body">' +
      '<div class="day-dup-warn-title">رکورد این روز قبلاً ثبت شده!</div>' +
      '<div class="day-dup-warn-text">' +
        'برای تاریخ <b>' + esc(date) + '</b> گله <b>' + esc(flock) + '</b> قبلاً یه رکورد داری. ' +
        'برای هر گله در هر روز فقط <b>یک رکورد</b> مجازه.' +
      '</div>' +
      buildRecordPreview(existing) +
      '<button type="button" class="day-dup-warn-btn" data-day="edit-existing" data-id="' + sid(existing.id) + '">' +
        '✏️ ویرایش رکورد قبلی (اطلاعات حفظ میشه)' +
      '</button>' +
    '</div>' +
  '</div>';
}

function openDailyForm(id){
  editingRecordId = id ? sid(id) : null;
  var r = id ? Store.find('dailyRecords', id) : null;

  formDeathsList = [];
  _formInput = { count: 0, causeId: '' };

  if(r){
    if(Array.isArray(r.deathsList) && r.deathsList.length){
      for(var k = 0; k < r.deathsList.length; k++){
        var it = r.deathsList[k];
        var cid = '';
        var cs = getCauses();
        for(var z = 0; z < cs.length; z++){
          if(cs[z].name === it.cause){ cid = sid(cs[z].id); break; }
        }
        formDeathsList.push({ causeId: cid, count: it.count || 0 });
      }
    } else if(r.deaths > 0){
      var oldCauseId = '';
      var cs2 = getCauses();
      for(var z2 = 0; z2 < cs2.length; z2++){
        if(cs2[z2].name === r.cause){ oldCauseId = sid(cs2[z2].id); break; }
      }
      formDeathsList.push({ causeId: oldCauseId, count: r.deaths || 0 });
    }
  }

  var costVal = (r && r.medCost) ? Number(r.medCost).toLocaleString('en-US') : '';

  var html = '<div class="day-modal-hd">' +
    '<div class="day-modal-t">' + (id ? '✏️ ویرایش رکورد' : '📅 ثبت روزانه جدید') + '</div>' +
    '<button class="day-modal-x" data-day="close-modal" data-mid="day-form">✕</button>' +
  '</div>' +
  '<div id="dayDupWarning" style="display:none"></div>' +
  '<div class="day-sec">' +
    '<div class="day-sec-hd"><div class="day-sec-ic" style="background:#f0fdfa">📅</div>' +
    '<div><div class="day-sec-t" style="color:#0f766e">اطلاعات پایه</div><div class="day-sec-s">تاریخ و گله</div></div></div>' +
    '<div class="day-fr">' +
      '<div class="day-fg"><label class="day-fl">📅 تاریخ <span class="day-req">*</span></label>' +
        '<div class="day-date-field">' +
          '<input class="day-fi" type="text" id="dayDate" readonly value="' + (r ? esc(r.date) : todayStr) + '" placeholder="1405/06/23">' +
          '<button type="button" class="day-date-btn" data-day="open-cal" data-target="dayDate">📅</button>' +
        '</div>' +
        '<span class="day-err-msg" id="err-dayDate" style="display:none"></span>' +
      '</div>' +
      '<div class="day-fg"><label class="day-fl">🐔 گله <span class="day-req">*</span></label>' +
        '<select class="day-fs" id="dayFlock">' + flockOptions(r ? r.flock : '') + '</select>' +
        '<span class="day-err-msg" id="err-dayFlock" style="display:none"></span>' +
      '</div>' +
    '</div>' +
  '</div>' +
  '<div class="day-sec" id="dayDeathsSection">' +
    '<div id="dayDeathsEditor">' + renderDeathsEditor() + '</div>' +
    '<span class="day-err-msg" id="err-dayCause" style="display:none"></span>' +
  '</div>' +
  '<div class="day-sec">' +
    '<div class="day-sec-hd"><div class="day-sec-ic" style="background:#eff6ff">🥚</div>' +
    '<div><div class="day-sec-t" style="color:#3b82f6">تخم</div><div class="day-sec-s">تخم‌های جمع‌آوری‌شده</div></div></div>' +
    '<div class="day-fr3">' +
      '<div class="day-fg"><label class="day-fl">🥚 تخم</label>' +
        '<input class="day-fi" type="number" inputmode="numeric" id="dayEggs" value="' + (r ? (r.eggs || 0) : 0) + '" placeholder="۰"></div>' +
      '<div class="day-fg"><label class="day-fl">💔 شکسته</label>' +
        '<input class="day-fi" type="number" inputmode="numeric" id="dayBroken" value="' + (r ? (r.broken || 0) : 0) + '" placeholder="۰"></div>' +
      '<div class="day-fg"><label class="day-fl">🧹 کثیف</label>' +
        '<input class="day-fi" type="number" inputmode="numeric" id="dayDirty" value="' + (r ? (r.dirty || 0) : 0) + '" placeholder="۰"></div>' +
    '</div>' +
  '</div>' +
  '<div class="day-sec">' +
    '<div class="day-sec-hd"><div class="day-sec-ic" style="background:#fffbeb">🌡️</div>' +
    '<div><div class="day-sec-t" style="color:#f59e0b">محیط و خوراک</div><div class="day-sec-s">دما، رطوبت، آب، خوراک</div></div></div>' +
    '<div class="day-fr3">' +
      '<div class="day-fg"><label class="day-fl">دما °C</label>' +
        '<input class="day-fi" type="number" inputmode="numeric" id="dayTemp" value="' + (r && r.temp ? r.temp : '') + '" placeholder="مثلاً ۲۸"></div>' +
      '<div class="day-fg"><label class="day-fl">رطوبت %</label>' +
        '<input class="day-fi" type="number" inputmode="numeric" id="dayHumidity" value="' + (r && r.humidity ? r.humidity : '') + '" placeholder="مثلاً ۶۵"></div>' +
      '<div class="day-fg"><label class="day-fl">آب L</label>' +
        '<input class="day-fi" type="number" inputmode="numeric" id="dayWater" value="' + (r ? (r.water || 0) : 0) + '" placeholder="مثلاً ۱۲۰"></div>' +
    '</div>' +
    '<div class="day-fr">' +
      '<div class="day-fg"><label class="day-fl">🌾 خوراک kg</label>' +
        '<input class="day-fi" type="number" inputmode="numeric" id="dayFeed" value="' + (r ? (r.feed || 0) : 0) + '" placeholder="مثلاً ۸۵"></div>' +
      '<div class="day-fg"><label class="day-fl">⚖️ وزن نمونه g</label>' +
        '<input class="day-fi" type="number" inputmode="numeric" id="dayWeight" value="' + (r ? (r.weight || 0) : 0) + '" placeholder="مثلاً ۱۲۰۰"></div>' +
    '</div>' +
  '</div>' +
  '<div class="day-sec">' +
    '<div class="day-sec-hd"><div class="day-sec-ic" style="background:#f5f3ff">💊</div>' +
    '<div><div class="day-sec-t" style="color:#8b5cf6">دارو و یادداشت</div><div class="day-sec-s">اختیاری</div></div></div>' +
    '<div class="day-fr">' +
      '<div class="day-fg"><label class="day-fl">نام دارو</label>' +
        '<input class="day-fi" type="text" id="dayMedicine" value="' + (r ? esc(r.medicine || '') : '') + '" placeholder="نام دارو (اختیاری)"></div>' +
      '<div class="day-fg"><label class="day-fl">💰 هزینه تومان</label>' +
        '<input class="day-fi" type="text" inputmode="numeric" id="dayMedCost" value="' + costVal + '" placeholder="مثلاً ۱۵۰,۰۰۰"></div>' +
    '</div>' +
    '<div class="day-fg"><label class="day-fl">📝 یادداشت</label>' +
      '<textarea class="day-ft" id="dayNotes" placeholder="مشاهدات و نکات مهم این روز...">' + (r ? esc(r.notes || '') : '') + '</textarea></div>' +
  '</div>' +
  '<button class="day-save" data-day="save">💾 ذخیره اطلاعات</button>';

  openModal('day-form', html);

  setTimeout(function(){
    var el = document.getElementById('dayDiCount');
    if(el) el.focus();
    refreshDupWarning();
  }, 200);
}

function clearErrors(){
  var ids = ['dayDate', 'dayFlock', 'dayCause'];
  for(var i = 0; i < ids.length; i++){
    var el = document.getElementById(ids[i]);
    if(el) el.classList.remove('err');
    var er = document.getElementById('err-' + ids[i]);
    if(er){ er.style.display = 'none'; er.textContent = ''; }
  }
}
function showError(fieldId, msg){
  var el = document.getElementById(fieldId);
  if(el) el.classList.add('err');
  var er = document.getElementById('err-' + fieldId);
  if(er){ er.style.display = 'block'; er.textContent = msg; }
}
function focusFirstError(){
  var el = document.querySelector('.day-fi.err, .day-fs.err');
  if(el && typeof el.focus === 'function'){
    try{ el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }catch(e){}
  }
}

function saveDaily(){
  clearErrors();
  var hasError = false;

  var dateEl = document.getElementById('dayDate');
  if(!dateEl){ toast('❌ خطا در فرم', 'error'); return; }
  var date = (dateEl.value || '').trim();
  if(!date){
    showError('dayDate', '❌ تاریخ اجباری است');
    hasError = true;
  } else {
    var parts = date.replace(/-/g, '/').split('/');
    var validDate = (parts.length === 3) &&
                    !isNaN(+parts[0]) && !isNaN(+parts[1]) && !isNaN(+parts[2]) &&
                    (+parts[0] > 1300) && (+parts[1] >= 1 && +parts[1] <= 12) &&
                    (+parts[2] >= 1 && +parts[2] <= 31);
    if(!validDate){
      showError('dayDate', '❌ تاریخ نامعتبر است');
      hasError = true;
    }
  }

  var flockEl = document.getElementById('dayFlock');
  var flock = flockEl ? (flockEl.value || '').trim() : '';
  if(!flock){
    showError('dayFlock', '❌ انتخاب گله اجباری است');
    hasError = true;
  }

  if(!hasError && !editingRecordId){
    var existing = findRecordByDateFlock(date, flock, null);
    if(existing){
      var confirmEdit = confirm(
        '⚠️ برای تاریخ ' + date + ' گله «' + flock + '» قبلاً یه رکورد ثبت شده.\n\n' +
        'مطمئنی می‌خوای رکورد جدید بسازی؟ بهتره رکورد قبلی رو ویرایش کنی.\n\n' +
        'OK = ویرایش رکورد قبلی\n' +
        'Cancel = انصراف'
      );
      if(confirmEdit){
        forceCloseModal('day-form');
        setTimeout(function(){ openDailyForm(existing.id); }, 100);
        return;
      } else {
        return;
      }
    }
  }

  if(_formInput.count > 0 && _formInput.causeId){
    var alreadyInList = false;
    for(var di = 0; di < formDeathsList.length; di++){
      if(sameId(formDeathsList[di].causeId, _formInput.causeId)){ alreadyInList = true; break; }
    }
    if(!alreadyInList){
      formDeathsList.push({ causeId: sid(_formInput.causeId), count: _formInput.count });
      _formInput.count = 0;
      _formInput.causeId = '';
    }
  }

  var cleanDeaths = [];
  var causeNames = [];
  var totalDeaths = 0;
  var seenCauses = {};

  for(var i = 0; i < formDeathsList.length; i++){
    var item = formDeathsList[i];
    var count = +item.count || 0;
    if(count <= 0) continue;
    if(!item.causeId){
      showError('dayCause', '❌ برای هر تلفات، علت رو انتخاب کن');
      hasError = true;
      continue;
    }
    var causeObj = Store.find('causes', item.causeId);
    if(!causeObj){
      showError('dayCause', '❌ علت پیدا نشد');
      hasError = true;
      continue;
    }
    if(seenCauses[causeObj.name]) continue;
    seenCauses[causeObj.name] = true;
    cleanDeaths.push({ cause: causeObj.name, count: count });
    causeNames.push(causeObj.name);
    totalDeaths += count;
  }

  if(hasError){
    toast('❌ خطاها رو برطرف کن', 'error');
    focusFirstError();
    return;
  }

  var data = {
    date: date,
    flock: flock,
    deaths: totalDeaths,
    deathsList: cleanDeaths,
    cause: causeNames.length === 1 ? causeNames[0] :
           causeNames.length > 1 ? causeNames.join('، ') : '',
    eggs: parseNum((document.getElementById('dayEggs') || {}).value),
    broken: parseNum((document.getElementById('dayBroken') || {}).value),
    dirty: parseNum((document.getElementById('dayDirty') || {}).value),
    temp: parseNum((document.getElementById('dayTemp') || {}).value),
    humidity: parseNum((document.getElementById('dayHumidity') || {}).value),
    water: parseNum((document.getElementById('dayWater') || {}).value),
    feed: parseNum((document.getElementById('dayFeed') || {}).value),
    weight: parseNum((document.getElementById('dayWeight') || {}).value),
    medicine: ((document.getElementById('dayMedicine') || {}).value || '').trim(),
    medCost: parseNum((document.getElementById('dayMedCost') || {}).value),
    notes: ((document.getElementById('dayNotes') || {}).value || '').trim()
  };

  var savedRecordId = null;

  try{
    if(editingRecordId){
      var existingRec = Store.find('dailyRecords', editingRecordId);
      if(existingRec){
        data.alive = existingRec.alive || 0;
        var result = Store.update('dailyRecords', editingRecordId, data);
        if(result){
          savedRecordId = editingRecordId;
          Store.save();
          syncMedicineRecords(Store.find('dailyRecords', savedRecordId));
          Store.save();
          toast('✅ ویرایش شد', 'success');
        } else {
          toast('❌ رکورد پیدا نشد', 'error');
          return;
        }
      } else {
        toast('❌ رکورد پیدا نشد', 'error');
        return;
      }
    } else {
      var records = getRecords();
      var flockRecords = records.filter(function(r){ return r.flock === flock; });
      var sortedFlock = flockRecords.slice().sort(function(a, b){ return jToC(b.date) - jToC(a.date); });

      var lastAlive = 0;
      for(var k = 0; k < sortedFlock.length; k++){
        if(sortedFlock[k].alive){ lastAlive = sortedFlock[k].alive; break; }
      }
      if(!lastAlive){
        var flocks = getFlocks();
        for(k = 0; k < flocks.length; k++){
          if(flocks[k].name === flock && (flocks[k].alive || flocks[k].aliveCount)){
            lastAlive = flocks[k].alive || flocks[k].aliveCount;
            break;
          }
        }
      }
      data.alive = Math.max(0, lastAlive - data.deaths);

      var added = Store.add('dailyRecords', data);
      if(!added){ toast('❌ خطا در ذخیره', 'error'); return; }
      savedRecordId = added.id;
      Store.save();
      syncMedicineRecords(added);
      Store.save();
      toast('✅ ثبت شد', 'success');
    }
  }catch(e){
    console.error('❌ saveDaily error:', e);
    toast('❌ خطا: ' + (e.message || ''), 'error');
    return;
  }

  editingRecordId = null;
  formDeathsList = [];
  _formInput = { count: 0, causeId: '' };
  closeModal('day-form');

  setTimeout(function(){ try{ refreshList(); }catch(e){} }, 100);
}

function deleteRecord(id){
  if(!confirm('این رکورد حذف شود؟')) return;
  removeLinkedMedicineRecords(id);
  var ok = Store.remove('dailyRecords', id);
  if(ok){
    Store.save();
    toast('🗑️ حذف شد');
    refreshList();
  } else {
    toast('❌ خطا در حذف', 'error');
  }
}

function renderCauseListInner(){
  var causes = getCauses();
  if(!causes.length) return '<div style="text-align:center;padding:20px;color:#64748b;font-size:12px">خالی</div>';
  var out = '';
  for(var i = 0; i < causes.length; i++){
    var c = causes[i];
    var cls = 'day-row', icon = '🔍', badge = '', actions = '';

    if(c.isDisease){
      cls += ' disease';
      icon = '🩺';
      badge = '<span class="day-badge disease">بیماری</span>';
    }
    if(c.isLocked){
      cls = 'day-row locked';
      if(c.isDisease) icon = '🔒';
      badge += '<span class="day-badge">🔒</span>';
      actions = '<button class="day-row-btn unlock" data-day="unlock-cause" data-id="' + sid(c.id) + '">🔓</button>';
    } else {
      actions = '<button class="day-row-btn edit" data-day="edit-cause" data-id="' + sid(c.id) + '">✏️</button>' +
        '<button class="day-row-btn lock" data-day="lock-cause" data-id="' + sid(c.id) + '">🔒</button>' +
        '<button class="day-row-btn delete" data-day="del-cause" data-id="' + sid(c.id) + '">🗑️</button>';
    }

    var flocksInfo = '';
    if(Array.isArray(c.flockNames) && c.flockNames.length){ flocksInfo = '🔗 ' + c.flockNames.join('، '); }
    else { flocksInfo = '🌍 عمومی'; }

    out += '<div class="' + cls + '">' +
      '<div class="day-row-ic">' + icon + '</div>' +
      '<div class="day-row-info">' +
        '<div class="day-row-n">' + esc(c.name) + ' ' + badge + '</div>' +
        '<div class="day-row-u">' + flocksInfo + ' • ' + (c.usage > 0 ? fa(c.usage) + ' بار' : 'استفاده نشده') + '</div>' +
      '</div>' +
      '<div class="day-row-acts">' + actions + '</div>' +
    '</div>';
  }
  return out;
}

function openCauseMgr(){
  var html = '<div class="day-modal-hd"><div class="day-modal-t">🔍 مدیریت علل تلفات</div>' +
    '<button class="day-modal-x" data-day="close-modal" data-mid="cause-mgr">✕</button></div>' +
    '<div class="day-info-box">💡 علت‌های <b>عمومی</b> برای همه گله‌ها. علت‌های <b>مخصوص</b> فقط برای گله‌های انتخابی. علت‌های <b>🩺 بیماری</b> خودکار به بخش دارو/واکسن سینک می‌شن.</div>' +
    '<button class="day-btn day-btn-g" data-day="open-add-cause" style="margin-bottom:12px">➕ افزودن علت جدید</button>' +
    '<div class="day-list">' + renderCauseListInner() + '</div>';

  var ex = _modals['cause-mgr'];
  if(ex){ try{ ex.remove(); }catch(e){} delete _modals['cause-mgr']; }
  openModal('cause-mgr', html);
}

function refreshCauseMgr(){
  var el = document.querySelector('[data-modal-id="cause-mgr"] .day-list');
  if(el) el.innerHTML = renderCauseListInner();
}

function openCauseEdit(id){
  editingCauseId = id ? sid(id) : null;
  var c = id ? Store.find('causes', id) : null;
  if(c && c.isLocked){ toast('🔒 قابل ویرایش نیست', 'error'); return; }

  var allFlocks = getFlocks();
  var selectedFlocks = (c && Array.isArray(c.flockNames)) ? c.flockNames.slice() : [];
  var isDisease = c && c.isDisease === true;

  var flockChipsHtml = '';
  if(allFlocks.length === 0){
    flockChipsHtml = '<div style="font-size:11px;color:#94a3b8;padding:6px">هنوز گله‌ای ثبت نشده</div>';
  } else {
    for(var i = 0; i < allFlocks.length; i++){
      var f = allFlocks[i];
      var on = selectedFlocks.indexOf(f.name) !== -1;
      var fcolor = getFlockColor(f.name);
      flockChipsHtml += '<div class="day-flock-chip ' + (on ? 'on' : '') + '" data-flock-chip="' + esc(f.name) + '" style="' + (on ? '' : 'border-color:' + fcolor + '40') + '">' +
        '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + fcolor + ';flex-shrink:0"></span>' +
        esc(f.name) +
      '</div>';
    }
  }

  var html = '<div class="day-modal-hd"><div class="day-modal-t">' + (id ? '✏️ ویرایش علت' : '➕ علت جدید') + '</div>' +
    '<button class="day-modal-x" data-day="close-modal" data-mid="cause-edit">✕</button></div>' +
    '<div class="day-fg"><label class="day-fl">نام علت <span class="day-req">*</span></label>' +
      '<input class="day-fi" id="edCauseName" value="' + (c ? esc(c.name) : '') + '" placeholder="مثلاً: اسهال خونی">' +
      '<span class="day-err-msg" id="err-edCauseName" style="display:none"></span></div>' +
    '<div class="day-disease-box">' +
      '<label class="day-disease-check">' +
        '<input type="checkbox" id="edCauseIsDisease" ' + (isDisease ? 'checked' : '') + '>' +
        '<span>🩺 این علت بیماری است</span>' +
      '</label>' +
      '<div class="day-disease-info">با فعال کردن این گزینه، هر بار که تلفات با این علت ثبت کنی، یه رکورد خودکار تو بخش «دارو/واکسن» ساخته می‌شه.</div>' +
    '</div>' +
    '<div class="day-fg">' +
      '<label class="day-fl">🐔 گله‌های مرتبط <span style="font-size:9.5px;color:#64748b;font-weight:700;margin-right:auto">اگه هیچ‌کدوم تیک نخوره → عمومی</span></label>' +
      '<div class="day-flock-chips" id="edCauseFlocks">' + flockChipsHtml + '</div>' +
      '<div class="day-cause-flocks-info">💡 علت‌های عمومی برای همه گله‌ها نمایش داده می‌شن</div>' +
    '</div>' +
    '<div class="day-fg"><label class="day-check"><input type="checkbox" id="edCauseLock" ' + (c && c.isLocked ? 'checked' : '') + '> <span>🔒 قفل کن</span></label></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">' +
      '<button class="day-btn day-btn-s" data-day="close-modal" data-mid="cause-edit">انصراف</button>' +
      '<button class="day-btn day-btn-p" data-day="save-cause">💾 ذخیره</button>' +
    '</div>';

  openModal('cause-edit', html, { sheet: true });
}

function saveCauseEdit(){
  var nameInput = document.getElementById('edCauseName');
  var errEl = document.getElementById('err-edCauseName');
  nameInput.classList.remove('err');
  if(errEl){ errEl.style.display = 'none'; errEl.textContent = ''; }

  var name = nameInput.value.trim();
  if(!name){
    nameInput.classList.add('err');
    if(errEl){ errEl.style.display = 'block'; errEl.textContent = '❌ نام اجباری است'; }
    toast('❌ نام را وارد کنید', 'error');
    try{ nameInput.focus(); }catch(e){}
    return;
  }

  var causes = getCauses();
  for(var i = 0; i < causes.length; i++){
    if(causes[i].name === name && !sameId(causes[i].id, editingCauseId)){
      toast('⚠️ تکراری', 'error'); return;
    }
  }

  var flockNames = [];
  var chips = document.querySelectorAll('#edCauseFlocks .day-flock-chip.on');
  for(var k = 0; k < chips.length; k++){ flockNames.push(chips[k].dataset.flockChip); }

  var isLocked = document.getElementById('edCauseLock').checked;
  var isDisease = document.getElementById('edCauseIsDisease').checked;

  if(editingCauseId){
    var existing = Store.find('causes', editingCauseId);
    if(existing){
      var oldName = existing.name;
      if(oldName !== name){
        var records = getRecords();
        records.forEach(function(r){
          if(r.cause === oldName) Store.update('dailyRecords', r.id, { cause: name });
          if(Array.isArray(r.deathsList)){
            var updated = r.deathsList.map(function(d){
              return d.cause === oldName ? { cause: name, count: d.count } : d;
            });
            Store.update('dailyRecords', r.id, { deathsList: updated });
          }
        });
      }
      Store.update('causes', editingCauseId, { name: name, isLocked: isLocked, flockNames: flockNames, isDisease: isDisease });
    }
    toast('✅', 'success');
  } else {
    Store.add('causes', { name: name, isLocked: isLocked, usage: 0, scope: 'death', flockNames: flockNames, isDisease: isDisease });
    toast('✅', 'success');
  }

  Store.save();
  closeModal('cause-edit');
  refreshCauseMgr();

  var ed = document.getElementById('dayDeathsEditor');
  if(ed) ed.innerHTML = renderDeathsEditor();

  refreshList();
  editingCauseId = null;
}

function lockCause(id){ var c = Store.find('causes', id); if(!c || c.isLocked) return; if(!confirm('قفل؟')) return; Store.update('causes', id, { isLocked: true }); Store.save(); toast('🔒'); refreshCauseMgr(); }
function unlockCause(id){ var c = Store.find('causes', id); if(!c || !c.isLocked) return; if(!confirm('باز؟')) return; Store.update('causes', id, { isLocked: false }); Store.save(); toast('🔓'); refreshCauseMgr(); }
function delCause(id){ var c = Store.find('causes', id); if(!c || c.isLocked){ toast('🔒', 'error'); return; } if(!confirm('حذف؟')) return; Store.remove('causes', id); Store.save(); toast('🗑️'); refreshCauseMgr(); }

function openCalendar(targetId){
  calState.targetId = targetId;
  calState.pickerStep = null;
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
  var html = '<div id="dayCalWrapper"></div>';
  openModal('day-cal', html, { sheet: true });
  renderCalendar();
}

function renderCalendar(){
  var wrap = document.getElementById('dayCalWrapper');
  if(!wrap) return;

  if(calState.pickerStep === 'year'){
    var startYear = todayJ.y - 10, endYear = todayJ.y + 5;
    var yearCells = '';
    for(var y = endYear; y >= startYear; y--){
      yearCells += '<button class="day-cal-year-btn ' + (y === calState.y ? 'on' : '') + '" data-day="cal-pick-year" data-y="' + y + '">' + fa(y) + '</button>';
    }
    wrap.innerHTML = '<div class="day-cal-picker"><div class="day-cal-picker-hd">📅 انتخاب سال</div>' +
      '<div class="day-cal-picker-body"><div class="day-cal-year-grid">' + yearCells + '</div></div>' +
      '<div class="day-cal-picker-foot"><button class="day-cal-back-btn" data-day="cal-back">بازگشت</button></div></div>';
    return;
  }

  if(calState.pickerStep === 'month'){
    var monthCells = '';
    for(var mm = 1; mm <= 12; mm++){
      var isCurrent = mm === calState.m;
      monthCells += '<button class="day-cal-month-btn' + (isCurrent ? ' on' : '') + '" data-day="cal-pick-month" data-m="' + mm + '">' + FA_MONTHS[mm - 1] + '</button>';
    }
    wrap.innerHTML = '<div class="day-cal-picker"><div class="day-cal-picker-hd">📅 ' + fa(calState.y) + '</div>' +
      '<div class="day-cal-picker-body"><div class="day-cal-month-grid">' + monthCells + '</div></div>' +
      '<div class="day-cal-picker-foot"><button class="day-cal-back-btn" data-day="cal-back-year">بازگشت به سال</button></div></div>';
    return;
  }

  var records = getRecords();
  var datesWithData = {};
  for(var i = 0; i < records.length; i++) datesWithData[records[i].date] = true;

  var firstDayG = jToG(calState.y, calState.m, 1);
  var startOffset = (firstDayG.getDay() + 1) % 7;
  var daysCount = daysInJMonth(calState.y, calState.m);
  var cells = '';
  for(i = 0; i < startOffset; i++) cells += '<div class="day-cal-d empty"></div>';
  for(var d = 1; d <= daysCount; d++){
    var jDate = calState.y + '/' + String(calState.m).padStart(2, '0') + '/' + String(d).padStart(2, '0');
    var isToday = calState.y === todayJ.y && calState.m === todayJ.m && d === todayJ.d;
    var isSel = calState.sel && calState.sel.y === calState.y && calState.sel.m === calState.m && calState.sel.d === d;
    var isFuture = (calState.y > todayJ.y) || (calState.y === todayJ.y && calState.m > todayJ.m) ||
      (calState.y === todayJ.y && calState.m === todayJ.m && d > todayJ.d);
    var hasData = !!datesWithData[jDate];
    var cls = 'day-cal-d';
    if(isToday) cls += ' today';
    if(isSel) cls += ' selected';
    if(isFuture) cls += ' future';
    if(hasData) cls += ' has-data';
    cells += '<div class="' + cls + '" data-day="cal-pick" data-d="' + d + '">' + toFa(d) + '</div>';
  }

  wrap.innerHTML =
    '<div class="day-cal-box">' +
      '<div class="day-cal-hd">' +
        '<button class="day-cal-nav-btn" data-day="cal-prev-month">›</button>' +
        '<div class="day-cal-my" data-day="open-year-picker">' +
          '<div class="day-cal-my-row"><span>' + FA_MONTHS[calState.m - 1] + '</span><span>' + fa(calState.y) + '</span><span style="font-size:10px">▾</span></div>' +
          '<div class="day-cal-my-hint">برای تغییر لمس کنید</div>' +
        '</div>' +
        '<button class="day-cal-nav-btn" data-day="cal-next-month">‹</button>' +
      '</div>' +
      '<div class="day-cal-wd"><div class="day-cal-wdc">ش</div><div class="day-cal-wdc">ی</div><div class="day-cal-wdc">د</div><div class="day-cal-wdc">س</div><div class="day-cal-wdc">چ</div><div class="day-cal-wdc">پ</div><div class="day-cal-wdc">ج</div></div>' +
      '<div class="day-cal-days">' + cells + '</div>' +
      '<div class="day-cal-ft"><button class="day-cal-tb" data-day="cal-today">📍 امروز</button>' +
      '<div class="day-cal-si">' + (calState.sel ? fa(calState.sel.y) + '/' + String(calState.sel.m).padStart(2, '0') + '/' + String(calState.sel.d).padStart(2, '0') : '—') + '</div></div>' +
    '</div>';
}

document.addEventListener('click', function(e){
  var fItem = e.target.closest ? e.target.closest('[data-day="set-filter"]') : null;
  if(fItem){
    e.stopPropagation();
    uiState.filter = fItem.dataset.f;
    uiState.filterBoxOpen = false;
    uiState.showAll = false;
    var pageRoot = document.querySelector('[data-day-root]');
    if(pageRoot){
      var tmp = document.createElement('div');
      tmp.innerHTML = renderPage();
      pageRoot.parentNode.replaceChild(tmp.firstElementChild, pageRoot);
    }
    return;
  }

  var chip = e.target.closest ? e.target.closest('[data-flock-chip]') : null;
  if(chip){ chip.classList.toggle('on'); return; }

  var btn = e.target.closest ? e.target.closest('[data-day]') : null;
  if(!btn) return;
  var act = btn.dataset.day;
  var id = sid(btn.dataset.id);
  var mid = btn.dataset.mid;
  var i = +btn.dataset.i;

  switch(act){
    case 'open-form': openDailyForm(); break;
    case 'edit': e.stopPropagation(); openDailyForm(id); break;
    case 'del': e.stopPropagation(); deleteRecord(id); break;
    case 'edit-existing': {
      e.stopPropagation();
      forceCloseModal('day-form');
      setTimeout(function(){ openDailyForm(id); }, 100);
      break;
    }
    case 'show-more': {
      e.stopPropagation();
      uiState.showAll = true;
      var l1 = document.querySelector('[data-day-list]');
      if(l1) l1.innerHTML = renderListInner();
      break;
    }
    case 'show-less': {
      e.stopPropagation();
      uiState.showAll = false;
      var l2 = document.querySelector('[data-day-list]');
      if(l2) l2.innerHTML = renderListInner();
      try{ window.scrollTo({ top: 0, behavior: 'smooth' }); }catch(e){}
      break;
    }
    case 'toggle': {
      e.stopPropagation();
      uiState.expanded[id] = !uiState.expanded[id];
      var card = document.querySelector('.day-card[data-day-id="' + id + '"]');
      if(card) card.classList.toggle('expanded', !!uiState.expanded[id]);
      break;
    }
    case 'close-modal': closeModal(mid); break;
    case 'save': saveDaily(); break;

    case 'toggle-filter-box': {
      e.stopPropagation();
      uiState.filterBoxOpen = !uiState.filterBoxOpen;
      var fbox = document.getElementById('dayFilterBox');
      if(fbox) fbox.classList.toggle('open', uiState.filterBoxOpen);
      break;
    }
    case 'toggle-sort': {
      e.stopPropagation();
      uiState.sortBy = uiState.sortBy === 'date_desc' ? 'date_asc' : 'date_desc';
      var pageRoot2 = document.querySelector('[data-day-root]');
      if(pageRoot2){
        var tmp2 = document.createElement('div');
        tmp2.innerHTML = renderPage();
        pageRoot2.parentNode.replaceChild(tmp2.firstElementChild, pageRoot2);
      }
      break;
    }

    case 'death-add-item': deathAddItem(); break;
    case 'death-edit-item': deathEditItem(i); break;
    case 'death-del': deathDel(i); break;

    case 'open-cause-mgr': openCauseMgr(); break;
    case 'open-add-cause': openCauseEdit(); break;
    case 'edit-cause': openCauseEdit(id); break;
    case 'save-cause': saveCauseEdit(); break;
    case 'lock-cause': lockCause(id); break;
    case 'unlock-cause': unlockCause(id); break;
    case 'del-cause': delCause(id); break;

    case 'open-cal': openCalendar(btn.dataset.target); break;
    case 'cal-prev-month':
      calState.m--;
      if(calState.m < 1){ calState.m = 12; calState.y--; }
      renderCalendar(); break;
    case 'cal-next-month':
      calState.m++;
      if(calState.m > 12){ calState.m = 1; calState.y++; }
      renderCalendar(); break;
    case 'open-year-picker': calState.pickerStep = 'year'; renderCalendar(); break;
    case 'cal-pick-year': calState.y = +btn.dataset.y; calState.pickerStep = 'month'; renderCalendar(); break;
    case 'cal-back-year': calState.pickerStep = 'year'; renderCalendar(); break;
    case 'cal-back': calState.pickerStep = null; renderCalendar(); break;
    case 'cal-pick-month': calState.m = +btn.dataset.m; calState.pickerStep = null; renderCalendar(); break;
    case 'cal-pick': {
      calState.sel = { y: calState.y, m: calState.m, d: +btn.dataset.d };
      renderCalendar();
      setTimeout(function(){
        var inp = document.getElementById(calState.targetId);
        if(inp) inp.value = calState.sel.y + '/' + String(calState.sel.m).padStart(2, '0') + '/' + String(calState.sel.d).padStart(2, '0');
        var el = document.getElementById('dayDate');
        if(el) el.classList.remove('err');
        var er = document.getElementById('err-dayDate');
        if(er){ er.style.display = 'none'; er.textContent = ''; }
        closeModal('day-cal');
        setTimeout(refreshDupWarning, 100);
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
        var el = document.getElementById('dayDate');
        if(el) el.classList.remove('err');
        var er = document.getElementById('err-dayDate');
        if(er){ er.style.display = 'none'; er.textContent = ''; }
        closeModal('day-cal');
        setTimeout(refreshDupWarning, 100);
      }, 220);
      break;
    }
  }
});

document.addEventListener('click', function(e){
  if(!uiState.filterBoxOpen) return;
  var box = document.getElementById('dayFilterBox');
  if(box && !box.contains(e.target)){
    uiState.filterBoxOpen = false;
    box.classList.remove('open');
  }
});

document.addEventListener('change', function(e){
  var t = e.target;

  if(t.id === 'dayDiCause'){
    _formInput.causeId = t.value || '';
    var btn = document.getElementById('dayDiAdd');
    if(btn) btn.disabled = !(_formInput.count > 0 && _formInput.causeId);
    var hint = document.querySelector('.day-di-hint');
    if(hint){
      var canAdd = _formInput.count > 0 && _formInput.causeId;
      hint.className = 'day-di-hint' + (canAdd ? ' ready' : '');
      hint.innerHTML = canAdd ? '✓ آماده افزودن — دکمه <b>➕</b> رو بزن'
        : (_formInput.count > 0 ? 'علت رو انتخاب کن' : 'تعداد تلفات رو وارد کن');
    }
    return;
  }

  if(t.id === 'dayFlock'){
    t.classList.remove('err');
    var er2 = document.getElementById('err-dayFlock');
    if(er2){ er2.style.display = 'none'; er2.textContent = ''; }
    setTimeout(function(){ refreshDeathsEditor(); }, 30);
    setTimeout(refreshDupWarning, 50);
  }
});

document.addEventListener('input', function(e){
  var t = e.target;

  if(t.id === 'dayDiCount'){
    var engVal = toEnDigits(t.value).replace(/[^\d]/g, '');
    if(engVal.length > 6) engVal = engVal.slice(0, 6);
    if(engVal) t.value = toFa(engVal); else t.value = '';
    _formInput.count = +engVal || 0;
    var btn = document.getElementById('dayDiAdd');
    if(btn) btn.disabled = !(_formInput.count > 0 && _formInput.causeId);
    var hint = document.querySelector('.day-di-hint');
    if(hint){
      var canAdd = _formInput.count > 0 && _formInput.causeId;
      hint.className = 'day-di-hint' + (canAdd ? ' ready' : '');
      hint.innerHTML = canAdd ? '✓ آماده افزودن — دکمه <b>➕</b> رو بزن'
        : (_formInput.count > 0 ? 'علت رو انتخاب کن' : 'تعداد تلفات رو وارد کن');
    }
    return;
  }

  if(t.id === 'dayMedCost'){
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

document.addEventListener('keydown', function(e){
  if(e.key === 'Enter' && e.target && e.target.id === 'dayDiCount'){
    e.preventDefault();
    var btn = document.getElementById('dayDiAdd');
    if(btn && !btn.disabled) deathAddItem();
  }
});

window.DailyModule = {
  key: 'dailyRecords',
  get: function(){ return getRecords().slice(); },
  findRecordByDateFlock: findRecordByDateFlock,
  set: function(data){
    if(Array.isArray(data)){
      Store.set('daily', { causes: getCauses(), records: data });
      Store.save(); refreshList();
    }
  },
  save: function(){ Store.save(); },
  load: function(){ refreshList(); },
  reset: function(){
    if(!confirm('همه داده‌های روزانه پاک شوند؟')) return;
    Store.set('daily', { causes: getCauses(), records: [] });
    Store.save(); refreshList();
  }
};

injectStyles();

Router.register('daily', {
  title: 'ثبت روزانه',
  navPage: 'daily',
  topLevel: true,
  render: function(){ return renderPage(); }
});

console.log('✅ daily route registered (v19.0)');

})();