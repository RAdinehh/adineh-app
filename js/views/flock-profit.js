/* ═══════════════════════════════════════════════
   FLOCK PROFIT — سود/زیان هر گله + مقایسه (v1.1 - formatShort)
   ساخته شده توسط رضا آدینه
   ═══════════════════════════════════════════════ */
(function(){
'use strict';

console.log('🚀 flock-profit.js start');

if (typeof Router === 'undefined' || typeof Router.register !== 'function') {
  console.error('❌ Router not available');
  return;
}

function sid(v){ return String(v == null ? '' : v); }
function sameId(a, b){ return sid(a) === sid(b); }
function findBy(arr, id){
  if(!Array.isArray(arr)) return null;
  for(var i=0;i<arr.length;i++){ if(sameId(arr[i].id, id)) return arr[i]; }
  return null;
}

function fa(n){
  var v = Number(n||0);
  if(isNaN(v)) v = 0;
  return v.toLocaleString('fa-IR');
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

/* alias برای سازگاری با کدهای قبلی */
function faMoney(n){
  return fmtShort(n);
}

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

var _state = { tab: 'profit', selected: {}, expandedProfit: {} };

/* ═══════ Styles ═══════ */
function injectStyles(){
  if(document.getElementById('fp-styles')) return;
  var css =
  '.fp-page{padding:10px;max-width:760px;margin:0 auto}' +
  '.fp-header{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:12px;flex-wrap:wrap}' +
  '.fp-title{font-size:14px;font-weight:900}' +
  '.fp-sub{font-size:10.5px;color:#64748b;font-weight:700;margin-top:1px}' +
  '.fp-tabs{display:flex;gap:4px;background:#f1f5f9;padding:4px;border-radius:12px;margin-bottom:12px}' +
  '.fp-tab{flex:1;padding:10px 6px;border:none;background:transparent;border-radius:8px;font-family:inherit;font-size:11.5px;font-weight:800;color:#64748b;cursor:pointer;transition:all .15s}' +
  '.fp-tab.on{background:#fff;color:#0f766e;box-shadow:0 1px 3px rgba(15,23,42,.08)}' +
  '.fp-card{background:#fff;border-radius:12px;margin-bottom:8px;border:1px solid #e2e8f0;border-right:3px solid #0f766e;overflow:hidden}' +
  '.fp-card.profit{border-right-color:#10b981}' +
  '.fp-card.loss{border-right-color:#ef4444}' +
  '.fp-card-hd{padding:12px;cursor:pointer;user-select:none}' +
  '.fp-card-hd:active{background:#f8fafc}' +
  '.fp-row1{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px}' +
  '.fp-name{font-size:13px;font-weight:900;color:#0f172a;display:flex;align-items:center;gap:6px;min-width:0}' +
  '.fp-name-text{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
  '.fp-color-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}' +
  '.fp-profit-badge{font-size:10px;font-weight:900;padding:3px 9px;border-radius:9999px;white-space:nowrap;flex-shrink:0}' +
  '.fp-profit-badge.g{background:#ecfdf5;color:#065f46}' +
  '.fp-profit-badge.r{background:#fef2f2;color:#991b1b}' +
  '.fp-profit-badge.z{background:#f1f5f9;color:#64748b}' +
  '.fp-row2{display:flex;align-items:center;gap:5px;flex-wrap:wrap;font-size:10.5px}' +
  '.fp-stat{display:inline-flex;align-items:center;gap:2px;padding:2px 7px;border-radius:9999px;background:#f1f5f9;font-size:10px;font-weight:700}' +
  '.fp-stat.g{background:#ecfdf5;color:#065f46}' +
  '.fp-stat.r{background:#fef2f2;color:#991b1b}' +
  '.fp-stat.b{background:#eff6ff;color:#1e40af}' +
  '.fp-stat.o{background:#fffbeb;color:#92400e}' +
  '.fp-stat strong{font-weight:900;font-size:11px}' +
  '.fp-body{display:none;padding:0 12px 12px;border-top:1px dashed #e2e8f0;padding-top:10px}' +
  '.fp-card.expanded .fp-body{display:block}' +
  '.fp-section{margin-bottom:10px}' +
  '.fp-section-title{font-size:10.5px;font-weight:900;color:#0f766e;margin-bottom:6px;display:flex;align-items:center;gap:5px;text-transform:uppercase;letter-spacing:.4px}' +
  '.fp-section-title::before{content:"";width:3px;height:11px;background:#0f766e;border-radius:2px}' +
  '.fp-table{width:100%;border-collapse:collapse;font-size:11px}' +
  '.fp-table td{padding:5px 6px;border-bottom:1px solid #f1f5f9;color:#334155;font-weight:600}' +
  '.fp-table td.lbl{color:#64748b;font-weight:700;width:60%}' +
  '.fp-table td.val{text-align:left;direction:ltr;font-variant-numeric:tabular-nums;font-weight:900}' +
  '.fp-table tr.total td{border-top:2px solid #cbd5e1;border-bottom:none;font-weight:900;font-size:12px;padding-top:8px}' +
  '.fp-table tr.total td.lbl{color:#0f172a}' +
  '.fp-table tr.rev td.val{color:#10b981}' +
  '.fp-table tr.cost td.val{color:#ef4444}' +
  '.fp-table tr.profit td.val{color:#0f766e;font-size:14px}' +
  '.fp-table tr.loss td.val{color:#ef4444;font-size:14px}' +
  '.fp-kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px}' +
  '.fp-kpi{background:#f0fdfa;border-radius:10px;padding:8px 4px;text-align:center;border-bottom:2px solid #0f766e}' +
  '.fp-kpi.g{border-color:#10b981;background:#ecfdf5}' +
  '.fp-kpi.r{border-color:#ef4444;background:#fef2f2}' +
  '.fp-kpi.o{border-color:#f59e0b;background:#fffbeb}' +
  '.fp-kpi-ic{font-size:14px;margin-bottom:2px}' +
  '.fp-kpi-v{font-size:14px;font-weight:900;line-height:1.1}' +
  '.fp-kpi-l{font-size:9px;color:#64748b;font-weight:700;margin-top:2px}' +
  '.fp-kpi.g .fp-kpi-v{color:#059669}' +
  '.fp-kpi.r .fp-kpi-v{color:#dc2626}' +
  '.fp-kpi.o .fp-kpi-v{color:#d97706}' +
  '.fp-empty{text-align:center;padding:48px 24px;background:#fff;border-radius:12px;border:1px dashed #cbd5e1}' +
  '.fp-empty-ic{font-size:56px;line-height:1;display:block;margin-bottom:12px;opacity:.6}' +
  '.fp-empty-t{font-size:14px;font-weight:900;margin-bottom:6px}' +
  '.fp-empty-x{font-size:12px;color:#64748b;font-weight:600;margin:0 auto 16px;max-width:300px}' +
  '.fp-btn{background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;border:none;padding:9px 18px;border-radius:9999px;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer;box-shadow:0 3px 10px rgba(15,118,110,.3)}' +
  '.fp-chart-card{background:#fff;border-radius:12px;padding:12px;border:1px solid #e2e8f0;margin-bottom:10px}' +
  '.fp-chart-title{font-size:12px;font-weight:900;color:#0f172a;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #f1f5f9}' +
  '.fp-select-list{background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:8px;margin-bottom:12px;max-height:280px;overflow-y:auto}' +
  '.fp-select-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;cursor:pointer;border:1.5px solid transparent;margin-bottom:4px;transition:all .15s}' +
  '.fp-select-item:active{background:#f1f5f9}' +
  '.fp-select-item.on{background:#ecfdf5;border-color:#10b981}' +
  '.fp-select-check{width:22px;height:22px;border-radius:6px;border:2px solid #cbd5e1;background:#fff;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;color:transparent;transition:all .15s}' +
  '.fp-select-item.on .fp-select-check{background:#10b981;border-color:#10b981;color:#fff}' +
  '.fp-select-info{flex:1;min-width:0}' +
  '.fp-select-name{font-size:12.5px;font-weight:800;color:#0f172a;margin-bottom:2px}' +
  '.fp-select-meta{font-size:10px;color:#64748b;font-weight:700}' +
  '.fp-compare-table{width:100%;border-collapse:collapse;font-size:11px;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,.06)}' +
  '.fp-compare-table th{background:#0f766e;color:#fff;padding:8px 6px;font-size:10.5px;font-weight:800;text-align:center;border-right:1px solid rgba(255,255,255,.15)}' +
  '.fp-compare-table th:first-child{text-align:right;padding-right:10px}' +
  '.fp-compare-table td{padding:7px 6px;border-bottom:1px solid #f1f5f9;text-align:center;color:#334155;font-weight:700;font-variant-numeric:tabular-nums}' +
  '.fp-compare-table td:first-child{text-align:right;color:#64748b;font-size:10.5px;padding-right:10px;font-weight:800}' +
  '.fp-compare-table tr:last-child td{border-bottom:none}' +
  '.fp-compare-table tr:nth-child(even) td{background:#f8fafc}' +
  '.fp-compare-table td.win{color:#10b981;font-weight:900}' +
  '.fp-compare-table td.lose{color:#ef4444}' +
  '.fp-winner{background:linear-gradient(135deg,#fef3c7,#fde68a);border:2px solid #fbbf24;border-radius:12px;padding:12px;margin-bottom:10px;display:flex;align-items:center;gap:10px}' +
  '.fp-winner-ic{font-size:32px;flex-shrink:0}' +
  '.fp-winner-txt{font-size:11.5px;font-weight:700;color:#78350f;line-height:1.6}' +
  '.fp-winner-txt b{font-size:14px;color:#92400e;display:block;margin-bottom:2px}' +
  '@media (max-width:420px){.fp-kpi-grid{grid-template-columns:1fr 1fr}}';

  var s = document.createElement('style');
  s.id = 'fp-styles';
  s.textContent = css;
  document.head.appendChild(s);
}

/* ═══════ Data Access ═══════ */
function getFlocks(){
  try{
    if(typeof Store !== 'undefined' && Store.all){
      return (Store.all('flocks') || []).filter(function(f){ return !f.isDeleted; });
    }
  }catch(e){}
  return [];
}
function getSales(){
  try{ if(typeof Store !== 'undefined' && Store.all) return Store.all('sales') || []; }catch(e){}
  return [];
}
function getDailyRecords(){
  try{ if(typeof Store !== 'undefined' && Store.all) return Store.all('dailyRecords') || []; }catch(e){}
  return [];
}
function getMedicine(){
  try{ if(typeof Store !== 'undefined' && Store.all) return Store.all('medicineRecords') || []; }catch(e){}
  return [];
}
function getFeedItems(){
  try{ if(typeof Store !== 'undefined' && Store.all){
    return (Store.all('items') || []).filter(function(i){ return i.type === 'feed' || i.category === 'خوراک'; });
  } }catch(e){}
  return [];
}

function getFeedAvgPrice(){
  var items = getFeedItems();
  if(!items.length) return 0;
  var total = 0, cnt = 0;
  for(var i=0;i<items.length;i++){
    if(items[i].price > 0){ total += items[i].price; cnt++; }
  }
  return cnt > 0 ? total / cnt : 0;
}

/* ═══════ محاسبه سود/زیان گله ═══════ */
function calcFlockProfit(flock){
  var count = flock.count || flock.initialCount || 0;
  var alive = flock.alive || flock.aliveCount || count;
  var deaths = flock.deaths || 0;

  var allSales = getSales();
  var revenue = 0;
  var salesCount = 0;
  var salesQty = 0;
  var flockName = flock.name || '';

  for(var i=0;i<allSales.length;i++){
    var s = allSales[i];
    var match = false;
    if(s.flockId && sameId(s.flockId, flock.id)) match = true;
    else if(s.flock === flockName) match = true;
    if(match){
      revenue += s.total || (s.qty || 0) * (s.price || 0);
      salesCount++;
      salesQty += s.quantity || s.qty || 0;
    }
  }

  /* هزینه‌ها */
  var chickCost = count * (flock.chickPrice || 0);
  var transportCost = flock.transportCost || 0;

  var allMed = getMedicine();
  var medCost = 0;
  for(i=0;i<allMed.length;i++){
    if(allMed[i].flock === flockName){
      medCost += allMed[i].cost || 0;
    }
  }

  var allDaily = getDailyRecords();
  var totalFeedKg = 0;
  var otherDailyCost = 0;
  for(i=0;i<allDaily.length;i++){
    if(allDaily[i].flock === flockName){
      totalFeedKg += allDaily[i].feed || 0;
      otherDailyCost += allDaily[i].medCost || 0;
    }
  }
  var avgFeedPrice = getFeedAvgPrice();
  var feedCost = totalFeedKg * avgFeedPrice;

  var totalCost = chickCost + transportCost + medCost + feedCost + otherDailyCost;
  var profit = revenue - totalCost;
  var profitPerBird = alive > 0 ? profit / alive : 0;
  var margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  var costPerBird = count > 0 ? totalCost / count : 0;

  return {
    flock: flock,
    alive: alive,
    count: count,
    deaths: deaths,
    revenue: revenue,
    salesCount: salesCount,
    salesQty: salesQty,
    chickCost: chickCost,
    transportCost: transportCost,
    medCost: medCost + otherDailyCost,
    feedCost: feedCost,
    totalFeedKg: totalFeedKg,
    totalCost: totalCost,
    profit: profit,
    profitPerBird: profitPerBird,
    costPerBird: costPerBird,
    margin: margin
  };
}

/* ═══════ Render — تب سود هر گله ═══════ */
function renderProfitTab(){
  var flocks = getFlocks();
  if(!flocks.length){
    return '<div class="fp-empty">' +
      '<div class="fp-empty-ic">🐔</div>' +
      '<div class="fp-empty-t">هنوز گله‌ای ثبت نشده</div>' +
      '<div class="fp-empty-x">اول یک گله بساز تا بتونیم سود/زیانش رو حساب کنیم</div>' +
      '<button class="fp-btn" data-fp="go-flocks">🐔 رفتن به گله‌ها</button>' +
    '</div>';
  }

  var results = [];
  var totalRevenue = 0, totalCost = 0, totalProfit = 0;
  for(var i=0;i<flocks.length;i++){
    var r = calcFlockProfit(flocks[i]);
    results.push(r);
    totalRevenue += r.revenue;
    totalCost += r.totalCost;
    totalProfit += r.profit;
  }

  results.sort(function(a,b){ return b.profit - a.profit; });

  var kpiHtml = '<div class="fp-kpi-grid">' +
    '<div class="fp-kpi g"><div class="fp-kpi-ic">📈</div><div class="fp-kpi-v">'+faMoney(totalRevenue)+'</div><div class="fp-kpi-l">کل درآمد</div></div>' +
    '<div class="fp-kpi r"><div class="fp-kpi-ic">📉</div><div class="fp-kpi-v">'+faMoney(totalCost)+'</div><div class="fp-kpi-l">کل هزینه</div></div>' +
    '<div class="fp-kpi '+(totalProfit >= 0 ? 'g' : 'r')+'"><div class="fp-kpi-ic">💵</div><div class="fp-kpi-v">'+faMoney(Math.abs(totalProfit))+'</div><div class="fp-kpi-l">'+(totalProfit >= 0 ? 'سود' : 'زیان')+'</div></div>' +
    '<div class="fp-kpi o"><div class="fp-kpi-ic">🐔</div><div class="fp-kpi-v">'+fa(flocks.length)+'</div><div class="fp-kpi-l">تعداد گله</div></div>' +
  '</div>';

  var cardsHtml = '';
  for(i=0;i<results.length;i++) cardsHtml += renderProfitCard(results[i]);

  return kpiHtml + '<div data-fp-profit-list>' + cardsHtml + '</div>';
}

function renderProfitCard(r){
  var isProfit = r.profit > 0;
  var isLoss = r.profit < 0;
  var cardCls = isProfit ? 'profit' : (isLoss ? 'loss' : '');
  var badgeCls = isProfit ? 'g' : (isLoss ? 'r' : 'z');
  var badgeTxt = isProfit ? '📈 سود' : (isLoss ? '📉 زیان' : '➖ بدون تغییر');
  var color = r.flock.color || '#0f766e';
  var isOpen = !!_state.expandedProfit[sid(r.flock.id)];

  return '<div class="fp-card '+cardCls+' '+(isOpen?'expanded':'')+'" data-fp-card="'+sid(r.flock.id)+'">' +
    '<div class="fp-card-hd" data-fp="toggle-profit" data-id="'+sid(r.flock.id)+'">' +
      '<div class="fp-row1">' +
        '<div class="fp-name"><span class="fp-color-dot" style="background:'+color+'"></span><span class="fp-name-text">'+esc(r.flock.name)+'</span></div>' +
        '<span class="fp-profit-badge '+badgeCls+'">'+badgeTxt+'</span>' +
      '</div>' +
      '<div class="fp-row2">' +
        '<span class="fp-stat">🐔 <strong>'+fa(r.alive)+'</strong></span>' +
        '<span class="fp-stat g">📈 <strong>'+faMoney(r.revenue)+'</strong></span>' +
        '<span class="fp-stat r">📉 <strong>'+faMoney(r.totalCost)+'</strong></span>' +
        '<span class="fp-stat '+(isProfit?'g':'r')+'">💵 <strong>'+faMoney(Math.abs(r.profit))+'</strong></span>' +
      '</div>' +
    '</div>' +
    '<div class="fp-body">' +

      '<div class="fp-section">' +
        '<div class="fp-section-title">📈 درآمد</div>' +
        '<table class="fp-table">' +
          '<tr><td class="lbl">تعداد فروش</td><td class="val">'+fa(r.salesCount)+' فاکتور</td></tr>' +
          '<tr><td class="lbl">مقدار فروخته‌شده</td><td class="val">'+fa(r.salesQty)+'</td></tr>' +
          '<tr class="total rev"><td class="lbl">💰 کل درآمد</td><td class="val">'+fa(r.revenue)+' تومان</td></tr>' +
        '</table>' +
      '</div>' +

      '<div class="fp-section">' +
        '<div class="fp-section-title">📉 هزینه‌ها</div>' +
        '<table class="fp-table">' +
          (r.chickCost > 0 ? '<tr class="cost"><td class="lbl">🐣 خرید جوجه ('+fa(r.count)+' × '+fa(r.flock.chickPrice || 0)+')</td><td class="val">'+fa(r.chickCost)+'</td></tr>' : '') +
          (r.feedCost > 0 ? '<tr class="cost"><td class="lbl">🌾 خوراک ('+fa(r.totalFeedKg)+' kg)</td><td class="val">'+fa(Math.round(r.feedCost))+'</td></tr>' : '') +
          (r.medCost > 0 ? '<tr class="cost"><td class="lbl">💊 دارو و درمان</td><td class="val">'+fa(r.medCost)+'</td></tr>' : '') +
          (r.transportCost > 0 ? '<tr class="cost"><td class="lbl">🚚 حمل و نقل</td><td class="val">'+fa(r.transportCost)+'</td></tr>' : '') +
          '<tr class="total cost"><td class="lbl">💸 کل هزینه</td><td class="val">'+fa(r.totalCost)+' تومان</td></tr>' +
        '</table>' +
      '</div>' +

      '<div class="fp-section">' +
        '<div class="fp-section-title">'+(isProfit ? '✅ نتیجه نهایی' : '⚠️ نتیجه نهایی')+'</div>' +
        '<table class="fp-table">' +
          '<tr class="'+(isProfit ? 'profit' : 'loss')+'"><td class="lbl">💵 '+(isProfit ? 'سود' : 'زیان')+' خالص</td><td class="val">'+fa(Math.abs(r.profit))+' تومان</td></tr>' +
          '<tr><td class="lbl">🐔 سود به ازای هر پرنده</td><td class="val">'+fa(Math.round(r.profitPerBird))+' تومان</td></tr>' +
          '<tr><td class="lbl">💵 هزینه به ازای هر جوجه</td><td class="val">'+fa(Math.round(r.costPerBird))+' تومان</td></tr>' +
          '<tr><td class="lbl">📊 حاشیه سود</td><td class="val">'+r.margin.toFixed(1)+'٪</td></tr>' +
        '</table>' +
      '</div>' +

    '</div>' +
  '</div>';
}

/* ═══════ Render — تب مقایسه ═══════ */
function renderCompareTab(){
  var flocks = getFlocks();
  if(flocks.length < 2){
    return '<div class="fp-empty">' +
      '<div class="fp-empty-ic">📊</div>' +
      '<div class="fp-empty-t">حداقل ۲ گله لازمه</div>' +
      '<div class="fp-empty-x">برای مقایسه، باید حداقل دو گله داشته باشی</div>' +
    '</div>';
  }

  var results = [];
  for(var i=0;i<flocks.length;i++) results.push(calcFlockProfit(flocks[i]));

  var selectedList = [];
  for(i=0;i<results.length;i++){
    if(_state.selected[sid(results[i].flock.id)]) selectedList.push(results[i]);
  }

  var listHtml = '<div style="font-size:11.5px;font-weight:800;color:#0f172a;margin-bottom:8px">🐔 گله‌ها رو انتخاب کن (حداقل ۲):</div>';
  listHtml += '<div class="fp-select-list">';
  for(i=0;i<results.length;i++){
    var r = results[i];
    var isSel = !!_state.selected[sid(r.flock.id)];
    var color = r.flock.color || '#0f766e';
    var profitTxt = r.profit >= 0 ? '+' + faMoney(r.profit) : '−' + faMoney(Math.abs(r.profit));
    listHtml += '<div class="fp-select-item '+(isSel?'on':'')+'" data-fp="toggle-select" data-id="'+sid(r.flock.id)+'">' +
      '<div class="fp-select-check">✓</div>' +
      '<div class="fp-select-info">' +
        '<div class="fp-select-name"><span class="fp-color-dot" style="display:inline-block;background:'+color+';margin-left:6px"></span>'+esc(r.flock.name)+'</div>' +
        '<div class="fp-select-meta">🐔 '+fa(r.alive)+' زنده • 💵 '+(r.profit >= 0 ? '📈' : '📉')+' '+profitTxt+'</div>' +
      '</div>' +
    '</div>';
  }
  listHtml += '</div>';

  if(selectedList.length < 2){
    return listHtml + '<div class="fp-empty" style="padding:30px 20px">' +
      '<div class="fp-empty-ic" style="font-size:40px">👆</div>' +
      '<div class="fp-empty-t">حداقل ۲ گله انتخاب کن</div>' +
    '</div>';
  }

  var best = selectedList.slice().sort(function(a,b){ return b.profit - a.profit; })[0];

  var winnerHtml = '<div class="fp-winner">' +
    '<div class="fp-winner-ic">🏆</div>' +
    '<div class="fp-winner-txt">' +
      '<b>'+esc(best.flock.name)+'</b>' +
      'سودآورترین گله با <b style="display:inline">'+fa(best.profit)+'</b> تومان سود خالص' +
    '</div>' +
  '</div>';

  var table = '<table class="fp-compare-table">' +
    '<thead><tr><th>شاخص</th>';
  for(i=0;i<selectedList.length;i++){
    table += '<th>'+esc(selectedList[i].flock.name.substring(0, 12))+'</th>';
  }
  table += '</tr></thead><tbody>';

  var rows = [
    { key: 'count', label: '🐣 تعداد اولیه', fmt: function(r){ return fa(r.count); } },
    { key: 'alive', label: '🐔 زنده', fmt: function(r){ return fa(r.alive); } },
    { key: 'deaths', label: '💀 تلفات', fmt: function(r){ return fa(r.deaths); }, invert: true },
    { key: 'mortalityPct', label: '📊 نرخ تلفات', fmt: function(r){ return r.count > 0 ? (r.deaths/r.count*100).toFixed(1) + '٪' : '—'; }, invert: true, raw: function(r){ return r.count > 0 ? r.deaths/r.count*100 : 9999; } },
    { key: 'revenue', label: '📈 درآمد', fmt: function(r){ return faMoney(r.revenue); }, raw: function(r){ return r.revenue; } },
    { key: 'totalCost', label: '📉 هزینه', fmt: function(r){ return faMoney(r.totalCost); }, invert: true, raw: function(r){ return r.totalCost; } },
    { key: 'profit', label: '💵 سود خالص', fmt: function(r){ return faMoney(r.profit); }, raw: function(r){ return r.profit; }, bold: true },
    { key: 'profitPerBird', label: '👤 سود/پرنده', fmt: function(r){ return fa(Math.round(r.profitPerBird)); }, raw: function(r){ return r.profitPerBird; } },
    { key: 'margin', label: '📊 حاشیه سود', fmt: function(r){ return r.margin.toFixed(1) + '٪'; }, raw: function(r){ return r.margin; } }
  ];

  for(i=0;i<rows.length;i++){
    var row = rows[i];
    var vals = selectedList.map(function(r){ return row.raw ? row.raw(r) : (r[row.key] || 0); });
    var bestVal = row.invert ? Math.min.apply(null, vals) : Math.max.apply(null, vals);

    table += '<tr><td>'+row.label+'</td>';
    for(var j=0;j<selectedList.length;j++){
      var v = vals[j];
      var isBest = Math.abs(v - bestVal) < 0.001;
      table += '<td class="'+(isBest ? (row.invert ? 'lose' : 'win') : '')+'">'+row.fmt(selectedList[j])+'</td>';
    }
    table += '</tr>';
  }

  table += '</tbody></table>';

  var profitItems = selectedList.map(function(r){
    return {
      label: r.flock.name.substring(0, 8),
      value: Math.round(r.profit / 1000),
      color: r.profit >= 0 ? '#10b981' : '#ef4444'
    };
  });

  var profitChart = '<div class="fp-chart-card">' +
    '<div class="fp-chart-title">💵 مقایسه سود (هزار تومان)</div>' +
    (window.Charts ? Charts.bar({
      items: profitItems,
      height: 200,
      yUnit: 'هزار تومان',
      formatY: function(y){ return Math.round(y); }
    }) : '') +
  '</div>';

  var mortalityItems = selectedList.map(function(r){
    var pct = r.count > 0 ? (r.deaths / r.count * 100) : 0;
    return {
      label: r.flock.name.substring(0, 8),
      value: +pct.toFixed(1),
      color: pct > 10 ? '#ef4444' : pct > 5 ? '#f59e0b' : '#10b981'
    };
  });

  var mortalityChart = '<div class="fp-chart-card">' +
    '<div class="fp-chart-title">📊 مقایسه نرخ تلفات (٪)</div>' +
    (window.Charts ? Charts.bar({
      items: mortalityItems,
      height: 180,
      yUnit: '٪',
      formatY: function(y){ return y.toFixed(0) + '٪'; }
    }) : '') +
  '</div>';

  return listHtml + winnerHtml + profitChart + mortalityChart +
    '<div class="fp-chart-card">' +
      '<div class="fp-chart-title">📋 جدول کامل مقایسه</div>' +
      table +
    '</div>';
}

/* ═══════ Render Page ═══════ */
function renderPage(){
  var tab = _state.tab;
  var content = '';

  if(tab === 'profit') content = renderProfitTab();
  else content = renderCompareTab();

  return '<div class="page fp-page" data-fp-root>' +
    '<div class="fp-header">' +
      '<div><div class="fp-title">💰 سود و مقایسه گله‌ها</div>' +
      '<div class="fp-sub">تحلیل مالی و مقایسه عملکرد</div></div>' +
    '</div>' +
    '<div class="fp-tabs">' +
      '<button class="fp-tab '+(tab === 'profit' ? 'on' : '')+'" data-fp="tab" data-t="profit">💰 سود هر گله</button>' +
      '<button class="fp-tab '+(tab === 'compare' ? 'on' : '')+'" data-fp="tab" data-t="compare">📊 مقایسه گله‌ها</button>' +
    '</div>' +
    content +
  '</div>';
}

function renderRoot(){
  var root = document.querySelector('[data-fp-root]');
  if(!root) return;
  var fresh = document.createElement('div');
  fresh.innerHTML = renderPage();
  root.parentNode.replaceChild(fresh.firstElementChild, root);
}

/* ═══════ Events ═══════ */
document.addEventListener('click', function(e){
  var btn = e.target.closest ? e.target.closest('[data-fp]') : null;
  if(!btn) return;
  var act = btn.dataset.fp;
  var id = sid(btn.dataset.id);

  switch(act){
    case 'tab':
      _state.tab = btn.dataset.t;
      renderRoot();
      break;

    case 'toggle-profit':
      _state.expandedProfit[id] = !_state.expandedProfit[id];
      var card = document.querySelector('[data-fp-card="'+id+'"]');
      if(card) card.classList.toggle('expanded');
      break;

    case 'toggle-select':
      _state.selected[id] = !_state.selected[id];
      renderRoot();
      break;

    case 'go-flocks':
      if(typeof Router !== 'undefined' && Router.go) Router.go('flocks');
      break;
  }
});

/* ═══════ Init ═══════ */
injectStyles();

Router.register('flock-profit', {
  title: 'سود و مقایسه',
  navPage: 'more',
  topLevel: true,
  render: function(){
    return renderPage();
  }
});

window.FlockProfit = {
  render: renderPage,
  calcFlockProfit: calcFlockProfit
};

console.log('✅ flock-profit route registered (v1.1 - formatShort)');

})();