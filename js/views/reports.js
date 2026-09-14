/* ═══════════════════════════════════════════════
   REPORTS — گزارش‌گیری جامع (v2.0)
   بازنویسی‌شده برای Store v4 + UI مشترک
   ساخته شده توسط رضا آدینه
   ═══════════════════════════════════════════════ */
(function(){
'use strict';

if(typeof Router === 'undefined' || typeof Router.register !== 'function'){
  console.error('❌ Router not available');
  return;
}
if(window.__reportsModuleLoaded) return;
window.__reportsModuleLoaded = true;

console.log('🚀 reports.js start');

var sid = UI.sid, sameId = UI.sameId;
var esc = UI.esc, fa = UI.fa, toFa = UI.toFa;
var fmtShort = UI.formatShort, toast = UI.toast;
var jToC = UI.jToC, todayStr = UI.todayStr;

var uiState = { tab: 'overview', expanded: {} };

/* ═══ Data Access ═══ */
function getStoreData(key){
  if(typeof Store === 'undefined') return [];
  try{
    if(Store.all) return Store.all(key) || [];
  }catch(e){}
  return [];
}

function getFarm(){
  if(typeof Store !== 'undefined' && Store.getFarm) return Store.getFarm();
  return {};
}

function getAllData(){
  var transactions = getStoreData('transactions');
  var finance = [];
  var inventory = [];

  for(var i = 0; i < transactions.length; i++){
    var t = transactions[i];
    if(!t) continue;
    if(t.kind === 'inv_in' || t.kind === 'inv_out' || t.kind === 'inv_waste'){
      inventory.push(t);
    } else if(!t.kind || t.kind === 'finance_income' || t.kind === 'finance_expense'
              || t.transType === 'income' || t.transType === 'expense'){
      finance.push(t);
    }
  }

  return {
    farm: getFarm(),
    flocks: getStoreData('flocks').filter(function(f){ return !f.isDeleted; }),
    halls: getStoreData('halls'),
    groups: getStoreData('groups'),
    sales: getStoreData('sales'),
    daily: getStoreData('dailyRecords'),
    incubation: getStoreData('incs'),
    medicine: getStoreData('medicineRecords'),
    feed: getStoreData('feedFormulas'),
    parties: getStoreData('parties'),
    items: getStoreData('items'),
    transactions: transactions,
    finance: finance,
    inventory: inventory
  };
}

/* ═══ Styles ═══ */
function injectStyles(){
  if(document.getElementById('rep-styles')) return;
  var s = document.createElement('style');
  s.id = 'rep-styles';
  s.textContent =
    '.rep-page{padding:10px;max-width:760px;margin:0 auto}' +
    '.rep-header{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:10px;flex-wrap:wrap}' +
    '.rep-title{font-size:14px;font-weight:900}' +
    '.rep-sub{font-size:10.5px;color:#64748b;font-weight:700;margin-top:1px}' +
    '.rep-export{background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;border:none;padding:8px 14px;border-radius:9999px;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:4px}' +
    '.rep-tabs{display:flex;gap:4px;margin-bottom:10px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none}' +
    '.rep-tabs::-webkit-scrollbar{display:none}' +
    '.rep-tab{background:#fff;border:1.5px solid #e2e8f0;color:#64748b;padding:6px 12px;border-radius:9999px;font-family:inherit;font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap;flex-shrink:0}' +
    '.rep-tab.on{background:#0f766e;border-color:#0f766e;color:#fff}' +
    '.rep-kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px}' +
    '.rep-card{background:#fff;border-radius:12px;padding:12px;border:1px solid #e2e8f0;margin-bottom:10px}' +
    '.rep-card-title{font-size:12.5px;font-weight:900;color:#0f172a;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:6px}' +
    '.rep-table{width:100%;border-collapse:collapse;font-size:11px}' +
    '.rep-table th{background:#f1f5f9;color:#0f172a;padding:7px 6px;font-size:10px;font-weight:800;text-align:right;border-bottom:1px solid #e2e8f0}' +
    '.rep-table td{padding:6px;border-bottom:1px solid #f1f5f9;color:#334155;font-weight:600}' +
    '.rep-table td.num{text-align:left;direction:ltr;font-variant-numeric:tabular-nums;font-weight:800}' +
    '.rep-table tr:last-child td{border-bottom:none}' +
    '.rep-table tr.total td{background:#ecfdf5;font-weight:900;color:#0f766e}' +
    '.rep-empty{text-align:center;padding:40px 20px;color:#94a3b8;font-size:12px;font-weight:700}' +
    '.rep-empty-ic{font-size:48px;opacity:.5;display:block;margin-bottom:8px}' +
    '@media(max-width:420px){.rep-kpi-grid{grid-template-columns:1fr 1fr}}';
  document.head.appendChild(s);
}

/* ═══ KPI ═══ */
function kpi(icon, value, label, color, bg){
  return '<div class="kpi-card" style="background:' + bg + ';border-bottom-color:' + color + '">' +
    '<div style="font-size:18px;line-height:1;margin-bottom:4px">' + icon + '</div>' +
    '<div style="font-size:16px;font-weight:900;color:' + color + ';line-height:1.1">' + value + '</div>' +
    '<div style="font-size:9.5px;color:#64748b;font-weight:700;margin-top:3px">' + label + '</div>' +
  '</div>';
}

/* ═══ Tab: Overview ═══ */
function renderOverview(d){
  var totalAlive = 0, totalDeaths = 0;
  for(var i = 0; i < d.flocks.length; i++){
    totalAlive += d.flocks[i].alive || d.flocks[i].aliveCount || 0;
    totalDeaths += d.flocks[i].deaths || 0;
  }

  var income = 0, expense = 0;
  for(i = 0; i < d.finance.length; i++){
    var t = d.finance[i];
    var isInc = t.transType === 'income' || t.kind === 'finance_income';
    if(isInc) income += t.amount || 0;
    else expense += t.amount || 0;
  }

  var salesTotal = 0;
  for(i = 0; i < d.sales.length; i++){
    salesTotal += d.sales[i].total || (d.sales[i].qty || 0) * (d.sales[i].price || 0);
  }

  return '<div class="rep-kpi-grid">' +
    kpi('🐔', fa(totalAlive), 'زنده', '#10b981', '#ecfdf5') +
    kpi('💀', fa(totalDeaths), 'تلفات', '#ef4444', '#fef2f2') +
    kpi('💰', fmtShort(salesTotal), 'فروش', '#f59e0b', '#fffbeb') +
    kpi('💵', fmtShort(income - expense), 'سود مالی', '#3b82f6', '#eff6ff') +
  '</div>' +
  '<div class="rep-card">' +
    '<div class="rep-card-title">📊 خلاصه کلی</div>' +
    '<table class="rep-table">' +
      '<tr><td>🐔 گله‌ها</td><td class="num">' + fa(d.flocks.length) + '</td></tr>' +
      '<tr><td>🏢 سالن‌ها</td><td class="num">' + fa(d.halls.length) + '</td></tr>' +
      '<tr><td>👥 گروه‌ها</td><td class="num">' + fa(d.groups.length) + '</td></tr>' +
      '<tr><td>📅 رکورد روزانه</td><td class="num">' + fa(d.daily.length) + '</td></tr>' +
      '<tr><td>💰 فروش</td><td class="num">' + fa(d.sales.length) + '</td></tr>' +
      '<tr><td>💼 تراکنش مالی</td><td class="num">' + fa(d.finance.length) + '</td></tr>' +
      '<tr><td>📦 تراکنش انبار</td><td class="num">' + fa(d.inventory.length) + '</td></tr>' +
      '<tr><td>🥚 جوجه‌کشی</td><td class="num">' + fa(d.incubation.length) + '</td></tr>' +
      '<tr><td>💊 دارو</td><td class="num">' + fa(d.medicine.length) + '</td></tr>' +
      '<tr><td>🌾 فرمول جیره</td><td class="num">' + fa(d.feed.length) + '</td></tr>' +
      '<tr><td>🏪 طرف حساب</td><td class="num">' + fa(d.parties.length) + '</td></tr>' +
      '<tr><td>📦 اقلام</td><td class="num">' + fa(d.items.length) + '</td></tr>' +
    '</table>' +
  '</div>';
}

/* ═══ Tab: Finance ═══ */
function renderFinanceReport(d){
  var income = 0, expense = 0;
  for(var i = 0; i < d.finance.length; i++){
    var t = d.finance[i];
    var isInc = t.transType === 'income' || t.kind === 'finance_income';
    if(isInc) income += t.amount || 0;
    else expense += t.amount || 0;
  }
  var profit = income - expense;
  var byCat = {};
  for(i = 0; i < d.finance.length; i++){
    var cat = d.finance[i].category || 'سایر';
    if(!byCat[cat]) byCat[cat] = { income: 0, expense: 0, count: 0 };
    byCat[cat].count++;
    var isInc2 = d.finance[i].transType === 'income' || d.finance[i].kind === 'finance_income';
    if(isInc2) byCat[cat].income += d.finance[i].amount || 0;
    else byCat[cat].expense += d.finance[i].amount || 0;
  }

  var rows = '';
  Object.keys(byCat).forEach(function(k){
    var c = byCat[k];
    rows += '<tr>' +
      '<td>' + esc(k) + '</td>' +
      '<td class="num">' + fa(c.count) + '</td>' +
      '<td class="num" style="color:#10b981">' + fmtShort(c.income) + '</td>' +
      '<td class="num" style="color:#ef4444">' + fmtShort(c.expense) + '</td>' +
    '</tr>';
  });

  return '<div class="rep-kpi-grid">' +
    kpi('📈', fmtShort(income), 'درآمد', '#10b981', '#ecfdf5') +
    kpi('📉', fmtShort(expense), 'هزینه', '#ef4444', '#fef2f2') +
    kpi('💵', fmtShort(Math.abs(profit)), profit >= 0 ? 'سود' : 'زیان', profit >= 0 ? '#3b82f6' : '#ef4444', profit >= 0 ? '#eff6ff' : '#fef2f2') +
    kpi('📊', fa(d.finance.length), 'تعداد', '#8b5cf6', '#f5f3ff') +
  '</div>' +
  (rows
    ? '<div class="rep-card"><div class="rep-card-title">🏷️ بر اساس دسته</div>' +
        '<table class="rep-table"><thead><tr><th>دسته</th><th>تعداد</th><th>درآمد</th><th>هزینه</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table></div>'
    : '<div class="rep-card"><div class="rep-empty"><div class="rep-empty-ic">💼</div>تراکنشی ثبت نشده</div></div>');
}

/* ═══ Tab: Flocks ═══ */
function renderFlocksReport(d){
  if(!d.flocks.length){
    return '<div class="rep-card"><div class="rep-empty"><div class="rep-empty-ic">🐔</div>گله‌ای ثبت نشده</div></div>';
  }
  var rows = '';
  var totalAlive = 0, totalDeaths = 0, totalCount = 0;
  for(var i = 0; i < d.flocks.length; i++){
    var f = d.flocks[i];
    var count = f.count || f.initialCount || 0;
    var alive = f.alive || f.aliveCount || 0;
    var deaths = f.deaths || 0;
    var age = Math.max(0, jToC(todayStr) - jToC(f.hatch || f.hatchDate));
    var pct = count > 0 ? ((deaths / count) * 100).toFixed(1) : '0';
    totalAlive += alive; totalDeaths += deaths; totalCount += count;
    rows += '<tr>' +
      '<td>' + esc(f.name) + '</td>' +
      '<td class="num">' + fa(count) + '</td>' +
      '<td class="num" style="color:#10b981">' + fa(alive) + '</td>' +
      '<td class="num" style="color:#ef4444">' + fa(deaths) + '</td>' +
      '<td class="num">' + pct + '٪</td>' +
      '<td class="num">' + fa(age) + '</td>' +
    '</tr>';
  }
  var totalPct = totalCount > 0 ? ((totalDeaths / totalCount) * 100).toFixed(1) : '0';

  return '<div class="rep-kpi-grid">' +
    kpi('🐔', fa(totalAlive), 'زنده', '#10b981', '#ecfdf5') +
    kpi('💀', fa(totalDeaths), 'تلفات', '#ef4444', '#fef2f2') +
    kpi('📊', totalPct + '٪', 'نرخ تلفات', '#f59e0b', '#fffbeb') +
    kpi('🏠', fa(d.flocks.length), 'گله', '#3b82f6', '#eff6ff') +
  '</div>' +
  '<div class="rep-card">' +
    '<div class="rep-card-title">🐔 جزئیات گله‌ها</div>' +
    '<table class="rep-table">' +
      '<thead><tr><th>نام</th><th>اولیه</th><th>زنده</th><th>تلفات</th><th>نرخ</th><th>سن</th></tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
      '<tfoot><tr class="total"><td>جمع</td><td class="num">' + fa(totalCount) + '</td><td class="num">' + fa(totalAlive) + '</td><td class="num">' + fa(totalDeaths) + '</td><td class="num">' + totalPct + '٪</td><td>—</td></tr></tfoot>' +
    '</table>' +
  '</div>';
}

/* ═══ Tab: Inventory ═══ */
function renderInventoryReport(d){
  var stock = {};
  for(var i = 0; i < d.inventory.length; i++){
    var t = d.inventory[i];
    var name = t.item || t.category;
    if(!name) continue;
    if(!stock[name]) stock[name] = { item: name, unit: t.unit || '', qty: 0, in: 0, out: 0, waste: 0, price: 0 };
    var q = t.qty || 0;
    if(t.kind === 'inv_in'){ stock[name].qty += q; stock[name].in += q; }
    else if(t.kind === 'inv_out'){ stock[name].qty -= q; stock[name].out += q; }
    else if(t.kind === 'inv_waste'){ stock[name].qty -= q; stock[name].waste += q; }
    if(t.price) stock[name].price = t.price;
    if(t.unit) stock[name].unit = t.unit;
  }

  var rows = '';
  var totalValue = 0;
  Object.keys(stock).forEach(function(k){
    var s = stock[k];
    var val = s.qty * s.price;
    totalValue += val;
    rows += '<tr>' +
      '<td>' + esc(s.item) + '</td>' +
      '<td class="num" style="color:#10b981">+' + fa(s.in) + '</td>' +
      '<td class="num" style="color:#ef4444">−' + fa(s.out) + '</td>' +
      '<td class="num">' + fa(s.qty) + ' ' + esc(s.unit) + '</td>' +
      '<td class="num">' + fmtShort(val) + '</td>' +
    '</tr>';
  });

  return '<div class="rep-kpi-grid">' +
    kpi('📥', fa(d.inventory.length), 'تراکنش', '#3b82f6', '#eff6ff') +
    kpi('📦', fa(Object.keys(stock).length), 'قلم', '#10b981', '#ecfdf5') +
    kpi('💰', fmtShort(totalValue), 'ارزش', '#f59e0b', '#fffbeb') +
    kpi('⚠️', fa(Object.keys(stock).filter(function(k){ return stock[k].qty <= 0; }).length), 'خالی', '#ef4444', '#fef2f2') +
  '</div>' +
  (rows
    ? '<div class="rep-card"><div class="rep-card-title">📦 موجودی انبار</div>' +
        '<table class="rep-table"><thead><tr><th>کالا</th><th>ورود</th><th>خروج</th><th>موجودی</th><th>ارزش</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table></div>'
    : '<div class="rep-card"><div class="rep-empty"><div class="rep-empty-ic">📦</div>تراکنشی ثبت نشده</div></div>');
}

/* ═══ Tab: Daily ═══ */
function renderDailyReport(d){
  if(!d.daily.length){
    return '<div class="rep-card"><div class="rep-empty"><div class="rep-empty-ic">📅</div>رکوردی ثبت نشده</div></div>';
  }
  var totalDeaths = 0, totalEggs = 0, totalFeed = 0;
  for(var i = 0; i < d.daily.length; i++){
    totalDeaths += d.daily[i].deaths || 0;
    totalEggs += d.daily[i].eggs || 0;
    totalFeed += d.daily[i].feed || 0;
  }

  var sorted = d.daily.slice().sort(function(a, b){ return jToC(b.date) - jToC(a.date); });
  var recent = sorted.slice(0, 15);
  var rows = '';
  for(i = 0; i < recent.length; i++){
    var r = recent[i];
    rows += '<tr>' +
      '<td class="num">' + esc(r.date) + '</td>' +
      '<td>' + esc(r.flock || '—') + '</td>' +
      '<td class="num" style="color:#ef4444">' + fa(r.deaths || 0) + '</td>' +
      '<td class="num" style="color:#10b981">' + fa(r.alive || 0) + '</td>' +
      '<td class="num">' + fa(r.eggs || 0) + '</td>' +
      '<td class="num">' + fa(r.feed || 0) + '</td>' +
    '</tr>';
  }

  return '<div class="rep-kpi-grid">' +
    kpi('📅', fa(d.daily.length), 'رکورد', '#3b82f6', '#eff6ff') +
    kpi('💀', fa(totalDeaths), 'تلفات', '#ef4444', '#fef2f2') +
    kpi('🥚', fa(totalEggs), 'تخم', '#10b981', '#ecfdf5') +
    kpi('🌾', fa(totalFeed), 'خوراک', '#f59e0b', '#fffbeb') +
  '</div>' +
  '<div class="rep-card">' +
    '<div class="rep-card-title">📋 آخرین ۱۵ رکورد</div>' +
    '<table class="rep-table">' +
      '<thead><tr><th>تاریخ</th><th>گله</th><th>تلفات</th><th>زنده</th><th>تخم</th><th>خوراک</th></tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
    '</table>' +
  '</div>';
}

/* ═══ Render Page ═══ */
function renderPage(){
  injectStyles();
  var t = uiState.tab;
  var content = '';
  var d = null;

  if(t === 'overview')  { d = getAllData(); content = renderOverview(d); }
  if(t === 'finance')   { d = d || getAllData(); content = renderFinanceReport(d); }
  if(t === 'flocks')    { d = d || getAllData(); content = renderFlocksReport(d); }
  if(t === 'inventory') { d = d || getAllData(); content = renderInventoryReport(d); }
  if(t === 'daily')     { d = d || getAllData(); content = renderDailyReport(d); }

  return '<div class="page rep-page" data-rep-root>' +
    '<div class="rep-header">' +
      '<div><div class="rep-title">📊 گزارش‌گیری جامع</div>' +
      '<div class="rep-sub">' + fa((d && d.transactions && d.transactions.length) || 0) + ' تراکنش • امروز ' + todayStr + '</div></div>' +
      '<button class="rep-export" data-rep="export">📤 <span>خروجی</span></button>' +
    '</div>' +
    '<div class="rep-tabs">' +
      '<button class="rep-tab ' + (t === 'overview' ? 'on' : '') + '" data-rep="tab" data-t="overview">📋 خلاصه</button>' +
      '<button class="rep-tab ' + (t === 'finance' ? 'on' : '') + '" data-rep="tab" data-t="finance">💰 مالی</button>' +
      '<button class="rep-tab ' + (t === 'flocks' ? 'on' : '') + '" data-rep="tab" data-t="flocks">🐔 گله‌ها</button>' +
      '<button class="rep-tab ' + (t === 'inventory' ? 'on' : '') + '" data-rep="tab" data-t="inventory">📦 انبار</button>' +
      '<button class="rep-tab ' + (t === 'daily' ? 'on' : '') + '" data-rep="tab" data-t="daily">📅 روزانه</button>' +
    '</div>' +
    content +
  '</div>';
}

function renderRoot(){
  var root = document.querySelector('[data-rep-root]');
  if(!root) return;
  var fresh = document.createElement('div');
  fresh.innerHTML = renderPage();
  root.parentNode.replaceChild(fresh.firstElementChild, root);
}

/* ═══ Export ═══ */
function exportJSON(){
  try{
    var data = getAllData();
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'adineh-report-' + todayStr.replace(/\//g, '-') + '.json';
    a.click();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
    toast('📤 گزارش دانلود شد', 'success');
  }catch(e){
    toast('❌ خطا در خروجی', 'error');
  }
}

/* ═══ Events ═══ */
document.addEventListener('click', function(e){
  var btn = e.target.closest ? e.target.closest('[data-rep]') : null;
  if(!btn) return;
  var act = btn.dataset.rep;

  if(act === 'tab'){
    uiState.tab = btn.dataset.t;
    renderRoot();
  } else if(act === 'export'){
    exportJSON();
  }
});

/* ═══ Init ═══ */
injectStyles();

Router.register('reports', {
  title: 'گزارش‌گیری',
  navPage: 'more',
  topLevel: true,
  render: function(){ return renderPage(); }
});

window.Reports = {
  render: renderPage,
  getAllData: getAllData,
  exportJSON: exportJSON
};

console.log('✅ reports route registered (v2.0)');

})();