/* ═══════════════════════════════════════════════
   INCUBATION — جوجه‌کشی (v3.0)
   بازنویسی‌شده برای Store v4 + UI مشترک
   ═══════════════════════════════════════════════ */
(function(){
'use strict';

if(typeof Router === 'undefined' || typeof Router.register !== 'function'){ return; }
if(window.__incubationModuleLoaded) return;
window.__incubationModuleLoaded = true;

var sid = UI.sid, sameId = UI.sameId, findBy = UI.findBy;
var esc = UI.esc, fa = UI.fa, toFa = UI.toFa, toEnDigits = UI.toEnDigits;
var parseNum = UI.parseNum, fmtThousandsInput = UI.fmtThousandsInput;
var fmtShort = UI.formatShort, toast = UI.toast;
var jToC = UI.jToC, todayStr = UI.todayStr;

var uiState = { filter: 'all', expanded: {} };
var formLosses = [];
var editingIncId = null;
var editingIds = { device: null, bird: null, cause: null, result: null, seller: null };
var selectedBirdColor = '#3b82f6';
var _modals = {};

/* ═══════ Data Access ═══════ */
function getIncs(){ return Store.all('incs'); }
function getDevices(){ return Store.all('incDevices'); }
function getSellers(){ return Store.all('incSellers'); }
function getCauses(){
  var arr = Store.all('incCauses');
  if(arr.length) return arr;
  /* Fallback — علل هچ پیش‌فرض */
  return [
    { id: '1', name: 'نطفه‌نگرفته', isLocked: false, usage: 0 },
    { id: '2', name: 'رطوبت نامناسب', isLocked: false, usage: 0 },
    { id: '3', name: 'دمای نامناسب', isLocked: false, usage: 0 }
  ];
}
function getResults(){
  var arr = Store.all('incResults');
  if(arr.length) return arr;
  return [
    { id: '1', name: 'موفق', isLocked: false, usage: 0 },
    { id: '2', name: 'ناقص', isLocked: false, usage: 0 },
    { id: '3', name: 'ناموفق', isLocked: false, usage: 0 }
  ];
}
function getBirds(){
  var arr = Store.all('incBirds');
  if(arr.length) return arr;
  return [
    { id: '1', name: 'مرغ', hatchDays: 21, transferDays: 18, color: '#3b82f6', icon: '🐔', isLocked: false },
    { id: '2', name: 'بلدرچین', hatchDays: 17, transferDays: 14, color: '#8b5cf6', icon: '🐦', isLocked: false },
    { id: '3', name: 'بوقلمون', hatchDays: 28, transferDays: 25, color: '#f59e0b', icon: '🦃', isLocked: false }
  ];
}

function getBird(name){
  var birds = getBirds();
  for(var i = 0; i < birds.length; i++) if(birds[i].name === name) return birds[i];
  return { hatchDays: 21, transferDays: 18, color: '#3b82f6', icon: '🐔' };
}

function getIncStatus(inc){
  var bird = getBird(inc.bird);
  var daysPassed = jToC(todayStr) - jToC(inc.startDate);
  var status, label, icon;
  var progress = Math.min(100, Math.max(0, (daysPassed / bird.hatchDays) * 100));

  if(inc.hatched > 0){ status = 'hatched'; label = 'هچ شده'; icon = '🐣'; progress = 100; }
  else if(daysPassed >= bird.hatchDays){ status = 'hatched'; label = 'آماده هچ'; icon = '🐣'; progress = 100; }
  else if(daysPassed >= bird.transferDays){ status = 'hatcher'; label = 'در هچر'; icon = '🥚'; }
  else if(daysPassed < 0){ status = 'pending'; label = 'شروع نشده'; icon = '⏸️'; progress = 0; }
  else { status = 'setter'; label = 'در ستر'; icon = '🔥'; }

  return { status: status, label: label, icon: icon, progress: progress, daysPassed: daysPassed, hatchDays: bird.hatchDays };
}

/* ═══════ Modal ═══════ */
function openModal(id, html, opts){
  opts = opts || {};
  if(_modals[id]) return _modals[id];
  var wrap = document.createElement('div');
  wrap.className = 'inc-modal-wrap';
  wrap.dataset.modalId = id;
  wrap.innerHTML = '<div class="inc-modal-bg" data-inc="close-modal" data-mid="' + id + '"></div>' +
    '<div class="inc-modal-box' + (opts.sheet ? ' inc-sheet' : '') + '">' + html + '</div>';
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
  if(document.getElementById('inc-styles')) return;
  var css =
  '.inc-page{padding:10px;max-width:760px;margin:0 auto}' +
  '.inc-header{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}' +
  '.inc-title{font-size:14px;font-weight:900;color:var(--text,#0f172a)}' +
  '.inc-sub{font-size:10.5px;color:var(--muted,#64748b);font-weight:700;margin-top:1px}' +
  '.inc-add{background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;border:none;padding:8px 14px;border-radius:9999px;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:4px;white-space:nowrap}' +
  '.inc-summary{background:#fff;border-radius:12px;padding:10px;margin-bottom:10px;border:1px solid #e2e8f0;display:grid;grid-template-columns:repeat(4,1fr);gap:6px}' +
  '.inc-sum{background:#f1f5f9;border-radius:8px;padding:8px 4px;text-align:center;border-bottom:2px solid #0f766e}' +
  '.inc-sum.g{border-color:#10b981}.inc-sum.b{border-color:#3b82f6}.inc-sum.o{border-color:#f59e0b}.inc-sum.p{border-color:#8b5cf6}' +
  '.inc-sum-ic{font-size:14px;line-height:1;margin-bottom:2px}' +
  '.inc-sum-v{font-size:14px;font-weight:900;line-height:1.2}' +
  '.inc-sum-l{font-size:9.5px;color:#64748b;font-weight:700;margin-top:1px}' +
  '.inc-filters{display:flex;gap:4px;margin-bottom:10px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none}' +
  '.inc-filters::-webkit-scrollbar{display:none}' +
  '.inc-tab{background:#fff;border:1.5px solid #e2e8f0;color:#64748b;padding:5px 12px;border-radius:9999px;font-family:inherit;font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap;flex-shrink:0}' +
  '.inc-tab.on{background:#0f766e;border-color:#0f766e;color:#fff}' +
  '.inc-card{background:#fff;border-radius:12px;margin-bottom:6px;border:1px solid #e2e8f0;border-right:3px solid #0f766e;overflow:hidden}' +
  '.inc-card-hd{display:flex;justify-content:space-between;align-items:flex-start;gap:6px;padding:8px 10px;cursor:pointer;user-select:none}' +
  '.inc-hd-content{flex:1;min-width:0}' +
  '.inc-hd-row1{display:flex;align-items:center;gap:6px;margin-bottom:5px;flex-wrap:wrap}' +
  '.inc-hd-ic{font-size:14px;flex-shrink:0}' +
  '.inc-hd-name{font-size:12.5px;font-weight:900;color:#0f172a}' +
  '.inc-status{font-size:9px;font-weight:800;padding:2px 7px;border-radius:9999px}' +
  '.inc-status.setter{background:#eff6ff;color:#1e40af}' +
  '.inc-status.hatcher{background:#fffbeb;color:#92400e}' +
  '.inc-status.hatched{background:#ecfdf5;color:#166534}' +
  '.inc-status.pending{background:#e2e8f0;color:#475569}' +
  '.inc-hd-row2{display:flex;align-items:center;gap:5px;flex-wrap:wrap}' +
  '.inc-stat{display:inline-flex;align-items:center;gap:2px;padding:2px 6px;border-radius:9999px;background:#f1f5f9;font-size:10px;font-weight:700;white-space:nowrap}' +
  '.inc-stat.r{background:#fef2f2;color:#991b1b}.inc-stat.g{background:#ecfdf5;color:#166534}' +
  '.inc-stat.b{background:#eff6ff;color:#1e40af}.inc-stat.o{background:#fffbeb;color:#92400e}' +
  '.inc-stat.p{background:#f5f3ff;color:#6b21a8}' +
  '.inc-toggle{background:#f1f5f9;border:none;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:#0f766e;cursor:pointer;flex-shrink:0;transition:transform .3s,background .2s}' +
  '.inc-card.expanded .inc-toggle{transform:rotate(180deg);background:#0f766e;color:#fff}' +
  '.inc-card-bd{max-height:0;overflow:hidden;transition:max-height .35s,padding .35s;padding:0 10px}' +
  '.inc-card.expanded .inc-card-bd{max-height:1500px;padding:8px 10px 10px;border-top:1px dashed #e2e8f0}' +
  '.inc-prog{margin-bottom:8px}' +
  '.inc-prog-info{display:flex;justify-content:space-between;font-size:10px;font-weight:800;color:#64748b;margin-bottom:4px}' +
  '.inc-prog-bar{height:6px;background:#f1f5f9;border-radius:3px;overflow:hidden}' +
  '.inc-prog-fill{height:100%;border-radius:3px;transition:width .3s}' +
  '.inc-prog-fill.setter{background:linear-gradient(90deg,#3b82f6,#60a5fa)}' +
  '.inc-prog-fill.hatcher{background:linear-gradient(90deg,#f59e0b,#fbbf24)}' +
  '.inc-prog-fill.hatched{background:linear-gradient(90deg,#10b981,#34d399)}' +
  '.inc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:8px}' +
  '.inc-box{background:#f1f5f9;border-radius:6px;padding:5px 6px;text-align:center;border-bottom:2px solid #cbd5e1}' +
  '.inc-box.r{border-color:#ef4444}.inc-box.g{border-color:#10b981}.inc-box.b{border-color:#3b82f6}.inc-box.o{border-color:#f59e0b}.inc-box.p{border-color:#8b5cf6}' +
  '.inc-box-l{font-size:9px;color:#64748b;font-weight:700;margin-bottom:1px}' +
  '.inc-box-v{font-size:12px;font-weight:900}' +
  '.inc-box.r .inc-box-v{color:#ef4444}.inc-box.g .inc-box-v{color:#10b981}' +
  '.inc-box.b .inc-box-v{color:#3b82f6}.inc-box.o .inc-box-v{color:#f59e0b}.inc-box.p .inc-box-v{color:#8b5cf6}' +
  '.inc-chips{display:flex;flex-wrap:wrap;gap:3px;margin-bottom:6px}' +
  '.inc-chip{display:inline-flex;align-items:center;gap:3px;padding:3px 7px;border-radius:9999px;font-size:10px;font-weight:700;background:#f1f5f9}' +
  '.inc-chip.date{background:#eff6ff;color:#1e40af}' +
  '.inc-chip.result{background:#f5f3ff;color:#6b21a8}' +
  '.inc-chip.seller{background:#fffbeb;color:#92400e}' +
  '.inc-losses{background:#fffbeb;border-radius:6px;padding:6px 8px;margin-bottom:6px;border-right:2px solid #f59e0b}' +
  '.inc-losses-t{font-size:9.5px;font-weight:900;color:#92400e;margin-bottom:4px}' +
  '.inc-loss-i{display:flex;justify-content:space-between;font-size:11px;font-weight:700;color:#78350f;padding:2px 0}' +
  '.inc-note{background:#f1f5f9;padding:6px 8px;border-radius:6px;font-size:11px;color:#475569;border-right:2px solid #0f766e;margin-bottom:6px}' +
  '.inc-actions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;padding-top:6px;border-top:1px dashed #e2e8f0}' +
  '.inc-actions button{padding:6px;border:none;border-radius:6px;font-family:inherit;font-size:10.5px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:3px}' +
  '.inc-act-edit{background:#eff6ff;color:#1e40af}' +
  '.inc-act-sell{background:#ecfdf5;color:#166534}' +
  '.inc-act-del{background:#fef2f2;color:#991b1b}' +
  '.inc-empty{text-align:center;padding:48px 24px;background:#fff;border-radius:12px;border:1px dashed #cbd5e1}' +
  '.inc-empty-ic{font-size:56px;line-height:1;display:block;margin-bottom:12px;opacity:.6}' +
  '.inc-empty-t{font-size:14px;font-weight:900;margin-bottom:6px}' +
  '.inc-empty-x{font-size:12px;color:#64748b;font-weight:600;margin:0 auto 16px;max-width:280px}' +
  '.inc-modal-wrap{position:fixed;inset:0;z-index:2000;display:flex;align-items:flex-end;justify-content:center;opacity:0;pointer-events:none;transition:opacity .2s}' +
  '.inc-modal-wrap.on{opacity:1;pointer-events:auto}' +
  '.inc-modal-bg{position:absolute;inset:0;background:rgba(15,23,42,.55)}' +
  '.inc-modal-box{position:relative;background:#fff;width:100%;max-width:760px;border-radius:24px 24px 0 0;padding:14px;max-height:95vh;overflow-y:auto;transform:translateY(30px);transition:transform .3s;padding-bottom:calc(20px + env(safe-area-inset-bottom,0px))}' +
  '.inc-modal-wrap.on .inc-modal-box{transform:translateY(0)}' +
  '.inc-modal-box.inc-sheet{border-radius:16px;max-width:380px;margin:auto}' +
  '.inc-modal-hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #e2e8f0}' +
  '.inc-modal-t{font-size:14px;font-weight:800}' +
  '.inc-modal-x{background:#f1f5f9;border:none;width:32px;height:32px;border-radius:50%;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center}' +
  '.inc-sec{margin-bottom:16px}' +
  '.inc-sec-hd{display:flex;align-items:center;gap:6px;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #e2e8f0}' +
  '.inc-sec-ic{width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}' +
  '.inc-sec-t{font-size:12.5px;font-weight:900}' +
  '.inc-sec-s{font-size:10px;color:#64748b;font-weight:600;margin-top:1px}' +
  '.inc-fg{margin-bottom:10px}' +
  '.inc-fl{font-size:11px;font-weight:800;margin-bottom:4px;display:flex;align-items:center;gap:4px}' +
  '.inc-fl-hint{font-size:9.5px;color:#0f766e;font-weight:700;margin-right:auto;cursor:pointer;text-decoration:underline}' +
  '.inc-fi,.inc-fs,.inc-ft{width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:12px;font-size:13px;font-family:inherit;background:#f1f5f9;color:#0f172a;box-sizing:border-box}' +
  '.inc-fi:focus,.inc-fs:focus,.inc-ft:focus{outline:none;border-color:#0f766e;background:#fff;box-shadow:0 0 0 3px #f0fdfa}' +
  '.inc-ft{resize:vertical;min-height:55px;line-height:1.6}' +
  '.inc-fr{display:grid;grid-template-columns:1fr 1fr;gap:8px}' +
  '.inc-date-field{display:flex;gap:6px}' +
  '.inc-date-field .inc-fi{flex:1;text-align:left;direction:ltr;font-weight:700;cursor:pointer}' +
  '.inc-date-btn{width:38px;flex-shrink:0;border:none;border-radius:12px;background:#0f766e;color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}' +
  '.inc-iwb{display:flex;gap:6px}' +
  '.inc-iwb .inc-fs{flex:1;min-width:0}' +
  '.inc-ibtn{width:38px;flex-shrink:0;border:none;border-radius:12px;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;background:#10b981;color:#fff}' +
  '.inc-save{width:100%;padding:14px;border:none;border-radius:12px;background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;font-family:inherit;font-size:14px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:16px}' +
  '.inc-btn{width:100%;padding:11px;border:none;border-radius:12px;font-size:13px;font-weight:800;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px}' +
  '.inc-btn-s{background:#f1f5f9;color:#0f172a}' +
  '.inc-btn-p{background:#0f766e;color:#fff}' +
  '.inc-btn-g{background:#10b981;color:#fff}' +
  '.inc-list{display:flex;flex-direction:column;gap:6px;max-height:55vh;overflow-y:auto;padding:2px}' +
  '.inc-row{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#f1f5f9;border-radius:12px;border-right:3px solid #f59e0b}' +
  '.inc-row.locked{border-right-color:#10b981;background:linear-gradient(90deg,#ecfdf5 0%,#f1f5f9 30%)}' +
  '.inc-row-ic{width:30px;height:30px;border-radius:8px;background:#fffbeb;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}' +
  '.inc-row-info{flex:1;min-width:0}' +
  '.inc-row-n{font-size:12.5px;font-weight:800;display:flex;align-items:center;gap:4px;flex-wrap:wrap}' +
  '.inc-row-u{font-size:10px;color:#64748b;font-weight:600;margin-top:1px}' +
  '.inc-row-acts{display:flex;gap:4px;flex-shrink:0}' +
  '.inc-row-btn{width:30px;height:30px;border-radius:8px;border:none;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center}' +
  '.inc-row-btn.edit{background:#eff6ff;color:#1e40af}' +
  '.inc-row-btn.delete{background:#fef2f2;color:#ef4444}' +
  '.inc-row-btn.lock{background:#ecfdf5;color:#10b981}' +
  '.inc-row-btn.unlock{background:#fffbeb;color:#f59e0b}' +
  '.inc-badge{display:inline-flex;align-items:center;gap:3px;font-size:9px;font-weight:800;padding:2px 6px;border-radius:9999px;background:#ecfdf5;color:#166534}' +
  '.inc-info-box{background:#eff6ff;color:#1e40af;padding:10px 12px;border-radius:12px;font-size:11px;font-weight:700;margin-bottom:12px;line-height:1.7;border-right:3px solid #3b82f6}' +
  '.inc-colors{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}' +
  '.inc-color{width:26px;height:26px;border-radius:50%;cursor:pointer;border:2.5px solid transparent}' +
  '.inc-color.on{border-color:#fff;box-shadow:0 0 0 1.5px #0f172a;transform:scale(1.1)}' +
  '.inc-check{display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer}' +
  '.inc-check input{width:18px;height:18px;accent-color:#0f766e}' +
  '.inc-loss-row{display:flex;align-items:center;gap:6px;padding:7px 9px;background:#f1f5f9;border-radius:10px;border-right:3px solid #ef4444;margin-bottom:5px}' +
  '.inc-loss-num{width:22px;height:22px;border-radius:50%;background:#fef2f2;color:#ef4444;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;flex-shrink:0}' +
  '.inc-loss-sel{flex:1;min-width:0;padding:6px 8px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px;font-family:inherit;background:#fff;color:#0f172a;font-weight:700;cursor:pointer}' +
  '.inc-loss-cnt{width:56px;padding:6px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px;font-family:inherit;background:#fff;text-align:center;font-weight:800;flex-shrink:0}' +
  '.inc-loss-unit{font-size:9.5px;color:#64748b;font-weight:800;flex-shrink:0}' +
  '.inc-loss-del{width:26px;height:26px;border-radius:8px;border:none;background:#fff;color:#ef4444;font-size:11px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1.5px solid #fecaca}' +
  '.inc-loss-empty{text-align:center;padding:14px 12px;background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1.5px dashed #fcd34d;border-radius:10px;margin-bottom:6px;font-size:11px;color:#92400e;font-weight:700}';

  var s = document.createElement('style');
  s.id = 'inc-styles';
  s.textContent = css;
  document.head.appendChild(s);
}

/* ═══════ Render Page ═══════ */
function renderPage(){
  var incs = getIncs();
  var totalEggs = 0, totalHatched = 0, active = 0;
  for(var i = 0; i < incs.length; i++){
    totalEggs += incs[i].eggs || 0;
    totalHatched += incs[i].hatched || 0;
    if(getIncStatus(incs[i]).status !== 'hatched') active++;
  }
  var rate = totalEggs > 0 ? ((totalHatched / totalEggs) * 100).toFixed(1) : '0';

  return '<div class="page inc-page" data-inc-root>' +
    '<div class="inc-header">' +
      '<div><div class="inc-title">📊 دوره‌های جوجه‌کشی</div>' +
      '<div class="inc-sub">' + fa(incs.length) + ' دوره • امروز ' + todayStr + '</div></div>' +
      '<button class="inc-add" data-inc="open-form">➕ <span>دوره جدید</span></button>' +
    '</div>' +
    '<div class="inc-summary">' +
      '<div class="inc-sum b"><div class="inc-sum-ic">🥚</div><div class="inc-sum-v">' + fa(totalEggs) + '</div><div class="inc-sum-l">کل تخم</div></div>' +
      '<div class="inc-sum g"><div class="inc-sum-ic">🐣</div><div class="inc-sum-v">' + fa(totalHatched) + '</div><div class="inc-sum-l">کل جوجه</div></div>' +
      '<div class="inc-sum o"><div class="inc-sum-ic">📊</div><div class="inc-sum-v">' + rate + '٪</div><div class="inc-sum-l">نرخ هچ</div></div>' +
      '<div class="inc-sum p"><div class="inc-sum-ic">🔥</div><div class="inc-sum-v">' + fa(active) + '</div><div class="inc-sum-l">فعال</div></div>' +
    '</div>' +
    '<div class="inc-filters">' +
      '<button class="inc-tab ' + (uiState.filter === 'all' ? 'on' : '') + '" data-inc="filter" data-f="all">همه</button>' +
      '<button class="inc-tab ' + (uiState.filter === 'setter' ? 'on' : '') + '" data-inc="filter" data-f="setter">🔥 در ستر</button>' +
      '<button class="inc-tab ' + (uiState.filter === 'hatcher' ? 'on' : '') + '" data-inc="filter" data-f="hatcher">🥚 در هچر</button>' +
      '<button class="inc-tab ' + (uiState.filter === 'hatched' ? 'on' : '') + '" data-inc="filter" data-f="hatched">🐣 هچ شده</button>' +
    '</div>' +
    '<div data-inc-list>' + renderListInner() + '</div>' +
  '</div>';
}

function renderListInner(){
  var list = getIncs().slice();
  if(uiState.filter !== 'all'){
    list = list.filter(function(i){ return getIncStatus(i).status === uiState.filter; });
  }
  if(!list.length){
    return '<div class="inc-empty">' +
      '<div class="inc-empty-ic">🥚</div>' +
      '<div class="inc-empty-t">هنوز دوره‌ای ثبت نشده</div>' +
      '<div class="inc-empty-x">برای شروع، اولین دوره جوجه‌کشی خود را ثبت کنید</div>' +
      '<button class="inc-add" style="margin:0 auto" data-inc="open-form">➕ ثبت دوره جدید</button>' +
    '</div>';
  }
  var out = '';
  for(var i = 0; i < list.length; i++) out += renderIncCard(list[i]);
  return out;
}

function renderIncCard(inc){
  var st = getIncStatus(inc);
  var bird = getBird(inc.bird);
  var hatchRate = inc.eggs > 0 ? ((inc.hatched / inc.eggs) * 100).toFixed(1) : '0';
  var totalLosses = 0;
  for(var i = 0; i < (inc.losses || []).length; i++) totalLosses += inc.losses[i].count || 0;
  var totalCost = (inc.eggCost || 0) + (inc.transportCost || 0);
  var isOpen = !!uiState.expanded[sid(inc.id)];

  var stats =
    '<span class="inc-stat b">🥚 <strong>' + fa(inc.eggs) + '</strong></span>' +
    (inc.hatched > 0 ? '<span class="inc-stat g">🐣 <strong>' + fa(inc.hatched) + '</strong></span>' : '') +
    '<span class="inc-stat o">📅 <strong>' + fa(st.daysPassed) + ' روز</strong></span>' +
    (inc.hatched > 0 ? '<span class="inc-stat p">📊 <strong>' + hatchRate + '٪</strong></span>' : '');

  var lossesHtml = '';
  if((inc.losses || []).length){
    lossesHtml = '<div class="inc-losses"><div class="inc-losses-t">⚠️ علل عدم هچ (' + fa(totalLosses) + ' تخم):</div>';
    for(i = 0; i < inc.losses.length; i++){
      lossesHtml += '<div class="inc-loss-i"><span>' + esc(inc.losses[i].cause) + '</span><span>' + fa(inc.losses[i].count) + '</span></div>';
    }
    lossesHtml += '</div>';
  }

  return '<div class="inc-card ' + (isOpen ? 'expanded' : '') + '" data-inc-id="' + sid(inc.id) + '" style="border-right-color:' + bird.color + '">' +
    '<div class="inc-card-hd" data-inc="toggle-card" data-id="' + sid(inc.id) + '">' +
      '<div class="inc-hd-content">' +
        '<div class="inc-hd-row1">' +
          '<span class="inc-hd-ic">' + st.icon + '</span>' +
          '<div class="inc-hd-name">' + esc(inc.bird) + '</div>' +
          '<span class="inc-status ' + st.status + '">' + st.label + '</span>' +
          (inc.result ? '<span class="inc-status hatched">🏷️ ' + esc(inc.result) + '</span>' : '') +
        '</div>' +
        '<div class="inc-hd-row2">' + stats + '</div>' +
      '</div>' +
      '<button class="inc-toggle" type="button">▼</button>' +
    '</div>' +
    '<div class="inc-card-bd">' +
      '<div class="inc-prog">' +
        '<div class="inc-prog-info"><span>📊 پیشرفت</span><span><strong>' + st.progress.toFixed(0) + '٪</strong></span></div>' +
        '<div class="inc-prog-bar"><div class="inc-prog-fill ' + st.status + '" style="width:' + st.progress + '%"></div></div>' +
      '</div>' +
      '<div class="inc-grid">' +
        '<div class="inc-box b"><div class="inc-box-l">🥚 تخم</div><div class="inc-box-v">' + fa(inc.eggs) + '</div></div>' +
        '<div class="inc-box g"><div class="inc-box-l">🐣 هچ</div><div class="inc-box-v">' + fa(inc.hatched) + '</div></div>' +
        '<div class="inc-box r"><div class="inc-box-l">💔 عدم هچ</div><div class="inc-box-v">' + fa(totalLosses) + '</div></div>' +
        '<div class="inc-box p"><div class="inc-box-l">📊 نرخ</div><div class="inc-box-v">' + hatchRate + '٪</div></div>' +
        '<div class="inc-box o"><div class="inc-box-l">📅 روز</div><div class="inc-box-v">' + fa(st.daysPassed) + '</div></div>' +
        '<div class="inc-box"><div class="inc-box-l">💰 هزینه</div><div class="inc-box-v">' + fmtShort(totalCost) + '</div></div>' +
      '</div>' +
      '<div class="inc-chips">' +
        '<span class="inc-chip date">📅 ' + esc(inc.startDate) + '</span>' +
        '<span class="inc-chip date">⚙️ ' + esc(inc.device) + '</span>' +
        (inc.result ? '<span class="inc-chip result">🏷️ ' + esc(inc.result) + '</span>' : '') +
        (inc.seller ? '<span class="inc-chip seller">🏪 ' + esc(inc.seller) + '</span>' : '') +
      '</div>' + lossesHtml +
      (inc.notes ? '<div class="inc-note"><strong>📝</strong> ' + esc(inc.notes) + '</div>' : '') +
      '<div class="inc-actions">' +
        '<button class="inc-act-edit" data-inc="edit-inc" data-id="' + sid(inc.id) + '">✏️ ویرایش</button>' +
        '<button class="inc-act-sell" data-inc="sell-inc" data-id="' + sid(inc.id) + '">💰 فروش</button>' +
        '<button class="inc-act-del" data-inc="del-inc" data-id="' + sid(inc.id) + '">🗑️ حذف</button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function refreshList(){
  var el = document.querySelector('[data-inc-list]');
  if(el) el.innerHTML = renderListInner();

  var incs = getIncs();
  var totalEggs = 0, totalHatched = 0, active = 0;
  for(var i = 0; i < incs.length; i++){
    totalEggs += incs[i].eggs || 0;
    totalHatched += incs[i].hatched || 0;
    if(getIncStatus(incs[i]).status !== 'hatched') active++;
  }
  var rate = totalEggs > 0 ? ((totalHatched / totalEggs) * 100).toFixed(1) : '0';
  var sumV = document.querySelectorAll('[data-inc-root] .inc-sum-v');
  if(sumV.length === 4){
    sumV[0].textContent = fa(totalEggs);
    sumV[1].textContent = fa(totalHatched);
    sumV[2].textContent = rate + '٪';
    sumV[3].textContent = fa(active);
  }
}

/* ═══════ Options ═══════ */
function deviceOptions(cur){
  var devices = getDevices();
  if(!devices.length) return '<option value="">— ابتدا دستگاه بسازید —</option>';
  var out = '';
  for(var i = 0; i < devices.length; i++){
    var d = devices[i];
    out += '<option value="' + esc(d.name) + '" ' + (cur === d.name ? 'selected' : '') + '>⚙️ ' + esc(d.name) + '</option>';
  }
  return out;
}
function birdOptions(cur){
  var birds = getBirds();
  var out = '';
  for(var i = 0; i < birds.length; i++){
    var b = birds[i];
    out += '<option value="' + esc(b.name) + '" ' + (cur === b.name ? 'selected' : '') + '>' + (b.icon || '🐔') + ' ' + esc(b.name) + '</option>';
  }
  return out;
}
function resultOptions(cur){
  var out = '<option value="">— انتخاب کنید —</option>';
  var results = getResults();
  for(var i = 0; i < results.length; i++){
    var r = results[i];
    out += '<option value="' + esc(r.name) + '" ' + (cur === r.name ? 'selected' : '') + '>🏷️ ' + esc(r.name) + '</option>';
  }
  return out;
}
function sellerOptions(cur){
  var sellers = getSellers();
  if(!sellers.length) return '<option value="">— ابتدا فروشنده بسازید —</option>';
  var out = '<option value="">— انتخاب کنید —</option>';
  for(var i = 0; i < sellers.length; i++){
    var s = sellers[i];
    out += '<option value="' + esc(s.name) + '" ' + (cur === s.name ? 'selected' : '') + '>🏪 ' + esc(s.name) + '</option>';
  }
  return out;
}

/* ═══════ Losses ═══════ */
function renderLossesInner(){
  var causes = getCauses();
  if(!causes.length){
    return '<div class="inc-loss-empty">🔍<br>هنوز علتی ساخته نشده</div>';
  }
  if(!formLosses.length){
    return '<div class="inc-loss-empty">📋<br>هنوز علتی اضافه نشده</div>';
  }
  var out = '';
  for(var i = 0; i < formLosses.length; i++){
    var l = formLosses[i];
    var opts = '';
    for(var j = 0; j < causes.length; j++){
      var c = causes[j];
      var usedByOther = false;
      for(var k = 0; k < formLosses.length; k++){
        if(k !== i && formLosses[k].cause === c.name){ usedByOther = true; break; }
      }
      opts += '<option value="' + esc(c.name) + '" ' + (l.cause === c.name ? 'selected' : '') + (usedByOther ? ' disabled' : '') + '>' + esc(c.name) + '</option>';
    }
    out += '<div class="inc-loss-row">' +
      '<div class="inc-loss-num">' + toFa(i + 1) + '</div>' +
      '<select class="inc-loss-sel" data-loss-cause="' + i + '">' + opts + '</select>' +
      '<input class="inc-loss-cnt" type="number" inputmode="numeric" placeholder="0" value="' + (l.count || '') + '" data-loss-count="' + i + '">' +
      '<span class="inc-loss-unit">تخم</span>' +
      '<button type="button" class="inc-loss-del" data-inc="del-loss" data-i="' + i + '">✕</button>' +
    '</div>';
  }
  return out;
}
function refreshLosses(){
  var el = document.getElementById('incLossesList');
  if(el) el.innerHTML = renderLossesInner();
}
function updateBirdInfo(name){
  var el = document.getElementById('incBirdInfo');
  if(!el) return;
  var bird = getBird(name);
  el.style.display = 'block';
  el.innerHTML = '💡 <b>' + esc(bird.name || name) + '</b>: هچ ' + fa(bird.hatchDays) + ' روز | انتقال: روز ' + fa(bird.transferDays);
}

/* ═══════ Form ═══════ */
function openIncForm(id){
  editingIncId = id ? sid(id) : null;
  var inc = id ? Store.find('incs', id) : null;
  formLosses = inc ? (inc.losses || []).map(function(l){ return { cause: l.cause, count: l.count }; }) : [];

  var eggCostVal = (inc && inc.eggCost) ? Number(inc.eggCost).toLocaleString('en-US') : '';
  var transportVal = (inc && inc.transportCost) ? Number(inc.transportCost).toLocaleString('en-US') : '';

  var html = '<div class="inc-modal-hd">' +
    '<div class="inc-modal-t">' + (id ? '✏️ ویرایش دوره' : '🥚 دوره جدید') + '</div>' +
    '<button class="inc-modal-x" data-inc="close-modal" data-mid="inc-form">✕</button>' +
  '</div>' +

  '<div class="inc-sec">' +
    '<div class="inc-sec-hd"><div class="inc-sec-ic" style="background:#eff6ff">🥚</div>' +
    '<div><div class="inc-sec-t" style="color:#3b82f6">اطلاعات پایه</div></div></div>' +
    '<div class="inc-fr">' +
      '<div class="inc-fg"><label class="inc-fl">🥚 تعداد تخم</label>' +
        '<input class="inc-fi" type="number" id="incEggs" value="' + (inc ? inc.eggs : 0) + '"></div>' +
      '<div class="inc-fg"><label class="inc-fl">⚙️ دستگاه <span class="inc-fl-hint" data-inc="open-device-mgr">مدیریت</span></label>' +
        '<div class="inc-iwb"><select class="inc-fs" id="incDevice">' + deviceOptions(inc ? inc.device : '') + '</select>' +
        '<button type="button" class="inc-ibtn" data-inc="open-add-device">➕</button></div></div>' +
    '</div>' +
    '<div class="inc-fr">' +
      '<div class="inc-fg"><label class="inc-fl">📅 تاریخ شروع</label>' +
        '<div class="inc-date-field"><input class="inc-fi" type="text" id="incDate" readonly value="' + (inc ? inc.startDate : todayStr) + '">' +
        '<button type="button" class="inc-date-btn" data-inc="open-cal" data-target="incDate">📅</button></div></div>' +
      '<div class="inc-fg"><label class="inc-fl">🐔 پرنده</label>' +
        '<select class="inc-fs" id="incBird">' + birdOptions(inc ? inc.bird : '') + '</select></div>' +
    '</div>' +
    '<div id="incBirdInfo" class="inc-info-box" style="display:none"></div>' +
  '</div>' +

  '<div class="inc-sec">' +
    '<div class="inc-sec-hd"><div class="inc-sec-ic" style="background:#fffbeb">💰</div>' +
    '<div><div class="inc-sec-t" style="color:#f59e0b">هزینه و فروشنده</div></div></div>' +
    '<div class="inc-fr">' +
      '<div class="inc-fg"><label class="inc-fl">💰 هزینه تخم</label><input class="inc-fi" type="text" inputmode="numeric" id="incEggCost" value="' + eggCostVal + '"></div>' +
      '<div class="inc-fg"><label class="inc-fl">🚚 هزینه حمل</label><input class="inc-fi" type="text" inputmode="numeric" id="incTransport" value="' + transportVal + '"></div>' +
    '</div>' +
    '<div class="inc-fr">' +
      '<div class="inc-fg"><label class="inc-fl">🏪 فروشنده <span class="inc-fl-hint" data-inc="open-seller-mgr">مدیریت</span></label>' +
        '<div class="inc-iwb"><select class="inc-fs" id="incSeller">' + sellerOptions(inc ? inc.seller : '') + '</select>' +
        '<button type="button" class="inc-ibtn" data-inc="open-add-seller">➕</button></div></div>' +
      '<div class="inc-fg"><label class="inc-fl">👤 خریدار</label><input class="inc-fi" type="text" id="incBuyer" value="' + (inc ? esc(inc.buyer || '') : '') + '"></div>' +
    '</div>' +
  '</div>' +

  '<div class="inc-sec">' +
    '<div class="inc-sec-hd"><div class="inc-sec-ic" style="background:#ecfdf5">🐣</div>' +
    '<div><div class="inc-sec-t" style="color:#10b981">نتیجه هچ</div></div></div>' +
    '<div class="inc-fr">' +
      '<div class="inc-fg"><label class="inc-fl">🏷️ نتیجه <span class="inc-fl-hint" data-inc="open-result-mgr">مدیریت</span></label>' +
        '<div class="inc-iwb"><select class="inc-fs" id="incResult">' + resultOptions(inc ? inc.result : '') + '</select>' +
        '<button type="button" class="inc-ibtn" data-inc="open-add-result">➕</button></div></div>' +
      '<div class="inc-fg"><label class="inc-fl">🐣 تعداد هچ</label><input class="inc-fi" type="number" id="incHatched" value="' + (inc ? inc.hatched : 0) + '"></div>' +
    '</div>' +
  '</div>' +

  '<div class="inc-sec">' +
    '<div class="inc-sec-hd"><div class="inc-sec-ic" style="background:#fef2f2">📋</div>' +
      '<div style="flex:1"><div class="inc-sec-t" style="color:#ef4444">علل عدم هچ <span class="inc-fl-hint" data-inc="open-cause-mgr">مدیریت</span></div></div>' +
    '</div>' +
    '<div id="incLossesList" style="margin-bottom:8px">' + renderLossesInner() + '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">' +
      '<button type="button" class="inc-btn inc-btn-s" data-inc="add-loss">➕ افزودن علت</button>' +
      '<button type="button" class="inc-btn inc-btn-g" data-inc="open-add-cause">🆕 علت جدید</button>' +
    '</div>' +
  '</div>' +

  '<div class="inc-sec">' +
    '<div class="inc-sec-hd"><div class="inc-sec-ic" style="background:#f0fdfa">📝</div>' +
    '<div><div class="inc-sec-t" style="color:#0f766e">یادداشت</div></div></div>' +
    '<textarea class="inc-ft" id="incNotes">' + (inc ? esc(inc.notes || '') : '') + '</textarea>' +
  '</div>' +

  '<button class="inc-save" data-inc="save-inc">💾 ذخیره دوره</button>';

  openModal('inc-form', html);
  var birdSel = document.getElementById('incBird');
  if(birdSel && birdSel.value) updateBirdInfo(birdSel.value);
}

function saveInc(){
  var eggs = +toEnDigits(document.getElementById('incEggs').value) || 0;
  if(eggs <= 0){ toast('❌ تعداد تخم', 'error'); return; }
  var startDate = document.getElementById('incDate').value.trim();
  if(!startDate){ toast('❌ تاریخ شروع', 'error'); return; }
  var hatched = +toEnDigits(document.getElementById('incHatched').value) || 0;
  if(hatched > eggs){ toast('❌ هچ بیشتر از تخم', 'error'); return; }

  var data = {
    bird: document.getElementById('incBird').value,
    device: document.getElementById('incDevice').value,
    eggs: eggs,
    startDate: startDate,
    hatched: hatched,
    result: document.getElementById('incResult').value,
    eggCost: parseNum(document.getElementById('incEggCost').value),
    transportCost: parseNum(document.getElementById('incTransport').value),
    seller: document.getElementById('incSeller').value,
    buyer: document.getElementById('incBuyer').value.trim(),
    losses: formLosses.filter(function(l){ return l.cause && l.count > 0; }),
    notes: document.getElementById('incNotes').value.trim()
  };

  if(editingIncId){
    Store.update('incs', editingIncId, data);
    toast('✅ ویرایش شد', 'success');
  } else {
    Store.add('incs', data);
    toast('✅ ثبت شد', 'success');
  }
  closeModal('inc-form');
  refreshList();
  editingIncId = null;
}

function deleteInc(id){
  var inc = Store.find('incs', id);
  if(!inc) return;
  if(!confirm('دوره «' + inc.bird + '» حذف شود؟')) return;
  Store.remove('incs', id);
  toast('🗑️');
  refreshList();
}

function sellInc(id){
  var inc = Store.find('incs', id);
  if(!inc) return;
  if(inc.hatched <= 0){ toast('❌ هنوز هچ نشده', 'error'); return; }
  toast('💰 فروش ' + fa(inc.hatched) + ' جوجه ' + inc.bird);
}

/* ═══════ Seller Mgr ═══════ */
function renderSellerListInner(){
  var sellers = getSellers();
  if(!sellers.length) return '<div style="text-align:center;padding:20px;color:#64748b;font-size:12px">هنوز فروشنده‌ای نیست</div>';
  var out = '';
  for(var i = 0; i < sellers.length; i++){
    var s = sellers[i];
    var cls = 'inc-row' + (s.isLocked ? ' locked' : '');
    var acts = s.isLocked
      ? '<button class="inc-row-btn unlock" data-inc="unlock-seller" data-id="' + sid(s.id) + '">🔓</button>'
      : '<button class="inc-row-btn edit" data-inc="edit-seller" data-id="' + sid(s.id) + '">✏️</button>' +
        '<button class="inc-row-btn lock" data-inc="lock-seller" data-id="' + sid(s.id) + '">🔒</button>' +
        '<button class="inc-row-btn delete" data-inc="del-seller" data-id="' + sid(s.id) + '">🗑️</button>';
    out += '<div class="' + cls + '"><div class="inc-row-ic">' + (s.isLocked ? '🔒' : '🏪') + '</div>' +
      '<div class="inc-row-info"><div class="inc-row-n">' + esc(s.name) + '</div>' +
      '<div class="inc-row-u">' + (s.city ? '📍 ' + esc(s.city) : '—') + '</div></div>' +
      '<div class="inc-row-acts">' + acts + '</div></div>';
  }
  return out;
}
function openSellerMgr(){
  var html = '<div class="inc-modal-hd"><div class="inc-modal-t">🏪 فروشندگان</div>' +
    '<button class="inc-modal-x" data-inc="close-modal" data-mid="seller-mgr">✕</button></div>' +
    '<button class="inc-btn inc-btn-g" data-inc="open-add-seller" style="margin-bottom:12px">➕ فروشنده جدید</button>' +
    '<div class="inc-list">' + renderSellerListInner() + '</div>';
  var ex = _modals['seller-mgr'];
  if(ex){ try{ ex.remove(); }catch(e){} delete _modals['seller-mgr']; }
  openModal('seller-mgr', html);
}
function refreshSellerMgr(){
  var el = document.querySelector('[data-modal-id="seller-mgr"] .inc-list');
  if(el) el.innerHTML = renderSellerListInner();
}
function openSellerEdit(id){
  editingIds.seller = id ? sid(id) : null;
  var s = id ? Store.find('incSellers', id) : null;
  if(s && s.isLocked){ toast('🔒', 'error'); return; }
  var html = '<div class="inc-modal-hd"><div class="inc-modal-t">' + (id ? '✏️' : '🏪 جدید') + '</div>' +
    '<button class="inc-modal-x" data-inc="close-modal" data-mid="seller-edit">✕</button></div>' +
    '<div class="inc-fg"><label class="inc-fl">🏪 نام</label><input class="inc-fi" id="edSellerName" value="' + (s ? esc(s.name) : '') + '"></div>' +
    '<div class="inc-fr">' +
      '<div class="inc-fg"><label class="inc-fl">📞 تلفن</label><input class="inc-fi" id="edSellerPhone" value="' + (s ? esc(s.phone || '') : '') + '"></div>' +
      '<div class="inc-fg"><label class="inc-fl">📍 شهر</label><input class="inc-fi" id="edSellerCity" value="' + (s ? esc(s.city || '') : '') + '"></div>' +
    '</div>' +
    '<div class="inc-fg"><label class="inc-check"><input type="checkbox" id="edSellerLock" ' + (s && s.isLocked ? 'checked' : '') + '> <span>🔒 قفل</span></label></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">' +
      '<button class="inc-btn inc-btn-s" data-inc="close-modal" data-mid="seller-edit">انصراف</button>' +
      '<button class="inc-btn inc-btn-p" data-inc="save-seller">💾 ذخیره</button>' +
    '</div>';
  openModal('seller-edit', html, { sheet: true });
}
function saveSellerEdit(){
  var name = document.getElementById('edSellerName').value.trim();
  if(!name){ toast('❌ نام', 'error'); return; }
  var sellers = getSellers();
  for(var i = 0; i < sellers.length; i++){
    if(sellers[i].name === name && !sameId(sellers[i].id, editingIds.seller)){ toast('⚠️ تکراری', 'error'); return; }
  }
  var data = {
    name: name,
    phone: document.getElementById('edSellerPhone').value.trim(),
    city: document.getElementById('edSellerCity').value.trim(),
    isLocked: document.getElementById('edSellerLock').checked
  };
  if(editingIds.seller){
    var existing = Store.find('incSellers', editingIds.seller);
    if(existing){
      var old = existing.name;
      if(old !== name){
        var incs = getIncs();
        for(var k = 0; k < incs.length; k++){
          if(incs[k].seller === old) Store.update('incs', incs[k].id, { seller: name });
        }
      }
      Store.update('incSellers', editingIds.seller, data);
    }
    toast('✅', 'success');
  } else {
    Store.add('incSellers', data);
    toast('✅', 'success');
  }
  closeModal('seller-edit');
  refreshSellerMgr();
  editingIds.seller = null;
}
function lockSeller(id){ var s = Store.find('incSellers', id); if(!s || s.isLocked) return; if(!confirm('قفل؟')) return; Store.update('incSellers', id, { isLocked: true }); toast('🔒'); refreshSellerMgr(); }
function unlockSeller(id){ var s = Store.find('incSellers', id); if(!s || !s.isLocked) return; if(!confirm('باز؟')) return; Store.update('incSellers', id, { isLocked: false }); toast('🔓'); refreshSellerMgr(); }
function delSeller(id){
  var s = Store.find('incSellers', id);
  if(!s || s.isLocked){ toast('🔒', 'error'); return; }
  if(!confirm('حذف؟')) return;
  Store.remove('incSellers', id);
  toast('🗑️'); refreshSellerMgr();
}

/* ═══════ Device Mgr ═══════ */
function renderDeviceListInner(){
  var devices = getDevices();
  if(!devices.length) return '<div style="text-align:center;padding:20px;color:#64748b;font-size:12px">هیچ دستگاهی نیست</div>';
  var out = '';
  for(var i = 0; i < devices.length; i++){
    var d = devices[i];
    var cls = 'inc-row' + (d.isLocked ? ' locked' : '');
    var acts = d.isLocked
      ? '<button class="inc-row-btn unlock" data-inc="unlock-device" data-id="' + sid(d.id) + '">🔓</button>'
      : '<button class="inc-row-btn edit" data-inc="edit-device" data-id="' + sid(d.id) + '">✏️</button>' +
        '<button class="inc-row-btn lock" data-inc="lock-device" data-id="' + sid(d.id) + '">🔒</button>' +
        '<button class="inc-row-btn delete" data-inc="del-device" data-id="' + sid(d.id) + '">🗑️</button>';
    out += '<div class="' + cls + '"><div class="inc-row-ic">' + (d.isLocked ? '🔒' : '⚙️') + '</div>' +
      '<div class="inc-row-info"><div class="inc-row-n">' + esc(d.name) + '</div>' +
      '<div class="inc-row-u">ظرفیت: ' + fa(d.capacity) + ' تخم</div></div>' +
      '<div class="inc-row-acts">' + acts + '</div></div>';
  }
  return out;
}
function openDeviceMgr(){
  var html = '<div class="inc-modal-hd"><div class="inc-modal-t">⚙️ دستگاه‌ها</div>' +
    '<button class="inc-modal-x" data-inc="close-modal" data-mid="device-mgr">✕</button></div>' +
    '<button class="inc-btn inc-btn-g" data-inc="open-add-device" style="margin-bottom:12px">➕ دستگاه جدید</button>' +
    '<div class="inc-list">' + renderDeviceListInner() + '</div>';
  var ex = _modals['device-mgr'];
  if(ex){ try{ ex.remove(); }catch(e){} delete _modals['device-mgr']; }
  openModal('device-mgr', html);
}
function refreshDeviceMgr(){
  var el = document.querySelector('[data-modal-id="device-mgr"] .inc-list');
  if(el) el.innerHTML = renderDeviceListInner();
}
function openDeviceEdit(id){
  editingIds.device = id ? sid(id) : null;
  var d = id ? Store.find('incDevices', id) : null;
  if(d && d.isLocked){ toast('🔒', 'error'); return; }
  var html = '<div class="inc-modal-hd"><div class="inc-modal-t">' + (id ? '✏️' : '⚙️ جدید') + '</div>' +
    '<button class="inc-modal-x" data-inc="close-modal" data-mid="device-edit">✕</button></div>' +
    '<div class="inc-fg"><label class="inc-fl">⚙️ نام</label><input class="inc-fi" id="edDeviceName" value="' + (d ? esc(d.name) : '') + '"></div>' +
    '<div class="inc-fr">' +
      '<div class="inc-fg"><label class="inc-fl">🔢 ظرفیت</label><input class="inc-fi" type="number" id="edDeviceCap" value="' + (d ? d.capacity : 0) + '"></div>' +
      '<div class="inc-fg"><label class="inc-fl">🏷️ نوع</label><input class="inc-fi" id="edDeviceType" value="' + (d ? esc(d.type || '') : '') + '"></div>' +
    '</div>' +
    '<div class="inc-fg"><label class="inc-check"><input type="checkbox" id="edDeviceLock" ' + (d && d.isLocked ? 'checked' : '') + '> <span>🔒 قفل</span></label></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">' +
      '<button class="inc-btn inc-btn-s" data-inc="close-modal" data-mid="device-edit">انصراف</button>' +
      '<button class="inc-btn inc-btn-p" data-inc="save-device">💾 ذخیره</button>' +
    '</div>';
  openModal('device-edit', html, { sheet: true });
}
function saveDeviceEdit(){
  var name = document.getElementById('edDeviceName').value.trim();
  if(!name){ toast('❌ نام', 'error'); return; }
  var devices = getDevices();
  for(var i = 0; i < devices.length; i++){
    if(devices[i].name === name && !sameId(devices[i].id, editingIds.device)){ toast('⚠️ تکراری', 'error'); return; }
  }
  var data = {
    name: name,
    capacity: parseNum(document.getElementById('edDeviceCap').value),
    type: document.getElementById('edDeviceType').value.trim(),
    isLocked: document.getElementById('edDeviceLock').checked
  };
  if(editingIds.device){
    var existing = Store.find('incDevices', editingIds.device);
    if(existing){
      var old = existing.name;
      if(old !== name){
        var incs = getIncs();
        for(var k = 0; k < incs.length; k++){
          if(incs[k].device === old) Store.update('incs', incs[k].id, { device: name });
        }
      }
      Store.update('incDevices', editingIds.device, data);
    }
    toast('✅', 'success');
  } else {
    Store.add('incDevices', data);
    toast('✅', 'success');
  }
  closeModal('device-edit');
  refreshDeviceMgr();
  editingIds.device = null;
}
function lockDevice(id){ var d = Store.find('incDevices', id); if(!d || d.isLocked) return; if(!confirm('قفل؟')) return; Store.update('incDevices', id, { isLocked: true }); toast('🔒'); refreshDeviceMgr(); }
function unlockDevice(id){ var d = Store.find('incDevices', id); if(!d || !d.isLocked) return; if(!confirm('باز؟')) return; Store.update('incDevices', id, { isLocked: false }); toast('🔓'); refreshDeviceMgr(); }
function delDevice(id){
  var d = Store.find('incDevices', id);
  if(!d || d.isLocked){ toast('🔒', 'error'); return; }
  if(!confirm('حذف؟')) return;
  Store.remove('incDevices', id); toast('🗑️'); refreshDeviceMgr();
}

/* ═══════ Bird Mgr ═══════ */
function renderBirdListInner(){
  var birds = getBirds();
  if(!birds.length) return '<div style="text-align:center;padding:20px;color:#64748b;font-size:12px">هیچ پرنده‌ای نیست</div>';
  var out = '';
  for(var i = 0; i < birds.length; i++){
    var b = birds[i];
    var cls = 'inc-row' + (b.isLocked ? ' locked' : '');
    var acts = b.isLocked
      ? '<button class="inc-row-btn unlock" data-inc="unlock-bird" data-id="' + sid(b.id) + '">🔓</button>'
      : '<button class="inc-row-btn edit" data-inc="edit-bird" data-id="' + sid(b.id) + '">✏️</button>' +
        '<button class="inc-row-btn lock" data-inc="lock-bird" data-id="' + sid(b.id) + '">🔒</button>' +
        '<button class="inc-row-btn delete" data-inc="del-bird" data-id="' + sid(b.id) + '">🗑️</button>';
    out += '<div class="' + cls + '" style="border-right-color:' + (b.color || '#10b981') + '">' +
      '<div class="inc-row-ic" style="background:' + (b.color || '#10b981') + ';color:#fff">' + (b.icon || '🐔') + '</div>' +
      '<div class="inc-row-info"><div class="inc-row-n">' + esc(b.name) + '</div>' +
      '<div class="inc-row-u">هچ: ' + fa(b.hatchDays) + ' روز | انتقال: ' + fa(b.transferDays) + '</div></div>' +
      '<div class="inc-row-acts">' + acts + '</div></div>';
  }
  return out;
}
function openBirdMgr(){
  var html = '<div class="inc-modal-hd"><div class="inc-modal-t">🐔 پرنده‌ها</div>' +
    '<button class="inc-modal-x" data-inc="close-modal" data-mid="bird-mgr">✕</button></div>' +
    '<button class="inc-btn inc-btn-g" data-inc="open-add-bird" style="margin-bottom:12px">➕ پرنده جدید</button>' +
    '<div class="inc-list">' + renderBirdListInner() + '</div>';
  var ex = _modals['bird-mgr'];
  if(ex){ try{ ex.remove(); }catch(e){} delete _modals['bird-mgr']; }
  openModal('bird-mgr', html);
}
function refreshBirdMgr(){
  var el = document.querySelector('[data-modal-id="bird-mgr"] .inc-list');
  if(el) el.innerHTML = renderBirdListInner();
}
function openBirdEdit(id){
  editingIds.bird = id ? sid(id) : null;
  var b = id ? Store.find('incBirds', id) : null;
  if(b && b.isLocked){ toast('🔒', 'error'); return; }
  selectedBirdColor = b ? b.color : '#3b82f6';
  var colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#06b6d4', '#0f766e'];
  var colorsHtml = '';
  for(var ci = 0; ci < colors.length; ci++){
    colorsHtml += '<div class="inc-color ' + (colors[ci] === selectedBirdColor ? 'on' : '') + '" data-color="' + colors[ci] + '" style="background:' + colors[ci] + '"></div>';
  }
  var html = '<div class="inc-modal-hd"><div class="inc-modal-t">' + (id ? '✏️' : '🐔 جدید') + '</div>' +
    '<button class="inc-modal-x" data-inc="close-modal" data-mid="bird-edit">✕</button></div>' +
    '<div class="inc-fg"><label class="inc-fl">🐔 نام</label><input class="inc-fi" id="edBirdName" value="' + (b ? esc(b.name) : '') + '"></div>' +
    '<div class="inc-fr">' +
      '<div class="inc-fg"><label class="inc-fl">⏰ روز هچ</label><input class="inc-fi" type="number" id="edBirdHatch" value="' + (b ? b.hatchDays : 21) + '"></div>' +
      '<div class="inc-fg"><label class="inc-fl">🥚 انتقال</label><input class="inc-fi" type="number" id="edBirdTransfer" value="' + (b ? b.transferDays : 18) + '"></div>' +
    '</div>' +
    '<div class="inc-fg"><label class="inc-fl">🎨 رنگ</label><div class="inc-colors" data-bird-colors>' + colorsHtml + '</div></div>' +
    '<div class="inc-fg"><label class="inc-check"><input type="checkbox" id="edBirdLock" ' + (b && b.isLocked ? 'checked' : '') + '> <span>🔒 قفل</span></label></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">' +
      '<button class="inc-btn inc-btn-s" data-inc="close-modal" data-mid="bird-edit">انصراف</button>' +
      '<button class="inc-btn inc-btn-p" data-inc="save-bird">💾 ذخیره</button>' +
    '</div>';
  openModal('bird-edit', html, { sheet: true });
}
function saveBirdEdit(){
  var name = document.getElementById('edBirdName').value.trim();
  if(!name){ toast('❌ نام', 'error'); return; }
  var hatch = parseNum(document.getElementById('edBirdHatch').value) || 21;
  var transfer = parseNum(document.getElementById('edBirdTransfer').value) || 18;
  if(transfer >= hatch){ toast('❌ انتقال < هچ', 'error'); return; }
  var birds = getBirds();
  for(var i = 0; i < birds.length; i++){
    if(birds[i].name === name && !sameId(birds[i].id, editingIds.bird)){ toast('⚠️ تکراری', 'error'); return; }
  }
  var data = {
    name: name, hatchDays: hatch, transferDays: transfer,
    color: selectedBirdColor,
    isLocked: document.getElementById('edBirdLock').checked,
    icon: '🐔'
  };
  if(editingIds.bird){
    var existing = Store.find('incBirds', editingIds.bird);
    if(existing){
      var old = existing.name;
      if(old !== name){
        var incs = getIncs();
        for(var k = 0; k < incs.length; k++){
          if(incs[k].bird === old) Store.update('incs', incs[k].id, { bird: name });
        }
      }
      Store.update('incBirds', editingIds.bird, data);
    }
    toast('✅', 'success');
  } else {
    Store.add('incBirds', data);
    toast('✅', 'success');
  }
  closeModal('bird-edit');
  refreshBirdMgr();
  editingIds.bird = null;
}
function lockBird(id){ var b = Store.find('incBirds', id); if(!b || b.isLocked) return; if(!confirm('قفل؟')) return; Store.update('incBirds', id, { isLocked: true }); toast('🔒'); refreshBirdMgr(); }
function unlockBird(id){ var b = Store.find('incBirds', id); if(!b || !b.isLocked) return; if(!confirm('باز؟')) return; Store.update('incBirds', id, { isLocked: false }); toast('🔓'); refreshBirdMgr(); }
function delBird(id){
  var b = Store.find('incBirds', id);
  if(!b || b.isLocked){ toast('🔒', 'error'); return; }
  if(!confirm('حذف؟')) return;
  Store.remove('incBirds', id); toast('🗑️'); refreshBirdMgr();
}

/* ═══════ Cause Mgr ═══════ */
function renderCauseListInner(){
  var causes = Store.all('incCauses');
  if(!causes.length) return '<div style="text-align:center;padding:20px;color:#64748b;font-size:12px">هیچ علتی نیست</div>';
  var out = '';
  for(var i = 0; i < causes.length; i++){
    var c = causes[i];
    var cls = 'inc-row' + (c.isLocked ? ' locked' : '');
    var acts = c.isLocked
      ? '<button class="inc-row-btn unlock" data-inc="unlock-cause" data-id="' + sid(c.id) + '">🔓</button>'
      : '<button class="inc-row-btn edit" data-inc="edit-cause" data-id="' + sid(c.id) + '">✏️</button>' +
        '<button class="inc-row-btn lock" data-inc="lock-cause" data-id="' + sid(c.id) + '">🔒</button>' +
        '<button class="inc-row-btn delete" data-inc="del-cause" data-id="' + sid(c.id) + '">🗑️</button>';
    out += '<div class="' + cls + '"><div class="inc-row-ic">' + (c.isLocked ? '🔒' : '🔍') + '</div>' +
      '<div class="inc-row-info"><div class="inc-row-n">' + esc(c.name) + '</div></div>' +
      '<div class="inc-row-acts">' + acts + '</div></div>';
  }
  return out;
}
function openCauseMgr(){
  var html = '<div class="inc-modal-hd"><div class="inc-modal-t">🔍 علل عدم هچ</div>' +
    '<button class="inc-modal-x" data-inc="close-modal" data-mid="cause-mgr">✕</button></div>' +
    '<button class="inc-btn inc-btn-g" data-inc="open-add-cause" style="margin-bottom:12px">➕ علت جدید</button>' +
    '<div class="inc-list">' + renderCauseListInner() + '</div>';
  var ex = _modals['cause-mgr'];
  if(ex){ try{ ex.remove(); }catch(e){} delete _modals['cause-mgr']; }
  openModal('cause-mgr', html);
}
function refreshCauseMgr(){
  var el = document.querySelector('[data-modal-id="cause-mgr"] .inc-list');
  if(el) el.innerHTML = renderCauseListInner();
}
function openCauseEdit(id){
  editingIds.cause = id ? sid(id) : null;
  var c = id ? Store.find('incCauses', id) : null;
  if(c && c.isLocked){ toast('🔒', 'error'); return; }
  var html = '<div class="inc-modal-hd"><div class="inc-modal-t">' + (id ? '✏️' : '➕ علت') + '</div>' +
    '<button class="inc-modal-x" data-inc="close-modal" data-mid="cause-edit">✕</button></div>' +
    '<div class="inc-fg"><label class="inc-fl">نام</label><input class="inc-fi" id="edCauseName" value="' + (c ? esc(c.name) : '') + '"></div>' +
    '<div class="inc-fg"><label class="inc-check"><input type="checkbox" id="edCauseLock" ' + (c && c.isLocked ? 'checked' : '') + '> <span>🔒 قفل</span></label></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">' +
      '<button class="inc-btn inc-btn-s" data-inc="close-modal" data-mid="cause-edit">انصراف</button>' +
      '<button class="inc-btn inc-btn-p" data-inc="save-cause">💾 ذخیره</button>' +
    '</div>';
  openModal('cause-edit', html, { sheet: true });
}
function saveCauseEdit(){
  var name = document.getElementById('edCauseName').value.trim();
  if(!name){ toast('❌ نام', 'error'); return; }
  var causes = Store.all('incCauses');
  for(var i = 0; i < causes.length; i++){
    if(causes[i].name === name && !sameId(causes[i].id, editingIds.cause)){ toast('⚠️ تکراری', 'error'); return; }
  }
  var isLocked = document.getElementById('edCauseLock').checked;
  if(editingIds.cause){
    var existing = Store.find('incCauses', editingIds.cause);
    if(existing){
      var old = existing.name;
      if(old !== name){
        var incs = getIncs();
        for(var k = 0; k < incs.length; k++){
          var losses = incs[k].losses || [];
          for(var m = 0; m < losses.length; m++) if(losses[m].cause === old) losses[m].cause = name;
        }
      }
      Store.update('incCauses', editingIds.cause, { name: name, isLocked: isLocked });
    }
    toast('✅', 'success');
  } else {
    Store.add('incCauses', { name: name, isLocked: isLocked, usage: 0, scope: 'hatch_failure' });
    toast('✅', 'success');
  }
  closeModal('cause-edit');
  refreshCauseMgr();
  refreshLosses();
  editingIds.cause = null;
}
function lockCause(id){ var c = Store.find('incCauses', id); if(!c || c.isLocked) return; if(!confirm('قفل؟')) return; Store.update('incCauses', id, { isLocked: true }); toast('🔒'); refreshCauseMgr(); }
function unlockCause(id){ var c = Store.find('incCauses', id); if(!c || !c.isLocked) return; if(!confirm('باز؟')) return; Store.update('incCauses', id, { isLocked: false }); toast('🔓'); refreshCauseMgr(); }
function delCause(id){
  var c = Store.find('incCauses', id);
  if(!c || c.isLocked){ toast('🔒', 'error'); return; }
  if(!confirm('حذف؟')) return;
  Store.remove('incCauses', id); toast('🗑️'); refreshCauseMgr(); refreshLosses();
}

/* ═══════ Result Mgr ═══════ */
function renderResultListInner(){
  var results = Store.all('incResults');
  if(!results.length) return '<div style="text-align:center;padding:20px;color:#64748b;font-size:12px">هیچ نتیجه‌ای نیست</div>';
  var out = '';
  for(var i = 0; i < results.length; i++){
    var r = results[i];
    var cls = 'inc-row' + (r.isLocked ? ' locked' : '');
    var acts = r.isLocked
      ? '<button class="inc-row-btn unlock" data-inc="unlock-result" data-id="' + sid(r.id) + '">🔓</button>'
      : '<button class="inc-row-btn edit" data-inc="edit-result" data-id="' + sid(r.id) + '">✏️</button>' +
        '<button class="inc-row-btn lock" data-inc="lock-result" data-id="' + sid(r.id) + '">🔒</button>' +
        '<button class="inc-row-btn delete" data-inc="del-result" data-id="' + sid(r.id) + '">🗑️</button>';
    out += '<div class="' + cls + '"><div class="inc-row-ic">' + (r.isLocked ? '🔒' : '🏷️') + '</div>' +
      '<div class="inc-row-info"><div class="inc-row-n">' + esc(r.name) + '</div></div>' +
      '<div class="inc-row-acts">' + acts + '</div></div>';
  }
  return out;
}
function openResultMgr(){
  var html = '<div class="inc-modal-hd"><div class="inc-modal-t">🏷️ نتایج هچ</div>' +
    '<button class="inc-modal-x" data-inc="close-modal" data-mid="result-mgr">✕</button></div>' +
    '<button class="inc-btn inc-btn-g" data-inc="open-add-result" style="margin-bottom:12px">➕ نتیجه جدید</button>' +
    '<div class="inc-list">' + renderResultListInner() + '</div>';
  var ex = _modals['result-mgr'];
  if(ex){ try{ ex.remove(); }catch(e){} delete _modals['result-mgr']; }
  openModal('result-mgr', html);
}
function refreshResultMgr(){
  var el = document.querySelector('[data-modal-id="result-mgr"] .inc-list');
  if(el) el.innerHTML = renderResultListInner();
}
function openResultEdit(id){
  editingIds.result = id ? sid(id) : null;
  var r = id ? Store.find('incResults', id) : null;
  if(r && r.isLocked){ toast('🔒', 'error'); return; }
  var html = '<div class="inc-modal-hd"><div class="inc-modal-t">' + (id ? '✏️' : '➕ نتیجه') + '</div>' +
    '<button class="inc-modal-x" data-inc="close-modal" data-mid="result-edit">✕</button></div>' +
    '<div class="inc-fg"><label class="inc-fl">نام</label><input class="inc-fi" id="edResultName" value="' + (r ? esc(r.name) : '') + '"></div>' +
    '<div class="inc-fg"><label class="inc-check"><input type="checkbox" id="edResultLock" ' + (r && r.isLocked ? 'checked' : '') + '> <span>🔒 قفل</span></label></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">' +
      '<button class="inc-btn inc-btn-s" data-inc="close-modal" data-mid="result-edit">انصراف</button>' +
      '<button class="inc-btn inc-btn-p" data-inc="save-result">💾 ذخیره</button>' +
    '</div>';
  openModal('result-edit', html, { sheet: true });
}
function saveResultEdit(){
  var name = document.getElementById('edResultName').value.trim();
  if(!name){ toast('❌ نام', 'error'); return; }
  var results = Store.all('incResults');
  for(var i = 0; i < results.length; i++){
    if(results[i].name === name && !sameId(results[i].id, editingIds.result)){ toast('⚠️ تکراری', 'error'); return; }
  }
  var isLocked = document.getElementById('edResultLock').checked;
  if(editingIds.result){
    var existing = Store.find('incResults', editingIds.result);
    if(existing){
      var old = existing.name;
      if(old !== name){
        var incs = getIncs();
        for(var k = 0; k < incs.length; k++){
          if(incs[k].result === old) Store.update('incs', incs[k].id, { result: name });
        }
      }
      Store.update('incResults', editingIds.result, { name: name, isLocked: isLocked });
    }
    toast('✅', 'success');
  } else {
    Store.add('incResults', { name: name, isLocked: isLocked, usage: 0 });
    toast('✅', 'success');
  }
  closeModal('result-edit');
  refreshResultMgr();
  editingIds.result = null;
}
function lockResult(id){ var r = Store.find('incResults', id); if(!r || r.isLocked) return; if(!confirm('قفل؟')) return; Store.update('incResults', id, { isLocked: true }); toast('🔒'); refreshResultMgr(); }
function unlockResult(id){ var r = Store.find('incResults', id); if(!r || !r.isLocked) return; if(!confirm('باز؟')) return; Store.update('incResults', id, { isLocked: false }); toast('🔓'); refreshResultMgr(); }
function delResult(id){
  var r = Store.find('incResults', id);
  if(!r || r.isLocked){ toast('🔒', 'error'); return; }
  if(!confirm('حذف؟')) return;
  Store.remove('incResults', id); toast('🗑️'); refreshResultMgr();
}

/* ═══════ Events ═══════ */
document.addEventListener('click', function(e){
  var colorOpt = e.target.closest ? e.target.closest('[data-bird-colors] .inc-color') : null;
  if(colorOpt){
    selectedBirdColor = colorOpt.dataset.color;
    var sib = colorOpt.parentElement.querySelectorAll('.inc-color');
    for(var si = 0; si < sib.length; si++) sib[si].classList.toggle('on', sib[si] === colorOpt);
    return;
  }

  var btn = e.target.closest ? e.target.closest('[data-inc]') : null;
  if(!btn) return;
  var act = btn.dataset.inc;
  var id = sid(btn.dataset.id);
  var mid = btn.dataset.mid;
  var i = +btn.dataset.i;

  switch(act){
    case 'open-form': openIncForm(); break;
    case 'edit-inc': e.stopPropagation(); openIncForm(id); break;
    case 'del-inc': e.stopPropagation(); deleteInc(id); break;
    case 'sell-inc': e.stopPropagation(); sellInc(id); break;
    case 'toggle-card': {
      e.stopPropagation();
      uiState.expanded[id] = !uiState.expanded[id];
      var card = document.querySelector('.inc-card[data-inc-id="' + id + '"]');
      if(card) card.classList.toggle('expanded', !!uiState.expanded[id]);
      break;
    }
    case 'filter': {
      uiState.filter = btn.dataset.f;
      var tabs = document.querySelectorAll('.inc-tab');
      for(var ti = 0; ti < tabs.length; ti++) tabs[ti].classList.toggle('on', tabs[ti] === btn);
      refreshList();
      break;
    }
    case 'close-modal': closeModal(mid); break;
    case 'open-seller-mgr': openSellerMgr(); break;
    case 'open-add-seller': openSellerEdit(); break;
    case 'edit-seller': openSellerEdit(id); break;
    case 'save-seller': saveSellerEdit(); break;
    case 'lock-seller': lockSeller(id); break;
    case 'unlock-seller': unlockSeller(id); break;
    case 'del-seller': delSeller(id); break;
    case 'open-device-mgr': openDeviceMgr(); break;
    case 'open-add-device': openDeviceEdit(); break;
    case 'edit-device': openDeviceEdit(id); break;
    case 'save-device': saveDeviceEdit(); break;
    case 'lock-device': lockDevice(id); break;
    case 'unlock-device': unlockDevice(id); break;
    case 'del-device': delDevice(id); break;
    case 'open-bird-mgr': openBirdMgr(); break;
    case 'open-add-bird': openBirdEdit(); break;
    case 'edit-bird': openBirdEdit(id); break;
    case 'save-bird': saveBirdEdit(); break;
    case 'lock-bird': lockBird(id); break;
    case 'unlock-bird': unlockBird(id); break;
    case 'del-bird': delBird(id); break;
    case 'open-cause-mgr': openCauseMgr(); break;
    case 'open-add-cause': openCauseEdit(); break;
    case 'edit-cause': openCauseEdit(id); break;
    case 'save-cause': saveCauseEdit(); break;
    case 'lock-cause': lockCause(id); break;
    case 'unlock-cause': unlockCause(id); break;
    case 'del-cause': delCause(id); break;
    case 'add-loss': {
      var causes = getCauses();
      if(!causes.length){ toast('❌ اول علت بسازید', 'error'); openCauseEdit(); break; }
      var used = formLosses.map(function(l){ return l.cause; });
      var avail = null;
      for(var ci = 0; ci < causes.length; ci++){
        if(used.indexOf(causes[ci].name) < 0){ avail = causes[ci]; break; }
      }
      formLosses.push({ cause: avail ? avail.name : causes[0].name, count: 0 });
      refreshLosses();
      break;
    }
    case 'del-loss': formLosses.splice(i, 1); refreshLosses(); break;
    case 'open-result-mgr': openResultMgr(); break;
    case 'open-add-result': openResultEdit(); break;
    case 'edit-result': openResultEdit(id); break;
    case 'save-result': saveResultEdit(); break;
    case 'lock-result': lockResult(id); break;
    case 'unlock-result': unlockResult(id); break;
    case 'del-result': delResult(id); break;
    case 'open-cal':
      if(UI.openCalendar) UI.openCalendar(btn.dataset.target);
      break;
    case 'save-inc': saveInc(); break;
  }
});

document.addEventListener('change', function(e){
  var t = e.target;
  if(t.id === 'incBird') updateBirdInfo(t.value);
  if(t.dataset && t.dataset.lossCause !== undefined){
    var idx = +t.dataset.lossCause;
    if(formLosses[idx]) formLosses[idx].cause = t.value;
    setTimeout(function(){
      var el = document.getElementById('incLossesList');
      if(el) el.innerHTML = renderLossesInner();
    }, 50);
  }
});

document.addEventListener('input', function(e){
  var t = e.target;
  if(t.id === 'incEggCost' || t.id === 'incTransport'){
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
  if(t.dataset && t.dataset.lossCount !== undefined){
    var idx = +t.dataset.lossCount;
    if(formLosses[idx]) formLosses[idx].count = parseNum(t.value);
  }
});

/* ═══════ Init ═══════ */
injectStyles();

Router.register('incubation', {
  title: 'جوجه‌کشی',
  navPage: 'more',
  topLevel: true,
  render: function(){ return renderPage(); }
});

window.IncubationModule = {
  key: 'incs',
  get: function(){ return getIncs().slice(); },
  save: function(){ Store.save(); },
  load: function(){ refreshList(); }
};

console.log('✅ incubation route registered (v3.0 - Store v4)');

})();