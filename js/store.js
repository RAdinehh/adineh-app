/* ═══════════════════════════════════════════════
   STORE — ذخیره‌سازی مرکزی (آدینه)
   نسخه: v4.4 — Fix bottomNav length (6 items)
   ساخته شده توسط رضا آدینه
   ═══════════════════════════════════════════════ */
(function(){
'use strict';

if(window.Store && window.Store._version === 4.4){
  console.log('⏭️ Store v4.4 already loaded');
  return;
}

var KEY = 'adineh_data_v1';
var LEGACY_KEYS = [
  'adineh_contacts_v1','adineh_daily_v1','adineh_finance_v1','adineh_finance_v2',
  'adineh_flocks_v6','adineh_flocks_v7','adineh_flocks_v8',
  'adineh_incubation_v1','adineh_medicine_v1',
  'adineh_sales_v1','adineh_sales_v2','adineh_sales_v3'
];

function getDefault(){
  return {
    farm: { name: 'مرغداری من', owner: '', city: '', phone: '', activity: 'مرغ گوشتی', address: '' },
    settings: {
      theme: 'light',
      font: 'vazirmatn',
      fontSize: 100,
      autoSave: true,
      sound: false,
      vibrate: false,
      compact: false,
      firstRun: true,
      activePage: 'dashboard',
      openSections: {},
      /* ✅ ۶ آیتم: ۵ انتخابی + more */
      bottomNav: ['dashboard', 'daily', 'flocks', 'finance', 'sales', 'more']
    },
    meta: { lastSaved: 0, lastCloudSync: 0, version: 4, seeded: false, createdAt: Date.now() },

    flocks: { flocks: [], groups: [], merged: [], halls: [], birdTypes: [], customFeatures: [] },
    daily: { causes: [], records: [] },
    finance: { categories: [], methods: [], transactions: [] },
    sales: { types: [], methods: [], sales: [] },
    incubation: { devices: [], birds: [], causes: [], results: [], sellers: [], incs: [] },
    medicine: { types: [], medicines: [], units: [], methods: [], reasons: [], records: [] },
    feed: { formulas: [], feedTypes: [], feedItemCats: [] },
    inventory: { items: [], transactions: [], transportVehicles: [] },
    contacts: { customers: {}, workers: [] },

    parties: [],
    items: [],
    units: [],
    categories: []
  };
}

function deepMerge(target, source){
  if(!source || typeof source !== 'object') return target;
  Object.keys(source).forEach(function(k){
    var sv = source[k];
    var tv = target[k];
    if(sv && typeof sv === 'object' && !Array.isArray(sv)
       && tv && typeof tv === 'object' && !Array.isArray(tv)){
      deepMerge(tv, sv);
    } else if(sv !== undefined){
      target[k] = sv;
    }
  });
  return target;
}

function loadData(){
  var defaults = getDefault();
  try{
    var raw = localStorage.getItem(KEY);
    if(!raw){ console.log('📦 Store: دیتای جدید'); return defaults; }
    var parsed = JSON.parse(raw);
    deepMerge(defaults, parsed);
    console.log('📦 Store: از localStorage لود شد');
    return defaults;
  }catch(e){
    console.error('❌ Store load:', e);
    return defaults;
  }
}

function migrateLegacy(data){
  if(data.meta && data.meta.version >= 4) return data;

  console.log('🔄 Store: مهاجرت از نسخه قدیمی');

  var unifiedParties = data.parties || [];
  var existingPartyNames = {};
  unifiedParties.forEach(function(p){ existingPartyNames[p.name] = true; });

  function pushParty(name, extra){
    if(!name || existingPartyNames[name]) return;
    existingPartyNames[name] = true;
    unifiedParties.push({
      id: String(unifiedParties.length + 1),
      name: name,
      phone: (extra && extra.phone) || '',
      city: (extra && extra.city) || '',
      type: (extra && extra.type) || 'both',
      notes: (extra && extra.notes) || '',
      isLocked: false
    });
  }

  if(data.finance && Array.isArray(data.finance.parties)){
    data.finance.parties.forEach(function(p){ pushParty(p.name, p); });
    delete data.finance.parties;
  }
  if(data.sales && Array.isArray(data.sales.parties)){
    data.sales.parties.forEach(function(p){ pushParty(p.name, p); });
    delete data.sales.parties;
  }
  if(data.contacts && data.contacts.customers){
    Object.keys(data.contacts.customers).forEach(function(name){
      pushParty(name, data.contacts.customers[name]);
    });
  }
  data.parties = unifiedParties;

  var unifiedItems = data.items || [];
  var existingItemNames = {};
  unifiedItems.forEach(function(it){ existingItemNames[it.name] = true; });

  if(data.inventory && Array.isArray(data.inventory.items)){
    data.inventory.items.forEach(function(it){
      if(!it.name || existingItemNames[it.name]) return;
      existingItemNames[it.name] = true;
      unifiedItems.push(it);
    });
    data.inventory.items = [];
  }
  data.items = unifiedItems;

  var allTrans = [];
  if(data.finance && Array.isArray(data.finance.transactions)){
    allTrans = allTrans.concat(data.finance.transactions);
  }
  if(data.inventory && Array.isArray(data.inventory.transactions)){
    allTrans = allTrans.concat(data.inventory.transactions);
    data.inventory.transactions = [];
  }
  var seenIds = {};
  data.finance.transactions = allTrans.filter(function(t){
    if(!t || !t.id) return false;
    var idStr = String(t.id);
    if(seenIds[idStr]) return false;
    seenIds[idStr] = true;
    return true;
  });

  if(Array.isArray(data.units) && data.units.length === 0){
    if(data.medicine && Array.isArray(data.medicine.units) && data.medicine.units.length){
      data.units = data.medicine.units.slice();
    }
  }

  if(!Array.isArray(data.categories) || !data.categories.length){
    var newCats = [];
    if(data.finance && Array.isArray(data.finance.categories)){
      newCats = newCats.concat(data.finance.categories);
    }
    data.categories = newCats;
  }

  LEGACY_KEYS.forEach(function(k){ try{ localStorage.removeItem(k); }catch(e){} });

  if(!data.meta) data.meta = {};
  data.meta.version = 4;

  console.log('✅ Store: مهاجرت کامل شد');
  return data;
}

function applySeed(data){
  if(!window.ADINEH_SEED){ console.log('⚠️ Store: seed موجود نیست'); return data; }
  if(data.meta && data.meta.seeded) return data;

  var s = window.ADINEH_SEED;
  console.log('🌱 Store: اعمال seed اولیه');

  try{
    if(s.farm) data.farm = Object.assign({}, data.farm, s.farm);
    if(Array.isArray(s.flocks) && s.flocks.length) data.flocks.flocks = s.flocks;
    if(Array.isArray(s.halls) && s.halls.length) data.flocks.halls = s.halls;
    if(Array.isArray(s.birdTypes) && s.birdTypes.length) data.flocks.birdTypes = s.birdTypes;
    if(Array.isArray(s.dailyRecords) && s.dailyRecords.length) data.daily.records = s.dailyRecords;

    if(Array.isArray(s.causes) && s.causes.length){
      var deathCauses = s.causes.filter(function(c){ return !c.scope || c.scope === 'death'; });
      var hatchCauses = s.causes.filter(function(c){ return c.scope === 'hatch_failure'; });
      if(deathCauses.length) data.daily.causes = deathCauses;
      if(hatchCauses.length) data.incubation.causes = hatchCauses;
    }

    if(Array.isArray(s.devices) && s.devices.length) data.incubation.devices = s.devices;
    if(Array.isArray(s.incubationBatches) && s.incubationBatches.length) data.incubation.incs = s.incubationBatches;
    if(Array.isArray(s.feedFormulas) && s.feedFormulas.length) data.feed.formulas = s.feedFormulas;
    if(Array.isArray(s.items) && s.items.length) data.items = s.items;
    if(Array.isArray(s.units) && s.units.length) data.units = s.units;
    if(Array.isArray(s.categories) && s.categories.length) data.categories = s.categories;
    if(Array.isArray(s.reasons) && s.reasons.length) data.medicine.reasons = s.reasons;
    if(Array.isArray(s.methods) && s.methods.length) data.medicine.methods = s.methods;

    data.meta.seeded = true;
    data.meta.version = 4;
  }catch(e){
    console.error('❌ Store seed:', e);
  }

  return data;
}

var MAP = {
  'flocks':            ['flocks', 'flocks'],
  'groups':            ['flocks', 'groups'],
  'merged':            ['flocks', 'merged'],
  'halls':             ['flocks', 'halls'],
  'birdTypes':         ['flocks', 'birdTypes'],
  'customFeatures':    ['flocks', 'customFeatures'],

  'dailyRecords':      ['daily', 'records'],
  'dailyCauses':       ['daily', 'causes'],
  'causes':            ['daily', 'causes'],

  'transactions':      ['finance', 'transactions'],
  'financeCategories': ['finance', 'categories'],
  'financeMethods':    ['finance', 'methods'],

  'sales':             ['sales', 'sales'],
  'saleTypes':         ['sales', 'types'],
  'salesTypes':        ['sales', 'types'],
  'salesMethods':      ['sales', 'methods'],

  'incubationBatches': ['incubation', 'incs'],
  'incs':              ['incubation', 'incs'],
  'incDevices':        ['incubation', 'devices'],
  'incBirds':          ['incubation', 'birds'],
  'incCauses':         ['incubation', 'causes'],
  'incResults':        ['incubation', 'results'],
  'incSellers':        ['incubation', 'sellers'],

  'medicineRecords':   ['medicine', 'records'],
  'medicines':         ['medicine', 'medicines'],
  'medTypes':          ['medicine', 'types'],
  'medMethods':        ['medicine', 'methods'],
  'medReasons':        ['medicine', 'reasons'],
  'medUnits':          ['medicine', 'units'],

  'feedFormulas':      ['feed', 'formulas'],
  'formulas':          ['feed', 'formulas'],
  'feedTypes':         ['feed', 'feedTypes'],
  'feedItemCats':      ['feed', 'feedItemCats'],

  'invItems':              ['inventory', 'items'],
  'invTransportVehicles':  ['inventory', 'transportVehicles'],

  'workers':           ['contacts', 'workers'],

  'parties':           ['parties', null],
  'items':             ['items', null],
  'units':             ['units', null],
  'categories':        ['categories', null],

  'types':             ['sales', 'types'],
  'methods':           ['finance', 'methods'],
  'devices':           ['incubation', 'devices']
};

function getArray(data, key){
  var m = MAP[key];
  if(!m) return null;
  var section = data[m[0]];
  if(!section) return null;
  if(m[1] === null) return Array.isArray(section) ? section : null;
  return Array.isArray(section[m[1]]) ? section[m[1]] : null;
}

function ensureArray(data, key){
  var arr = getArray(data, key);
  if(arr) return arr;
  var m = MAP[key];
  if(!m) return null;
  if(m[1] === null){
    if(!Array.isArray(data[m[0]])) data[m[0]] = [];
    return data[m[0]];
  }
  if(!data[m[0]]) data[m[0]] = {};
  if(!Array.isArray(data[m[0]][m[1]])) data[m[0]][m[1]] = [];
  return data[m[0]][m[1]];
}

var _data = loadData();
_data = migrateLegacy(_data);
_data = applySeed(_data);

var _listeners = {};

function emit(eventName, payload){
  var list = _listeners[eventName] || [];
  list.forEach(function(fn){
    try{ fn(payload); }
    catch(e){ console.error('❌ Store event listener:', e); }
  });
}

window.Store = {
  _version: 4.4,
  _KEY: KEY,
  data: _data,

  init: function(){
    if(!this.data.settings) this.data.settings = {};
    if(!this.data.meta) this.data.meta = {};
    /* ✅ bottomNav: باید ۶ آیتم باشه (۵ انتخابی + more) */
    if(!Array.isArray(this.data.settings.bottomNav) || this.data.settings.bottomNav.length !== 6){
      this.data.settings.bottomNav = ['dashboard', 'daily', 'flocks', 'finance', 'sales', 'more'];
    }
    console.log('✅ Store v4.4 آماده — version ' + (this.data.meta.version || '?'));
    return this.data;
  },

  all: function(key){
    var arr = getArray(this.data, key);
    return arr ? arr : [];
  },

  get: function(key){
    if(key === 'settings') return this.data.settings || {};
    if(key === 'farm')     return this.data.farm || {};
    if(key === 'meta')     return this.data.meta || {};
    if(key === 'contacts') return this.data.contacts || {};
    return this.data[key];
  },

  set: function(key, value){ this.data[key] = value; return value; },

  find: function(key, id){
    var arr = getArray(this.data, key);
    if(!arr || id == null) return null;
    var idStr = String(id);
    for(var i = 0; i < arr.length; i++){
      if(String(arr[i].id) === idStr) return arr[i];
    }
    return null;
  },

  add: function(key, item){
    var arr = ensureArray(this.data, key);
    if(!arr) return null;

    if(!item) item = {};
    if(!item.id){
      var mx = 0;
      for(var i = 0; i < arr.length; i++){
        var v = +arr[i].id || 0;
        if(v > mx) mx = v;
      }
      item.id = String(mx + 1);
    } else {
      item.id = String(item.id);
    }

    item.createdAt = item.createdAt || Date.now();
    arr.push(item);
    this.save();
    emit('add:' + key, item);
    return item;
  },

  update: function(key, id, updates){
    var arr = getArray(this.data, key);
    if(!arr || id == null) return null;
    var idStr = String(id);
    for(var i = 0; i < arr.length; i++){
      if(String(arr[i].id) === idStr){
        Object.keys(updates).forEach(function(k){ arr[i][k] = updates[k]; });
        arr[i].updatedAt = Date.now();
        this.save();
        emit('update:' + key, arr[i]);
        return arr[i];
      }
    }
    return null;
  },

  remove: function(key, id){
    var arr = getArray(this.data, key);
    if(!arr || id == null) return false;
    var idStr = String(id);
    for(var i = 0; i < arr.length; i++){
      if(String(arr[i].id) === idStr){
        var removed = arr.splice(i, 1)[0];
        this.save();
        emit('remove:' + key, removed);
        return true;
      }
    }
    return false;
  },

  /* ✅ اینجا مشکل بود — الان fix شده */
  getSettings: function(){
    if(!this.data.settings) this.data.settings = {};
    /* bottomNav: باید ۶ آیتم باشه (۵ انتخابی + more) */
    if(!Array.isArray(this.data.settings.bottomNav) || this.data.settings.bottomNav.length !== 6){
      this.data.settings.bottomNav = ['dashboard', 'daily', 'flocks', 'finance', 'sales', 'more'];
    }
    return this.data.settings;
  },

  updateSettings: function(updates){
    this.data.settings = Object.assign({}, this.data.settings || {}, updates);
    this.save();
    return this.data.settings;
  },

  getFarm: function(){
    if(!this.data.farm) this.data.farm = {};
    return this.data.farm;
  },
  updateFarm: function(updates){
    this.data.farm = Object.assign({}, this.data.farm || {}, updates);
    this.save();
    return this.data.farm;
  },

  save: function(){
    try{
      if(!this.data.meta) this.data.meta = {};
      this.data.meta.lastSaved = Date.now();
      localStorage.setItem(KEY, JSON.stringify(this.data));
      return true;
    }catch(e){
      console.error('❌ Store save:', e);
      return false;
    }
  },

  load: function(){
    this.data = loadData();
    this.data = migrateLegacy(this.data);
    this.data = applySeed(this.data);
    return this.data;
  },

  exportJSON: function(){ return JSON.stringify(this.data, null, 2); },

  importJSON: function(json){
    try{
      var parsed = typeof json === 'string' ? JSON.parse(json) : json;
      if(!parsed || typeof parsed !== 'object') return { ok: false, error: 'فایل نامعتبر' };
      this.data = parsed;
      this.data = migrateLegacy(this.data);
      this.save();
      emit('import', this.data);
      return { ok: true };
    }catch(e){
      return { ok: false, error: e.message };
    }
  },

  reset: function(){
    if(!confirm('⚠️ همه داده‌ها حذف می‌شوند. مطمئن هستید؟')) return;
    try{
      var toRemove = [];
      for(var i = 0; i < localStorage.length; i++){
        var k = localStorage.key(i);
        if(!k) continue;
        if(k === KEY || k.indexOf('adineh_') === 0) toRemove.push(k);
      }
      toRemove.forEach(function(k){ try{ localStorage.removeItem(k); }catch(e){} });
      console.log('🗑️ Store: پاک‌سازی کامل — ' + toRemove.length + ' کلید');
      location.reload();
    }catch(e){
      console.error('❌ reset:', e);
      location.reload();
    }
  },

  on: function(eventName, fn){
    if(!_listeners[eventName]) _listeners[eventName] = [];
    _listeners[eventName].push(fn);
    return function off(){
      _listeners[eventName] = _listeners[eventName].filter(function(f){ return f !== fn; });
    };
  },

  emit: emit,

  stats: function(){
    var self = this;
    var out = {};
    Object.keys(MAP).forEach(function(k){
      var arr = getArray(self.data, k);
      out[k] = arr ? arr.length : 0;
    });
    return out;
  },

  financeTransactions: function(){
    return this.all('transactions').filter(function(t){
      return !t.kind || t.kind === 'finance_income' || t.kind === 'finance_expense'
        || t.transType === 'income' || t.transType === 'expense';
    });
  },

  inventoryTransactions: function(){
    return this.all('transactions').filter(function(t){
      return t.kind === 'inv_in' || t.kind === 'inv_out' || t.kind === 'inv_waste';
    });
  }
};

console.log('✅ Store v4.4 آماده — ' + Object.keys(_data).length + ' بخش');

})();