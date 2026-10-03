/* ============================================================
   db.js - طبقة البيانات الشاملة (V2)
   (النسخة الكاملة مع المواسم)
   ============================================================ */

import { APP_CONFIG, DEFAULT_DB, DEFAULT_OCCASIONS } from './config.js';
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
        expenses: state.expenses.length,
        inventory: state.inventory.length,
        workers: state.workers.length,
        portfolio: state.portfolio.length,
        occasions: state.occasions.length
      });
    } else {
      state = deepClone(DEFAULT_DB);
      console.log('📭 DB empty — using defaults');
      save(true);
    }

    // تهيئة المواسم الافتراضية عند أول تشغيل
    initializeOccasions();

    events.emit(EVENTS.DB_LOADED, state);
    return state;
  } catch (e) {
    console.error('❌ DB load failed:', e);
    state = deepClone(DEFAULT_DB);
    return state;
  }
}

/* ============================================================
   تهيئة المواسم الافتراضية (مرة واحدة فقط)
   ============================================================ */
function initializeOccasions() {
  if (state.occasionsInitialized === true) return;
  if (!Array.isArray(state.occasions)) state.occasions = [];

  // إضافة المواسم الافتراضية إذا كانت القائمة فارغة
  if (state.occasions.length === 0) {
    DEFAULT_OCCASIONS.forEach(occ => {
      state.occasions.push({
        ...occ,
        id: occ.id || uid(),
        enabled: true,
        createdAt: Date.now()
      });
    });
    console.log('🎉 تم تهيئة المواسم الافتراضية:', state.occasions.length);
  }

  state.occasionsInitialized = true;
  save(true);
}

function mergeWithDefaults(saved) {
  const merged = { ...deepClone(DEFAULT_DB), ...saved };
  ['customers', 'orders', 'payments', 'expenses', 'commitments',
   'commitmentPayments', 'houseExpenses', 'personalLoans', 'loanPayments',
   'savingsGoals', 'inventory', 'workers', 'workerPayments',
   'referrals', 'referralRewards', 'portfolio', 'garmentTypes',
   'occasions', 'holidays', 'activityLog', 'trash'].forEach(key => {
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

export function getPayments() { return state.payments; }

export function getPayment(id) {
  if (!id) return null;
  return state.payments.find(p => p.id === id) || null;
}

export function addPayment(payment) {
  const newPayment = { ...payment, id: payment.id || uid(), createdAt: Date.now() };
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

export function getExpenses() { return state.expenses; }

export function getExpense(id) {
  if (!id) return null;
  return state.expenses.find(e => e.id === id) || null;
}

export function addExpense(expense) {
  const newExpense = { ...expense, id: expense.id || uid(), createdAt: Date.now(), updatedAt: Date.now() };
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
   قسم المخزون (Inventory)
   ============================================================ */

export function getInventory() { return state.inventory; }

export function getInventoryItem(id) {
  if (!id) return null;
  return state.inventory.find(i => i.id === id) || null;
}

export function addInventoryItem(item) {
  const newItem = {
    ...item,
    id: item.id || uid(),
    quantity: Number(item.quantity) || 0,
    minQuantity: Number(item.minQuantity) || 0,
    price: Number(item.price) || 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  state.inventory.push(newItem);
  save();
  events.emit('inventory:added', newItem);
  return newItem;
}

export function updateInventoryItem(id, updates) {
  const item = getInventoryItem(id);
  if (!item) return null;
  Object.assign(item, updates, { updatedAt: Date.now() });
  save();
  events.emit('inventory:updated', item);
  return item;
}

export function deleteInventoryItem(id) {
  const idx = state.inventory.findIndex(i => i.id === id);
  if (idx === -1) return false;
  const [item] = state.inventory.splice(idx, 1);
  state.trash.push({ id: uid(), type: 'inventory', data: item, deletedAt: today() });
  save();
  events.emit('inventory:deleted', item);
  return true;
}

export function adjustInventoryQuantity(id, delta) {
  const item = getInventoryItem(id);
  if (!item) return null;
  const newQty = Math.max(0, (item.quantity || 0) + Number(delta));
  item.quantity = newQty;
  item.updatedAt = Date.now();
  save();
  events.emit('inventory:updated', item);
  return item;
}

export function getLowStockItems() {
  return state.inventory.filter(i => (i.quantity || 0) <= (i.minQuantity || 0) && (i.minQuantity || 0) > 0);
}

/* ============================================================
   قسم العمال (Workers)
   ============================================================ */

export function getWorkers() { return state.workers; }

export function getWorker(id) {
  if (!id) return null;
  return state.workers.find(w => w.id === id) || null;
}

export function addWorker(worker) {
  const newWorker = {
    ...worker,
    id: worker.id || uid(),
    salary: Number(worker.salary) || 0,
    active: worker.active !== false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  state.workers.push(newWorker);
  save();
  events.emit('worker:added', newWorker);
  return newWorker;
}

export function updateWorker(id, updates) {
  const worker = getWorker(id);
  if (!worker) return null;
  Object.assign(worker, updates, { updatedAt: Date.now() });
  save();
  events.emit('worker:updated', worker);
  return worker;
}

export function deleteWorker(id) {
  const idx = state.workers.findIndex(w => w.id === id);
  if (idx === -1) return false;
  const [worker] = state.workers.splice(idx, 1);
  state.trash.push({ id: uid(), type: 'worker', data: worker, deletedAt: today() });
  save();
  events.emit('worker:deleted', worker);
  return true;
}

/* ============================================================
   قسم دفعات العمال (Worker Payments)
   ============================================================ */

export function getWorkerPayments() { return state.workerPayments; }

export function getWorkerPayment(id) {
  if (!id) return null;
  return state.workerPayments.find(p => p.id === id) || null;
}

export function getWorkerPaymentsByWorker(workerId) {
  return state.workerPayments.filter(p => p.workerId === workerId);
}

export function addWorkerPayment(payment) {
  const newPayment = {
    ...payment,
    id: payment.id || uid(),
    amount: Number(payment.amount) || 0,
    createdAt: Date.now()
  };
  state.workerPayments.push(newPayment);
  save();
  events.emit('workerPayment:added', newPayment);
  return newPayment;
}

export function deleteWorkerPayment(id) {
  const idx = state.workerPayments.findIndex(p => p.id === id);
  if (idx === -1) return false;
  const [payment] = state.workerPayments.splice(idx, 1);
  state.trash.push({ id: uid(), type: 'workerPayment', data: payment, deletedAt: today() });
  save();
  events.emit('workerPayment:deleted', payment);
  return true;
}

/* ============================================================
   قسم الالتزامات (Commitments)
   ============================================================ */

export function getCommitments() { return state.commitments; }

export function getCommitment(id) {
  if (!id) return null;
  return state.commitments.find(c => c.id === id) || null;
}

export function addCommitment(commitment) {
  const newCommitment = {
    ...commitment,
    id: commitment.id || uid(),
    amount: Number(commitment.amount) || 0,
    active: commitment.active !== false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  state.commitments.push(newCommitment);
  save();
  events.emit('commitment:added', newCommitment);
  return newCommitment;
}

export function updateCommitment(id, updates) {
  const commitment = getCommitment(id);
  if (!commitment) return null;
  Object.assign(commitment, updates, { updatedAt: Date.now() });
  save();
  events.emit('commitment:updated', commitment);
  return commitment;
}

export function deleteCommitment(id) {
  const idx = state.commitments.findIndex(c => c.id === id);
  if (idx === -1) return false;
  const [commitment] = state.commitments.splice(idx, 1);
  state.trash.push({ id: uid(), type: 'commitment', data: commitment, deletedAt: today() });
  state.commitmentPayments = state.commitmentPayments.filter(p => p.commitmentId !== id);
  save();
  events.emit('commitment:deleted', commitment);
  return true;
}

/* ============================================================
   قسم دفعات الالتزامات (Commitment Payments)
   ============================================================ */

export function getCommitmentPayments() { return state.commitmentPayments; }

export function getCommitmentPayment(id) {
  if (!id) return null;
  return state.commitmentPayments.find(p => p.id === id) || null;
}

export function getCommitmentPaymentsByCommitment(commitmentId) {
  return state.commitmentPayments.filter(p => p.commitmentId === commitmentId);
}

export function addCommitmentPayment(payment) {
  const newPayment = {
    ...payment,
    id: payment.id || uid(),
    amount: Number(payment.amount) || 0,
    createdAt: Date.now()
  };
  state.commitmentPayments.push(newPayment);
  save();
  events.emit('commitmentPayment:added', newPayment);
  return newPayment;
}

export function deleteCommitmentPayment(id) {
  const idx = state.commitmentPayments.findIndex(p => p.id === id);
  if (idx === -1) return false;
  const [payment] = state.commitmentPayments.splice(idx, 1);
  state.trash.push({ id: uid(), type: 'commitmentPayment', data: payment, deletedAt: today() });
  save();
  events.emit('commitmentPayment:deleted', payment);
  return true;
}

/* ============================================================
   قسم مصاريف البيت (House Expenses)
   ============================================================ */

export function getHouseExpenses() { return state.houseExpenses; }

export function getHouseExpense(id) {
  if (!id) return null;
  return state.houseExpenses.find(e => e.id === id) || null;
}

export function addHouseExpense(expense) {
  const newExpense = {
    ...expense,
    id: expense.id || uid(),
    amount: Number(expense.amount) || 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  state.houseExpenses.push(newExpense);
  save();
  events.emit('houseExpense:added', newExpense);
  return newExpense;
}

export function updateHouseExpense(id, updates) {
  const expense = getHouseExpense(id);
  if (!expense) return null;
  Object.assign(expense, updates, { updatedAt: Date.now() });
  save();
  events.emit('houseExpense:updated', expense);
  return expense;
}

export function deleteHouseExpense(id) {
  const idx = state.houseExpenses.findIndex(e => e.id === id);
  if (idx === -1) return false;
  const [expense] = state.houseExpenses.splice(idx, 1);
  state.trash.push({ id: uid(), type: 'houseExpense', data: expense, deletedAt: today() });
  save();
  events.emit('houseExpense:deleted', expense);
  return true;
}

/* ============================================================
   قسم القروض (Personal Loans)
   ============================================================ */

export function getPersonalLoans() { return state.personalLoans; }

export function getPersonalLoan(id) {
  if (!id) return null;
  return state.personalLoans.find(l => l.id === id) || null;
}

export function addPersonalLoan(loan) {
  const newLoan = {
    ...loan,
    id: loan.id || uid(),
    amount: Number(loan.amount) || 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  state.personalLoans.push(newLoan);
  save();
  events.emit('loan:added', newLoan);
  return newLoan;
}

export function updatePersonalLoan(id, updates) {
  const loan = getPersonalLoan(id);
  if (!loan) return null;
  Object.assign(loan, updates, { updatedAt: Date.now() });
  save();
  events.emit('loan:updated', loan);
  return loan;
}

export function deletePersonalLoan(id) {
  const idx = state.personalLoans.findIndex(l => l.id === id);
  if (idx === -1) return false;
  const [loan] = state.personalLoans.splice(idx, 1);
  state.trash.push({ id: uid(), type: 'personalLoan', data: loan, deletedAt: today() });
  state.loanPayments = state.loanPayments.filter(p => p.loanId !== id);
  save();
  events.emit('loan:deleted', loan);
  return true;
}

/* ============================================================
   قسم دفعات القروض (Loan Payments)
   ============================================================ */

export function getLoanPayments() { return state.loanPayments; }

export function getLoanPayment(id) {
  if (!id) return null;
  return state.loanPayments.find(p => p.id === id) || null;
}

export function getLoanPaymentsByLoan(loanId) {
  return state.loanPayments.filter(p => p.loanId === loanId);
}

export function addLoanPayment(payment) {
  const newPayment = {
    ...payment,
    id: payment.id || uid(),
    amount: Number(payment.amount) || 0,
    createdAt: Date.now()
  };
  state.loanPayments.push(newPayment);
  save();
  events.emit('loanPayment:added', newPayment);
  return newPayment;
}

export function deleteLoanPayment(id) {
  const idx = state.loanPayments.findIndex(p => p.id === id);
  if (idx === -1) return false;
  const [payment] = state.loanPayments.splice(idx, 1);
  state.trash.push({ id: uid(), type: 'loanPayment', data: payment, deletedAt: today() });
  save();
  events.emit('loanPayment:deleted', payment);
  return true;
}

/* ============================================================
   قسم أهداف الادخار (Savings Goals)
   ============================================================ */

export function getSavingsGoals() { return state.savingsGoals; }

export function getSavingsGoal(id) {
  if (!id) return null;
  return state.savingsGoals.find(g => g.id === id) || null;
}

export function addSavingsGoal(goal) {
  const newGoal = {
    ...goal,
    id: goal.id || uid(),
    targetAmount: Number(goal.targetAmount) || 0,
    currentAmount: Number(goal.currentAmount) || 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  state.savingsGoals.push(newGoal);
  save();
  events.emit('savingsGoal:added', newGoal);
  return newGoal;
}

export function updateSavingsGoal(id, updates) {
  const goal = getSavingsGoal(id);
  if (!goal) return null;
  Object.assign(goal, updates, { updatedAt: Date.now() });
  save();
  events.emit('savingsGoal:updated', goal);
  return goal;
}

export function deleteSavingsGoal(id) {
  const idx = state.savingsGoals.findIndex(g => g.id === id);
  if (idx === -1) return false;
  const [goal] = state.savingsGoals.splice(idx, 1);
  state.trash.push({ id: uid(), type: 'savingsGoal', data: goal, deletedAt: today() });
  save();
  events.emit('savingsGoal:deleted', goal);
  return true;
}

export function depositToSavingsGoal(id, amount) {
  const goal = getSavingsGoal(id);
  if (!goal) return null;
  goal.currentAmount = (goal.currentAmount || 0) + Number(amount);
  goal.updatedAt = Date.now();
  save();
  events.emit('savingsGoal:updated', goal);
  return goal;
}

/* ============================================================
   قسم معرض الأعمال (Portfolio)
   ============================================================ */

export function getPortfolio() { return state.portfolio; }

export function getPortfolioItem(id) {
  if (!id) return null;
  return state.portfolio.find(p => p.id === id) || null;
}

export function addPortfolioItem(item) {
  const newItem = {
    ...item,
    id: item.id || uid(),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  state.portfolio.push(newItem);
  save();
  events.emit('portfolio:added', newItem);
  return newItem;
}

export function updatePortfolioItem(id, updates) {
  const item = getPortfolioItem(id);
  if (!item) return null;
  Object.assign(item, updates, { updatedAt: Date.now() });
  save();
  events.emit('portfolio:updated', item);
  return item;
}

export function deletePortfolioItem(id) {
  const idx = state.portfolio.findIndex(p => p.id === id);
  if (idx === -1) return false;
  const [item] = state.portfolio.splice(idx, 1);
  state.trash.push({ id: uid(), type: 'portfolio', data: item, deletedAt: today() });
  save();
  events.emit('portfolio:deleted', item);
  return true;
}

/* ============================================================
   قسم أنواع الجلابيات (Garment Types)
   ============================================================ */

export function getGarmentTypes() { return state.garmentTypes; }

export function getGarmentType(id) {
  if (!id) return null;
  return state.garmentTypes.find(g => g.id === id) || null;
}

export function addGarmentType(type) {
  const newType = {
    ...type,
    id: type.id || uid(),
    price: Number(type.price) || 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  state.garmentTypes.push(newType);
  save();
  events.emit('garmentType:added', newType);
  return newType;
}

export function updateGarmentType(id, updates) {
  const type = getGarmentType(id);
  if (!type) return null;
  Object.assign(type, updates, { updatedAt: Date.now() });
  save();
  events.emit('garmentType:updated', type);
  return type;
}

export function deleteGarmentType(id) {
  const idx = state.garmentTypes.findIndex(g => g.id === id);
  if (idx === -1) return false;
  const [type] = state.garmentTypes.splice(idx, 1);
  state.trash.push({ id: uid(), type: 'garmentType', data: type, deletedAt: today() });
  save();
  events.emit('garmentType:deleted', type);
  return true;
}

/* ============================================================
   قسم المواسم والأعياد (Occasions) - جديد
   ============================================================ */

export function getOccasions() { return state.occasions || []; }

export function getOccasion(id) {
  if (!id) return null;
  return (state.occasions || []).find(o => o.id === id) || null;
}

export function addOccasion(occasion) {
  if (!Array.isArray(state.occasions)) state.occasions = [];
  const newOccasion = {
    ...occasion,
    id: occasion.id || uid(),
    month: Number(occasion.month) || 1,
    day: Number(occasion.day) || 1,
    alertDaysBefore: Number(occasion.alertDaysBefore) || 14,
    enabled: occasion.enabled !== false,
    recurring: occasion.recurring !== false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  state.occasions.push(newOccasion);
  save();
  events.emit('occasion:added', newOccasion);
  return newOccasion;
}

export function updateOccasion(id, updates) {
  const occasion = getOccasion(id);
  if (!occasion) return null;
  Object.assign(occasion, updates, { updatedAt: Date.now() });
  save();
  events.emit('occasion:updated', occasion);
  return occasion;
}

export function deleteOccasion(id) {
  const idx = (state.occasions || []).findIndex(o => o.id === id);
  if (idx === -1) return false;
  const [occasion] = state.occasions.splice(idx, 1);
  state.trash.push({ id: uid(), type: 'occasion', data: occasion, deletedAt: today() });
  save();
  events.emit('occasion:deleted', occasion);
  return true;
}

/**
 * الحصول على المواسم القادمة (خلال X يوم)
 */
export function getUpcomingOccasions(daysAhead = 60) {
  const occasions = state.occasions || [];
  const todayDate = new Date();
  const currentYear = todayDate.getFullYear();

  const upcoming = [];

  occasions.forEach(occ => {
    if (occ.enabled === false) return;

    // احسب تاريخ المناسبة للسنة الحالية
    let occDate = new Date(currentYear, occ.month - 1, occ.day);

    // إذا مرت المناسبة هذا العام، احسب للسنة القادمة
    if (occDate < todayDate) {
      occDate = new Date(currentYear + 1, occ.month - 1, occ.day);
    }

    const diffDays = Math.ceil((occDate - todayDate) / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays <= daysAhead) {
      upcoming.push({
        ...occ,
        nextDate: occDate.toISOString().slice(0, 10),
        daysLeft: diffDays
      });
    }
  });

  return upcoming.sort((a, b) => a.daysLeft - b.daysLeft);
}

/**
 * الحصول على المواسم التي تحتاج تنبيه (خلال alertDaysBefore)
 */
export function getOccasionsNeedingAlert() {
  const occasions = state.occasions || [];
  const todayDate = new Date();
  const currentYear = todayDate.getFullYear();

  const alerts = [];

  occasions.forEach(occ => {
    if (occ.enabled === false) return;

    let occDate = new Date(currentYear, occ.month - 1, occ.day);
    if (occDate < todayDate) {
      occDate = new Date(currentYear + 1, occ.month - 1, occ.day);
    }

    const diffDays = Math.ceil((occDate - todayDate) / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays <= (occ.alertDaysBefore || 14)) {
      alerts.push({
        ...occ,
        nextDate: occDate.toISOString().slice(0, 10),
        daysLeft: diffDays
      });
    }
  });

  return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
}

/* ============================================================
   أحداث الحفظ التلقائي
   ============================================================ */

window.addEventListener('beforeunload', () => flush());
window.addEventListener('pagehide', () => flush());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flush();
});
