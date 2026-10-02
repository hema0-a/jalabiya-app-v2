/* ============================================================
   db.js - طبقة البيانات (Data Layer) - V2
   
   كل التعامل مع البيانات يمر من هنا.
   لا يوجد كود UI في هذا الملف.
   ============================================================ */

import { APP_CONFIG, DEFAULT_DB } from './config.js';
import * as storage from './storage.js';
import { events, EVENTS } from './events.js';
import { deepClone, uid, today } from './utils.js';

// الحالة الداخلية
let state = deepClone(DEFAULT_DB);
let saveTimer = null;

// ═══ التحميل ═══

export function load() {
  try {
    const saved = storage.loadDB();
    if (saved && typeof saved === 'object') {
      state = mergeWithDefaults(saved);
      console.log('✅ DB loaded:', {
        customers: state.customers.length,
        orders: state.orders.length,
      });
    } else {
      state = deepClone(DEFAULT_DB);
      console.log('📭 DB empty — using defaults');
      save(true);
    }
    events.emit(EVENTS.DB_LOADED, state);
    return state;
  } catch (e) {
    console.error('❌ DB load failed:', e);
    state = deepClone(DEFAULT_DB);
    return state;
  }
}

function mergeWithDefaults(saved) {
  const merged = { ...deepClone(DEFAULT_DB), ...saved };
  ['customers', 'orders', 'payments', 'expenses', 'commitments', 
   'houseExpenses', 'personalLoans', 'garmentTypes', 'holidays', 
   'occasions', 'activityLog', 'trash'].forEach(key => {
    if (!Array.isArray(merged[key])) merged[key] = [];
  });
  return merged;
}

// ═══ الحفظ ═══

export function save(immediate = false) {
  if (immediate) {
    return persist();
  }
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, APP_CONFIG.saveDebounceMs);
}

function persist() {
  clearTimeout(saveTimer);
  state.updatedAt = Date.now();
  const ok = storage.saveDB(state);
  if (ok) {
    events.emit(EVENTS.DB_SAVED, { updatedAt: state.updatedAt });
  }
  return ok;
}

export function flush() {
  return persist();
}

export function backup() {
  return storage.saveBackup(state);
}

// ═══ الوصول للبيانات ═══

export function getState() {
  return state;
}

export function getStateCopy() {
  return deepClone(state);
}

export function setState(newState) {
  state = { ...deepClone(DEFAULT_DB), ...newState };
  save(true);
  events.emit(EVENTS.DB_LOADED, state);
}

export function reset() {
  state = deepClone(DEFAULT_DB);
  save(true);
  events.emit(EVENTS.DB_LOADED, state);
}

// ═══ العملاء ═══

export function getCustomers() {
  return state.customers;
}

export function getCustomer(id) {
  if (!id) return null;
  return state.customers.find(c => c.id === id) || null;
}

export function addCustomer(customer) {
  const newCustomer = { 
    ...customer, 
    id: customer.id || uid(), 
    createdAt: Date.now(), 
    updatedAt: Date.now() 
  };
  state.customers.push(newCustomer);
  save();
  events.emit(EVENTS.CUSTOMER_ADDED, newCustomer);
  return newCustomer;
}

export function updateCustomer(id, updates) {
  const customer = getCustomer(id);
  if (!customer) return null;
  Object.assign(customer, updates, { updatedAt: Date.now() });
  save();
  events.emit(EVENTS.CUSTOMER_UPDATED, customer);
  return customer;
}

export function deleteCustomer(id) {
  const idx = state.customers.findIndex(c => c.id === id);
  if (idx === -1) return false;
  const [customer] = state.customers.splice(idx, 1);
  state.trash.push({
    id: uid(),
    type: 'customer',
    data: customer,
    deletedAt: today(),
  });
  save();
  events.emit(EVENTS.CUSTOMER_DELETED, customer);
  return true;
}

// ═══ الطلبات ═══

export function getOrders() {
  return state.orders;
}

export function getOrder(id) {
  if (!id) return null;
  return state.orders.find(o => o.id === id) || null;
}

export function addOrder(order) {
  const newOrder = { 
    ...order, 
    id: order.id || uid(), 
    createdAt: Date.now(), 
    updatedAt: Date.now() 
  };
  state.orders.push(newOrder);
  save();
  events.emit(EVENTS.ORDER_ADDED, newOrder);
  return newOrder;
}

export function updateOrder(id, updates) {
  const order = getOrder(id);
  if (!order) return null;
  Object.assign(order, updates, { updatedAt: Date.now() });
  save();
  events.emit(EVENTS.ORDER_UPDATED, order);
  return order;
}

export function deleteOrder(id) {
  const idx = state.orders.findIndex(o => o.id === id);
  if (idx === -1) return false;
  const [order] = state.orders.splice(idx, 1);
  state.trash.push({
    id: uid(),
    type: 'order',
    data: order,
    deletedAt: today(),
  });
  save();
  events.emit(EVENTS.ORDER_DELETED, order);
  return true;
}

// ═══ الإغلاق الآمن ═══

window.addEventListener('beforeunload', () => flush());
window.addEventListener('pagehide', () => flush());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flush();
});
