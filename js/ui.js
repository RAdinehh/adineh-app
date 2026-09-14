/* ═══════════════════════════════════════════════
   UI — رابط کاربری + اعتبارسنجی + خطا + مدیریت اعداد
   ساخته شده توسط رضا آدینه
   نسخه v2.3 — اضافه شد: esc, toEnDigits, fmtThousandsInput, dayDiff, ageFromDate
   ═══════════════════════════════════════════════ */
const UI = (() => {

  function sid(v){ return String(v == null ? '' : v); }
  function sameId(a, b){ return sid(a) === sid(b); }
  function findBy(arr, id){
    if(!Array.isArray(arr)) return null;
    for(var i=0;i<arr.length;i++){
      if(sameId(arr[i].id, id)) return arr[i];
    }
    return null;
  }

  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }

  function toEnDigits(str){
    return String(str == null ? '' : str)
      .replace(/[۰-۹]/g, function(d){ return String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)); })
      .replace(/[٠-٩]/g, function(d){ return String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)); });
  }

  function fmtThousandsInput(str){
    var eng = toEnDigits(str).replace(/[^\d]/g, '');
    if(!eng) return '';
    return Number(eng).toLocaleString('en-US');
  }

  const FA_MONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];

  function gToJ(d) {
    d = new Date(d);
    const gy = d.getFullYear(), gm = d.getMonth()+1, gd = d.getDate();
    const gdm = [0,31,59,90,120,151,181,212,243,273,304,334];
    let jy = (gy <= 1600) ? 0 : 979;
    const gy2 = (gy <= 1600) ? gy-621 : gy-1600;
    const gy3 = (gm > 2) ? gy2+1 : gy2;
    let days = (365*gy2) + Math.floor((gy3+3)/4) - Math.floor((gy3+99)/100) + Math.floor((gy3+399)/400) - 80 + gd + gdm[gm-1];
    jy += 33 * Math.floor(days/12053); days %= 12053;
    jy += 4 * Math.floor(days/1461); days %= 1461;
    if (days > 365) { jy += Math.floor((days-1)/365); days = (days-1) % 365; }
    const jm = (days < 186) ? 1 + Math.floor(days/31) : 7 + Math.floor((days-186)/30);
    const jd = 1 + ((days < 186) ? (days % 31) : ((days-186) % 30));
    return { y: jy, m: jm, d: jd };
  }

  function jToG(jy, jm, jd) {
    jy = +jy; jm = +jm; jd = +jd;
    let gy = (jy <= 979) ? jy+621 : jy+1600;
    let days = ((jy - (jy<=979?0:979))*365) + Math.floor((jy - (jy<=979?0:979))/33)*8 + Math.floor(((jy - (jy<=979?0:979))%33+3)/4);
    days += jm <= 6 ? (jm-1)*31 : (jm-7)*30+186;
    days += jd-1;
    let gd = days+79, gm = 0, gy2 = gy;
    const gdm = [31,28,31,30,31,30,31,31,30,31,30,31];
    while (gd >= 365) {
      if (gy2%4===0 && (gy2%100!==0 || gy2%400===0)) { gd -= 366; gy2++; }
      else { gd -= 365; gy2++; }
    }
    for (let i=0; i<12; i++) {
      const ml = gdm[i] + ((i===1 && (gy2%4===0 && (gy2%100!==0 || gy2%400===0)))?1:0);
      if (gd < ml) { gm = i+1; gd = gd+1; break; }
      gd -= ml;
    }
    return new Date(gy2, gm-1, gd);
  }

  function daysInJMonth(jy, jm) {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    return ((jy-1403)%4===0 && jy>=1403) ? 30 : 29;
  }

  function jToC(j) {
    if (!j) return 0;
    const p = String(j).replace(/-/g,'/').split('/');
    if (p.length !== 3) return 0;
    const y = +p[0], m = +p[1], d = +p[2];
    if (isNaN(y) || isNaN(m) || isNaN(d)) return 0;
    const db = m<=6 ? (m-1)*31 : 186+(m-7)*30;
    return y*365 + Math.floor(y/4) + db + d;
  }

  const todayG = new Date();
  const todayJ = gToJ(todayG);
  const todayStr = `${todayJ.y}/${String(todayJ.m).padStart(2,'0')}/${String(todayJ.d).padStart(2,'0')}`;

  function dayDiff(dateStr1, dateStr2){
    return jToC(dateStr2) - jToC(dateStr1);
  }

  function ageFromDate(hatchStr){
    return Math.max(0, dayDiff(hatchStr, todayStr));
  }

  function fa(n) {
    if (n === null || n === undefined || isNaN(n)) return '۰';
    return Number(n).toLocaleString('fa-IR');
  }

  function toFa(n) {
    return String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  }

  function fmtMoney(n) {
    if (n === null || n === undefined || isNaN(n)) return '۰';
    return Number(n).toLocaleString('fa-IR');
  }

  function fmtNum(n) {
    if (n === null || n === undefined || isNaN(n)) return '0';
    return Number(n).toLocaleString('en-US');
  }

  function pct(a, b) {
    return b > 0 ? ((a/b)*100).toFixed(1) : 0;
  }

  function parseNum(v) {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number') return v;
    return +toEnDigits(String(v)).replace(/[^\d.-]/g, '') || 0;
  }

  function formatNumInput(el) {
    if (!el) return;
    let v = String(el.value || '').replace(/[^\d]/g, '');
    if (v === '') { el.value = ''; return; }
    el.value = Number(v).toLocaleString('en-US');
  }

  function formatShort(n) {
    var v = Math.round(Number(n || 0));
    if (isNaN(v)) v = 0;
    var abs = Math.abs(v);
    var sign = v < 0 ? '−' : '';

    if (abs >= 1000000000) {
      var b = abs / 1000000000;
      var bStr = b >= 10 ? String(Math.round(b)) : b.toFixed(1).replace(/\.0$/, '');
      return sign + toFa(bStr) + ' میلیارد';
    }
    if (abs >= 1000000) {
      var m = abs / 1000000;
      var mStr = m >= 10 ? String(Math.round(m)) : m.toFixed(1).replace(/\.0$/, '');
      return sign + toFa(mStr) + ' میلیون';
    }
    if (abs >= 1000) {
      return sign + toFa(Math.round(abs / 1000)) + ' هزار';
    }
    return sign + toFa(v);
  }

  function faMoney(n){
    return formatShort(n);
  }

  function toast(msg, type = 'info', duration = 2800) {
    const el = document.getElementById('toast');
    const ic = document.getElementById('toastIc');
    const msgEl = document.getElementById('toastMsg');
    if (!el) return;

    const icons = { info:'ℹ️', success:'✅', error:'❌', warn:'⚠️' };

    el.className = 'toast ' + type;
    if (ic) ic.textContent = icons[type] || 'ℹ️';
    if (msgEl) msgEl.textContent = msg;
    else el.textContent = msg;

    el.classList.add('on');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('on'), duration);

    try {
      const s = Store.getSettings();
      if (s.vibrate && navigator.vibrate) {
        const pat = { success:[10,30,10], error:[20,40,20], warn:[15], info:[8] };
        navigator.vibrate(pat[type] || [8]);
      }
    } catch(e){}
  }

  function showLoading(text = 'لطفاً صبر کنید...') {
    const ov = document.getElementById('loadingOv');
    const txt = document.getElementById('loadingText');
    if (txt) txt.textContent = text;
    if (ov) ov.classList.add('on');
  }

  function hideLoading() {
    const ov = document.getElementById('loadingOv');
    if (ov) ov.classList.remove('on');
  }

  function showError(title, message, options = {}) {
    const ov = document.getElementById('errorOv');
    const t = document.getElementById('errTitle');
    const m = document.getElementById('errMsg');
    if (t) t.textContent = title || 'خطای غیرمنتظره';
    if (m) m.textContent = message || 'مشکلی پیش آمد.';
    if (ov) ov.classList.add('on');
    if (options.log) console.error('⚠️', title, message, options.log);
  }

  function hideError() {
    const ov = document.getElementById('errorOv');
    if (ov) ov.classList.remove('on');
  }

  function confirm(message, opts = {}) {
    return new Promise(resolve => {
      const title = opts.title || 'تأیید عملیات';
      const yesText = opts.yesText || 'بله، ادامه بده';
      const noText = opts.noText || 'انصراف';
      const danger = opts.danger !== false;

      const modal = document.createElement('div');
      modal.className = 'modal modal-center on';
      modal.innerHTML = `
        <div class="modal-box">
          <div class="modal-title">${title}</div>
          <div class="modal-text">${message}</div>
          <div class="modal-actions">
            <button class="btn btn-s" data-act="no">${noText}</button>
            <button class="btn ${danger ? 'btn-d' : 'btn-p'}" data-act="yes">${yesText}</button>
          </div>
        </div>
      `;
      const root = document.getElementById('modalRoot') || document.body;
      root.appendChild(modal);

      modal.addEventListener('click', e => {
        const act = e.target.dataset.act;
        if (act === 'yes') { modal.remove(); resolve(true); }
        else if (act === 'no') { modal.remove(); resolve(false); }
      });
    });
  }

  function openModal(html, onClose) {
    const modal = document.createElement('div');
    modal.className = 'modal on';
    modal.innerHTML = html;
    const root = document.getElementById('modalRoot') || document.body;
    root.appendChild(modal);

    modal.addEventListener('click', e => {
      if (e.target === modal || e.target.hasAttribute('data-close')) {
        closeModal(modal);
        if (onClose) onClose();
      }
    });

    return modal;
  }

  function closeModal(modal) {
    if (modal && modal.parentNode) modal.remove();
  }

  function closeAllModals() {
    const root = document.getElementById('modalRoot') || document.body;
    root.querySelectorAll('.modal, .sort-sheet-overlay, .mini-modal').forEach(m => m.remove());
  }

  const Validator = {
    required(value, label) {
      if (value === null || value === undefined || String(value).trim() === '') {
        return `«${label}» را وارد کنید`;
      }
      return null;
    },
    positiveNumber(value, label) {
      const n = parseNum(value);
      if (isNaN(n) || n <= 0) return `«${label}» باید یک عدد بزرگ‌تر از صفر باشد`;
      return null;
    },
    number(value, label, opts = {}) {
      const n = parseNum(value);
      if (isNaN(n)) return `«${label}» باید عدد باشد`;
      if (opts.min !== undefined && n < opts.min) return `«${label}» نباید کمتر از ${toFa(opts.min)} باشد`;
      if (opts.max !== undefined && n > opts.max) return `«${label}» نباید بیشتر از ${toFa(opts.max)} باشد`;
      return null;
    },
    length(value, label, opts = {}) {
      const s = String(value || '').trim();
      if (opts.min && s.length < opts.min) return `«${label}» باید حداقل ${toFa(opts.min)} کاراکتر باشد`;
      if (opts.max && s.length > opts.max) return `«${label}» نباید بیشتر از ${toFa(opts.max)} کاراکتر باشد`;
      return null;
    },
    date(value, label) {
      if (!value) return `«${label}» را انتخاب کنید`;
      const p = String(value).replace(/-/g,'/').split('/');
      if (p.length !== 3) return `«${label}» معتبر نیست`;
      const y = +p[0], m = +p[1], d = +p[2];
      if (isNaN(y) || isNaN(m) || isNaN(d)) return `«${label}» معتبر نیست`;
      if (y < 1300 || y > 1500) return `سال «${label}» باید بین ۱۳۰۰ تا ۱۵۰۰ باشد`;
      if (m < 1 || m > 12) return `ماه «${label}» باید ۱ تا ۱۲ باشد`;
      const maxDay = daysInJMonth(y, m);
      if (d < 1 || d > maxDay) return `روز «${label}» باید ۱ تا ${toFa(maxDay)} باشد`;
      return null;
    },
    phone(value, label) {
      if (!value) return null;
      const clean = String(value).replace(/[^\d]/g, '');
      if (clean.length < 10 || clean.length > 13) return `«${label}» باید ۱۰ تا ۱۳ رقم باشد`;
      return null;
    },
    email(value, label) {
      if (!value) return null;
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!re.test(String(value))) return `«${label}» معتبر نیست`;
      return null;
    },
    unique(collection, field, value, currentId, label) {
      const items = Store.all(collection);
      const dup = items.find(x => x[field] === value && !sameId(x.id, currentId));
      if (dup) return `«${label}» تکراری است`;
      return null;
    }
  };

  function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    field.classList.add('error');

    let errEl = field.parentNode.querySelector('.field-error');
    if (!errEl) {
      errEl = document.createElement('div');
      errEl.className = 'field-error';
      field.parentNode.appendChild(errEl);
    }
    errEl.textContent = '⚠️ ' + message;
    errEl.classList.add('show');

    try { field.scrollIntoView({ behavior:'smooth', block:'center' }); } catch(e) {}
    if (navigator.vibrate) navigator.vibrate([20, 40, 20]);
  }

  function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    field.classList.remove('error');
    const errEl = field.parentNode.querySelector('.field-error');
    if (errEl) { errEl.classList.remove('show'); setTimeout(() => errEl.remove(), 200); }
  }

  function clearAllErrors(container) {
    container = container || document;
    container.querySelectorAll('.fi.error, .fs.error, .ft.error').forEach(f => f.classList.remove('error'));
    container.querySelectorAll('.field-error.show').forEach(e => {
      e.classList.remove('show');
      setTimeout(() => e.remove(), 200);
    });
  }

  function validateFields(fields) {
    const errors = {};
    let firstError = null;

    fields.forEach(f => {
      for (const rule of (f.rules || [])) {
        let err = null;
        if (rule === 'required') err = Validator.required(f.value, f.label);
        else if (rule === 'positiveNumber') err = Validator.positiveNumber(f.value, f.label);
        else if (rule === 'number') err = Validator.number(f.value, f.label, f.opts || {});
        else if (rule === 'date') err = Validator.date(f.value, f.label);
        else if (rule === 'phone') err = Validator.phone(f.value, f.label);
        else if (rule === 'email') err = Validator.email(f.value, f.label);
        else if (rule.startsWith('min:')) err = Validator.length(f.value, f.label, { min: +rule.split(':')[1] });
        else if (rule.startsWith('max:')) err = Validator.length(f.value, f.label, { max: +rule.split(':')[1] });
        else if (rule.startsWith('unique:')) {
          const [col, fld] = rule.split(':')[1].split('.');
          err = Validator.unique(col, fld, f.value, f.currentId, f.label);
        }

        if (err) {
          errors[f.id] = err;
          if (!firstError) firstError = { id: f.id, msg: err };
          break;
        }
      }
    });

    if (Object.keys(errors).length > 0) {
      Object.keys(errors).forEach(id => showFieldError(id, errors[id]));
      toast('❌ ' + firstError.msg, 'error');
      return { ok: false, errors };
    }
    return { ok: true };
  }

  function openCalendar(targetInputId) {
    const input = document.getElementById(targetInputId);
    if (!input) return;

    let state = { y: todayJ.y, m: todayJ.m, sel: null };

    if (input.value) {
      const p = input.value.replace(/-/g,'/').split('/').map(Number);
      if (p.length === 3 && !isNaN(p[0])) {
        state.y = p[0]; state.m = p[1];
        state.sel = { y: p[0], m: p[1], d: p[2] };
      }
    }

    const modal = document.createElement('div');
    modal.className = 'modal modal-center on';
    const root = document.getElementById('modalRoot') || document.body;
    root.appendChild(modal);

    const render = () => {
      const firstDayG = jToG(state.y, state.m, 1);
      const offset = (firstDayG.getDay() + 1) % 7;
      const days = daysInJMonth(state.y, state.m);

      let cells = '';
      for (let i=0; i<offset; i++) cells += '<div class="cal-day empty"></div>';
      for (let d=1; d<=days; d++) {
        const isToday = (state.y===todayJ.y && state.m===todayJ.m && d===todayJ.d);
        const isSel = state.sel && state.sel.y===state.y && state.sel.m===state.m && state.sel.d===d;
        let cls = 'cal-day';
        if (isToday) cls += ' today';
        if (isSel) cls += ' selected';
        cells += `<div class="${cls}" data-day="${d}">${toFa(d)}</div>`;
      }

      modal.innerHTML = `
        <div class="cal-box">
          <div class="cal-header">
            <button class="cal-nav" data-act="prev">‹</button>
            <div class="cal-month">${FA_MONTHS[state.m-1]} ${fa(state.y)}</div>
            <button class="cal-nav" data-act="next">›</button>
          </div>
          <div class="cal-weekdays">
            <div>ش</div><div>ی</div><div>د</div><div>س</div><div>چ</div><div>پ</div><div>ج</div>
          </div>
          <div class="cal-days">${cells}</div>
          <div class="cal-footer">
            <button class="cal-btn" data-act="today">📍 امروز</button>
            <button class="cal-btn" data-act="clear" style="background:var(--danger-bg);color:var(--danger)">پاک</button>
          </div>
        </div>
      `;

      modal.querySelectorAll('[data-act]').forEach(b => {
        b.addEventListener('click', () => {
          const act = b.dataset.act;
          if (act === 'prev') { state.m--; if (state.m<1) { state.m=12; state.y--; } render(); }
          else if (act === 'next') { state.m++; if (state.m>12) { state.m=1; state.y++; } render(); }
          else if (act === 'today') {
            state.y = todayJ.y; state.m = todayJ.m;
            state.sel = { y: todayJ.y, m: todayJ.m, d: todayJ.d };
            pick();
          } else if (act === 'clear') {
            input.value = '';
            input.dispatchEvent(new Event('change'));
            modal.remove();
          }
        });
      });

      modal.querySelectorAll('.cal-day[data-day]').forEach(c => {
        c.addEventListener('click', () => {
          state.sel = { y: state.y, m: state.m, d: +c.dataset.day };
          pick();
        });
      });
    };

    const pick = () => {
      if (!state.sel) return;
      const val = `${state.sel.y}/${String(state.sel.m).padStart(2,'0')}/${String(state.sel.d).padStart(2,'0')}`;
      input.value = val;
      input.dispatchEvent(new Event('change'));
      clearFieldError(input.id);
      modal.remove();
    };

    render();
  }

  function toggleTheme() {
    const current = document.body.classList.contains('dark');
    const next = !current;
    document.body.classList.toggle('dark', next);
    try { Store.updateSettings({ theme: next ? 'dark' : 'light' }); } catch(e){}
    const icon = document.getElementById('hdrTheme');
    if (icon) icon.textContent = next ? '☀️' : '🌙';
    toast(next ? '🌙 تم تیره فعال شد' : '☀️ تم روشن فعال شد', 'info', 1500);
  }

  function applyTheme() {
    try {
      const s = Store.getSettings();
      document.body.classList.toggle('dark', s.theme === 'dark');
      const icon = document.getElementById('hdrTheme');
      if (icon) icon.textContent = s.theme === 'dark' ? '☀️' : '🌙';
    } catch(e){}
  }

  const FONTS = {
    vazirmatn: 'Vazirmatn',
    sahel: 'Sahel',
    shabnam: 'Shabnam',
    samim: 'Samim',
    estedad: 'Estedad',
    gandom: 'Gandom'
  };

  function applyFont() {
    try {
      const s = Store.getSettings();
      const family = FONTS[s.font] || 'Vazirmatn';
      document.documentElement.style.setProperty('--app-font', `'${family}','Vazirmatn',sans-serif`);
    } catch(e){}
  }

  function applyFontSize() {
    try {
      const s = Store.getSettings();
      document.body.style.zoom = (s.fontSize || 100) / 100;
    } catch(e){}
  }

  function applyAll() {
    applyTheme();
    applyFont();
    applyFontSize();
  }

  function isOnline() { return navigator.onLine; }

  const APP_INFO = {
    name: 'مدیریت مرغداری',
    brand: 'آدینه',
    author: 'رضا آدینه',
    version: '1.2.0',
    license: 'رایگان و شخصی — استفاده تجاری با مجوز مالک',
    year: 1405
  };

  const SortTypes = {
    date_desc: { label: '📅 جدیدترین', icon: '⬇️' },
    date_asc: { label: '📅 قدیمی‌ترین', icon: '⬆️' },
    amount_desc: { label: '💰 بیشترین', icon: '⬇️' },
    amount_asc: { label: '💰 کمترین', icon: '⬆️' },
    name_asc: { label: '🔤 الفبا (الف-ی)', icon: '⬆️' },
    name_desc: { label: '🔤 الفبا (ی-الف)', icon: '⬇️' },
    count_desc: { label: '🔢 بیشترین تعداد', icon: '⬇️' },
    count_asc: { label: '🔢 کمترین تعداد', icon: '⬆️' }
  };

  function sortList(arr, type, options = {}) {
    if (!arr || !arr.length) return arr || [];
    const dateField = options.dateField || 'date';
    const amountField = options.amountField || 'amount';
    const nameField = options.nameField || 'name';
    const countField = options.countField || 'qty';
    const copy = [...arr];
    const getDate = (x) => jToC(x[dateField] || x.date || x.startDate || x.hatchDate || '');
    const getAmount = (x) => {
      if (typeof x[amountField] === 'number') return x[amountField];
      if (x.qty && x.price) return x.qty * x.price;
      if (x.amount) return x.amount;
      return 0;
    };
    const getName = (x) => String(x[nameField] || x.name || x.title || x.item || '').trim();
    const getCount = (x) => +x[countField] || +x[amountField] || 0;

    switch (type) {
      case 'date_desc': copy.sort((a, b) => getDate(b) - getDate(a)); break;
      case 'date_asc': copy.sort((a, b) => getDate(a) - getDate(b)); break;
      case 'amount_desc': copy.sort((a, b) => getAmount(b) - getAmount(a)); break;
      case 'amount_asc': copy.sort((a, b) => getAmount(a) - getAmount(b)); break;
      case 'name_asc': copy.sort((a, b) => getName(a).localeCompare(getName(b), 'fa')); break;
      case 'name_desc': copy.sort((a, b) => getName(b).localeCompare(getName(a), 'fa')); break;
      case 'count_desc': copy.sort((a, b) => getCount(b) - getCount(a)); break;
      case 'count_asc': copy.sort((a, b) => getCount(a) - getCount(b)); break;
    }

    return copy;
  }

  function renderSortBar(currentType, onChange, availableTypes = ['date_desc','date_asc','amount_desc','amount_asc']) {
    return `
      <div class="sort-bar">
        <span class="sort-icon">⇅</span>
        ${availableTypes.map(t => `
          <button class="sort-chip ${currentType === t ? 'on' : ''}" onclick="${onChange}('${t}')">
            ${SortTypes[t]?.label || t}
          </button>
        `).join('')}
      </div>
    `;
  }

  return {
    sid, sameId, findBy,
    esc,
    toEnDigits,
    fmtThousandsInput,
    gToJ, jToG, daysInJMonth, jToC,
    todayG, todayJ, todayStr, FA_MONTHS,
    dayDiff,
    ageFromDate,
    fa, toFa, fmtMoney, fmtNum, pct, parseNum, formatNumInput,
    formatShort,
    faMoney,
    toast, showLoading, hideLoading, showError, hideError, confirm,
    openModal, closeModal, closeAllModals,
    Validator, validateFields, showFieldError, clearFieldError, clearAllErrors,
    openCalendar,
    toggleTheme, applyTheme, applyFont, applyFontSize, applyAll,
    isOnline,
    APP_INFO,
    sortList, renderSortBar, SortTypes
  };
})();