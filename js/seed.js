/* ═══════════════════════════════════════════════
   SEED — داده‌های اولیه فارم (آدینه)
   نسخه: v2 — String IDs + dual fields برای سازگاری
   ═══════════════════════════════════════════════ */
window.ADINEH_SEED = (function(){
'use strict';

var now = Date.now();
var _c = 0;
function uid(){ return String(++_c); }   /* ✅ String به جای number */

/* ═══════════════════════════════════════════════
   اطلاعات فارم
   ═══════════════════════════════════════════════ */
var farm = {
  name: 'مرغداری آدینه',
  owner: 'رضا آدینه',
  phone: '',
  city: '',
  address: '',
  activity: 'مرغ گوشتی'
};

/* ═══════════════════════════════════════════════
   واحدها
   ═══════════════════════════════════════════════ */
var units = [
  { id: uid(), name: 'کیلوگرم', symbol: 'kg',   isLocked: false, createdAt: now },
  { id: uid(), name: 'گرم',     symbol: 'g',    isLocked: false, createdAt: now },
  { id: uid(), name: 'لیتر',    symbol: 'L',    isLocked: false, createdAt: now },
  { id: uid(), name: 'میلی‌لیتر', symbol: 'ml', isLocked: false, createdAt: now },
  { id: uid(), name: 'عدد',     symbol: 'عدد',  isLocked: false, createdAt: now },
  { id: uid(), name: 'ویال',    symbol: 'vial', isLocked: false, createdAt: now },
  { id: uid(), name: 'بسته',    symbol: 'pack', isLocked: false, createdAt: now },
  { id: uid(), name: 'تن',      symbol: 'ton',  isLocked: false, createdAt: now }
];

/* ═══════════════════════════════════════════════
   دسته‌بندی‌ها
   ═══════════════════════════════════════════════ */
var categories = [
  /* انبار */
  { id: uid(), name: 'خوراک',  color: '#10b981', icon: '🌾', scope: 'inventory', isLocked: false, createdAt: now },
  { id: uid(), name: 'دارو',   color: '#ef4444', icon: '💊', scope: 'inventory', isLocked: false, createdAt: now },
  { id: uid(), name: 'تجهیزات', color: '#3b82f6', icon: '🔧', scope: 'inventory', isLocked: false, createdAt: now },
  { id: uid(), name: 'سایر',   color: '#8b5cf6', icon: '📦', scope: 'inventory', isLocked: false, createdAt: now },

  /* مالی — درآمد */
  { id: uid(), name: 'فروش جوجه', color: '#f59e0b', icon: '🐣', scope: 'finance', type: 'income',  isLocked: false, createdAt: now },
  { id: uid(), name: 'فروش تخم',  color: '#3b82f6', icon: '🥚', scope: 'finance', type: 'income',  isLocked: false, createdAt: now },
  { id: uid(), name: 'فروش مرغ',  color: '#ef4444', icon: '🐔', scope: 'finance', type: 'income',  isLocked: false, createdAt: now },
  { id: uid(), name: 'فروش کود',  color: '#10b981', icon: '🌱', scope: 'finance', type: 'income',  isLocked: false, createdAt: now },

  /* مالی — هزینه */
  { id: uid(), name: 'خوراک',   color: '#10b981', icon: '🌾', scope: 'finance', type: 'expense', isLocked: false, createdAt: now },
  { id: uid(), name: 'دارو',    color: '#ef4444', icon: '💊', scope: 'finance', type: 'expense', isLocked: false, createdAt: now },
  { id: uid(), name: 'کارگر',   color: '#f59e0b', icon: '👷', scope: 'finance', type: 'expense', isLocked: false, createdAt: now },
  { id: uid(), name: 'حمل',     color: '#3b82f6', icon: '🚚', scope: 'finance', type: 'expense', isLocked: false, createdAt: now },
  { id: uid(), name: 'آب و برق', color: '#06b6d4', icon: '⚡', scope: 'finance', type: 'expense', isLocked: false, createdAt: now }
];

/* ═══════════════════════════════════════════════
   انواع پرنده
   ═══════════════════════════════════════════════ */
var birdTypes = [
  { id: uid(), name: 'مرندی',   hatchDays: 21, transferDays: 18, icon: '🐔', color: '#f59e0b', isLocked: false, createdAt: now },
  { id: uid(), name: 'بلدرچین', hatchDays: 17, transferDays: 14, icon: '🐦', color: '#8b5cf6', isLocked: false, createdAt: now },
  { id: uid(), name: 'بوقلمون', hatchDays: 28, transferDays: 25, icon: '🦃', color: '#3b82f6', isLocked: false, createdAt: now }
];

/* ═══════════════════════════════════════════════
   علل تلفات / عدم هچ
   ═══════════════════════════════════════════════ */
var causes = [
  { id: uid(), name: 'نامعلوم',       scope: 'death', isLocked: true,  isBuiltIn: true, usage: 0, createdAt: now },
  { id: uid(), name: 'حمل و نقل',     scope: 'death', isLocked: false, usage: 0, createdAt: now },
  { id: uid(), name: 'زیر دست و پا',  scope: 'death', isLocked: false, usage: 0, createdAt: now },
  { id: uid(), name: 'نقص جسمی',      scope: 'death', isLocked: false, usage: 0, createdAt: now },
  { id: uid(), name: 'غرغ شدگی',      scope: 'death', isLocked: false, usage: 0, createdAt: now },
  { id: uid(), name: 'فلجی',          scope: 'death', isLocked: false, usage: 0, createdAt: now },
  { id: uid(), name: 'بیماری',        scope: 'death', isLocked: false, usage: 0, createdAt: now },
  { id: uid(), name: 'گرما',          scope: 'death', isLocked: false, usage: 0, createdAt: now },
  { id: uid(), name: 'سرما',          scope: 'death', isLocked: false, usage: 0, createdAt: now },
  { id: uid(), name: 'گیر کردن',      scope: 'death', isLocked: false, usage: 0, createdAt: now },
  { id: uid(), name: 'غرق شدگی',      scope: 'death', isLocked: false, usage: 0, createdAt: now },
  { id: uid(), name: 'نطفه‌نگرفته',   scope: 'hatch_failure', isLocked: false, usage: 0, createdAt: now },
  { id: uid(), name: 'رطوبت نامناسب', scope: 'hatch_failure', isLocked: false, usage: 0, createdAt: now },
  { id: uid(), name: 'دمای نامناسب',  scope: 'hatch_failure', isLocked: false, usage: 0, createdAt: now }
];

/* ═══════════════════════════════════════════════
   روش‌های مصرف دارو
   ═══════════════════════════════════════════════ */
var methods = [
  { id: uid(), name: 'آب آشامیدنی',    isLocked: false, createdAt: now },
  { id: uid(), name: 'تزریق زیرجلدی', isLocked: false, createdAt: now },
  { id: uid(), name: 'تزریق عضلانی',  isLocked: false, createdAt: now },
  { id: uid(), name: 'قطره چشمی',      isLocked: false, createdAt: now },
  { id: uid(), name: 'قطره بینی',      isLocked: false, createdAt: now },
  { id: uid(), name: 'خوراکی',         isLocked: false, createdAt: now },
  { id: uid(), name: 'مخلوط در جیره', isLocked: false, createdAt: now }
];

/* ═══════════════════════════════════════════════
   علل مصرف دارو
   ═══════════════════════════════════════════════ */
var reasons = [
  { id: uid(), name: 'پیشگیری',             isLocked: false, createdAt: now },
  { id: uid(), name: 'درمان',               isLocked: false, createdAt: now },
  { id: uid(), name: 'تقویت عمومی',         isLocked: false, createdAt: now },
  { id: uid(), name: 'بعد از واکسیناسیون', isLocked: false, createdAt: now },
  { id: uid(), name: 'استرس',               isLocked: false, createdAt: now },
  { id: uid(), name: 'ضدعفونی',             isLocked: false, createdAt: now }
];

/* ═══════════════════════════════════════════════
   انواع تراکنش انبار
   ═══════════════════════════════════════════════ */
var transTypes = [
  { id: uid(), name: 'ورود',    effect: '+', color: '#10b981', icon: '📥', isLocked: true, createdAt: now },
  { id: uid(), name: 'خروج',    effect: '-', color: '#ef4444', icon: '📤', isLocked: true, createdAt: now },
  { id: uid(), name: 'ضایعات',  effect: '-', color: '#f59e0b', icon: '🗑️', isLocked: true, createdAt: now }
];

/* ═══════════════════════════════════════════════
   سالن‌ها
   ═══════════════════════════════════════════════ */
var halls = [
  {
    id: uid(),
    name: 'سالن ۱',
    color: '#8b5cf6',
    length: 0, width: 0, height: 0,
    birdType: 'مرندی',
    birdCount: 0,
    equipment: [],
    features: ['تهویه', 'گرمایش'],
    notes: '',
    isLocked: false,
    createdAt: now
  },
  {
    id: uid(),
    name: 'سالن ۲',
    color: '#a855f7',
    length: 0, width: 0, height: 0,
    birdType: 'مرندی',
    birdCount: 0,
    equipment: [],
    features: ['تهویه'],
    notes: '',
    isLocked: false,
    createdAt: now
  }
];

/* ═══════════════════════════════════════════════
   گله‌ها
   ═══════════════════════════════════════════════ */
var flockOldId = uid();
var flockNewId = uid();

var flocks = [
  {
    id: flockOldId,
    name: 'گله مرندی قدیم',
    birdType: 'مرندی',
    hatch: '1405/05/03',
    hatchDate: '1405/05/03',      /* ✅ dual field */
    count: 455,
    initialCount: 455,             /* ✅ dual field */
    alive: 354,
    aliveCount: 354,               /* ✅ dual field */
    deaths: 101,
    status: 'active',
    color: '#f59e0b',
    hall: 'سالن ۱',
    group: 'گروه بهاره',
    chickPrice: 0,
    feedPrice: 0,
    transportCost: 0,
    notes: 'گله اصلی — هچ ۱۴۰۵/۰۵/۰۳',
    createdAt: now - 100 * 86400000
  },
  {
    id: flockNewId,
    name: 'گله مرندی جدید',
    birdType: 'مرندی',
    hatch: '1405/06/01',
    hatchDate: '1405/06/01',
    count: 185,
    initialCount: 185,
    alive: 162,
    aliveCount: 162,
    deaths: 23,
    status: 'active',
    color: '#3b82f6',
    hall: 'سالن ۲',
    group: 'گروه پاییزه',
    chickPrice: 0,
    feedPrice: 0,
    transportCost: 0,
    notes: 'گله دوم — هچ ۱۴۰۵/۰۶/۰۱',
    createdAt: now - 30 * 86400000
  }
];

/* ═══════════════════════════════════════════════
   رکوردهای روزانه — گله قدیم
   ═══════════════════════════════════════════════ */
var dailyOldRaw = [
  { date: '1405/05/04', deaths: 16, cause: 'حمل و نقل',    notes: '۱۱ تا داخل کارتن از زمان حمل مرده بودن', medicine: '' },
  { date: '1405/05/30', deaths: 44, cause: 'نامعلوم',      notes: '', medicine: '' },
  { date: '1405/06/02', deaths: 25, cause: 'زیر دست و پا', notes: 'زیر دست و پا مرده بودن، شب اول جابجایی به سالن ۵۰ متری', medicine: '' },
  { date: '1405/06/07', deaths: 4,  cause: 'نقص جسمی',     notes: '۱ جوجه نوکش کج شده بود از کودکی و الان از گرسنگی مرد، سه تا هم از بی حالی بعد از ظهر مردن', medicine: '' },
  { date: '1405/06/08', deaths: 1,  cause: 'نامعلوم',      notes: 'یک جوجه بدون نشانه‌ای، جایی که جوجه ها دیشب خواب بودن، مرده', medicine: '' },
  { date: '1405/06/09', deaths: 1,  cause: 'نقص جسمی',     notes: 'جوجه‌ای که از کودکی نوکش کج بود و ساعت ۷ و ۲۰ دقیقه شب مرده بود', medicine: '' },
  { date: '1405/06/10', deaths: 0,  cause: '',             notes: '', medicine: '' },
  { date: '1405/06/11', deaths: 2,  cause: 'گیر کردن',     notes: 'آبخوری دم در افتاده بود، تا ۱.۵ متر اولش در، آب جمع شده بود که تخلیه شد. یک جوجه خیس شده بود و بقیه جوجه زخمیش کردن', medicine: '' },
  { date: '1405/06/12', deaths: 0,  cause: '',             notes: 'در مشاهدات دم غروب، اکثر جوجه ها سالم و چینه دان پر از دان بود، یک جوجه یه گوشه افتاده بود، اما چینه دان پر، ولی آب نخورده بود (روی پا نمی‌تونه وایسه) که آب بهش دادم، امروز برگ یونجه خشک دادم', medicine: '' },
  { date: '1405/06/13', deaths: 1,  cause: 'نامعلوم',      notes: 'بالای سالن جایی که جوجه‌ها شب می‌خوابن مرده بود', medicine: '' },
  { date: '1405/06/15', deaths: 1,  cause: 'غرق شدگی',     notes: 'داخل آبخوری افتاد و خفه شد', medicine: '' },
  { date: '1405/06/17', deaths: 1,  cause: 'نقص جسمی',     notes: 'نوک پایین نصف شده بود، عکس ازش دارم', medicine: '' },
  { date: '1405/06/19', deaths: 2,  cause: 'فلجی',         notes: 'دو تا فلج بودن و از گرسنگی و بیماری مردن', medicine: '' },
  { date: '1405/06/20', deaths: 3,  cause: 'فلجی',         notes: '۳ تا فلج شده مرده بود. آبخوری‌ها شسته و ۱۰۰ گرم پودر سیر در ۱۰ لیتر آب ریختم. داخل ۱۵ کیلو جیره، پودر سورنجان، خولنجان، شیطرج، زنجبیل و دارچین هر کدام ۱۰۰ گرم و ۲۵ گرم فلفل سیاه زدم', medicine: 'پودر سیر + ادویه‌جات' }
];

/* ═══════════════════════════════════════════════
   رکوردهای روزانه — گله جدید
   ═══════════════════════════════════════════════ */
var dailyNewRaw = [
  { date: '1405/06/01', deaths: 0, cause: '',             notes: '', medicine: '' },
  { date: '1405/06/02', deaths: 3, cause: 'نامعلوم',      notes: '', medicine: '' },
  { date: '1405/06/04', deaths: 2, cause: 'نامعلوم',      notes: '', medicine: '' },
  { date: '1405/06/07', deaths: 2, cause: 'نامعلوم',      notes: '', medicine: '' },
  { date: '1405/06/08', deaths: 1, cause: 'نامعلوم',      notes: '', medicine: '' },
  { date: '1405/06/09', deaths: 1, cause: 'نامعلوم',      notes: 'بدون علامت خاصی', medicine: '' },
  { date: '1405/06/10', deaths: 0, cause: '',             notes: '', medicine: '' },
  { date: '1405/06/11', deaths: 3, cause: 'نامعلوم',      notes: 'دان خورده بودن ولی انگار ضعیف بودن', medicine: '' },
  { date: '1405/06/12', deaths: 1, cause: 'نامعلوم',      notes: 'یک کاکلی مرده، دان و آب خورده، بدون نشانه بیماری', medicine: 'مولتی ویتامین' },
  { date: '1405/06/13', deaths: 0, cause: '',             notes: '', medicine: 'مولتی ویتامین' },
  { date: '1405/06/14', deaths: 2, cause: 'گیر کردن',     notes: 'با لمس چینه دان، چینه دان پر بود (نرم)، و بین دوتا درز کوچک کارتن بستر افتاده بود', medicine: '' },
  { date: '1405/06/15', deaths: 1, cause: 'نامعلوم',      notes: 'جوجه نزدیک آبخوری بدون علامت خاصی مرده', medicine: '' },
  { date: '1405/06/16', deaths: 2, cause: 'گیر کردن',     notes: 'یک جوجه در نزدیکی محل خواب مرده بود و یکی هم بین کارتن گیر کرده بود', medicine: '' },
  { date: '1405/06/17', deaths: 1, cause: 'نامعلوم',      notes: 'چینه دان پر، ولی جوجه ها به پشتش نوک زدن', medicine: '' },
  { date: '1405/06/18', deaths: 2, cause: 'نامعلوم',      notes: 'علائم خاصی ندیدم', medicine: '' },
  { date: '1405/06/19', deaths: 1, cause: 'نامعلوم',      notes: 'روزی نزدیک ۳ تا ۴ لیتر آب مصرف دارن', medicine: '' },
  { date: '1405/06/20', deaths: 1, cause: 'زیر دست و پا', notes: 'زیر دست و پا فک کنم مرده بود، وسط سالن', medicine: '' }
];

/* ساخت رکوردهای نهایی با محاسبه مانده */
function buildDaily(raw, flockId, flockName, initial){
  var alive = initial;
  return raw.map(function(r, i){
    alive -= r.deaths;
    return {
      id: uid(),
      flockId: flockId,
      flock: flockName,
      date: r.date,
      deaths: r.deaths,
      alive: alive,
      deathPct: +(((initial - alive) / initial) * 100).toFixed(2),
      cause: r.cause || '',
      notes: r.notes || '',
      medicine: r.medicine || '',
      medCost: 0,
      temp: 0, humidity: 0,
      feed: 0, water: 0, weight: 0, eggs: 0,
      broken: 0, dirty: 0,
      createdAt: now - (raw.length - i) * 86400000
    };
  });
}

var dailyRecords = [
  ...buildDaily(dailyOldRaw, flockOldId, 'گله مرندی قدیم', 455),
  ...buildDaily(dailyNewRaw, flockNewId, 'گله مرندی جدید', 185)
];

/* ═══════════════════════════════════════════════
   دستگاه‌های جوجه‌کشی
   ═══════════════════════════════════════════════ */
var devices = [
  {
    id: uid(),
    name: 'دستگاه ۵۸۸ تایی دماوند',
    manufacturer: 'بلدرچین دماوند',
    model: 'DQ 150 SH',
    capacity: 588,
    capacityQuail: 1350,
    capacityTurkey: 350,
    power: 165,
    voltage: 220,
    dimensions: '۱۴۳ × ۸۰ × ۵۸',
    weight: 60,
    price: 53000000,
    type: 'نیمه‌صنعتی',
    notes: 'ستر اتوماتیک ۷ طبقه راک + هچر ۷ طبقه. برد DQIG',
    isLocked: false,
    createdAt: now
  },
  {
    id: uid(),
    name: 'دستگاه ۵۰۴ تایی هدایت',
    manufacturer: 'گروه صنعت طیور هدایت',
    model: 'HED-504',
    capacity: 504,
    capacityQuail: 1152,
    capacityTurkey: 300,
    power: 200,
    voltage: 220,
    dimensions: '۱۲۵ × ۷۱ × ۴۴',
    weight: 25,
    price: 53500000,
    type: 'فول اتومات',
    notes: 'کنترلر فول اتومات. حفظ دما و رطوبت تا ۳ ساعت در قطع برق',
    isLocked: false,
    createdAt: now
  }
];

/* ═══════════════════════════════════════════════
   اقلام خوراک
   ═══════════════════════════════════════════════ */
var feedItemsData = [
  { name: 'ذرت',              price: 58000 },
  { name: 'کنجاله سویا',      price: 86000 },
  { name: 'کنجاله کنجد',      price: 65000 },
  { name: 'گندم',             price: 52000 },
  { name: 'جو',               price: 45000 },
  { name: 'سبوس گندم',        price: 40000 },
  { name: 'دی کلسیم فسفات',   price: 250000 },
  { name: 'کربنات کلسیم',     price: 60000 },
  { name: 'روغن کنجد',        price: 900000 },
  { name: 'کنسانتره',         price: 220000 },
  { name: 'نمک',              price: 10000 },
  { name: 'یونجه',            price: 2000 }
];

var items = feedItemsData.map(function(it){
  return {
    id: uid(),
    name: it.name,
    category: 'خوراک',
    price: it.price,
    unit: 'کیلوگرم',
    type: 'feed',
    minQty: 0,
    isLocked: false,
    createdAt: now
  };
});

/* افزودن دارو به اقلام */
items.push({
  id: uid(),
  name: 'آمینو ویتاتریس',
  category: 'دارو',
  price: 0,
  unit: 'لیتر',
  type: 'medicine',
  manufacturer: 'رویان دارو',
  description: 'مولتی‌ویتامین + اسیدهای آمینه + عناصر کمیاب',
  dosage: 'نیم تا یک لیتر در هزار لیتر آب — ۳ تا ۵ روز',
  minQty: 0,
  isLocked: false,
  createdAt: now
});

/* ═══════════════════════════════════════════════
   فرمول جیره
   ═══════════════════════════════════════════════ */
var feedFormulas = [
  {
    id: uid(),
    name: 'جیره اصلی — مرندی',
    type: 'رشد',
    totalKg: 100,
    ingredients: [
      { name: 'ذرت',              pct: 38 },
      { name: 'کنجاله سویا',      pct: 20 },
      { name: 'کنجاله کنجد',      pct: 5 },
      { name: 'گندم',             pct: 18 },
      { name: 'جو',               pct: 8 },
      { name: 'سبوس گندم',        pct: 3 },
      { name: 'دی کلسیم فسفات',   pct: 2 },
      { name: 'کربنات کلسیم',     pct: 0 },
      { name: 'روغن کنجد',        pct: 1 },
      { name: 'کنسانتره',         pct: 5 },
      { name: 'نمک',              pct: 0.8 },
      { name: 'یونجه',            pct: 0 }
    ],
    protein: 0, energy: 0,
    calcium: 0, phosphorus: 0, fiber: 0,
    suitable: 'گله‌های در حال رشد',
    notes: 'فرمول واقعی — مخلوط‌شده در ۱۴۰۵/۰۶/۰۸',
    createdAt: now
  }
];

/* ═══════════════════════════════════════════════
   خروجی نهایی
   ═══════════════════════════════════════════════ */
return {
  farm: farm,
  units: units,
  categories: categories,
  birdTypes: birdTypes,
  causes: causes,
  methods: methods,
  reasons: reasons,
  transTypes: transTypes,
  halls: halls,
  flocks: flocks,
  dailyRecords: dailyRecords,
  devices: devices,
  items: items,
  feedFormulas: feedFormulas,
  transactions: [],
  incubationBatches: []
};

})();