/* ═══════════════════════════════════════════════
   SETTINGS — تنظیمات کامل (آدینه) v10
   درباره/لایسنس/آمار — inline style
   ارسال داده‌ها — با fallback دانلود
   ساخته شده توسط رضا آدینه
   ═══════════════════════════════════════════════ */
(function(){
'use strict';

if(typeof Router === 'undefined' || typeof Router.register !== 'function'){
  console.error('❌ Router not available');
  return;
}
if(window.__settingsModuleLoaded) return;
window.__settingsModuleLoaded = true;

console.log('🚀 settings.js start');

Router.register('settings', {
  title: 'تنظیمات',
  navPage: 'more',
  topLevel: true,

  FONTS: [
    { id:'vazirmatn', name:'وزیرمتن', family:'Vazirmatn', tag:'پیش‌فرض', tagClass:'persian', sample:'سلام، این متن نمونه است' },
    { id:'sahel',     name:'ساحل',     family:'Sahel',     tag:'خوانا',    tagClass:'persian', sample:'سلام، این متن نمونه است' },
    { id:'shabnam',   name:'شبنم',     family:'Shabnam',   tag:'محبوب',   tagClass:'persian', sample:'سلام، این متن نمونه است' },
    { id:'samim',     name:'صمیم',     family:'Samim',     tag:'رسمی',    tagClass:'bold',    sample:'سلام، این متن نمونه است' },
    { id:'estedad',   name:'استعداد',  family:'Estedad',   tag:'مدرن',    tagClass:'persian', sample:'سلام، این متن نمونه است' },
    { id:'gandom',    name:'گندم',     family:'Gandom',    tag:'سبک',     tagClass:'light',   sample:'سلام، این متن نمونه است' }
  ],

  FS_MIN: 80, FS_MAX: 130, FS_STEP: 5,

  BOTTOM_MODULES: [
    { id: 'dashboard',  icon: '🏠', name: 'خانه' },
    { id: 'daily',      icon: '📅', name: 'روزانه' },
    { id: 'flocks',     icon: '🐔', name: 'گله‌ها' },
    { id: 'finance',    icon: '💰', name: 'مالی' },
    { id: 'sales',      icon: '🏷️', name: 'فروش' },
    { id: 'inventory',  icon: '📦', name: 'انبار' },
    { id: 'medicine',   icon: '💊', name: 'دارو' },
    { id: 'incubation', icon: '🥚', name: 'جوجه‌کشی' },
    { id: 'feed',       icon: '🌾', name: 'خوراک' },
    { id: 'contacts',   icon: '👥', name: 'پرونده' },
    { id: 'reports',    icon: '📊', name: 'گزارش' },
    { id: 'settings',   icon: '⚙️', name: 'تنظیمات' },
    { id: 'more',       icon: '☰', name: 'بیشتر' }
  ],

  css() {
    return `<style>
      .profile-card{background:linear-gradient(135deg,var(--brand-700,#0f766e),var(--brand-500,#14b8a6));border-radius:12px;padding:10px 12px;margin-bottom:8px;color:#fff;box-shadow:0 3px 10px rgba(15,118,110,.2);position:relative;overflow:hidden}
      .profile-card::before{content:'';position:absolute;top:-30px;left:-30px;width:100px;height:100px;background:rgba(255,255,255,.08);border-radius:50%}
      .profile-inner{position:relative;z-index:1;display:flex;align-items:center;gap:9px}
      .profile-logo{width:40px;height:40px;border-radius:10px;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;border:1px solid rgba(255,255,255,.2)}
      .profile-info{flex:1;min-width:0}
      .profile-name{font-family:'Lalezar','Vazirmatn',sans-serif;font-size:16px;font-weight:400;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2}
      .profile-meta{font-size:9.5px;opacity:.9;margin-top:1px;font-weight:600}
      .profile-edit{background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.25);color:#fff;width:30px;height:30px;border-radius:8px;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;padding:0}
      .profile-edit:active{background:rgba(255,255,255,.35);transform:scale(.95)}

      .section{background:var(--card,#fff);border-radius:10px;border:1px solid var(--border,#e2e8f0);box-shadow:0 1px 2px rgba(15,23,42,.03);margin-bottom:5px;overflow:hidden}
      .section.open{box-shadow:0 2px 6px rgba(15,23,42,.06)}
      .section-head{display:flex;align-items:center;gap:8px;padding:8px 10px;cursor:pointer;user-select:none;transition:background .12s}
      .section-head:active{background:var(--soft,#f1f5f9)}
      .section-icon{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0}
      .section-info{flex:1;min-width:0}
      .section-title{font-size:11.5px;font-weight:900;color:var(--text,#0f172a);line-height:1.3}
      .section-summary{font-size:9.5px;color:var(--muted,#64748b);font-weight:600;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .section-status{display:flex;align-items:center;gap:4px;flex-shrink:0}
      .section-badge{font-size:9px;font-weight:800;padding:2px 6px;border-radius:9999px;background:var(--soft,#f1f5f9);color:var(--muted,#64748b);white-space:nowrap}
      .section-badge.on{background:#ecfdf5;color:#166534}
      .section-badge.warn{background:#fffbeb;color:#92400e}
      .section-arrow{width:22px;height:22px;border-radius:50%;background:var(--soft,#f1f5f9);color:var(--primary,#0f766e);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;flex-shrink:0;transition:transform .25s,background .2s,color .2s}
      .section.open .section-arrow{transform:rotate(180deg);background:var(--primary,#0f766e);color:#fff}
      .section-body{max-height:0;overflow:hidden;transition:max-height .3s ease,opacity .2s ease;opacity:0;border-top:0 solid var(--border,#e2e8f0)}
      .section.open .section-body{max-height:3000px;opacity:1;border-top:1px solid var(--border,#e2e8f0)}

      .s-row{display:flex;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid var(--border,#e2e8f0);cursor:pointer;transition:background .12s}
      .s-row:last-child{border-bottom:none}
      .s-row:active{background:var(--soft,#f1f5f9)}
      .s-row-icon{width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0}
      .s-row-info{flex:1;min-width:0}
      .s-row-name{font-size:11.5px;font-weight:800;color:var(--text,#0f172a);display:flex;align-items:center;gap:4px}
      .s-row-desc{font-size:9.5px;color:var(--muted,#64748b);font-weight:600;margin-top:1px;line-height:1.4}
      .s-row-value{font-size:10.5px;font-weight:800;color:var(--primary,#0f766e);flex-shrink:0;padding:2px 8px;background:#f0fdfa;border-radius:9999px;white-space:nowrap}
      .s-row-arrow{color:var(--muted,#94a3b8);font-size:12px;flex-shrink:0;font-weight:900}

      .fs-slider-wrap{padding:8px 10px 6px;border-bottom:1px solid var(--border,#e2e8f0);background:var(--card,#fff)}
      .fs-slider-row{display:flex;align-items:center;gap:7px}
      .fs-btn{width:32px;height:32px;flex-shrink:0;border:none;border-radius:8px;background:var(--soft,#f1f5f9);color:var(--text,#0f172a);font-size:17px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:inherit;padding:0;padding-bottom:1px}
      .fs-btn:disabled{opacity:.3;cursor:not-allowed}
      .fs-slider{flex:1;position:relative;height:32px;display:flex;align-items:center}
      .fs-slider input[type="range"]{-webkit-appearance:none;appearance:none;width:100%;height:6px;border-radius:3px;background:var(--soft,#e2e8f0);outline:none;margin:0;cursor:pointer;direction:ltr}
      .fs-slider input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:linear-gradient(135deg,#0f766e,#14b8a6);cursor:pointer;border:3px solid #fff;box-shadow:0 1px 4px rgba(15,118,110,.4)}
      .fs-value{min-width:44px;text-align:center;font-size:11px;font-weight:900;color:var(--primary,#0f766e);background:#f0fdfa;padding:5px 0;border-radius:8px;flex-shrink:0}
      .fs-marks{display:flex;justify-content:space-between;padding:4px 0 0;margin-right:42px;margin-left:42px}
      .fs-mark{font-size:8.5px;font-weight:800;color:var(--muted,#94a3b8)}
      .fs-mark.on{color:var(--primary,#0f766e)}

      .font-preview{margin:6px 10px 8px;background:linear-gradient(135deg,#f0fdfa,var(--soft,#f1f5f9));border:1px dashed var(--primary,#0f766e);border-radius:10px;padding:8px;text-align:center}
      .font-preview-label{font-size:9px;color:var(--primary,#0f766e);font-weight:800;margin-bottom:3px}
      .font-preview-text{font-size:14px;font-weight:700;color:var(--text,#0f172a);line-height:1.5}
      .font-preview-sub{font-size:10px;color:var(--muted,#64748b);font-weight:600;margin-top:3px}

      .credits{text-align:center;padding:12px 10px;margin-top:6px}
      .credits-brand{font-size:12px;font-weight:900;color:var(--primary,#0f766e);margin-bottom:3px}
      .credits-author{font-size:10.5px;color:var(--muted,#64748b);font-weight:600;margin-bottom:8px}
      .credits-license{background:#f1f5f9;border:1px solid #e2e8f0;border-radius:10px;padding:8px 10px;font-size:9.5px;color:#475569;line-height:1.7;text-align:right;margin-bottom:6px}
      .credits-copy{font-size:9px;color:#94a3b8;font-weight:600}

      body.dark .section{background:#141b2d;border-color:#1e293b}
      body.dark .section-head:active,
      body.dark .s-row:active{background:#1e293b}
      body.dark .s-row{border-color:#1e293b}
      body.dark .section-body{border-color:#1e293b}
      body.dark .section-title,
      body.dark .s-row-name{color:#f8fafc}
      body.dark .s-row-value{background:#0f2e2a;color:#5eead4}
      body.dark .fs-slider-wrap{background:#141b2d;border-color:#1e293b}
      body.dark .fs-value{background:#0f2e2a;color:#5eead4}
      body.dark .font-preview{background:linear-gradient(135deg,#0f2e2a,#064e3b);border-color:#14b8a6}
      body.dark .credits-license{background:#1e293b;border-color:#334155;color:#cbd5e1}
    </style>`;
  },

  render() {
    const s = Store.getSettings();
    const farm = Store.getFarm();
    const meta = Store.data.meta;
    const font = this.FONTS.find(f => f.id === s.font) || this.FONTS[0];

    return `
      ${this.css()}
      <div class="page">

        <div class="profile-card">
          <div class="profile-inner">
            <div class="profile-logo">🐔</div>
            <div class="profile-info">
              <div class="profile-name">${farm.name || 'مرغداری من'}</div>
              <div class="profile-meta">
                ${farm.city ? `📍 ${farm.city}` : ''}
                ${farm.city && farm.owner ? ' • ' : ''}
                ${farm.owner ? `👤 ${farm.owner}` : ''}
                ${!farm.city && !farm.owner ? 'بدون اطلاعات' : ''}
              </div>
            </div>
            <button class="profile-edit" onclick="Settings.openFarmEdit()">✏️</button>
          </div>
        </div>

        <div class="section" id="sec-bottomnav">
          <div class="section-head" onclick="Settings.toggleSection('sec-bottomnav')">
            <div class="section-icon" style="background:#f0fdfa;color:#0f766e">📱</div>
            <div class="section-info">
              <div class="section-title">منوی پایین</div>
              <div class="section-summary">۵ ماژول + «بیشتر» ثابت</div>
            </div>
            <div class="section-status"><span class="section-badge on">قابل تغییر</span></div>
            <div class="section-arrow">▼</div>
          </div>
          <div class="section-body">
            <div class="s-row" onclick="Settings.openBottomNavPicker()">
              <div class="s-row-icon" style="background:#f0fdfa;color:#0f766e">✏️</div>
              <div class="s-row-info">
                <div class="s-row-name">انتخاب ماژول‌های منوی پایین</div>
                <div class="s-row-desc">۵ ماژول پرکاربرد خودت رو انتخاب کن</div>
              </div>
              <div class="s-row-arrow">›</div>
            </div>
          </div>
        </div>

        <div class="section" id="sec-layout">
          <div class="section-head" onclick="Settings.toggleSection('sec-layout')">
            <div class="section-icon" style="background:#eff6ff;color:#1e40af">🎛️</div>
            <div class="section-info">
              <div class="section-title">چیدمان صفحه «بیشتر»</div>
              <div class="section-summary">ترتیب و مخفی‌سازی ماژول‌ها</div>
            </div>
            <div class="section-status"><span class="section-badge">قابل تنظیم</span></div>
            <div class="section-arrow">▼</div>
          </div>
          <div class="section-body">
            <div class="s-row" onclick="More.openLayoutEditor()">
              <div class="s-row-icon" style="background:#eff6ff;color:#1e40af">✏️</div>
              <div class="s-row-info">
                <div class="s-row-name">ویرایش چیدمان</div>
                <div class="s-row-desc">با نگه‌داشتن کارت، ترتیب رو تغییر بده</div>
              </div>
              <div class="s-row-arrow">›</div>
            </div>
            <div class="s-row" onclick="More.resetLayout()">
              <div class="s-row-icon" style="background:#fffbeb;color:#92400e">🔄</div>
              <div class="s-row-info">
                <div class="s-row-name">بازنشانی به حالت اولیه</div>
                <div class="s-row-desc">ترتیب پیش‌فرض بازگردانی می‌شود</div>
              </div>
              <div class="s-row-arrow">›</div>
            </div>
          </div>
        </div>

        <div class="section" id="sec-cloud">
          <div class="section-head" onclick="Settings.toggleSection('sec-cloud')">
            <div class="section-icon" style="background:#eff6ff;color:#4285f4">☁️</div>
            <div class="section-info">
              <div class="section-title">پشتیبان‌گیری خودکار</div>
              <div class="section-summary">${UI.isOnline() ? 'متصل' : 'آفلاین — داده‌ها محلی'}</div>
            </div>
            <div class="section-status">
              <span class="section-badge ${UI.isOnline() ? 'on' : 'warn'}">${UI.isOnline() ? 'متصل' : 'آفلاین'}</span>
            </div>
            <div class="section-arrow">▼</div>
          </div>
          <div class="section-body">
            <div class="s-row" onclick="Settings.toggleAutoSave()">
              <div class="s-row-icon" style="background:#ecfdf5;color:#166534">🔄</div>
              <div class="s-row-info">
                <div class="s-row-name">ذخیره خودکار</div>
                <div class="s-row-desc">هنگام خروج از برنامه</div>
              </div>
              <div class="switch ${s.autoSave ? 'on' : ''}" id="swAutoSave"></div>
            </div>
            <div class="s-row" style="cursor:default">
              <div class="s-row-icon" style="background:#ecfdf5;color:#166534">💾</div>
              <div class="s-row-info">
                <div class="s-row-name">آخرین ذخیره</div>
                <div class="s-row-desc">${this.timeAgo(meta.lastSaved)}</div>
              </div>
              <div class="dot on"></div>
            </div>
            <div class="s-row" onclick="Settings.manualSave()">
              <div class="s-row-icon" style="background:#eff6ff;color:#1e40af">⚡</div>
              <div class="s-row-info">
                <div class="s-row-name">ذخیره فوری</div>
                <div class="s-row-desc">همین حالا ذخیره کن</div>
              </div>
              <div class="s-row-arrow">›</div>
            </div>
          </div>
        </div>

        <div class="section" id="sec-import">
          <div class="section-head" onclick="Settings.toggleSection('sec-import')">
            <div class="section-icon" style="background:#ecfdf5;color:#166534">📥</div>
            <div class="section-info">
              <div class="section-title">ایمپورت داده‌ها</div>
              <div class="section-summary">Excel • Google Sheets • CSV</div>
            </div>
            <div class="section-arrow">▼</div>
          </div>
          <div class="section-body">
            <div class="s-row" onclick="Settings.openImportDialog(event)">
              <div class="s-row-icon" style="background:#ecfdf5;color:#166534">📊</div>
              <div class="s-row-info">
                <div class="s-row-name">ایمپورت از Excel</div>
                <div class="s-row-desc">فایل اکسل خود را بارگذاری کنید</div>
              </div>
              <div class="s-row-arrow">›</div>
            </div>
          </div>
        </div>

        <div class="section" id="sec-appearance">
          <div class="section-head" onclick="Settings.toggleSection('sec-appearance')">
            <div class="section-icon" style="background:#f5f3ff;color:#8b5cf6">🎨</div>
            <div class="section-info">
              <div class="section-title">ظاهر و تجربه کاربری</div>
              <div class="section-summary">${s.theme === 'dark' ? 'تم تیره' : 'تم روشن'} • ${font.name} • ${UI.toFa(s.fontSize)}٪</div>
            </div>
            <div class="section-status">
              <span class="section-badge ${s.theme === 'dark' ? 'on' : ''}">${s.theme === 'dark' ? '🌙' : '☀️'}</span>
            </div>
            <div class="section-arrow">▼</div>
          </div>
          <div class="section-body">
            <div class="s-row" onclick="UI.toggleTheme()">
              <div class="s-row-icon" style="background:#eff6ff;color:#1e40af">🌙</div>
              <div class="s-row-info">
                <div class="s-row-name">تم تیره</div>
                <div class="s-row-desc">حالت شب و روز</div>
              </div>
              <div class="switch ${s.theme === 'dark' ? 'on' : ''}"></div>
            </div>

            <div class="s-row" onclick="Settings.openFontPicker()">
              <div class="s-row-icon" style="background:#f5f3ff;color:#6b21a8">🔤</div>
              <div class="s-row-info">
                <div class="s-row-name">فونت نرم‌افزار</div>
                <div class="s-row-desc">۶ فونت پرکاربرد فارسی</div>
              </div>
              <div class="s-row-value">${font.name}</div>
              <div class="s-row-arrow">›</div>
            </div>

            <div class="s-row" style="cursor:default;border-bottom:none;padding-bottom:4px">
              <div class="s-row-icon" style="background:#eff6ff;color:#1e40af">📏</div>
              <div class="s-row-info">
                <div class="s-row-name">اندازه فونت</div>
                <div class="s-row-desc">با اسلایدر تنظیم کن</div>
              </div>
            </div>
            <div class="fs-slider-wrap">
              <div class="fs-slider-row">
                <button class="fs-btn" id="fsMinus" onclick="Settings.stepFontSize(-1)" ${s.fontSize <= 80 ? 'disabled' : ''}>−</button>
                <div class="fs-slider">
                  <input type="range" id="fsRange" min="80" max="130" step="1" value="${s.fontSize}" oninput="Settings.onFontSizeSlide(this.value)">
                </div>
                <button class="fs-btn" id="fsPlus" onclick="Settings.stepFontSize(1)" ${s.fontSize >= 130 ? 'disabled' : ''}>+</button>
                <div class="fs-value" id="fsValue">${UI.toFa(s.fontSize)}٪</div>
              </div>
              <div class="fs-marks">
                <span class="fs-mark ${s.fontSize===80?'on':''}" data-v="80">۸۰٪</span>
                <span class="fs-mark ${s.fontSize===90?'on':''}" data-v="90">۹۰٪</span>
                <span class="fs-mark ${s.fontSize===100?'on':''}" data-v="100">۱۰۰٪</span>
                <span class="fs-mark ${s.fontSize===110?'on':''}" data-v="110">۱۱۰٪</span>
                <span class="fs-mark ${s.fontSize===120?'on':''}" data-v="120">۱۲۰٪</span>
                <span class="fs-mark ${s.fontSize===130?'on':''}" data-v="130">۱۳۰٪</span>
              </div>
            </div>

            <div class="font-preview">
              <div class="font-preview-label">پیش‌نمایش زنده</div>
              <div class="font-preview-text">سلام، این متن نمونه است</div>
              <div class="font-preview-sub" id="previewInfo">${font.name} • اندازه ${UI.toFa(s.fontSize)}٪</div>
            </div>
          </div>
        </div>

        <div class="section" id="sec-data">
          <div class="section-head" onclick="Settings.toggleSection('sec-data')">
            <div class="section-icon" style="background:#ecfdf5;color:#10b981">💾</div>
            <div class="section-info">
              <div class="section-title">مدیریت داده‌ها</div>
              <div class="section-summary">پشتیبان‌گیری، بازیابی، پاک‌سازی</div>
            </div>
            <div class="section-arrow">▼</div>
          </div>
          <div class="section-body">
            <div class="s-row" onclick="Settings.backup()">
              <div class="s-row-icon" style="background:#eff6ff;color:#1e40af">📤</div>
              <div class="s-row-info">
                <div class="s-row-name">پشتیبان‌گیری</div>
                <div class="s-row-desc">دانلود فایل JSON</div>
              </div>
              <div class="s-row-arrow">›</div>
            </div>
            <div class="s-row" onclick="Settings.restore()">
              <div class="s-row-icon" style="background:#ecfdf5;color:#166534">📥</div>
              <div class="s-row-info">
                <div class="s-row-name">بازیابی از فایل</div>
                <div class="s-row-desc">بارگذاری نسخه پشتیبان</div>
              </div>
              <div class="s-row-arrow">›</div>
            </div>
            <div class="s-row" onclick="Settings.shareBackup()">
              <div class="s-row-icon" style="background:#f5f3ff;color:#6b21a8">📲</div>
              <div class="s-row-info">
                <div class="s-row-name">ارسال داده‌ها</div>
                <div class="s-row-desc">اشتراک‌گذاری یا دانلود فایل پشتیبان</div>
              </div>
              <div class="s-row-arrow">›</div>
            </div>
            <div class="s-row" onclick="Settings.reset()">
              <div class="s-row-icon" style="background:#fef2f2;color:#991b1b">🗑️</div>
              <div class="s-row-info">
                <div class="s-row-name">پاک‌سازی کامل</div>
                <div class="s-row-desc" style="color:#ef4444">همه داده‌ها حذف می‌شود</div>
              </div>
              <div class="s-row-arrow">›</div>
            </div>
          </div>
        </div>

        <div class="section" id="sec-about">
          <div class="section-head" onclick="Settings.toggleSection('sec-about')">
            <div class="section-icon" style="background:#eff6ff;color:#1e40af">ℹ️</div>
            <div class="section-info">
              <div class="section-title">درباره نرم‌افزار</div>
              <div class="section-summary">راهنما، پشتیبانی، نسخه</div>
            </div>
            <div class="section-status"><span class="section-badge">v${UI.toFa(UI.APP_INFO.version)}</span></div>
            <div class="section-arrow">▼</div>
          </div>
          <div class="section-body">
            <div class="s-row" onclick="Settings.showAbout()">
              <div class="s-row-icon" style="background:#f0fdfa;color:#0f766e">📱</div>
              <div class="s-row-info">
                <div class="s-row-name">مدیریت مرغداری (آدینه)</div>
                <div class="s-row-desc">ساخته شده توسط ${UI.APP_INFO.author}</div>
              </div>
              <div class="s-row-arrow">›</div>
            </div>
            <div class="s-row" onclick="Settings.showLicense()">
              <div class="s-row-icon" style="background:#fffbeb;color:#92400e">📜</div>
              <div class="s-row-info">
                <div class="s-row-name">لایسنس و شرایط</div>
                <div class="s-row-desc">فقط برای آموزش</div>
              </div>
              <div class="s-row-arrow">›</div>
            </div>
            <div class="s-row" onclick="Settings.showStats()">
              <div class="s-row-icon" style="background:#eff6ff;color:#1e40af">📊</div>
              <div class="s-row-info">
                <div class="s-row-name">آمار داده‌ها</div>
                <div class="s-row-desc">تعداد رکوردها در هر بخش</div>
              </div>
              <div class="s-row-arrow">›</div>
            </div>
          </div>
        </div>

        <div class="credits">
          <div class="credits-brand">مدیریت مرغداری (آدینه)</div>
          <div class="credits-author">ساخته شده توسط ${UI.APP_INFO.author}</div>
          <div class="credits-license">
            <b>📜 شرایط استفاده:</b><br>
            ✅ <b>فقط برای اهداف آموزشی</b> مجاز است<br>
            ❌ استفاده شخصی و تجاری <b>جایز نیست</b><br>
            ⚠️ نیازمند مجوز کتبی از سازنده
          </div>
          <div class="credits-copy">© ${UI.toFa(UI.APP_INFO.year)} ${UI.APP_INFO.author}</div>
        </div>

      </div>
    `;
  },

  after() {
    const open = Store.getSettings().openSections || {};
    Object.keys(open).forEach(id => {
      const el = document.getElementById(id);
      if (el && open[id]) el.classList.add('open');
    });
  },

  toggleSection(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('open');
    const open = Store.getSettings().openSections || {};
    open[id] = el.classList.contains('open');
    Store.updateSettings({ openSections: open });
  },

  openBottomNavPicker() {
    var self = this;
    var FIXED_LAST = 'more';
    var MAX_SELECTABLE = 5;

    var selectableModules = this.BOTTOM_MODULES.filter(function(m){
      return m.id !== FIXED_LAST;
    });

    var s = Store.getSettings();
    var current = s.bottomNav || [];
    var temp = current.filter(function(id){
      return id !== FIXED_LAST;
    }).slice(0, MAX_SELECTABLE);

    var defaults = ['dashboard', 'daily', 'flocks', 'finance', 'sales'];
    for(var d = 0; d < defaults.length && temp.length < MAX_SELECTABLE; d++){
      if(temp.indexOf(defaults[d]) === -1){
        temp.push(defaults[d]);
      }
    }

    function renderPicker(){
      var itemsHtml = '';
      for(var i = 0; i < selectableModules.length; i++){
        var m = selectableModules[i];
        var on = temp.indexOf(m.id) !== -1;
        var order = temp.indexOf(m.id) + 1;
        itemsHtml +=
          '<div class="bnp-item" data-bnp="' + m.id + '" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:' +
          (on ? 'linear-gradient(135deg,#ecfdf5,#d1fae5)' : '#f1f5f9') +
          ';border-radius:10px;border:2px solid ' + (on ? '#10b981' : 'transparent') +
          ';cursor:pointer;margin-bottom:6px">' +
            '<div style="width:32px;height:32px;border-radius:8px;background:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">' + m.icon + '</div>' +
            '<div style="flex:1;font-size:12.5px;font-weight:800;color:#0f172a">' + m.name + '</div>' +
            (on
              ? '<div style="width:22px;height:22px;border-radius:50%;background:#10b981;color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900">' + UI.toFa(order) + '</div>'
              : '<div style="width:22px;height:22px;border-radius:50%;border:2px solid #cbd5e1;background:#fff"></div>') +
          '</div>';
      }

      var moreHtml =
        '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:linear-gradient(135deg,#e0f2fe,#dbeafe);border-radius:10px;border:2px solid #3b82f6;margin-bottom:6px;opacity:.85">' +
          '<div style="width:32px;height:32px;border-radius:8px;background:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">☰</div>' +
          '<div style="flex:1;font-size:12.5px;font-weight:800;color:#1e40af">بیشتر</div>' +
          '<div style="font-size:10px;font-weight:800;color:#1e40af;background:#fff;padding:3px 8px;border-radius:9999px">🔒 ثابت</div>' +
        '</div>';

      var html = '<div style="background:#fff;border-radius:16px;padding:16px;max-width:420px;margin:0 auto;box-shadow:0 12px 32px rgba(15,23,42,.25)">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #e2e8f0">' +
          '<div style="font-size:14px;font-weight:900;color:#0f172a">📱 انتخاب منوی پایین</div>' +
          '<button data-close style="background:#f1f5f9;border:none;width:30px;height:30px;border-radius:50%;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>' +
        '</div>' +
        '<div style="background:#eff6ff;color:#1e40af;padding:10px 12px;border-radius:10px;font-size:11px;font-weight:700;margin-bottom:12px;line-height:1.7;border-right:3px solid #3b82f6">' +
          '💡 دقیقاً <b>۵ ماژول</b> انتخاب کن. «بیشتر» همیشه در آخرین جایگاه ثابت می‌مونه.' +
        '</div>' +
        '<div style="background:#f1f5f9;padding:8px 12px;border-radius:10px;margin-bottom:10px;text-align:center;font-size:11.5px;font-weight:800;color:#0f766e">' +
          'انتخاب‌شده: <span id="bnpCount">' + UI.toFa(temp.length) + '</span> از ۵' +
        '</div>' +
        '<div style="font-size:10.5px;font-weight:800;color:#64748b;margin-bottom:6px;padding-right:4px">✅ ماژول‌های انتخابی</div>' +
        '<div id="bnpList" style="max-height:45vh;overflow-y:auto">' + itemsHtml + '</div>' +
        '<div style="font-size:10.5px;font-weight:800;color:#64748b;margin:12px 0 6px;padding-right:4px">📌 همیشه در آخر</div>' +
        moreHtml +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">' +
          '<button data-close style="padding:11px;border:none;border-radius:10px;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer;background:#f1f5f9;color:#0f172a">انصراف</button>' +
          '<button id="bnpSave" style="padding:11px;border:none;border-radius:10px;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer;background:#0f766e;color:#fff">💾 ذخیره</button>' +
        '</div>' +
      '</div>';

      UI.closeAllModals();
      var modal = UI.openModal(html);

      modal.querySelectorAll('.bnp-item').forEach(function(el){
        el.addEventListener('click', function(){
          var id = el.dataset.bnp;
          var idx = temp.indexOf(id);
          if(idx === -1){
            if(temp.length >= MAX_SELECTABLE){
              UI.toast('⚠️ فقط ۵ ماژول می‌تونی انتخاب کنی', 'warn');
              return;
            }
            temp.push(id);
          } else {
            if(temp.length <= 1){
              UI.toast('⚠️ حداقل ۱ ماژول', 'warn');
              return;
            }
            temp.splice(idx, 1);
          }
          renderPicker();
        });
      });

      var saveBtn = modal.querySelector('#bnpSave');
      if(saveBtn){
        saveBtn.addEventListener('click', function(){
          if(temp.length !== MAX_SELECTABLE){
            UI.toast('❌ باید دقیقاً ۵ ماژول انتخاب کنی', 'error');
            return;
          }
          var finalList = temp.slice(0, MAX_SELECTABLE);
          finalList.push(FIXED_LAST);
          Store.updateSettings({ bottomNav: finalList });
          UI.closeAllModals();
          UI.toast('✅ منوی پایین تغییر کرد', 'success');
          if(window.__renderBottomNav) window.__renderBottomNav();
        });
      }
    }

    renderPicker();
  },

  openImportDialog(ev) {
    if(ev){
      ev.preventDefault();
      ev.stopPropagation();
    }
    console.log('📂 openImportDialog called');

    if(window.ExcelImport && typeof window.ExcelImport.open === 'function'){
      try{
        window.ExcelImport.open();
        return;
      }catch(e){
        console.warn('ExcelImport error:', e);
      }
    }

    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv';
    input.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;width:1px;height:1px';

    input.onchange = function(e){
      var file = e.target.files && e.target.files[0];
      if(input.parentNode) input.parentNode.removeChild(input);
      if(!file) return;
      console.log('📁 file selected:', file.name, file.size);

      var tries = 0;
      var timer = setInterval(function(){
        tries++;
        if(typeof XLSX !== 'undefined' && XLSX.read){
          clearInterval(timer);
          processFileWithXLSX(file);
        } else if(tries > 100){
          clearInterval(timer);
          if(typeof UI !== 'undefined' && UI.toast){
            UI.toast('❌ کتابخانه Excel لود نشد', 'error');
          }
        }
      }, 200);
    };

    document.body.appendChild(input);
    input.click();

    function processFileWithXLSX(file){
      var reader = new FileReader();
      reader.onload = function(evt){
        try{
          var wb = XLSX.read(new Uint8Array(evt.target.result), {type:'array'});
          if(window.ExcelImport && typeof window.ExcelImport.processWorkbook === 'function'){
            var res = window.ExcelImport.processWorkbook(wb);
            if(res && res.sheetsProcessed > 0){
              if(window.ExcelImport.showPreview && window.ExcelImport.saveToStore){
                window.ExcelImport.showPreview(res, function(){
                  window.ExcelImport.saveToStore(res);
                });
              }
            } else {
              if(typeof UI !== 'undefined' && UI.toast) UI.toast('⚠️ شیت قابل تشخیصی نبود', 'error');
            }
          } else {
            if(typeof UI !== 'undefined' && UI.toast){
              UI.toast('📊 فایل خوانده شد — ' + wb.SheetNames.length + ' شیت', 'success');
            }
          }
        }catch(err){
          console.error(err);
          if(typeof UI !== 'undefined' && UI.toast) UI.toast('❌ خطا در خواندن فایل', 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    }
  },

  openFarmEdit() {
    const f = Store.getFarm();
    UI.openModal(`
      <div style="background:#fff;border-radius:16px;padding:18px;max-width:440px;margin:0 auto;box-shadow:0 12px 32px rgba(15,23,42,.25)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #e2e8f0">
          <div style="font-size:15px;font-weight:900;color:#0f172a">🏢 اطلاعات فارم</div>
          <button data-close style="background:#f1f5f9;border:none;width:32px;height:32px;border-radius:50%;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>
        </div>
        <div style="margin-bottom:10px">
          <label style="font-size:11px;font-weight:800;margin-bottom:4px;display:block;color:#0f172a">🏢 نام فارم</label>
          <input id="f-name" value="${f.name || ''}" placeholder="مثلاً مرغداری نمونه" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:12px;font-size:13px;background:#f1f5f9;color:#0f172a;box-sizing:border-box;font-family:inherit">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
          <div>
            <label style="font-size:11px;font-weight:800;margin-bottom:4px;display:block;color:#0f172a">👤 نام مدیر</label>
            <input id="f-owner" value="${f.owner || ''}" placeholder="نام و نام خانوادگی" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:12px;font-size:13px;background:#f1f5f9;color:#0f172a;box-sizing:border-box;font-family:inherit">
          </div>
          <div>
            <label style="font-size:11px;font-weight:800;margin-bottom:4px;display:block;color:#0f172a">📞 تلفن</label>
            <input id="f-phone" type="tel" value="${f.phone || ''}" placeholder="۰۹۱۲..." style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:12px;font-size:13px;background:#f1f5f9;color:#0f172a;box-sizing:border-box;font-family:inherit">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
          <div>
            <label style="font-size:11px;font-weight:800;margin-bottom:4px;display:block;color:#0f172a">📍 شهر</label>
            <input id="f-city" value="${f.city || ''}" placeholder="مثلاً قزوین" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:12px;font-size:13px;background:#f1f5f9;color:#0f172a;box-sizing:border-box;font-family:inherit">
          </div>
          <div>
            <label style="font-size:11px;font-weight:800;margin-bottom:4px;display:block;color:#0f172a">🏷️ نوع فعالیت</label>
            <select id="f-activity" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:12px;font-size:13px;background:#f1f5f9;color:#0f172a;box-sizing:border-box;font-family:inherit">
              <option ${f.activity === 'مرغ گوشتی' ? 'selected' : ''}>مرغ گوشتی</option>
              <option ${f.activity === 'مرغ تخم‌گذار' ? 'selected' : ''}>مرغ تخم‌گذار</option>
              <option ${f.activity === 'جوجه‌کشی' ? 'selected' : ''}>جوجه‌کشی</option>
              <option ${f.activity === 'مختلط' ? 'selected' : ''}>مختلط</option>
            </select>
          </div>
        </div>
        <div style="margin-bottom:14px">
          <label style="font-size:11px;font-weight:800;margin-bottom:4px;display:block;color:#0f172a">📍 آدرس</label>
          <textarea id="f-address" placeholder="آدرس کامل..." style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:12px;font-size:13px;background:#f1f5f9;color:#0f172a;box-sizing:border-box;font-family:inherit;min-height:55px;resize:vertical">${f.address || ''}</textarea>
        </div>
        <button onclick="Settings.saveFarm()" style="width:100%;padding:13px;border:none;border-radius:12px;background:#0f766e;color:#fff;font-family:inherit;font-size:14px;font-weight:900;cursor:pointer">💾 ذخیره اطلاعات</button>
      </div>
    `);
  },

  saveFarm() {
    const name = document.getElementById('f-name').value.trim();
    const phone = document.getElementById('f-phone').value.trim();
    if (!name || name.length < 2) {
      UI.toast('❌ نام فارم را وارد کنید', 'error');
      return;
    }
    Store.updateFarm({
      name,
      owner: document.getElementById('f-owner').value.trim(),
      phone,
      city: document.getElementById('f-city').value.trim(),
      activity: document.getElementById('f-activity').value,
      address: document.getElementById('f-address').value.trim()
    });
    UI.closeAllModals();
    UI.toast('✅ اطلاعات فارم ذخیره شد', 'success');
    Router.go('settings');
  },

  toggleAutoSave() {
    const s = Store.getSettings();
    const next = !s.autoSave;
    Store.updateSettings({ autoSave: next });
    const sw = document.getElementById('swAutoSave');
    if (sw) sw.classList.toggle('on', next);
    UI.toast(next ? '✅ ذخیره خودکار فعال' : '⭕ غیرفعال', next ? 'success' : 'info');
  },

  onFontSizeSlide(v) {
    const val = +v;
    const s = Store.getSettings();
    document.body.style.zoom = val / 100;
    Store.updateSettings({ fontSize: val });

    const valueEl = document.getElementById('fsValue');
    if (valueEl) valueEl.textContent = UI.toFa(val) + '٪';
    const minus = document.getElementById('fsMinus');
    const plus = document.getElementById('fsPlus');
    if (minus) minus.disabled = val <= this.FS_MIN;
    if (plus) plus.disabled = val >= this.FS_MAX;
    document.querySelectorAll('.fs-mark').forEach(m => {
      m.classList.toggle('on', +m.dataset.v === val);
    });
    const info = document.getElementById('previewInfo');
    if (info) {
      const font = this.FONTS.find(f => f.id === s.font) || this.FONTS[0];
      info.textContent = `${font.name} • اندازه ${UI.toFa(val)}٪`;
    }
  },

  stepFontSize(dir) {
    const s = Store.getSettings();
    const next = Math.max(this.FS_MIN, Math.min(this.FS_MAX, (s.fontSize || 100) + dir * this.FS_STEP));
    const range = document.getElementById('fsRange');
    if (range) range.value = next;
    this.onFontSizeSlide(next);
  },

  openFontPicker() {
    const s = Store.getSettings();
    UI.openModal(`
      <div style="background:#fff;border-radius:16px;padding:16px;max-width:420px;margin:0 auto;box-shadow:0 12px 32px rgba(15,23,42,.25)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #e2e8f0">
          <div style="font-size:14px;font-weight:900;color:#0f172a">🔤 انتخاب فونت</div>
          <button data-close style="background:#f1f5f9;border:none;width:30px;height:30px;border-radius:50%;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:5px;max-height:60vh;overflow-y:auto">
          ${this.FONTS.map(f => `
            <div onclick="Settings.selectFont('${f.id}')" style="display:flex;align-items:center;gap:9px;padding:9px 10px;background:${s.font === f.id ? '#f0fdfa' : '#f1f5f9'};border-radius:10px;border:2px solid ${s.font === f.id ? '#0f766e' : 'transparent'};cursor:pointer;font-family:'${f.family}','Vazirmatn',sans-serif">
              <div style="flex:1;min-width:0">
                <div style="font-size:11.5px;font-weight:800;color:#0f172a;margin-bottom:3px;display:flex;align-items:center;gap:5px">
                  <span>${f.name}</span>
                  <span style="font-size:8.5px;font-weight:800;padding:1px 6px;border-radius:9999px;background:#eff6ff;color:#1e40af">${f.tag}</span>
                </div>
                <div style="font-size:13px;font-weight:700;color:#475569;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.sample}</div>
              </div>
              <div style="width:20px;height:20px;border-radius:50%;background:${s.font === f.id ? '#0f766e' : '#fff'};border:2px solid ${s.font === f.id ? '#0f766e' : '#cbd5e1'};display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:11px;color:${s.font === f.id ? '#fff' : 'transparent'};font-weight:900">✓</div>
            </div>
          `).join('')}
        </div>
      </div>
    `);
  },

  selectFont(id) {
    Store.updateSettings({ font: id });
    UI.applyFont();
    UI.closeAllModals();
    UI.toast('✅ فونت تغییر کرد', 'success');
    Router.go('settings');
  },

  manualSave() {
    if (Store.save()) {
      UI.toast('✅ ذخیره شد', 'success');
    } else {
      UI.toast('❌ خطا در ذخیره‌سازی', 'error');
    }
  },

  /* ═══════════════════════════════════════════════
     پشتیبان‌گیری (دانلود فایل)
     ═══════════════════════════════════════════════ */
  backup() {
    try {
      const json = Store.exportJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'adineh-backup-' + UI.todayStr.replace(/\//g, '-') + '.json';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      UI.toast('📤 فایل پشتیبان دانلود شد', 'success');
    } catch (e) {
      console.error('backup error:', e);
      UI.toast('❌ خطا در پشتیبان‌گیری', 'error');
    }
  },

  restore() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const ok = await UI.confirm('همه داده‌ها جایگزین می‌شوند. ادامه؟', { title: '⚠️ بازیابی', yesText: 'بله' });
      if (!ok) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = Store.importJSON(ev.target.result);
        if (result.ok) {
          UI.toast('✅ بازیابی موفق', 'success');
          setTimeout(() => location.reload(), 900);
        } else {
          UI.toast('❌ فایل نامعتبر', 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  },

  /* ═══════════════════════════════════════════════
     ارسال داده‌ها — Web Share + Fallback دانلود
     ═══════════════════════════════════════════════ */
  async shareBackup() {
    const json = Store.exportJSON();
    const filename = 'adineh-backup-' + UI.todayStr.replace(/\//g, '-') + '.json';

    /* ─── روش ۱: Web Share API با فایل ─── */
    if (navigator.share && navigator.canShare) {
      try {
        const blob = new Blob([json], { type: 'application/json' });
        const file = new File([blob], filename, { type: 'application/json' });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'پشتیبان آدینه',
            text: 'پشتیبان ' + UI.todayStr,
            files: [file]
          });
          UI.toast('✅ ارسال شد', 'success');
          return;
        }
      } catch (e) {
        if (e && e.name === 'AbortError') return;
        console.warn('Web Share failed, falling back to download:', e);
      }
    }

    /* ─── روش ۲: دانلود مستقیم فایل ─── */
    try {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function(){ URL.revokeObjectURL(url); }, 1500);
      UI.toast('📤 فایل پشتیبان دانلود شد', 'success');
    } catch (e) {
      console.error('shareBackup fallback failed:', e);
      UI.toast('❌ خطا در ارسال داده‌ها', 'error');
    }
  },

  async reset() {
    const ok1 = await UI.confirm('⚠️ همه داده‌ها حذف می‌شود. ادامه؟', { title: '🗑️ پاک‌سازی', yesText: 'ادامه' });
    if (!ok1) return;
    const ok2 = await UI.confirm('🔴 مطمئن هستید؟!', { title: 'هشدار نهایی', yesText: 'بله' });
    if (!ok2) return;
    Store.reset();
  },

  timeAgo(ts) {
    if (!ts) return 'هنوز ذخیره نشده';
    const diff = Date.now() - ts;
    if (diff < 60000) return 'همین الان';
    if (diff < 3600000) return UI.toFa(Math.floor(diff / 60000)) + ' دقیقه پیش';
    if (diff < 86400000) return UI.toFa(Math.floor(diff / 3600000)) + ' ساعت پیش';
    return new Date(ts).toLocaleDateString('fa-IR');
  },

  showAbout() {
    const info = UI.APP_INFO;
    UI.openModal(`
      <div style="background:#fff;border-radius:20px;padding:24px 20px;max-width:320px;width:100%;margin:0 auto;box-shadow:0 20px 50px rgba(15,23,42,.3);text-align:center">
        <div style="width:72px;height:72px;border-radius:20px;background:linear-gradient(135deg,#0f766e,#14b8a6);display:flex;align-items:center;justify-content:center;font-size:38px;margin:0 auto 14px;box-shadow:0 8px 20px rgba(15,118,110,.35)">🐔</div>
        <div style="font-size:19px;font-weight:900;color:#0f172a;line-height:1.3">مدیریت مرغداری</div>
        <div style="font-size:14px;font-weight:800;color:#0f766e;margin-top:2px">آدینه</div>
        <div style="font-size:11px;color:#94a3b8;font-weight:600;margin-top:8px;line-height:1.6">
          ساخته شده توسط ${info.author}
        </div>
        <div style="display:flex;justify-content:center;gap:6px;margin-top:16px">
          <span style="font-size:10.5px;font-weight:800;padding:5px 12px;border-radius:9999px;background:#f0fdfa;color:#0f766e;border:1px solid #a7f3d0">v${UI.toFa(info.version)}</span>
          <span style="font-size:10.5px;font-weight:800;padding:5px 12px;border-radius:9999px;background:#f0fdfa;color:#0f766e;border:1px solid #a7f3d0">© ${UI.toFa(info.year)}</span>
        </div>
        <button data-close style="width:100%;margin-top:18px;padding:12px;border:none;border-radius:12px;background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;font-family:inherit;font-size:13.5px;font-weight:900;cursor:pointer;box-shadow:0 4px 12px rgba(15,118,110,.3)">بستن</button>
      </div>
    `);
  },

  showLicense() {
    const info = UI.APP_INFO;

    function licCard(type, icon, title, desc){
      var colors = {
        ok:   { bg: '#ecfdf5', border: '#10b981', title: '#166534', text: '#065f46' },
        no:   { bg: '#fef2f2', border: '#ef4444', title: '#991b1b', text: '#7f1d1d' },
        warn: { bg: '#fffbeb', border: '#f59e0b', title: '#92400e', text: '#78350f' }
      };
      var c = colors[type];
      return '<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:12px;background:' + c.bg + ';border-right:3px solid ' + c.border + ';margin-bottom:8px">' +
        '<div style="font-size:16px;line-height:1.3;flex-shrink:0">' + icon + '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:12px;font-weight:900;color:' + c.title + ';margin-bottom:2px">' + title + '</div>' +
          '<div style="font-size:11px;font-weight:600;color:' + c.text + ';line-height:1.5">' + desc + '</div>' +
        '</div>' +
      '</div>';
    }

    UI.openModal(`
      <div style="background:#fff;border-radius:16px;padding:18px;max-width:360px;width:100%;margin:0 auto;box-shadow:0 20px 50px rgba(15,23,42,.3)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #e2e8f0">
          <div style="font-size:14px;font-weight:900;color:#0f172a">📜 شرایط استفاده</div>
          <button data-close style="background:#f1f5f9;border:none;width:30px;height:30px;border-radius:50%;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>
        </div>

        ${licCard('ok', '✅', 'استفاده آموزشی', 'فقط برای اهداف آموزشی مجاز است')}
        ${licCard('no', '❌', 'استفاده شخصی ممنوع', 'شرعاً و قانوناً جایز نیست')}
        ${licCard('no', '❌', 'استفاده تجاری ممنوع', 'شرعاً و قانوناً جایز نیست')}
        ${licCard('warn', '⚠️', 'کسب مجوز', 'نیازمند مجوز کتبی از سازنده (' + info.author + ')')}

        <button data-close style="width:100%;margin-top:8px;padding:12px;border:none;border-radius:12px;background:#0f766e;color:#fff;font-family:inherit;font-size:13.5px;font-weight:900;cursor:pointer">متوجه شدم</button>
      </div>
    `);
  },

  showStats() {
    const d = Store.data;
    const allTx = (d.finance && d.finance.transactions) || [];

    const rows = [
      { icon:'🐔', name:'گله‌ها',          count: (d.flocks && d.flocks.flocks || []).length },
      { icon:'🏢', name:'سالن‌ها',          count: (d.flocks && d.flocks.halls || []).length },
      { icon:'👥', name:'گروه‌ها',          count: (d.flocks && d.flocks.groups || []).length },
      { icon:'📅', name:'رکورد روزانه',    count: (d.daily && d.daily.records || []).length },
      { icon:'💼', name:'تراکنش مالی',     count: allTx.filter(t => !t.kind || t.kind === 'finance_income' || t.kind === 'finance_expense' || t.transType === 'income' || t.transType === 'expense').length },
      { icon:'📥', name:'تراکنش انبار',    count: allTx.filter(t => t.kind === 'inv_in' || t.kind === 'inv_out' || t.kind === 'inv_waste').length },
      { icon:'💰', name:'فروش‌ها',          count: (d.sales && d.sales.sales || []).length },
      { icon:'🥚', name:'جوجه‌کشی',        count: (d.incubation && d.incubation.incs || []).length },
      { icon:'🌾', name:'فرمول جیره',      count: (d.feed && d.feed.formulas || []).length },
      { icon:'💊', name:'سوابق دارو',       count: (d.medicine && d.medicine.records || []).length },
      { icon:'📦', name:'اقلام کاتالوگ',    count: (d.items || []).length },
      { icon:'🧪', name:'مواد دارویی',      count: (d.medicine && d.medicine.medicines || []).length }
    ];

    function statCard(r){
      var isZero = r.count === 0;
      return '<div style="background:' + (isZero ? '#f8fafc' : '#f0fdfa') + ';border:1px solid ' + (isZero ? '#e2e8f0' : '#a7f3d0') + ';border-radius:12px;padding:10px 8px;text-align:center">' +
        '<div style="font-size:20px;line-height:1;margin-bottom:4px">' + r.icon + '</div>' +
        '<div style="font-size:18px;font-weight:900;color:' + (isZero ? '#94a3b8' : '#0f766e') + ';line-height:1.1">' + UI.toFa(r.count) + '</div>' +
        '<div style="font-size:9.5px;font-weight:700;color:#64748b;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + r.name + '</div>' +
      '</div>';
    }

    UI.openModal(`
      <div style="background:#fff;border-radius:16px;padding:18px;max-width:400px;width:100%;margin:0 auto;box-shadow:0 20px 50px rgba(15,23,42,.3)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #e2e8f0">
          <div style="font-size:14px;font-weight:900;color:#0f172a">📊 آمار داده‌ها</div>
          <button data-close style="background:#f1f5f9;border:none;width:30px;height:30px;border-radius:50%;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>
        </div>

        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-height:60vh;overflow-y:auto;padding:2px">
          ${rows.map(statCard).join('')}
        </div>

        <button data-close style="width:100%;margin-top:14px;padding:12px;border:none;border-radius:12px;background:#0f766e;color:#fff;font-family:inherit;font-size:13.5px;font-weight:900;cursor:pointer">بستن</button>
      </div>
    `);
  }
});

console.log('✅ settings route registered (v10 — header + share fix)');

})();