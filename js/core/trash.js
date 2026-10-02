/* ============================================================
   trash.js - نظام سلة المحذوفات (V2)
   (استرجاع العناصر المحذوفة + حذف نهائي + تنظيف تلقائي)
   ============================================================ */

import * as storage from './storage.js';
import * as db from './db.js';
import { APP_CONFIG, DEFAULT_SETTINGS, TRASH_ITEM_TYPES } from './config.js';
import { events, EVENTS } from './events.js';
import { today } from './utils.js';

/* ============================================================
   جلب كل عناصر السلة (مرتبة من الأحدث)
   ============================================================ */
export function getTrashItems() {
  const state = db.getState();
  if (!state || !Array.isArray(state.trash)) return [];
  return [...state.trash].sort((a, b) => {
    const dateA = a.deletedAt || '';
    const dateB = b.deletedAt || '';
    return dateB.localeCompare(dateA);
  });
}

/* ============================================================
   فلترة عناصر السلة
   ============================================================ */
export function filterTrashItems({ type = null, searchQuery = '' } = {}) {
  let items = getTrashItems();

  if (type && type !== 'all') {
    items = items.filter(i => i.type === type);
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    items = items.filter(i => {
      const data = i.data || {};
      const name = (data.name || data.personName || data.garmentType || '').toLowerCase();
      return name.includes(q);
    });
  }

  return items;
}

/* ============================================================
   معلومات نوع العنصر
   ============================================================ */
export function getTrashItemInfo(typeId) {
  return TRASH_ITEM_TYPES[typeId] || { label: 'عنصر', icon: '📌', color: '#666' };
}

/* ============================================================
   حساب المدة المتبقية قبل الحذف التلقائي
   ============================================================ */
export function getDaysRemaining(item) {
  const settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  const retentionDays = settings.trashRetentionDays || APP_CONFIG.maxBackups || 7;
  
  const deletedAt = item.deletedAt;
  if (!deletedAt) return retentionDays;
  
  const deletedDate = new Date(deletedAt);
  const now = new Date();
  const daysSinceDeleted = Math.floor((now - deletedDate) / (1000 * 60 * 60 * 24));
  const remaining = retentionDays - daysSinceDeleted;
  
  return Math.max(0, remaining);
}

/* ============================================================
   استرجاع عنصر من السلة
   ============================================================ */
export function restoreItem(trashId) {
  const state = db.getState();
  if (!state || !Array.isArray(state.trash)) return false;

  const idx = state.trash.findIndex(t => t.id === trashId);
  if (idx === -1) return false;

  const item = state.trash[idx];
  const { type, data } = item;

  // استرجاع حسب النوع
  try {
    switch (type) {
      case 'customer':
        if (!db.getCustomer(data.id)) {
          state.customers.push(data);
        }
        break;
      case 'order':
        if (!db.getOrder(data.id)) {
          state.orders.push(data);
        }
        break;
      case 'payment':
        if (!db.getPayment(data.id)) {
          state.payments.push(data);
        }
        break;
      case 'expense':
        if (!db.getExpense(data.id)) {
          state.expenses.push(data);
        }
        break;
      case 'inventory':
        if (!db.getInventoryItem(data.id)) {
          state.inventory.push(data);
        }
        break;
      case 'worker':
        if (!db.getWorker(data.id)) {
          state.workers.push(data);
        }
        break;
      case 'workerPayment':
        if (!db.getWorkerPayment(data.id)) {
          state.workerPayments.push(data);
        }
        break;
      case 'commitment':
        if (!db.getCommitment(data.id)) {
          state.commitments.push(data);
        }
        break;
      case 'commitmentPayment':
        if (!db.getCommitmentPayment(data.id)) {
          state.commitmentPayments.push(data);
        }
        break;
      case 'houseExpense':
        if (!db.getHouseExpense(data.id)) {
          state.houseExpenses.push(data);
        }
        break;
      case 'personalLoan':
        if (!db.getPersonalLoan(data.id)) {
          state.personalLoans.push(data);
        }
        break;
      case 'loanPayment':
        if (!db.getLoanPayment(data.id)) {
          state.loanPayments.push(data);
        }
        break;
      case 'savingsGoal':
        if (!db.getSavingsGoal(data.id)) {
          state.savingsGoals.push(data);
        }
        break;
      default:
        console.warn('⚠️ نوع عنصر غير معروف:', type);
        return false;
    }

    // حذف من السلة
    state.trash.splice(idx, 1);
    db.save(true);

    // تسجيل النشاط
    events.emit('trash:restored', { type, data });

    return true;
  } catch (e) {
    console.error('❌ فشل استرجاع العنصر:', e);
    return false;
  }
}

/* ============================================================
   حذف نهائي لعنصر من السلة
   ============================================================ */
export function permanentlyDelete(trashId) {
  const state = db.getState();
  if (!state || !Array.isArray(state.trash)) return false;

  const idx = state.trash.findIndex(t => t.id === trashId);
  if (idx === -1) return false;

  const item = state.trash[idx];
  state.trash.splice(idx, 1);
  db.save(true);

  events.emit('trash:permanentlyDeleted', item);

  return true;
}

/* ============================================================
   تفريغ السلة بالكامل
   ============================================================ */
export function emptyTrash() {
  const state = db.getState();
  if (!state) return false;

  const count = (state.trash || []).length;
  state.trash = [];
  db.save(true);

  events.emit('trash:emptied', { count });
  return true;
}

/* ============================================================
   تنظيف تلقائي للعناصر القديمة
   (تُستدعى عند بدء التطبيق)
   ============================================================ */
export function cleanOldTrashItems() {
  const state = db.getState();
  if (!state || !Array.isArray(state.trash)) return 0;

  const settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  const retentionDays = settings.trashRetentionDays || 7;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const initialCount = state.trash.length;
  
  state.trash = state.trash.filter(item => {
    if (!item.deletedAt) return false;
    const deletedDate = new Date(item.deletedAt);
    return deletedDate >= cutoffDate;
  });

  const removed = initialCount - state.trash.length;
  
  if (removed > 0) {
    db.save(true);
    console.log(`🧹 تم حذف ${removed} عنصر قديم من السلة تلقائياً`);
  }

  return removed;
}

/* ============================================================
   عدد العناصر في السلة
   ============================================================ */
export function getTrashCount() {
  const state = db.getState();
  if (!state || !Array.isArray(state.trash)) return 0;
  return state.trash.length;
}

/* ============================================================
   الحصول على ملخص السلة حسب النوع
   ============================================================ */
export function getTrashSummary() {
  const items = getTrashItems();
  const summary = {};

  items.forEach(item => {
    if (!summary[item.type]) {
      summary[item.type] = 0;
    }
    summary[item.type]++;
  });

  return summary;
}
