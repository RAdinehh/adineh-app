/* ═══════════════════════════════════════════════
   DASHBOARD — داشبورد حرفه‌ای (v12.0)
   نمودار هوشمند: دوره + نوع + بازه سفارشی
   ساخته شده توسط رضا آدینه
   ═══════════════════════════════════════════════ */
(function(){
'use strict';

if(typeof Router === 'undefined' || typeof Router.register !== 'function'){
  console.error('❌ Router not available');
  return;
}
if(window.__dashboardModuleLoaded) return;
window.__dashboardModuleLoaded = true;

var esc = UI.esc, fa = UI.fa, toFa = UI.toFa;
var fmtShort = UI.formatShort;
var jToC = UI.jToC, todayStr = UI.todayStr;

/* ═══ State نمودار ═══ */
var _chartMode = 'deaths';      /* deaths | eggs | feed */
var _chartPeriod = 7;            /* 1 | 7 | 14 | 'custom' */
var _chartType = 'bar';          /* bar | line */
var _customFrom = '';
var _customTo = '';

/* ═══ State بخش‌های باز/بسته ═══ */
var _openSections = {
  stats: true, finance: true, flock: true, topFlock: true,
  flockStatus: true, today: true, chart: true, compare: true,
  recent: true, quick: true
};

function isOpen(id){ return !!_openSections[id]; }

function getArr(key){
  try{ return (Store.all && Store.all(key)) || []; }
  catch(e){ return []; }
}

/* ═══════════════════════════════════════════════
   Data Collection
   ═══════════════════════════════════════════════ */
function collectData(){
  var flocks = getArr('flocks').filter(function(f){ return !f.isDeleted; });
  var daily = getArr('dailyRecords');
  var sales = getArr('sales');
  var allTx = getArr('transactions');
  var finance = allTx.filter(function(t){
    return !t.kind || t.kind === 'finance_income' || t.kind === 'finance_expense'
      || t.transType === 'income' || t.transType === 'expense';
  });

  var totalAlive = 0, totalDeaths = 0, totalInitial = 0;
  var warnFlocks = [];
  var flockStats = [];

  for(var i = 0; i < flocks.length; i++){
    var f = flocks[i];
    var count = f.count || f.initialCount || 0;
    var alive = f.alive || f.aliveCount || 0;
    var deaths = f.deaths || 0;
    totalAlive += alive;
    totalDeaths += deaths;
    totalInitial += count;

    var pct = count > 0 ? (deaths / count) * 100 : 0;
    var alivePct = count > 0 ? (alive / count) * 100 : 0;
    var age = Math.max(0, jToC(todayStr) - jToC(f.hatch || f.hatchDate));

    flockStats.push({
      id: f.id, name: f.name, alive: alive, deaths: deaths,
      initial: count, deathPct: pct, alivePct: alivePct, age: age,
      color: f.color || '#0f766e', hall: f.hall || ''
    });

    if(pct > 15){
      warnFlocks.push({ name: f.name, pct: pct, deaths: deaths, alive: alive });
    }
  }

  flockStats.sort(function(a, b){ return b.alive - a.alive; });
  var topFlock = flockStats.length ? flockStats[0] : null;

  var income = 0, expense = 0;
  for(i = 0; i < finance.length; i++){
    var t = finance[i];
    var isInc = t.transType === 'income' || t.kind === 'finance_income';
    if(isInc) income += t.amount || 0;
    else expense += t.amount || 0;
  }

  var salesTotal = 0;
  for(i = 0; i < sales.length; i++){
    salesTotal += sales[i].total || (sales[i].qty || 0) * (sales[i].price || 0);
  }

  var todayC = jToC(todayStr);
  var week1Start = todayC - 7;
  var week2Start = todayC - 14;

  var week1 = { deaths: 0, eggs: 0, feed: 0, income: 0, expense: 0 };
  var week2 = { deaths: 0, eggs: 0, feed: 0, income: 0, expense: 0 };

  for(i = 0; i < daily.length; i++){
    var dc = jToC(daily[i].date);
    if(dc > week1Start && dc <= todayC){
      week1.deaths += daily[i].deaths || 0;
      week1.eggs += daily[i].eggs || 0;
      week1.feed += daily[i].feed || 0;
    } else if(dc > week2Start && dc <= week1Start){
      week2.deaths += daily[i].deaths || 0;
      week2.eggs += daily[i].eggs || 0;
      week2.feed += daily[i].feed || 0;
    }
  }

  for(i = 0; i < finance.length; i++){
    var fc = jToC(finance[i].date);
    var isInc2 = finance[i].transType === 'income' || finance[i].kind === 'finance_income';
    var amt = finance[i].amount || 0;
    if(fc > week1Start && fc <= todayC){
      if(isInc2) week1.income += amt;
      else week1.expense += amt;
    } else if(fc > week2Start && fc <= week1Start){
      if(isInc2) week2.income += amt;
      else week2.expense += amt;
    }
  }

  function pctChange(cur, prev){
    if(prev === 0) return cur > 0 ? 100 : 0;
    return ((cur - prev) / prev) * 100;
  }

  var changes = {
    deaths: pctChange(week1.deaths, week2.deaths),
    eggs: pctChange(week1.eggs, week2.eggs),
    feed: pctChange(week1.feed, week2.feed),
    income: pctChange(week1.income, week2.income),
    expense: pctChange(week1.expense, week2.expense)
  };

  var todayDeaths = 0, todayEggs = 0, todayFeed = 0;
  for(i = 0; i < daily.length; i++){
    if(daily[i].date === todayStr){
      todayDeaths += daily[i].deaths || 0;
      todayEggs += daily[i].eggs || 0;
      todayFeed += daily[i].feed || 0;
    }
  }

  var sorted = daily.slice().sort(function(a,b){ return jToC(b.date) - jToC(a.date); });
  var recent = sorted.slice(0, 5);
  var alivePct = totalInitial > 0 ? ((totalAlive / totalInitial) * 100).toFixed(1) : '0';
  var deathPct = totalInitial > 0 ? ((totalDeaths / totalInitial) * 100).toFixed(1) : '0';

  return {
    flocks: flockStats, flockCount: flocks.length,
    alive: totalAlive, deaths: totalDeaths, initial: totalInitial,
    alivePct: alivePct, deathPct: deathPct,
    warns: warnFlocks, topFlock: topFlock,
    income: income, expense: expense, profit: income - expense,
    salesTotal: salesTotal, dailyCount: daily.length, salesCount: sales.length,
    todayDeaths: todayDeaths, todayEggs: todayEggs, todayFeed: todayFeed,
    week1: week1, week2: week2, changes: changes,
    recentDaily: recent,
    allDaily: daily
  };
}

/* ═══════════════════════════════════════════════
   Chart Data — محاسبه بر اساس دوره
   ═══════════════════════════════════════════════ */
function getChartData(daily){
  var todayC = jToC(todayStr);
  var fromC, toC;

  if(_chartPeriod === 'custom'){
    fromC = _customFrom ? jToC(_customFrom) : todayC - 6;
    toC = _customTo ? jToC(_customTo) : todayC;
    if(fromC > toC){ var tmp = fromC; fromC = toC; toC = tmp; }
  } else {
    toC = todayC;
    fromC = todayC - (parseInt(_chartPeriod) - 1);
  }

  var map = {};
  for(var i = 0; i < daily.length; i++){
    var dc = jToC(daily[i].date);
    if(dc >= fromC && dc <= toC){
      if(!map[daily[i].date]){
        map[daily[i].date] = { deaths: 0, eggs: 0, feed: 0 };
      }
      map[daily[i].date].deaths += daily[i].deaths || 0;
      map[daily[i].date].eggs += daily[i].eggs || 0;
      map[daily[i].date].feed += daily[i].feed || 0;
    }
  }

  var dates = Object.keys(map).sort(function(a,b){ return jToC(a) - jToC(b); });
  var days = [];
  var values = [];
  for(var j = 0; j < dates.length; j++){
    days.push(dates[j]);
    values.push(map[dates[j]][_chartMode]);
  }

  return { days: days, values: values, fromC: fromC, toC: toC };
}

function getPeriodLabel(){
  if(_chartPeriod === 'custom'){
    if(_customFrom && _customTo) return _customFrom + ' → ' + _customTo;
    return 'بازه سفارشی';
  }
  if(_chartPeriod === 1) return '۱ روز اخیر';
  if(_chartPeriod === 7) return '۷ روز اخیر';
  if(_chartPeriod === 14) return '۱۴ روز اخیر';
  return _chartPeriod + ' روز';
}

/* ═══════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════ */
function changeBadge(pct, goodWhenNegative){
  if(pct === 0) return '<span class="db-chg n">— 0٪</span>';
  var positive = pct > 0;
  var isGood = goodWhenNegative ? !positive : positive;
  var cls = isGood ? 'g' : 'r';
  var arrow = positive ? '↑' : '↓';
  return '<span class="db-chg ' + cls + '">' + arrow + ' ' + Math.abs(pct).toFixed(0) + '٪</span>';
}

function kpiCard(icon, val, label, color, bg){
  return '<div class="db-kpi" style="background:' + bg + '">' +
    '<div class="db-kpi-top">' +
      '<div class="db-kpi-ic" style="background:' + color + '22;color:' + color + '">' + icon + '</div>' +
    '</div>' +
    '<div class="db-kpi-val" style="color:' + color + '">' + val + '</div>' +
    '<div class="db-kpi-lbl">' + label + '</div>' +
  '</div>';
}

function quickBtn(page, icon, label, color){
  return '<button class="db-quick-btn" data-dash-go="' + page + '">' +
    '<div class="db-quick-ic" style="background:' + color + '15;color:' + color + '">' + icon + '</div>' +
    '<div class="db-quick-lbl">' + label + '</div>' +
  '</button>';
}

function collapsibleCard(id, icon, title, badge, bodyHtml, opts){
  opts = opts || {};
  var open = isOpen(id);
  var page = opts.page || '';
  var extraClass = opts.className || '';
  var goBtn = page
    ? '<button class="db-card-go" data-dash-go="' + page + '" title="مشاهده">مشاهده ←</button>'
    : '';
  return '<div class="db-card ' + extraClass + ' ' + (open ? 'open' : '') + '" data-dash-card="' + id + '">' +
    '<div class="db-card-hd" data-dash-toggle="' + id + '">' +
      '<div class="db-card-ttl"><span>' + icon + '</span> ' + title + '</div>' +
      (badge ? '<div class="db-card-badge">' + badge + '</div>' : '') +
      goBtn +
      '<div class="db-card-arrow">▼</div>' +
    '</div>' +
    '<div class="db-card-bd">' + bodyHtml + '</div>' +
  '</div>';
}

/* ═══════════════════════════════════════════════
   Chart Section Render
   ═══════════════════════════════════════════════ */
function renderChartSection(d){
  var mode = _chartMode;
  var modeLabel = mode === 'deaths' ? 'تلفات' : mode === 'eggs' ? 'تخم' : 'خوراک';
  var modeUnit = mode === 'feed' ? ' kg' : '';
  var modeColor = mode === 'deaths' ? '#ef4444' : mode === 'eggs' ? '#3b82f6' : '#f59e0b';
  var modeIcon = mode === 'deaths' ? '💀' : mode === 'eggs' ? '🥚' : '🌾';

  var cd = getChartData(d.allDaily);

  /* ═══ نوع داده ═══ */
  var typeTabs = '<div class="db-ch-tabs">' +
    '<button class="db-ch-tab ' + (mode === 'deaths' ? 'on' : '') + '" data-dash-chart="deaths">💀 تلفات</button>' +
    '<button class="db-ch-tab ' + (mode === 'eggs' ? 'on' : '') + '" data-dash-chart="eggs">🥚 تخم</button>' +
    '<button class="db-ch-tab ' + (mode === 'feed' ? 'on' : '') + '" data-dash-chart="feed">🌾 خوراک</button>' +
  '</div>';

  /* ═══ دوره ═══ */
  var periodTabs = '<div class="db-ch-periods">' +
    '<button class="db-ch-period ' + (_chartPeriod == 1 ? 'on' : '') + '" data-dash-period="1">۱ روزه</button>' +
    '<button class="db-ch-period ' + (_chartPeriod == 7 ? 'on' : '') + '" data-dash-period="7">۷ روزه</button>' +
    '<button class="db-ch-period ' + (_chartPeriod == 14 ? 'on' : '') + '" data-dash-period="14">۱۴ روزه</button>' +
    '<button class="db-ch-period ' + (_chartPeriod === 'custom' ? 'on' : '') + '" data-dash-period="custom">🗓️ سفارشی</button>' +
  '</div>';

  /* ═══ بازه سفارشی ═══ */
  var customRange = '';
  if(_chartPeriod === 'custom'){
    customRange = '<div class="db-ch-custom">' +
      '<div class="db-ch-date-field">' +
        '<label>از</label>' +
        '<input type="text" readonly data-dash-custom="from" value="' + esc(_customFrom) + '" placeholder="انتخاب..." class="db-ch-date-input" id="dbCustomFrom">' +
        '<button type="button" class="db-ch-date-btn" data-dash-cal="dbCustomFrom">📅</button>' +
      '</div>' +
      '<div class="db-ch-date-field">' +
        '<label>تا</label>' +
        '<input type="text" readonly data-dash-custom="to" value="' + esc(_customTo) + '" placeholder="انتخاب..." class="db-ch-date-input" id="dbCustomTo">' +
        '<button type="button" class="db-ch-date-btn" data-dash-cal="dbCustomTo">📅</button>' +
      '</div>' +
    '</div>';
  }

  /* ═══ نوع نمودار ═══ */
  var chartTypeBtns = '<div class="db-ch-types">' +
    '<button class="db-ch-type ' + (_chartType === 'bar' ? 'on' : '') + '" data-dash-type="bar">📊 میله‌ای</button>' +
    '<button class="db-ch-type ' + (_chartType === 'line' ? 'on' : '') + '" data-dash-type="line">📈 خطی</button>' +
  '</div>';

  /* ═══ خلاصه آمار دوره ═══ */
  var sum = 0, max = 0, avg = 0;
  for(var s = 0; s < cd.values.length; s++){
    sum += cd.values[s];
    if(cd.values[s] > max) max = cd.values[s];
  }
  if(cd.values.length > 0) avg = sum / cd.values.length;

  var summary = '<div class="db-ch-summary">' +
    '<div class="db-ch-sum-item">' +
      '<div class="db-ch-sum-val">' + fa(sum) + '</div>' +
      '<div class="db-ch-sum-lbl">جمع</div>' +
    '</div>' +
    '<div class="db-ch-sum-item">' +
      '<div class="db-ch-sum-val">' + avg.toFixed(1) + '</div>' +
      '<div class="db-ch-sum-lbl">میانگین</div>' +
    '</div>' +
    '<div class="db-ch-sum-item">' +
      '<div class="db-ch-sum-val" style="color:' + modeColor + '">' + fa(max) + '</div>' +
      '<div class="db-ch-sum-lbl">بیشترین</div>' +
    '</div>' +
  '</div>';

  /* ═══ خود نمودار ═══ */
  var chartHtml = '';
  if(cd.days.length === 0){
    chartHtml = '<div class="db-ch-empty">📭<br>در این بازه داده‌ای ثبت نشده</div>';
  } else if(!window.Charts){
    chartHtml = '<div class="db-ch-empty">⚠️ کتابخانه نمودار لود نشده</div>';
  } else if(_chartType === 'line'){
    /* نمودار خطی */
    var linePoints = cd.days.map(function(dt, idx){
      return { x: idx, y: cd.values[idx] };
    });

    chartHtml = Charts.line({
      height: 180,
      yUnit: modeLabel + modeUnit,
      series: [{
        label: modeLabel,
        color: modeColor,
        points: linePoints
      }],
      xLabels: cd.days.map(function(dt, idx){ return idx; }),
      formatX: function(x){
        var dt = cd.days[x];
        if(!dt) return '';
        var p = dt.split('/');
        return p.length === 3 ? toFa(p[2]) : '';
      },
      formatY: function(y){ return Math.round(y); },
      showLegend: false,
      showArea: true
    });
  } else {
    /* نمودار میله‌ای */
    var barItems = cd.days.map(function(dt, idx){
      var parts = dt.split('/');
      return {
        label: parts.length === 3 ? toFa(parts[2]) : dt,
        value: cd.values[idx],
        color: cd.values[idx] > 0 ? modeColor : '#cbd5e1'
      };
    });

    chartHtml = Charts.bar({
      items: barItems,
      height: 180,
      yUnit: modeLabel + modeUnit,
      formatY: function(y){ return Math.round(y); }
    });
  }

  return typeTabs + periodTabs + customRange + chartTypeBtns + summary + chartHtml;
}

/* ═══════════════════════════════════════════════
   Render
   ═══════════════════════════════════════════════ */
function renderPage(){
  injectStyles();

  var d = collectData();
  var farm = Store.getFarm();
  var now = new Date();
  var hours = now.getHours();
  var greeting = hours < 12 ? 'صبح بخیر' : hours < 18 ? 'ظهر بخیر' : 'شب بخیر';
  var greetingIcon = hours < 12 ? '☀️' : hours < 18 ? '🌤️' : '🌙';

  var dayNames = ['یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه','شنبه'];
  var dayName = dayNames[now.getDay()];

  /* ═══ Empty State ═══ */
  if(d.flockCount === 0 && d.dailyCount === 0){
    return '<div class="page db-page">' +
      '<div class="db-hero">' +
        '<div class="db-hero-bg"></div>' +
        '<div class="db-hero-inner">' +
          '<div class="db-hero-left">' +
            '<div class="db-hero-greet">' + greetingIcon + ' ' + greeting + '</div>' +
            '<div class="db-hero-farm">' + esc(farm.name || 'مرغداری من') + '</div>' +
            '<div class="db-hero-date">📅 ' + dayName + ' • ' + todayStr + '</div>' +
          '</div>' +
          '<div class="db-hero-icon">🐔</div>' +
        '</div>' +
      '</div>' +
      '<div class="db-welcome">' +
        '<div class="db-welcome-ic">🎉</div>' +
        '<div class="db-welcome-title">خوش آمدید!</div>' +
        '<div class="db-welcome-text">برای شروع، اولین گله خود را ثبت کنید</div>' +
        '<button class="db-welcome-btn" data-dash-go="flocks">🐔 افزودن گله</button>' +
      '</div>' +
    '</div>';
  }

  /* ═══ هشدار ═══ */
  var alerts = '';
  if(d.warns.length > 0){
    alerts = '<div class="db-alert">' +
      '<div class="db-alert-head">' +
        '<span class="db-alert-ic">⚠️</span>' +
        '<span>' + fa(d.warns.length) + ' گله نیاز به بررسی</span>' +
        '<button class="db-alert-more" data-dash-go="flocks">مشاهده ←</button>' +
      '</div>' +
      d.warns.slice(0, 2).map(function(w){
        return '<div class="db-alert-row">' +
          '<span class="db-alert-name">🐔 ' + esc(w.name) + '</span>' +
          '<span class="db-alert-stat">' + fa(w.alive) + ' زنده</span>' +
          '<span class="db-alert-pct">' + w.pct.toFixed(1) + '٪</span>' +
        '</div>';
      }).join('') +
    '</div>';
  }

  /* ═══ کارت آمار اصلی ═══ */
  var statsBody = '<div class="db-stats-grid">' +
    '<div class="db-stat-box">' +
      '<div class="db-stat-ic" style="background:#ecfdf5;color:#10b981">🐔</div>' +
      '<div class="db-stat-val" style="color:#10b981">' + fa(d.alive) + '</div>' +
      '<div class="db-stat-lbl">زنده</div>' +
    '</div>' +
    '<div class="db-stat-box">' +
      '<div class="db-stat-ic" style="background:#eff6ff;color:#3b82f6">📊</div>' +
      '<div class="db-stat-val" style="color:#3b82f6">' + d.alivePct + '٪</div>' +
      '<div class="db-stat-lbl">بقا</div>' +
    '</div>' +
    '<div class="db-stat-box">' +
      '<div class="db-stat-ic" style="background:#fef2f2;color:#ef4444">💀</div>' +
      '<div class="db-stat-val" style="color:#ef4444">' + fa(d.deaths) + '</div>' +
      '<div class="db-stat-lbl">تلفات</div>' +
    '</div>' +
  '</div>' +
  '<div class="db-stats-bar">' +
    '<div class="db-stats-progress">' +
      '<div class="db-stats-progress-fill" style="width:' + d.alivePct + '%"></div>' +
    '</div>' +
    '<div class="db-stats-note">از ' + fa(d.initial) + ' جوجه اولیه</div>' +
  '</div>';

  var statsCard = collapsibleCard('stats', '📊', 'وضعیت کلی', fa(d.flockCount) + ' گله', statsBody, {
    page: 'flocks', className: 'db-stats-card'
  });

  /* ═══ خلاصه مالی ═══ */
  var financeBody = '<div class="db-kpi-row">' +
    kpiCard('💰', fmtShort(d.salesTotal), 'کل فروش', '#f59e0b', '#fffbeb') +
    kpiCard('📈', fmtShort(d.income), 'درآمد', '#10b981', '#ecfdf5') +
    kpiCard('📉', fmtShort(d.expense), 'هزینه', '#ef4444', '#fef2f2') +
  '</div>' +
  '<div class="db-profit-row">' +
    '<span class="db-profit-lbl">💵 سود خالص</span>' +
    '<span class="db-profit-val" style="color:' + (d.profit >= 0 ? '#10b981' : '#ef4444') + '">' +
      fmtShort(Math.abs(d.profit)) + ' تومان' +
    '</span>' +
  '</div>';

  var financeCard = collapsibleCard('finance', '💼', 'خلاصه مالی', '', financeBody, { page: 'finance' });

  /* ═══ خلاصه گله ═══ */
  var flockBody = '<div class="db-kpi-row">' +
    kpiCard('🐔', fa(d.alive), 'زنده', '#10b981', '#ecfdf5') +
    kpiCard('💀', fa(d.deaths), 'تلفات', '#ef4444', '#fef2f2') +
    kpiCard('📊', d.deathPct + '٪', 'نرخ تلفات', '#f59e0b', '#fffbeb') +
  '</div>';

  var flockCard = collapsibleCard('flock', '🐔', 'خلاصه گله', fa(d.flockCount) + ' گله فعال', flockBody, { page: 'flocks' });

  /* ═══ گله برتر ═══ */
  var topFlockBody = '';
  if(d.topFlock){
    var tf = d.topFlock;
    topFlockBody = '<div class="db-tf-stats">' +
      '<div class="db-tf-stat">' +
        '<div class="db-tf-val" style="color:#10b981">' + fa(tf.alive) + '</div>' +
        '<div class="db-tf-lbl">زنده</div>' +
      '</div>' +
      '<div class="db-tf-stat">' +
        '<div class="db-tf-val" style="color:#3b82f6">' + fa(tf.age) + '</div>' +
        '<div class="db-tf-lbl">روز</div>' +
      '</div>' +
      '<div class="db-tf-stat">' +
        '<div class="db-tf-val" style="color:#f59e0b">' + tf.deathPct.toFixed(1) + '٪</div>' +
        '<div class="db-tf-lbl">تلفات</div>' +
      '</div>' +
    '</div>';
  }
  var topFlockCard = d.topFlock ? collapsibleCard('topFlock', '🏆', 'گله برتر', esc(d.topFlock.name), topFlockBody, {
    page: 'flocks', className: 'db-top-flock'
  }) : '';

  /* ═══ وضعیت گله‌ها ═══ */
  var flockStatusBody = '';
  if(d.flocks.length){
    flockStatusBody = '<div class="db-flock-list">';
    var maxFlockShow = 6;
    for(var fi = 0; fi < Math.min(d.flocks.length, maxFlockShow); fi++){
      var fs = d.flocks[fi];
      var pct = fs.alivePct;
      var cls = pct >= 90 ? 'g' : pct >= 75 ? 'o' : 'r';
      var warn = fs.deathPct > 15 ? '<span class="db-flock-warn">⚠️</span>' : '';
      flockStatusBody +=
        '<div class="db-flock-row" data-dash-go="flocks">' +
          '<div class="db-flock-color" style="background:' + fs.color + '"></div>' +
          '<div class="db-flock-info">' +
            '<div class="db-flock-name">' + esc(fs.name) + ' ' + warn + '</div>' +
            '<div class="db-flock-meta">' + fa(fs.alive) + ' از ' + fa(fs.initial) + ' • ' + fa(fs.age) + ' روز' +
              (fs.hall ? ' • 🏢 ' + esc(fs.hall) : '') +
            '</div>' +
          '</div>' +
          '<div class="db-flock-progress-wrap">' +
            '<div class="db-flock-progress">' +
              '<div class="db-flock-fill db-flock-fill-' + cls + '" style="width:' + pct + '%"></div>' +
            '</div>' +
            '<div class="db-flock-pct db-flock-pct-' + cls + '">' + pct.toFixed(0) + '٪</div>' +
          '</div>' +
        '</div>';
    }
    if(d.flocks.length > maxFlockShow){
      flockStatusBody += '<div class="db-flock-more" data-dash-go="flocks">+ ' +
        fa(d.flocks.length - maxFlockShow) + ' گله دیگر ←</div>';
    }
    flockStatusBody += '</div>';
  }

  var flockStatusCard = d.flocks.length ? collapsibleCard(
    'flockStatus', '🐔', 'وضعیت گله‌ها',
    fa(d.flocks.length) + ' گله',
    flockStatusBody,
    { page: 'flocks' }
  ) : '';

  /* ═══ امروز ═══ */
  var todayBody = '<div class="db-today-grid">' +
    '<div class="db-today-item">' +
      '<div class="db-today-ic" style="background:#fef2f2;color:#ef4444">💀</div>' +
      '<div class="db-today-val" style="color:#ef4444">' + fa(d.todayDeaths) + '</div>' +
      '<div class="db-today-lbl">تلفات</div>' +
    '</div>' +
    '<div class="db-today-item">' +
      '<div class="db-today-ic" style="background:#eff6ff;color:#3b82f6">🥚</div>' +
      '<div class="db-today-val" style="color:#3b82f6">' + fa(d.todayEggs) + '</div>' +
      '<div class="db-today-lbl">تخم</div>' +
    '</div>' +
    '<div class="db-today-item">' +
      '<div class="db-today-ic" style="background:#fffbeb;color:#f59e0b">🌾</div>' +
      '<div class="db-today-val" style="color:#f59e0b">' + fa(d.todayFeed) + '</div>' +
      '<div class="db-today-lbl">خوراک (kg)</div>' +
    '</div>' +
  '</div>';

  var todayCard = collapsibleCard('today', '📅', 'امروز', dayName + ' • ' + todayStr, todayBody, { page: 'daily' });

  /* ═══ نمودار ═══ */
  var chartCard = collapsibleCard(
    'chart', '📈', 'روند فعالیت',
    getPeriodLabel(),
    renderChartSection(d),
    { page: 'daily' }
  );

  /* ═══ مقایسه هفته ═══ */
  var weekCompareBody = '<div class="db-compare-list">' +
    '<div class="db-compare-row">' +
      '<div class="db-compare-lbl">💀 تلفات</div>' +
      '<div class="db-compare-val">' + fa(d.week1.deaths) + '</div>' +
      changeBadge(d.changes.deaths, true) +
    '</div>' +
    '<div class="db-compare-row">' +
      '<div class="db-compare-lbl">🥚 تخم</div>' +
      '<div class="db-compare-val">' + fa(d.week1.eggs) + '</div>' +
      changeBadge(d.changes.eggs, false) +
    '</div>' +
    '<div class="db-compare-row">' +
      '<div class="db-compare-lbl">🌾 خوراک (kg)</div>' +
      '<div class="db-compare-val">' + fa(d.week1.feed) + '</div>' +
      changeBadge(d.changes.feed, false) +
    '</div>' +
    '<div class="db-compare-row">' +
      '<div class="db-compare-lbl">📈 درآمد</div>' +
      '<div class="db-compare-val">' + fmtShort(d.week1.income) + '</div>' +
      changeBadge(d.changes.income, false) +
    '</div>' +
    '<div class="db-compare-row">' +
      '<div class="db-compare-lbl">📉 هزینه</div>' +
      '<div class="db-compare-val">' + fmtShort(d.week1.expense) + '</div>' +
      changeBadge(d.changes.expense, true) +
    '</div>' +
  '</div>';

  var compareCard = collapsibleCard('compare', '⚖️', 'مقایسه هفته', 'این هفته vs قبل', weekCompareBody, { page: 'reports' });

  /* ═══ آخرین ثبت‌ها ═══ */
  var recentBody = '';
  if(d.recentDaily.length){
    recentBody = '<div class="db-recent-list">' +
      d.recentDaily.map(function(r){
        var hasDeath = (r.deaths || 0) > 0;
        var cls = (r.deaths || 0) > 5 ? 'r' : hasDeath ? 'o' : 'g';
        return '<div class="db-recent-row">' +
          '<div class="db-recent-icon db-recent-icon-' + cls + '">' +
            (hasDeath ? '💀' : '✅') +
          '</div>' +
          '<div class="db-recent-info">' +
            '<div class="db-recent-name">' + esc(r.flock || '—') + '</div>' +
            '<div class="db-recent-meta">📅 ' + esc(r.date) + '</div>' +
          '</div>' +
          '<div class="db-recent-stats">' +
            (hasDeath ? '<span class="db-recent-tag r">💀 ' + fa(r.deaths) + '</span>' : '') +
            ((r.eggs || 0) > 0 ? '<span class="db-recent-tag b">🥚 ' + fa(r.eggs) + '</span>' : '') +
          '</div>' +
        '</div>';
      }).join('') +
    '</div>';
  } else {
    recentBody = '<div class="db-empty-small">هنوز رکوردی ثبت نشده</div>';
  }

  var recentCard = collapsibleCard('recent', '📋', 'آخرین ثبت‌ها', '', recentBody, { page: 'daily' });

  /* ═══ دسترسی سریع ═══ */
  var quickBody = '<div class="db-quick-grid">' +
    quickBtn('daily', '📅', 'ثبت روزانه', '#3b82f6') +
    quickBtn('sales', '🏷️', 'ثبت فروش', '#f59e0b') +
    quickBtn('finance', '💼', 'مالی', '#10b981') +
    quickBtn('flocks', '🐔', 'گله‌ها', '#8b5cf6') +
    quickBtn('inventory', '📦', 'انبار', '#06b6d4') +
    quickBtn('medicine', '💊', 'دارو', '#ef4444') +
  '</div>';

  var quickCard = collapsibleCard('quick', '⚡', 'دسترسی سریع', '', quickBody);

  return '<div class="page db-page">' +

    '<div class="db-hero">' +
      '<div class="db-hero-bg"></div>' +
      '<div class="db-hero-inner">' +
        '<div class="db-hero-left">' +
          '<div class="db-hero-greet">' + greetingIcon + ' ' + greeting + '</div>' +
          '<div class="db-hero-farm">' + esc(farm.name || 'مرغداری من') + '</div>' +
          '<div class="db-hero-date">📅 ' + dayName + ' • ' + todayStr + '</div>' +
        '</div>' +
        '<div class="db-hero-icon">🐔</div>' +
      '</div>' +
    '</div>' +

    alerts +
    statsCard +
    financeCard +
    flockCard +
    topFlockCard +
    flockStatusCard +
    todayCard +
    chartCard +
    compareCard +
    recentCard +
    quickCard +

  '</div>';
}

/* ═══════════════════════════════════════════════
   CSS
   ═══════════════════════════════════════════════ */
function injectStyles(){
  if(document.getElementById('dash-styles')) return;
  var s = document.createElement('style');
  s.id = 'dash-styles';
  s.textContent = `
.db-page{padding:10px 12px 24px;max-width:760px;margin:0 auto}

/* ═══ HERO ═══ */
.db-hero{position:relative;overflow:hidden;background:linear-gradient(135deg,#0f766e 0%,#14b8a6 100%);border-radius:18px;margin-bottom:14px;box-shadow:0 6px 20px rgba(15,118,110,.25);color:#fff}
.db-hero-bg{position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 90% 10%,rgba(255,255,255,.15) 0%,transparent 45%),radial-gradient(circle at 10% 90%,rgba(255,255,255,.08) 0%,transparent 45%)}
.db-hero-inner{position:relative;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px}
.db-hero-left{flex:1;min-width:0}
.db-hero-greet{font-size:11.5px;opacity:.9;font-weight:600;margin-bottom:3px}
.db-hero-farm{font-size:18px;font-weight:900;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-.3px}
.db-hero-date{font-size:10.5px;opacity:.85;font-weight:700;margin-top:5px}
.db-hero-icon{width:54px;height:54px;border-radius:15px;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;font-size:29px;flex-shrink:0}

/* ═══ Card Collapsible ═══ */
.db-card{background:#fff;border-radius:14px;border:1px solid #e2e8f0;margin-bottom:10px;box-shadow:0 1px 3px rgba(15,23,42,.04);overflow:hidden}
.db-card-hd{display:flex;align-items:center;gap:6px;padding:12px 12px 12px 14px;cursor:pointer;user-select:none;transition:background .12s}
.db-card-hd:active{background:#f8fafc}
.db-card-ttl{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:900;color:#0f172a;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.db-card-ttl span{font-size:14px;flex-shrink:0}
.db-card-badge{font-size:9.5px;font-weight:800;background:#f0fdfa;color:#0f766e;padding:3px 8px;border-radius:9999px;white-space:nowrap;flex-shrink:0;max-width:120px;overflow:hidden;text-overflow:ellipsis}
.db-card-go{background:#f0fdfa;border:1px solid #a7f3d0;color:#0f766e;font-family:inherit;font-size:10px;font-weight:900;padding:5px 10px;border-radius:9999px;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:background .15s,color .15s}
.db-card-go:active{background:#0f766e;color:#fff;border-color:#0f766e}
.db-card-arrow{font-size:10px;font-weight:900;color:#0f766e;width:22px;height:22px;border-radius:50%;background:#f1f5f9;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:transform .25s,background .2s,color .2s}
.db-card.open .db-card-arrow{transform:rotate(180deg);background:#0f766e;color:#fff}
.db-card-bd{max-height:0;overflow:hidden;opacity:0;transition:max-height .35s ease,opacity .25s ease,padding .3s;padding:0 14px}
.db-card.open .db-card-bd{max-height:3000px;opacity:1;padding:0 14px 14px;border-top:1px solid #f1f5f9}

/* ═══ Stats ═══ */
.db-stats-card{background:linear-gradient(135deg,#f0fdfa 0%,#ecfdf5 100%);border-color:#a7f3d0}
.db-stats-card .db-card-hd:active{background:rgba(240,253,250,.7)}
.db-stats-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}
.db-stat-box{background:rgba(255,255,255,.7);border-radius:12px;padding:12px 6px;text-align:center;border:1px solid rgba(255,255,255,.8)}
.db-stat-ic{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:17px;margin:0 auto 6px}
.db-stat-val{font-size:17px;font-weight:900;line-height:1.1;margin-bottom:3px}
.db-stat-lbl{font-size:9.5px;color:#64748b;font-weight:800}
.db-stats-bar{background:rgba(255,255,255,.7);border-radius:12px;padding:10px 12px}
.db-stats-progress{height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;margin-bottom:6px}
.db-stats-progress-fill{height:100%;background:linear-gradient(90deg,#10b981,#34d399);border-radius:4px;transition:width .5s}
.db-stats-note{font-size:10px;color:#64748b;font-weight:700;text-align:center}

/* ═══ KPI ═══ */
.db-kpi-row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.db-kpi{border-radius:12px;padding:10px 6px 8px;text-align:center;border:1px solid rgba(0,0,0,.04)}
.db-kpi-top{display:flex;justify-content:center;margin-bottom:5px}
.db-kpi-ic{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:15px}
.db-kpi-val{font-size:14.5px;font-weight:900;line-height:1.15;margin-bottom:2px}
.db-kpi-lbl{font-size:9.5px;color:#64748b;font-weight:800}

/* ═══ Profit ═══ */
.db-profit-row{display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding:10px 12px;background:#f0fdfa;border-radius:10px;border:1px solid #a7f3d0}
.db-profit-lbl{font-size:11.5px;font-weight:800;color:#065f46}
.db-profit-val{font-size:13px;font-weight:900}

/* ═══ Top Flock ═══ */
.db-top-flock{background:linear-gradient(135deg,#fffbeb 0%,#fef3c7 100%) !important;border-color:#fcd34d !important}
.db-top-flock .db-card-hd:active{background:rgba(255,251,235,.7) !important}
.db-top-flock .db-card-ttl{color:#78350f !important}
.db-top-flock .db-card-badge{background:#fef3c7 !important;color:#92400e !important}
.db-top-flock .db-card-go{background:#fef3c7 !important;color:#92400e !important;border-color:#fbbf24 !important}
.db-top-flock .db-card-arrow{background:rgba(255,255,255,.6) !important;color:#92400e !important}
.db-top-flock.open .db-card-arrow{background:#f59e0b !important;color:#fff !important}
.db-top-flock .db-card-bd{border-top-color:rgba(252,211,77,.3) !important}
.db-tf-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.db-tf-stat{background:rgba(255,255,255,.7);border-radius:10px;padding:10px 6px;text-align:center}
.db-tf-val{font-size:16px;font-weight:900;line-height:1.1}
.db-tf-lbl{font-size:9.5px;color:#92400e;font-weight:800;margin-top:3px;opacity:.85}

/* ═══ Flock Status ═══ */
.db-flock-list{display:flex;flex-direction:column;gap:6px}
.db-flock-row{display:flex;align-items:center;gap:10px;padding:10px 12px;background:#f8fafc;border-radius:10px;border:1px solid #f1f5f9;cursor:pointer;transition:background .12s}
.db-flock-row:active{background:#f1f5f9}
.db-flock-color{width:4px;height:36px;border-radius:2px;flex-shrink:0}
.db-flock-info{flex:1;min-width:0}
.db-flock-name{font-size:12px;font-weight:900;color:#0f172a;margin-bottom:3px;display:flex;align-items:center;gap:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.db-flock-warn{font-size:11px}
.db-flock-meta{font-size:10px;color:#64748b;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.db-flock-progress-wrap{width:80px;flex-shrink:0;display:flex;flex-direction:column;gap:4px;align-items:flex-end}
.db-flock-progress{width:100%;height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden}
.db-flock-fill{height:100%;border-radius:3px;transition:width .4s}
.db-flock-fill-g{background:linear-gradient(90deg,#10b981,#34d399)}
.db-flock-fill-o{background:linear-gradient(90deg,#f59e0b,#fbbf24)}
.db-flock-fill-r{background:linear-gradient(90deg,#ef4444,#f87171)}
.db-flock-pct{font-size:10px;font-weight:900;font-variant-numeric:tabular-nums}
.db-flock-pct-g{color:#10b981}
.db-flock-pct-o{color:#f59e0b}
.db-flock-pct-r{color:#ef4444}
.db-flock-more{text-align:center;font-size:11px;font-weight:800;color:#0f766e;padding:8px;cursor:pointer;background:#f0fdfa;border-radius:8px;margin-top:4px}

/* ═══ Today ═══ */
.db-today-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.db-today-item{text-align:center;padding:10px 4px;background:#f8fafc;border-radius:12px;border:1px solid #f1f5f9}
.db-today-ic{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:17px;margin:0 auto 6px}
.db-today-val{font-size:17px;font-weight:900;line-height:1;margin-bottom:4px}
.db-today-lbl{font-size:9.5px;color:#64748b;font-weight:800}

/* ═══ Chart — جدید ═══ */
.db-ch-tabs{display:flex;gap:4px;margin-bottom:8px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}
.db-ch-tabs::-webkit-scrollbar{display:none}
.db-ch-tab{background:#f1f5f9;border:none;padding:7px 12px;border-radius:9px;font-size:11px;font-weight:800;cursor:pointer;font-family:inherit;color:#64748b;white-space:nowrap;flex-shrink:0;transition:background .15s,color .15s}
.db-ch-tab.on{background:#0f766e;color:#fff}

.db-ch-periods{display:flex;gap:4px;margin-bottom:8px;padding:4px;background:#f1f5f9;border-radius:10px}
.db-ch-period{flex:1;background:transparent;border:none;padding:7px 4px;border-radius:7px;font-size:10.5px;font-weight:800;cursor:pointer;font-family:inherit;color:#64748b;white-space:nowrap;transition:background .15s,color .15s,box-shadow .15s}
.db-ch-period.on{background:#fff;color:#0f766e;box-shadow:0 1px 3px rgba(15,23,42,.08)}

.db-ch-custom{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px;margin-bottom:8px;display:grid;grid-template-columns:1fr 1fr;gap:8px}
.db-ch-date-field{display:flex;align-items:center;gap:6px;position:relative}
.db-ch-date-field label{font-size:10px;font-weight:800;color:#64748b;flex-shrink:0}
.db-ch-date-input{flex:1;min-width:0;padding:7px 10px;border:1.5px solid #e2e8f0;border-radius:8px;background:#fff;font-family:inherit;font-size:11.5px;font-weight:700;color:#0f172a;text-align:center;direction:ltr;cursor:pointer}
.db-ch-date-input:focus{outline:none;border-color:#0f766e}
.db-ch-date-btn{width:30px;height:30px;flex-shrink:0;border:none;border-radius:8px;background:#0f766e;color:#fff;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}

.db-ch-types{display:flex;gap:4px;margin-bottom:10px;justify-content:center}
.db-ch-type{background:#f1f5f9;border:1px solid transparent;padding:6px 14px;border-radius:9999px;font-size:11px;font-weight:800;cursor:pointer;font-family:inherit;color:#64748b;transition:all .15s}
.db-ch-type.on{background:#0f766e;color:#fff;border-color:#0f766e}

.db-ch-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:12px;background:#f8fafc;border-radius:10px;padding:10px;border:1px solid #f1f5f9}
.db-ch-sum-item{text-align:center}
.db-ch-sum-val{font-size:14px;font-weight:900;color:#0f172a;line-height:1.2}
.db-ch-sum-lbl{font-size:9px;color:#94a3b8;font-weight:800;margin-top:2px}

.db-ch-empty{text-align:center;padding:40px 20px;color:#94a3b8;font-size:12px;font-weight:700;line-height:2}

/* ═══ Compare ═══ */
.db-compare-list{display:flex;flex-direction:column;gap:1px}
.db-compare-row{display:flex;align-items:center;gap:8px;padding:9px 4px;border-bottom:1px solid #f1f5f9}
.db-compare-row:last-child{border-bottom:none}
.db-compare-lbl{flex:1;font-size:12px;font-weight:800;color:#475569}
.db-compare-val{font-size:13px;font-weight:900;color:#0f172a;min-width:60px;text-align:left;direction:ltr}
.db-chg{font-size:10.5px;font-weight:900;padding:3px 8px;border-radius:9999px;min-width:52px;text-align:center}
.db-chg.g{background:#ecfdf5;color:#059669}
.db-chg.r{background:#fef2f2;color:#dc2626}
.db-chg.n{background:#f1f5f9;color:#64748b}

/* ═══ Recent ═══ */
.db-recent-list{display:flex;flex-direction:column;gap:1px}
.db-recent-row{display:flex;align-items:center;gap:10px;padding:9px 4px;border-bottom:1px solid #f1f5f9}
.db-recent-row:last-child{border-bottom:none}
.db-recent-icon{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
.db-recent-icon-r{background:#fef2f2}
.db-recent-icon-o{background:#fffbeb}
.db-recent-icon-g{background:#ecfdf5}
.db-recent-info{flex:1;min-width:0}
.db-recent-name{font-size:12px;font-weight:800;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px}
.db-recent-meta{font-size:10px;color:#94a3b8;font-weight:700}
.db-recent-stats{display:flex;gap:4px;flex-shrink:0}
.db-recent-tag{font-size:10px;font-weight:900;padding:3px 8px;border-radius:9999px}
.db-recent-tag.r{background:#fef2f2;color:#dc2626}
.db-recent-tag.b{background:#eff6ff;color:#2563eb}

/* ═══ Quick ═══ */
.db-quick-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.db-quick-btn{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px 6px;text-align:center;cursor:pointer;font-family:inherit;display:flex;flex-direction:column;align-items:center;gap:7px;transition:transform .1s,background .12s}
.db-quick-btn:active{transform:scale(.95);background:#f1f5f9}
.db-quick-ic{width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:18px}
.db-quick-lbl{font-size:10.5px;font-weight:800;color:#334155}

/* ═══ Welcome / Empty ═══ */
.db-welcome{background:#fff;border-radius:16px;padding:32px 20px;text-align:center;border:1px dashed #cbd5e1}
.db-welcome-ic{font-size:56px;margin-bottom:12px}
.db-welcome-title{font-size:16px;font-weight:900;color:#0f172a;margin-bottom:6px}
.db-welcome-text{font-size:12px;color:#64748b;font-weight:600;margin-bottom:18px}
.db-welcome-btn{background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;border:none;padding:11px 22px;border-radius:9999px;font-family:inherit;font-size:13px;font-weight:900;cursor:pointer;box-shadow:0 4px 14px rgba(15,118,110,.3)}
.db-empty-small{text-align:center;padding:20px;color:#94a3b8;font-size:11.5px;font-weight:700}

/* ═══ Alert ═══ */
.db-alert{background:linear-gradient(135deg,#fef2f2,#fee2e2);border-right:3px solid #ef4444;border-radius:14px;padding:12px 14px;margin-bottom:10px;color:#991b1b}
.db-alert-head{display:flex;align-items:center;gap:6px;font-weight:900;font-size:12.5px;margin-bottom:8px}
.db-alert-ic{font-size:14px}
.db-alert-more{margin-right:auto;background:none;border:none;color:#dc2626;font-family:inherit;font-size:10.5px;font-weight:800;cursor:pointer}
.db-alert-row{display:flex;align-items:center;gap:8px;padding:6px 0;font-size:11.5px;font-weight:700;border-top:1px solid rgba(239,68,68,.15)}
.db-alert-row:first-of-type{border-top:none;padding-top:0}
.db-alert-name{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.db-alert-stat{font-size:10.5px;color:#7f1d1d;opacity:.7}
.db-alert-pct{background:#fff;padding:2px 8px;border-radius:9999px;font-weight:900;font-size:10.5px;color:#dc2626}

/* ═══ Dark Mode ═══ */
body.dark .db-card{background:#141b2d;border-color:#1e293b}
body.dark .db-card-hd:active{background:#1e293b}
body.dark .db-card-ttl{color:#f8fafc}
body.dark .db-card-badge{background:#0f2e2a;color:#5eead4}
body.dark .db-card-go{background:#0f2e2a;color:#5eead4;border-color:#134e4a}
body.dark .db-card-go:active{background:#0f766e;color:#fff;border-color:#0f766e}
body.dark .db-card-arrow{background:#1e293b;color:#5eead4}
body.dark .db-card.open .db-card-arrow{background:#0f766e;color:#fff}
body.dark .db-card.open .db-card-bd{border-top-color:#1e293b}
body.dark .db-stats-card{background:linear-gradient(135deg,#0f2e2a 0%,#064e3b 100%) !important;border-color:#0f766e !important}
body.dark .db-stat-box,body.dark .db-stats-bar{background:rgba(0,0,0,.2);border-color:rgba(255,255,255,.05)}
body.dark .db-stat-lbl{color:#94a3b8}
body.dark .db-stats-progress{background:#0b1120}
body.dark .db-stats-note{color:#94a3b8}
body.dark .db-profit-row{background:#0f2e2a;border-color:#0f766e}
body.dark .db-profit-lbl{color:#5eead4}
body.dark .db-top-flock{background:linear-gradient(135deg,#78350f 0%,#92400e 100%) !important;border-color:#b45309 !important}
body.dark .db-top-flock .db-card-ttl{color:#fef3c7 !important}
body.dark .db-top-flock .db-card-badge{background:rgba(0,0,0,.3) !important;color:#fcd34d !important}
body.dark .db-top-flock .db-card-go{background:rgba(0,0,0,.3) !important;color:#fcd34d !important;border-color:#b45309 !important}
body.dark .db-top-flock .db-card-arrow{background:rgba(0,0,0,.3) !important;color:#fcd34d !important}
body.dark .db-tf-stat{background:rgba(0,0,0,.25)}
body.dark .db-tf-val{color:#fef3c7}
body.dark .db-tf-lbl{color:#fcd34d}
body.dark .db-flock-row{background:#1e293b;border-color:#334155}
body.dark .db-flock-row:active{background:#334155}
body.dark .db-flock-name{color:#f8fafc}
body.dark .db-flock-meta{color:#94a3b8}
body.dark .db-flock-progress{background:#0b1120}
body.dark .db-flock-more{background:#0f2e2a;color:#5eead4}
body.dark .db-today-item{background:#1e293b;border-color:#334155}
body.dark .db-today-lbl{color:#94a3b8}
body.dark .db-ch-tab{background:#1e293b;color:#94a3b8}
body.dark .db-ch-tab.on{background:#0f766e;color:#fff}
body.dark .db-ch-periods{background:#1e293b}
body.dark .db-ch-period{color:#94a3b8}
body.dark .db-ch-period.on{background:#0b1120;color:#5eead4;box-shadow:0 1px 3px rgba(0,0,0,.4)}
body.dark .db-ch-custom{background:#1e293b;border-color:#334155}
body.dark .db-ch-date-input{background:#0b1120;border-color:#334155;color:#f8fafc}
body.dark .db-ch-date-input:focus{border-color:#14b8a6}
body.dark .db-ch-type{background:#1e293b;color:#94a3b8}
body.dark .db-ch-type.on{background:#0f766e;color:#fff}
body.dark .db-ch-summary{background:#1e293b;border-color:#334155}
body.dark .db-ch-sum-val{color:#f8fafc}
body.dark .db-ch-sum-lbl{color:#64748b}
body.dark .db-compare-row{border-color:#1e293b}
body.dark .db-compare-lbl{color:#94a3b8}
body.dark .db-compare-val{color:#f8fafc}
body.dark .db-chg.n{background:#1e293b;color:#94a3b8}
body.dark .db-recent-row{border-color:#1e293b}
body.dark .db-recent-name{color:#f8fafc}
body.dark .db-recent-meta{color:#64748b}
body.dark .db-quick-btn{background:#1e293b;border-color:#334155}
body.dark .db-quick-btn:active{background:#334155}
body.dark .db-quick-lbl{color:#cbd5e1}
body.dark .db-alert{background:linear-gradient(135deg,#7f1d1d,#991b1b);color:#fecaca}
body.dark .db-alert-pct{background:#0b1120;color:#fca5a5}
body.dark .db-alert-row{border-color:rgba(252,165,165,.15)}
body.dark .db-welcome{background:#141b2d;border-color:#334155}
body.dark .db-welcome-title{color:#f8fafc}
body.dark .db-empty-small{color:#64748b}
  `;
  document.head.appendChild(s);
}

/* ═══════════════════════════════════════════════
   Re-render Helper
   ═══════════════════════════════════════════════ */
function refreshDashboard(){
  var page = document.querySelector('.db-page');
  if(page && page.parentNode){
    var fresh = document.createElement('div');
    fresh.innerHTML = renderPage();
    page.parentNode.replaceChild(fresh.firstElementChild, page);
  }
}

/* ═══════════════════════════════════════════════
   Events
   ═══════════════════════════════════════════════ */
document.addEventListener('click', function(e){
  /* ۱. نوع داده نمودار */
  var chartTab = e.target.closest ? e.target.closest('[data-dash-chart]') : null;
  if(chartTab){
    _chartMode = chartTab.dataset.dashChart;
    refreshDashboard();
    return;
  }

  /* ۲. دوره نمودار */
  var periodTab = e.target.closest ? e.target.closest('[data-dash-period]') : null;
  if(periodTab){
    var p = periodTab.dataset.dashPeriod;
    if(p === 'custom'){
      _chartPeriod = 'custom';
      if(!_customFrom){
        _customFrom = todayStr;
        _customTo = todayStr;
      }
    } else {
      _chartPeriod = parseInt(p);
    }
    refreshDashboard();
    return;
  }

  /* ۳. نوع نمودار (میله/خط) */
  var typeBtn = e.target.closest ? e.target.closest('[data-dash-type]') : null;
  if(typeBtn){
    _chartType = typeBtn.dataset.dashType;
    refreshDashboard();
    return;
  }

  /* ۴. دکمه تقویم سفارشی */
  var calBtn = e.target.closest ? e.target.closest('[data-dash-cal]') : null;
  if(calBtn){
    if(UI.openCalendar){
      UI.openCalendar(calBtn.dataset.dashCal);
    }
    return;
  }

  /* ۵. دکمه «مشاهده» */
  var goBtn = e.target.closest ? e.target.closest('[data-dash-go]') : null;
  if(goBtn){
    var goPage = goBtn.dataset.dashGo;
    if(goPage){ try{ Router.go(goPage); }catch(err){} }
    return;
  }

  /* ۶. Toggle بخش */
  var toggleBtn = e.target.closest ? e.target.closest('[data-dash-toggle]') : null;
  if(toggleBtn){
    var id = toggleBtn.dataset.dashToggle;
    _openSections[id] = !_openSections[id];
    var card = toggleBtn.closest('.db-card');
    if(card) card.classList.toggle('open', _openSections[id]);
    return;
  }
});

/* تغییر تاریخ سفارشی از تقویم */
document.addEventListener('change', function(e){
  var t = e.target;
  if(t && t.dataset && t.dataset.dashCustom){
    if(t.dataset.dashCustom === 'from') _customFrom = t.value;
    else if(t.dataset.dashCustom === 'to') _customTo = t.value;
    /* بعد از کمی تأخیر رفرش کن */
    setTimeout(refreshDashboard, 100);
  }
});

/* ═══════════════════════════════════════════════
   Register
   ═══════════════════════════════════════════════ */
injectStyles();

Router.register('dashboard', {
  title: 'داشبورد',
  navPage: 'dashboard',
  topLevel: true,
  render: function(){ return renderPage(); }
});

console.log('✅ dashboard route registered (v12.0 — smart chart)');

})();