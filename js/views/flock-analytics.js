/* ═══════════════════════════════════════════════
   FLOCK ANALYTICS — تحلیل و نمودار گله (v1.1 - formatShort)
   ساخته شده توسط رضا آدینه
   ═══════════════════════════════════════════════ */
(function(){
'use strict';

console.log('🚀 flock-analytics.js start');

if (typeof Router === 'undefined' || typeof Router.register !== 'function') {
  console.error('❌ Router not available');
  return;
}
if(!window.Charts){
  console.error('❌ Charts library not loaded');
  return;
}

function sid(v){ return String(v == null ? '' : v); }
function sameId(a, b){ return sid(a) === sid(b); }
function findBy(arr, id){
  if(!Array.isArray(arr)) return null;
  for(var i=0;i<arr.length;i++){ if(sameId(arr[i].id, id)) return arr[i]; }
  return null;
}

/* ✅ formatShort — با fallback */
function fmtShort(n){
  if(typeof UI !== 'undefined' && UI.formatShort) return UI.formatShort(n);
  var v = Math.round(Number(n||0));
  var abs = Math.abs(v);
  var sign = v < 0 ? '−' : '';
  if(abs >= 1000000000) return sign + (abs/1000000000).toFixed(1).replace(/\.0$/,'') + ' میلیارد';
  if(abs >= 1000000) return sign + (abs/1000000).toFixed(1).replace(/\.0$/,'') + ' میلیون';
  if(abs >= 1000) return sign + Math.round(abs/1000) + ' هزار';
  return sign + Number(abs).toLocaleString('fa-IR');
}

function fa(n){ return Number(n||0).toLocaleString('fa-IR'); }
function toFa(n){ return String(n).replace(/\d/g, function(d){ return '۰۱۲۳۴۵۶۷۸۹'[d]; }); }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }

function jToC(j){
  if(!j)return 0;
  var p=String(j).replace(/-/g,'/').split('/');
  if(p.length!==3)return 0;
  var y=+p[0],m=+p[1],d=+p[2];
  if(isNaN(y)||isNaN(m)||isNaN(d))return 0;
  var db_=m<=6?(m-1)*31:186+(m-7)*30;
  return y*365+Math.floor(y/4)+db_+d;
}

var _state = { flockId: null };

/* ═══════ Styles ═══════ */
function injectStyles(){
  if(document.getElementById('fa-styles')) return;
  var css =
  '.fa-page{padding:10px;max-width:760px;margin:0 auto}' +
  '.fa-header{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:12px;flex-wrap:wrap}' +
  '.fa-title{font-size:14px;font-weight:900}' +
  '.fa-sub{font-size:10.5px;color:#64748b;font-weight:700;margin-top:1px}' +
  '.fa-flock-picker{background:#fff;border-radius:12px;padding:10px 12px;border:1px solid #e2e8f0;display:flex;align-items:center;gap:10px;margin-bottom:12px}' +
  '.fa-flock-picker label{font-size:11.5px;font-weight:800;color:#0f172a;flex-shrink:0}' +
  '.fa-flock-picker select{flex:1;height:40px;border:1.5px solid #e2e8f0;border-radius:10px;font-family:inherit;font-size:12.5px;background:#f1f5f9;color:#0f172a;padding:0 30px 0 12px;appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml;charset=utf8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2364748b\' stroke-width=\'2\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:left 10px center;background-size:14px}' +
  '.fa-kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px}' +
  '.kpi-card{background:#f0fdfa;border-radius:12px;padding:10px 6px;text-align:center;border-bottom:3px solid #0f766e}' +
  '@media (max-width:420px){.fa-kpi-grid{grid-template-columns:1fr 1fr}}' +
  '.fa-card{background:#fff;border-radius:12px;padding:12px;border:1px solid #e2e8f0;margin-bottom:10px}' +
  '.fa-card-title{font-size:12.5px;font-weight:900;color:#0f172a;margin-bottom:10px;display:flex;align-items:center;gap:6px;padding-bottom:8px;border-bottom:1px solid #f1f5f9}' +
  '.fa-empty{text-align:center;padding:60px 24px;background:#fff;border-radius:12px;border:1px dashed #cbd5e1}' +
  '.fa-empty-ic{font-size:56px;line-height:1;display:block;margin-bottom:12px;opacity:.6}' +
  '.fa-empty-t{font-size:14px;font-weight:900;margin-bottom:6px}' +
  '.fa-empty-x{font-size:12px;color:#64748b;font-weight:600;margin:0 auto 16px;max-width:300px}' +
  '.fa-btn{background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;border:none;padding:9px 18px;border-radius:9999px;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer;box-shadow:0 3px 10px rgba(15,118,110,.3)}' +
  '.chart-wrap{width:100%;padding:4px 0}' +
  '.chart-wrap svg text{font-family:Vazirmatn,sans-serif}' +
  '.fa-alert{padding:10px 12px;border-radius:10px;font-size:11.5px;font-weight:700;line-height:1.7;border-right:3px solid;margin-bottom:8px}' +
  '.fa-alert.ok{background:#ecfdf5;border-color:#10b981;color:#065f46}' +
  '.fa-alert.warn{background:#fffbeb;border-color:#f59e0b;color:#92400e}' +
  '.fa-alert.err{background:#fef2f2;border-color:#ef4444;color:#991b1b}' +
  '.fa-alert.info{background:#eff6ff;border-color:#3b82f6;color:#1e40af}' +
  '.fa-table{width:100%;border-collapse:collapse;font-size:11px}' +
  '.fa-table th{background:#f1f5f9;color:#0f172a;padding:7px 6px;font-size:10px;font-weight:800;text-align:right;border-bottom:1px solid #e2e8f0}' +
  '.fa-table td{padding:6px;border-bottom:1px solid #f1f5f9;color:#334155;font-weight:600;text-align:right}' +
  '.fa-table td.num{text-align:left;direction:ltr;font-variant-numeric:tabular-nums}' +
  '.fa-table tr:last-child td{border-bottom:none}';

  var s = document.createElement('style');
  s.id = 'fa-styles';
  s.textContent = css;
  document.head.appendChild(s);
}

/* ═══════ Data Access ═══════ */
function getFlocks(){
  try{
    if(typeof Store !== 'undefined' && Store.all){
      var flocks = Store.all('flocks') || [];
      return flocks.filter(function(f){ return !f.isDeleted; });
    }
  }catch(e){}
  return [];
}
function getDailyRecords(flockName){
  try{
    if(typeof Store !== 'undefined' && Store.all){
      var daily = Store.all('dailyRecords') || [];
      return daily.filter(function(r){ return !flockName || r.flock === flockName; })
        .slice()
        .sort(function(a,b){ return jToC(a.date) - jToC(b.date); });
    }
  }catch(e){}
  return [];
}

/* ═══════ محاسبات ═══════ */
function calcMetrics(flock, records){
  var count = flock.count || flock.initialCount || 0;
  var deaths = flock.deaths || 0;
  var alive = flock.alive || flock.aliveCount || (count - deaths);
  var mortalityPct = count > 0 ? (deaths / count * 100) : 0;
  var survivalPct = count > 0 ? (alive / count * 100) : 0;
  var todayStr = (typeof UI !== 'undefined' && UI.todayStr) || '';
  var age = jToC(todayStr) - jToC(flock.hatch || flock.hatchDate || todayStr);
  if(age < 0) age = 0;

  var totalFeedKg = 0, totalWaterL = 0, totalEggs = 0, totalBroken = 0;
  var totalWeightG = 0, weightSamples = 0;

  for(var i=0;i<records.length;i++){
    var r = records[i];
    totalFeedKg += r.feed || 0;
    totalWaterL += r.water || 0;
    totalEggs += r.eggs || 0;
    totalBroken += r.broken || 0;
    if(r.weight > 0){
      totalWeightG += r.weight;
      weightSamples++;
    }
  }
  var avgWeightG = weightSamples > 0 ? (totalWeightG / weightSamples) : 0;
  var avgWeightKg = avgWeightG / 1000;

  var fcr = null;
  if(totalFeedKg > 0 && avgWeightKg > 0 && alive > 0){
    var totalLiveWeightKg = alive * avgWeightKg;
    if(totalLiveWeightKg > 0) fcr = totalFeedKg / totalLiveWeightKg;
  }

  var epef = null;
  if(age > 0 && avgWeightKg > 0 && fcr && fcr > 0){
    epef = (survivalPct * avgWeightKg) / (age * fcr) * 10000;
  }

  return {
    count: count, deaths: deaths, alive: alive,
    mortalityPct: mortalityPct, survivalPct: survivalPct, age: age,
    totalFeedKg: totalFeedKg, totalWaterL: totalWaterL,
    totalEggs: totalEggs, totalBroken: totalBroken,
    avgWeightG: avgWeightG, avgWeightKg: avgWeightKg,
    fcr: fcr, epef: epef, daysRecorded: records.length
  };
}

/* ═══════ استاندارد رشد (Ross 308) ═══════ */
var STANDARD_WEIGHTS = {
  0:42,1:60,2:80,3:105,4:135,5:170,6:210,7:250,
  8:300,9:350,10:410,11:475,12:545,13:620,14:700,
  15:790,16:880,17:980,18:1090,19:1200,20:1320,
  21:1450,22:1580,23:1720,24:1870,25:2020,26:2175,
  27:2335,28:2500,29:2665,30:2830,31:2995,32:3160,
  33:3325,34:3485,35:3645,36:3800,37:3955,38:4105,
  39:4250,40:4390,41:4525,42:4655
};

/* ═══════ نمودارها ═══════ */
function renderMortalityChart(records){
  if(!records.length){
    return '<div style="text-align:center;padding:40px;color:#94a3b8;font-size:12px">رکورد روزانه ثبت نشده</div>';
  }
  var points = [];
  var cumDeaths = 0;
  var xLabels = [];
  for(var i=0;i<records.length;i++){
    var r = records[i];
    cumDeaths += r.deaths || 0;
    var xc = jToC(r.date);
    points.push({ x: xc, y: cumDeaths });
    xLabels.push(xc);
  }
  if(!points.length){
    return '<div style="text-align:center;padding:40px;color:#94a3b8;font-size:12px">تلفاتی ثبت نشده 🎉</div>';
  }
  return Charts.line({
    title: '📉 روند تلفات تجمعی',
    height: 230,
    yUnit: 'تعداد',
    series: [{ label: 'تلفات تجمعی', color: '#ef4444', points: points }],
    xLabels: xLabels,
    formatX: function(){ return ''; },
    formatY: function(y){ return Math.round(y); }
  });
}

function renderDailyMortalityChart(records){
  if(!records.length) return '';
  var items = [];
  var start = Math.max(0, records.length - 20);
  for(var i=start;i<records.length;i++){
    var r = records[i];
    if(!r) continue;
    var parts = (r.date||'').split('/');
    var lbl = parts.length === 3 ? toFa(parts[2]) : '—';
    items.push({
      label: lbl,
      value: r.deaths || 0,
      color: (r.deaths||0) >= 5 ? '#ef4444' : (r.deaths||0) > 0 ? '#f59e0b' : '#10b981'
    });
  }
  return Charts.bar({
    title: '📊 تلفات روزانه (آخرین ۲۰ روز)',
    height: 180,
    items: items,
    yUnit: 'تعداد',
    formatY: function(y){ return Math.round(y); }
  });
}

function renderGrowthChart(records){
  var weightPoints = [];
  var standardPoints = [];
  var startAge = null;
  for(var i=0;i<records.length;i++){
    var r = records[i];
    if(r.weight > 0){
      var age = jToC(r.date) - jToC(records[0].date);
      if(startAge === null) startAge = age;
      weightPoints.push({ x: age, y: r.weight });
    }
  }
  if(weightPoints.length < 2){
    return '<div style="text-align:center;padding:40px;color:#94a3b8;font-size:12px">' +
      'برای نمایش نمودار رشد، حداقل ۲ نمونه وزن ثبت کن<br>' +
      '<span style="font-size:11px">در فرم «ثبت روزانه» فیلد «وزن نمونه» رو پر کن</span>' +
    '</div>';
  }
  var minAge = weightPoints[0].x;
  var maxAge = weightPoints[weightPoints.length - 1].x;
  for(var a = minAge; a <= maxAge; a++){
    var std = STANDARD_WEIGHTS[a] || STANDARD_WEIGHTS[Math.min(42, Math.max(0, a))];
    if(std) standardPoints.push({ x: a, y: std });
  }
  return Charts.line({
    title: '⚖️ منحنی رشد — مقایسه با استاندارد',
    height: 240,
    yUnit: 'گرم',
    series: [
      { label: 'وزن واقعی', color: '#0f766e', points: weightPoints },
      { label: 'استاندارد (Ross 308)', color: '#94a3b8', points: standardPoints, dash: [5, 4] }
    ],
    xLabels: weightPoints.map(function(p){ return p.x; }),
    formatX: function(x){ return toFa(x); },
    formatY: function(y){ return Math.round(y); },
    showLegend: true
  });
}

function renderWeightTrendChart(records){
  var points = [];
  for(var i=0;i<records.length;i++){
    var r = records[i];
    if(r.weight > 0) points.push({ x: i+1, y: r.weight });
  }
  if(points.length < 2) return '';
  return Charts.line({
    title: '📈 روند وزن نمونه',
    height: 180,
    yUnit: 'گرم',
    series: [{ label: 'وزن (g)', color: '#3b82f6', points: points }],
    xLabels: points.map(function(p){ return p.x; }),
    formatX: function(x){ return toFa(x); }
  });
}

function renderFcrCard(metrics){
  var fcr = metrics.fcr;
  var epef = metrics.epef;
  var html = '';

  var fcrStatus = 'info';
  var fcrMsg = 'داده کافی برای محاسبه FCR وجود ندارد — وزن نمونه و خوراک روزانه ثبت کن';
  if(fcr){
    if(fcr < 1.6){ fcrStatus = 'ok'; fcrMsg = '✅ FCR عالی — بازدهی خوب'; }
    else if(fcr < 2.0){ fcrStatus = 'warn'; fcrMsg = '⚠️ FCR متوسط — قابل بهبود'; }
    else { fcrStatus = 'err'; fcrMsg = '❌ FCR بالا — نیاز به بازنگری'; }
  }
  html += '<div class="fa-alert '+fcrStatus+'">' +
    '<b>FCR (ضریب تبدیل غذایی):</b> ' + (fcr ? fcr.toFixed(2) : '—') + '<br>' +
    '<span style="font-size:10.5px">' + fcrMsg + '</span>' +
  '</div>';

  var epefStatus = 'info';
  var epefMsg = 'داده کافی برای محاسبه EPEF وجود ندارد';
  if(epef){
    if(epef > 350){ epefStatus = 'ok'; epefMsg = '✅ EPEF عالی'; }
    else if(epef > 250){ epefStatus = 'warn'; epefMsg = '⚠️ EPEF متوسط'; }
    else { epefStatus = 'err'; epefMsg = '❌ EPEF پایین'; }
  }
  html += '<div class="fa-alert '+epefStatus+'">' +
    '<b>EPEF (شاخص کارایی اروپایی):</b> ' + (epef ? Math.round(epef) : '—') + '<br>' +
    '<span style="font-size:10.5px">' + epefMsg + '</span>' +
  '</div>';

  return html;
}

function renderDailyTable(records){
  if(!records.length) return '';
  var last = records.slice(-15).reverse();
  var rows = '';
  for(var i=0;i<last.length;i++){
    var r = last[i];
    rows += '<tr>' +
      '<td class="num">'+esc(r.date)+'</td>' +
      '<td class="num">'+fa(r.deaths||0)+'</td>' +
      '<td class="num">'+fa(r.alive||0)+'</td>' +
      '<td class="num">'+(r.feed?fa(r.feed):'—')+'</td>' +
      '<td class="num">'+(r.weight?fa(r.weight):'—')+'</td>' +
      '<td class="num">'+(r.temp?fa(r.temp)+'°':'—')+'</td>' +
    '</tr>';
  }
  return '<table class="fa-table"><thead><tr>' +
    '<th>تاریخ</th><th>تلفات</th><th>مانده</th><th>خوراک (kg)</th><th>وزن (g)</th><th>دما</th>' +
  '</tr></thead><tbody>'+rows+'</tbody></table>';
}

/* ═══════ رندر اصلی ═══════ */
function renderPage(){
  var flocks = getFlocks();

  if(!flocks.length){
    return '<div class="page fa-page" data-fa-root>' +
      '<div class="fa-header">' +
        '<div><div class="fa-title">📊 تحلیل گله</div>' +
        '<div class="fa-sub">نمودار رشد، تلفات و شاخص‌ها</div></div>' +
      '</div>' +
      '<div class="fa-empty">' +
        '<div class="fa-empty-ic">🐔</div>' +
        '<div class="fa-empty-t">هنوز گله‌ای ثبت نشده</div>' +
        '<div class="fa-empty-x">اول یک گله بساز تا بتونیم نمودار تحلیلش رو نشون بدیم</div>' +
        '<button class="fa-btn" data-fa="go-flocks">🐔 رفتن به گله‌ها</button>' +
      '</div>' +
    '</div>';
  }

  if(!_state.flockId) _state.flockId = sid(flocks[0].id);
  var flock = findBy(flocks, _state.flockId) || flocks[0];
  if(flock) _state.flockId = sid(flock.id);

  var records = getDailyRecords(flock.name);
  var metrics = calcMetrics(flock, records);

  var kpiHtml = '<div class="fa-kpi-grid">' +
    Charts.kpi({ icon:'🐔', value: fa(metrics.alive), label: 'زنده', sub: 'از ' + fa(metrics.count), color:'#10b981', bg:'#ecfdf5' }) +
    Charts.kpi({ icon:'💀', value: fa(metrics.deaths), label: 'تلفات', sub: metrics.mortalityPct.toFixed(1) + '٪', color:'#ef4444', bg:'#fef2f2' }) +
    Charts.kpi({ icon:'📅', value: fa(metrics.age), label: 'روز', sub: 'سن گله', color:'#3b82f6', bg:'#eff6ff' }) +
    Charts.kpi({ icon:'🌾', value: fa(metrics.totalFeedKg), label: 'خوراک (kg)', sub: 'تجمعی', color:'#f59e0b', bg:'#fffbeb' }) +
  '</div>';

  var flockOptions = '';
  for(var i=0;i<flocks.length;i++){
    var f = flocks[i];
    flockOptions += '<option value="'+sid(f.id)+'" '+(sameId(f.id, _state.flockId)?'selected':'')+'>🐔 '+esc(f.name)+'</option>';
  }

  return '<div class="page fa-page" data-fa-root>' +
    '<div class="fa-header">' +
      '<div><div class="fa-title">📊 تحلیل گله</div>' +
      '<div class="fa-sub">نمودار رشد، تلفات و شاخص‌ها</div></div>' +
    '</div>' +

    '<div class="fa-flock-picker">' +
      '<label>🐔 گله:</label>' +
      '<select data-fa="pick-flock" id="faFlockPicker">'+flockOptions+'</select>' +
    '</div>' +

    kpiHtml +

    '<div class="fa-card">' +
      '<div class="fa-card-title">📈 نمودار تلفات تجمعی</div>' +
      renderMortalityChart(records) +
    '</div>' +

    '<div class="fa-card">' +
      '<div class="fa-card-title">📊 تلفات روزانه</div>' +
      renderDailyMortalityChart(records) +
    '</div>' +

    '<div class="fa-card">' +
      '<div class="fa-card-title">⚖️ منحنی رشد</div>' +
      renderGrowthChart(records) +
    '</div>' +

    (renderWeightTrendChart(records) ?
      '<div class="fa-card">' +
        '<div class="fa-card-title">📉 روند وزن نمونه</div>' +
        renderWeightTrendChart(records) +
      '</div>' : '') +

    '<div class="fa-card">' +
      '<div class="fa-card-title">🧮 شاخص‌های کارایی</div>' +
      renderFcrCard(metrics) +
    '</div>' +

    (records.length ?
      '<div class="fa-card">' +
        '<div class="fa-card-title">📋 آخرین ۱۵ رکورد روزانه</div>' +
        renderDailyTable(records) +
      '</div>' : '') +
  '</div>';
}

function renderRoot(){
  var root = document.querySelector('[data-fa-root]');
  if(!root) return;
  var fresh = document.createElement('div');
  fresh.innerHTML = renderPage();
  root.parentNode.replaceChild(fresh.firstElementChild, root);
}

/* ═══════ Events ═══════ */
document.addEventListener('change', function(e){
  var t = e.target;
  if(t.id === 'faFlockPicker'){
    _state.flockId = sid(t.value);
    renderRoot();
  }
});

document.addEventListener('click', function(e){
  var btn = e.target.closest ? e.target.closest('[data-fa]') : null;
  if(!btn) return;
  var act = btn.dataset.fa;
  if(act === 'go-flocks'){
    if(typeof Router !== 'undefined' && Router.go) Router.go('flocks');
  }
});

/* ═══════ Init ═══════ */
injectStyles();

Router.register('flock-analytics', {
  title: 'تحلیل گله',
  navPage: 'more',
  topLevel: true,
  render: function(){
    return renderPage();
  }
});

window.FlockAnalytics = {
  render: renderPage,
  setFlock: function(id){ _state.flockId = sid(id); renderRoot(); }
};

console.log('✅ flock-analytics route registered (v1.1 - formatShort)');

})();