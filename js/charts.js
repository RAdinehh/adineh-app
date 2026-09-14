/* ═══════════════════════════════════════════════
   CHARTS — کتابخانه سبک نمودار SVG (بدون وابستگی)
   ساخته شده توسط رضا آدینه
   ═══════════════════════════════════════════════ */
(function(){
'use strict';

if(window.Charts) return;

var Charts = {};

/* ═══════ Line Chart ═══════ */
Charts.line = function(options){
  var opt = options || {};
  var W = opt.width || 700;
  var H = opt.height || 220;
  var padding = { top: 20, right: 20, bottom: 40, left: 55 };
  var innerW = W - padding.left - padding.right;
  var innerH = H - padding.top - padding.bottom;

  var series = opt.series || [];
  if(!series.length) return '<div style="text-align:center;padding:40px;color:#94a3b8;font-size:12px">داده‌ای برای نمایش نیست</div>';

  var minX = Infinity, maxX = -Infinity, minY = 0, maxY = -Infinity;
  for(var i=0;i<series.length;i++){
    var pts = series[i].points || [];
    for(var j=0;j<pts.length;j++){
      if(pts[j].x < minX) minX = pts[j].x;
      if(pts[j].x > maxX) maxX = pts[j].x;
      if(pts[j].y > maxY) maxY = pts[j].y;
      if(pts[j].y < minY) minY = pts[j].y;
    }
  }
  if(!isFinite(minX) || !isFinite(maxX)) return '';
  if(maxY === minY) maxY = minY + 1;

  var rangeX = maxX - minX || 1;
  var rangeY = maxY - minY || 1;

  function px(x){ return padding.left + ((x - minX) / rangeX) * innerW; }
  function py(y){ return padding.top + innerH - ((y - minY) / rangeY) * innerH; }

  var yTicks = 5;
  var gridLines = '';
  var yLabels = '';
  for(var t=0;t<=yTicks;t++){
    var yy = minY + (rangeY * t / yTicks);
    var yyPx = py(yy);
    gridLines += '<line x1="'+padding.left+'" y1="'+yyPx+'" x2="'+(padding.left+innerW)+'" y2="'+yyPx+'" stroke="#e2e8f0" stroke-width="1" '+(t===0?'stroke-opacity="0.8"':'stroke-opacity="0.5"')+'/>';
    var labelY = opt.formatY ? opt.formatY(yy) : Math.round(yy);
    yLabels += '<text x="'+(padding.left - 6)+'" y="'+(yyPx+4)+'" text-anchor="end" font-size="10" fill="#64748b" font-family="inherit">'+labelY+'</text>';
  }

  var xLabelsHtml = '';
  if(opt.xLabels && opt.xLabels.length){
    var step = Math.max(1, Math.ceil(opt.xLabels.length / 6));
    for(var k=0;k<opt.xLabels.length;k+=step){
      var xk = opt.xLabels[k];
      var xxPx = px(xk);
      if(xxPx < padding.left - 5 || xxPx > padding.left + innerW + 5) continue;
      var xLabel = opt.formatX ? opt.formatX(xk) : xk;
      xLabelsHtml += '<text x="'+xxPx+'" y="'+(padding.top + innerH + 16)+'" text-anchor="middle" font-size="10" fill="#64748b" font-family="inherit">'+xLabel+'</text>';
    }
  }

  var paths = '';
  var areas = '';
  var dots = '';
  for(var s=0;s<series.length;s++){
    var sr = series[s];
    var srPts = sr.points || [];
    if(!srPts.length) continue;
    var d = '';
    for(var p=0;p<srPts.length;p++){
      var cx = px(srPts[p].x);
      var cy = py(srPts[p].y);
      d += (p === 0 ? 'M' : 'L') + cx.toFixed(1) + ',' + cy.toFixed(1) + ' ';
    }
    if(opt.showArea && srPts.length > 1){
      var areaD = d + 'L' + px(srPts[srPts.length-1].x).toFixed(1) + ',' + (padding.top + innerH) + ' L' + px(srPts[0].x).toFixed(1) + ',' + (padding.top + innerH) + ' Z';
      areas += '<path d="'+areaD+'" fill="'+(sr.color || '#0f766e')+'" fill-opacity="0.08" stroke="none"/>';
    }
    var dashAttr = sr.dash ? 'stroke-dasharray="'+sr.dash.join(',')+'"' : '';
    paths += '<path d="'+d+'" fill="none" stroke="'+(sr.color || '#0f766e')+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" '+dashAttr+'/>';
    for(p=0;p<srPts.length;p++){
      if(srPts.length <= 30){
        dots += '<circle cx="'+px(srPts[p].x).toFixed(1)+'" cy="'+py(srPts[p].y).toFixed(1)+'" r="2.5" fill="#fff" stroke="'+(sr.color || '#0f766e')+'" stroke-width="2"/>';
      }
    }
  }

  var axis = '<line x1="'+padding.left+'" y1="'+(padding.top + innerH)+'" x2="'+(padding.left + innerW)+'" y2="'+(padding.top + innerH)+'" stroke="#94a3b8" stroke-width="1"/>' +
             '<line x1="'+padding.left+'" y1="'+padding.top+'" x2="'+padding.left+'" y2="'+(padding.top + innerH)+'" stroke="#94a3b8" stroke-width="1"/>';

  var yUnitTxt = opt.yUnit ? '<text x="'+padding.left+'" y="'+(padding.top - 8)+'" text-anchor="start" font-size="9.5" fill="#94a3b8" font-family="inherit" font-weight="700">'+opt.yUnit+'</text>' : '';

  var legendHtml = '';
  if(opt.showLegend !== false && series.length > 1){
    legendHtml = '<div style="display:flex;flex-wrap:wrap;gap:14px;justify-content:center;margin-top:10px;font-size:11px;font-weight:700;color:#475569">';
    for(s=0;s<series.length;s++){
      legendHtml += '<div style="display:flex;align-items:center;gap:5px"><span style="display:inline-block;width:14px;height:3px;border-radius:2px;background:'+(series[s].color||'#0f766e')+'"></span><span>'+series[s].label+'</span></div>';
    }
    legendHtml += '</div>';
  }

  var titleHtml = opt.title ? '<div style="font-size:12px;font-weight:900;color:#0f172a;margin-bottom:8px;text-align:center">'+opt.title+'</div>' : '';

  return '<div class="chart-wrap" style="width:100%">' +
    titleHtml +
    '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto;overflow:visible;display:block">' +
      gridLines + areas + axis + paths + dots + yLabels + xLabelsHtml + yUnitTxt +
    '</svg>' +
    legendHtml +
  '</div>';
};

/* ═══════ Bar Chart ═══════ */
Charts.bar = function(options){
  var opt = options || {};
  var items = opt.items || [];
  if(!items.length) return '<div style="text-align:center;padding:40px;color:#94a3b8;font-size:12px">داده‌ای برای نمایش نیست</div>';

  var W = opt.width || 700;
  var H = opt.height || 200;
  var padding = { top: 25, right: 20, bottom: 45, left: 50 };
  var innerW = W - padding.left - padding.right;
  var innerH = H - padding.top - padding.bottom;

  var maxV = 0;
  for(var i=0;i<items.length;i++) if(items[i].value > maxV) maxV = items[i].value;
  if(maxV === 0) maxV = 1;

  var barW = innerW / items.length * 0.65;
  var gap = innerW / items.length * 0.35 / 2;

  var bars = '';
  var labels = '';
  var values = '';
  for(i=0;i<items.length;i++){
    var it = items[i];
    var x = padding.left + (innerW / items.length) * i + gap;
    var h = (it.value / maxV) * innerH;
    var y = padding.top + innerH - h;
    var color = it.color || '#0f766e';
    bars += '<rect x="'+x+'" y="'+y+'" width="'+barW+'" height="'+Math.max(2, h)+'" rx="3" fill="'+color+'" fill-opacity="0.85"/>';
    labels += '<text x="'+(x + barW/2)+'" y="'+(padding.top + innerH + 16)+'" text-anchor="middle" font-size="10" fill="#475569" font-family="inherit" font-weight="700">'+it.label+'</text>';
    if(opt.showValues !== false && it.value > 0){
      values += '<text x="'+(x + barW/2)+'" y="'+(y - 5)+'" text-anchor="middle" font-size="10" fill="'+color+'" font-family="inherit" font-weight="900">'+it.value+'</text>';
    }
  }

  var gridLines = '';
  var yLabels = '';
  var ticks = 4;
  for(var t=0;t<=ticks;t++){
    var yy = (maxV * t / ticks);
    var yyPx = padding.top + innerH - (t / ticks) * innerH;
    gridLines += '<line x1="'+padding.left+'" y1="'+yyPx+'" x2="'+(padding.left+innerW)+'" y2="'+yyPx+'" stroke="#e2e8f0" stroke-width="1"/>';
    var labelY = opt.formatY ? opt.formatY(yy) : Math.round(yy);
    yLabels += '<text x="'+(padding.left - 6)+'" y="'+(yyPx+4)+'" text-anchor="end" font-size="10" fill="#64748b" font-family="inherit">'+labelY+'</text>';
  }

  var titleHtml = opt.title ? '<div style="font-size:12px;font-weight:900;color:#0f172a;margin-bottom:8px;text-align:center">'+opt.title+'</div>' : '';
  var yUnitTxt = opt.yUnit ? '<text x="'+padding.left+'" y="'+(padding.top - 10)+'" text-anchor="start" font-size="9.5" fill="#94a3b8" font-family="inherit" font-weight="700">'+opt.yUnit+'</text>' : '';

  return '<div class="chart-wrap" style="width:100%">' +
    titleHtml +
    '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto;display:block">' +
      gridLines +
      bars + values + labels + yLabels + yUnitTxt +
    '</svg>' +
  '</div>';
};

/* ═══════ Doughnut Chart ═══════ */
Charts.doughnut = function(options){
  var opt = options || {};
  var items = opt.items || [];
  if(!items.length) return '';

  var total = 0;
  for(var i=0;i<items.length;i++) total += items[i].value;
  if(total === 0) total = 1;

  var R = 50;
  var r = 32;
  var cx = 60;
  var cy = 60;
  var acc = 0;

  function polar(cx, cy, r, angle){
    var a = (angle - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  }

  var paths = '';
  var defaultColors = ['#0f766e','#f59e0b','#3b82f6','#8b5cf6','#ef4444','#10b981','#06b6d4','#ec4899'];
  for(i=0;i<items.length;i++){
    var it = items[i];
    var color = it.color || defaultColors[i % defaultColors.length];
    var startAngle = (acc / total) * 360;
    var endAngle = ((acc + it.value) / total) * 360;
    acc += it.value;
    if(endAngle - startAngle >= 359.99){
      paths += '<circle cx="'+cx+'" cy="'+cy+'" r="'+((R+r)/2)+'" fill="none" stroke="'+color+'" stroke-width="'+(R-r)+'"/>';
    } else {
      var p1 = polar(cx, cy, R, startAngle);
      var p2 = polar(cx, cy, R, endAngle);
      var p3 = polar(cx, cy, r, endAngle);
      var p4 = polar(cx, cy, r, startAngle);
      var largeArc = (endAngle - startAngle) > 180 ? 1 : 0;
      var d = 'M' + p1.x.toFixed(2) + ',' + p1.y.toFixed(2) +
        ' A' + R + ',' + R + ' 0 ' + largeArc + ' 1 ' + p2.x.toFixed(2) + ',' + p2.y.toFixed(2) +
        ' L' + p3.x.toFixed(2) + ',' + p3.y.toFixed(2) +
        ' A' + r + ',' + r + ' 0 ' + largeArc + ' 0 ' + p4.x.toFixed(2) + ',' + p4.y.toFixed(2) + ' Z';
      paths += '<path d="'+d+'" fill="'+color+'"/>';
    }
  }

  var legendHtml = '<div style="flex:1;min-width:140px;display:flex;flex-direction:column;gap:5px">';
  for(i=0;i<items.length;i++){
    var itL = items[i];
    var colorL = itL.color || defaultColors[i % defaultColors.length];
    var pctL = ((itL.value / total) * 100).toFixed(1);
    legendHtml += '<div style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;color:#334155">' +
      '<span style="width:10px;height:10px;border-radius:2px;background:'+colorL+';flex-shrink:0"></span>' +
      '<span style="flex:1">'+itL.label+'</span>' +
      '<span style="color:#0f172a;font-weight:900">'+pctL+'٪</span>' +
    '</div>';
  }
  legendHtml += '</div>';

  var titleHtml = opt.title ? '<div style="font-size:12px;font-weight:900;color:#0f172a;margin-bottom:8px;text-align:center">'+opt.title+'</div>' : '';

  return '<div class="chart-wrap" style="width:100%">' + titleHtml +
    '<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;justify-content:center">' +
      '<svg viewBox="0 0 120 120" style="width:130px;height:130px;flex-shrink:0">' +
        paths +
        (opt.centerLabel ? '<text x="60" y="56" text-anchor="middle" font-size="14" font-weight="900" fill="#0f172a" font-family="inherit">'+opt.centerLabel+'</text>' : '') +
        (opt.centerSub ? '<text x="60" y="70" text-anchor="middle" font-size="9" fill="#64748b" font-family="inherit">'+opt.centerSub+'</text>' : '') +
      '</svg>' +
      legendHtml +
    '</div>' +
  '</div>';
};

/* ═══════ Progress Bar ═══════ */
Charts.progress = function(options){
  var opt = options || {};
  var pct = Math.max(0, Math.min(100, opt.value || 0));
  var color = opt.color || '#0f766e';
  var bg = opt.bg || '#f1f5f9';
  return '<div style="margin-bottom:8px">' +
    '<div style="display:flex;justify-content:space-between;font-size:10.5px;font-weight:800;color:#64748b;margin-bottom:4px">' +
      '<span>'+opt.label+'</span>' +
      '<span style="color:'+color+'">'+(opt.display || (pct.toFixed(1) + '٪'))+'</span>' +
    '</div>' +
    '<div style="height:7px;background:'+bg+';border-radius:4px;overflow:hidden">' +
      '<div style="height:100%;width:'+pct+'%;background:'+color+';border-radius:4px;transition:width .3s"></div>' +
    '</div>' +
  '</div>';
};

/* ═══════ KPI Card ═══════ */
Charts.kpi = function(options){
  var opt = options || {};
  var color = opt.color || '#0f766e';
  var bg = opt.bg || '#f0fdfa';
  return '<div class="kpi-card" style="background:'+bg+';border-bottom-color:'+color+'">' +
    '<div style="font-size:18px;line-height:1;margin-bottom:4px">'+(opt.icon||'📊')+'</div>' +
    '<div style="font-size:16px;font-weight:900;color:'+color+';line-height:1.1">'+(opt.value||'—')+'</div>' +
    '<div style="font-size:9.5px;color:#64748b;font-weight:700;margin-top:3px">'+(opt.label||'')+'</div>' +
    (opt.sub ? '<div style="font-size:9px;color:#94a3b8;font-weight:700;margin-top:2px">'+opt.sub+'</div>' : '') +
  '</div>';
};

window.Charts = Charts;
console.log('✅ Charts library loaded');

})();