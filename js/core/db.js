/* ============================================================
   db.js - طبقة البيانات الشاملة (V2)
   ============================================================ */

import { APP_CONFIG, DEFAULT_DB } from './config.js';
import * as storage from './storage.js';
import { events, EVENTS } from './events.js';
import { deepClone, uid, today } from './utils.js';

let state = deepClone(DEFAULT_DB);
let saveTimer = null;

/* ============================================================
   تحميل وحفظ قاعدة البيانات
   ============================================================ */

export function load() {
  try {
    const saved = storage.loadDB();
    if (saved && typeof saved === 'object') {
      state = mergeWithDefaults(saved);
      console.log('✅ DB loaded:', { 
        customers: state.customers.length, 
        orders: state.orders.length, 
        payments: state.payments.length,
        expenses: state.expenses.length 
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

export function save(immediate = false) {
  if (immediate) return persist();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, APP_CONFIG.saveDebounceMs);
}

function persist() {
  clearTimeout(saveTimer);
  state.updatedAt = Date.now();
  const ok = storage.saveDB(state);
  if (ok) events.emit(EVENTS.DB_SAVED, { updatedAt: state.updatedAt });
  return ok;
}

export function flush() { return persist(); }
export function backup() { return storage.saveBackup(state); }
export function getState() { return state; }
export function getStateCopy() { return deepClone(state); }
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

/* ============================================================
   قسم العملاء (Customers)
   ============================================================ */

export function getCustomers() { return state.customers; }

export function getCustomer(id) {
  if (!id) return null;
  return state.customers.find(c => c.id === id) || null;
}

export function addCustomer(customer) {
  const newCustomer = { ...customer, id: customer.id || uid(), createdAt: Date.now(), updatedAt: Date.now() };
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
  state.trash.push({ id: uid(), type: 'customer', data: customer, deletedAt: today() });
  save();
  events.emit(EVENTS.CUSTOMER_DELETED, customer);
  return true;
}

/* ============================================================
   قسم الطلبات (Orders)
   ============================================================ */

export function getOrders() { return state.orders; }

export function getOrder(id) {
  if (!id) return null;
  return state.orders.find(o => o.id === id) || null;
}

export function addOrder(order) {
  const newOrder = { ...order, id: order.id || uid(), createdAt: Date.now(), updatedAt: Date.now() };
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
  state.trash.push({ id: uid(), type: 'order', data: order, deletedAt: today() });
  save();
  events.emit(EVENTS.ORDER_DELETED, order);
  return true;
}

/* ============================================================
   قسم الدفعات (Payments)
   ============================================================ */

export function getPayments() { 
  return state.payments; 
}

export function getPayment(id) {
  if (!id) return null;
  return state.payments.find(p => p.id === id) || null;
}

export function addPayment(payment) {
  const newPayment = { 
    ...payment, 
    id: payment.id || uid(), 
    createdAt: Date.now() 
  };
  state.payments.push(newPayment);
  save();
  events.emit(EVENTS.PAYMENT_ADDED, newPayment);
  return newPayment;
}

export function deletePayment(id) {
  const idx = state.payments.findIndex(p => p.id === id);
  if (idx === -1) return false;
  const [payment] = state.payments.splice(idx, 1);
  state.trash.push({ id: uid(), type: 'payment', data: payment, deletedAt: today() });
  save();
  return true;
}

/* ============================================================
   قسم المصروفات (Expenses)
   ============================================================ */

export function getExpenses() { 
  return state.expenses; 
}

export function getExpense(id) {
  if (!id) return null;
  return state.expenses.find(e => e.id === id) || null;
}

export function addExpense(expense) {
  const newExpense = { 
    ...expense, 
    id: expense.id || uid(), 
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  state.expenses.push(newExpense);
  save();
  events.emit('expense:added', newExpense);
  return newExpense;
}

export function updateExpense(id, updates) {
  const expense = getExpense(id);
  if (!expense) return null;
  Object.assign(expense, updates, { updatedAt: Date.now() });
  save();
  events.emit('expense:updated', expense);
  return expense;
}

export function deleteExpense(id) {
  const idx = state.expenses.findIndex(e => e.id === id);
  if (idx === -1) return false;
  const [expense] = state.expenses.splice(idx, 1);
  state.trash.push({ id: uid(), type: 'expense', data: expense, deletedAt: today() });
  save();
  events.emit('expense:deleted', expense);
  return true;
}

/* ============================================================
   أحداث الحفظ التلقائي
   ============================================================ */

window.addEventListener('beforeunload', () => flush());
window.addEventListener('pagehide', () => flush());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flush();
});
