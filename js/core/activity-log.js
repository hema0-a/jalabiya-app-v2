/* ============================================================
   activity-log.js - نظام سجل النشاط (V2)
   (نسخة نهائية - يشمل clearActivityLog)
   ============================================================ */

import { APP_CONFIG, ACTIVITY_TYPES } from './config.js';
import * as storage from './storage.js';
import { events, EVENTS } from './events.js';
import { uid } from './utils.js';

/* إضافة حدث جديد إلى السجل */
export function logActivity(type, description, metadata = {}) {
  try {
    const db = storage.loadDB();
    if (!db) return null;
    if (!Array.isArray(db.activityLog)) db.activityLog = [];

    const activity = {
      id: uid(),
      type: type,
      description: description,
      metadata: metadata,
      timestamp: Date.now()
    };

    db.activityLog.push(activity);

    if (db.activityLog.length > APP_CONFIG.maxActivityLog) {
      const excess = db.activityLog.length - APP_CONFIG.maxActivityLog;
      db.activityLog.splice(0, excess);
    }

    storage.saveDB(db);
    return activity;
  } catch (e) {
    console.error('❌ فشل تسجيل النشاط:', e);
    return null;
  }
}

/* جلب كل الأنشطة */
export function getActivities() {
  const db = storage.loadDB();
  if (!db || !Array.isArray(db.activityLog)) return [];
  return [...db.activityLog].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

/* تصفية الأنشطة */
export function filterActivities({ type = null, searchQuery = '', fromDate = null, toDate = null } = {}) {
  let activities = getActivities();

  if (type && type !== 'all') {
    activities = activities.filter(a => a.type === type);
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    activities = activities.filter(a => (a.description || '').toLowerCase().includes(q));
  }

  if (fromDate) {
    const from = new Date(fromDate).getTime();
    activities = activities.filter(a => (a.timestamp || 0) >= from);
  }

  if (toDate) {
    const to = new Date(toDate).getTime() + 86400000;
    activities = activities.filter(a => (a.timestamp || 0) <= to);
  }

  return activities;
}

/* مسح السجل بالكامل */
export function clearActivityLog() {
  const db = storage.loadDB();
  if (!db) return false;
  db.activityLog = [];
  storage.saveDB(db);
  return true;
}

/* حذف نشاط معين */
export function deleteActivity(id) {
  const db = storage.loadDB();
  if (!db || !Array.isArray(db.activityLog)) return false;
  const idx = db.activityLog.findIndex(a => a.id === id);
  if (idx === -1) return false;
  db.activityLog.splice(idx, 1);
  storage.saveDB(db);
  return true;
}

/* معلومات نشاط معين */
export function getActivityInfo(typeId) {
  for (const key in ACTIVITY_TYPES) {
    if (ACTIVITY_TYPES[key].id === typeId) {
      return ACTIVITY_TYPES[key];
    }
  }
  return { id: typeId, label: 'نشاط', icon: '📌', color: '#666' };
}

/* تفعيل التسجيل التلقائي */
export function initActivityLogger() {
  events.on(EVENTS.CUSTOMER_ADDED, (c) => logActivity(ACTIVITY_TYPES.CUSTOMER_ADDED.id, `إضافة عميل: ${c.name}`, { id: c.id }));
  events.on(EVENTS.CUSTOMER_UPDATED, (c) => logActivity(ACTIVITY_TYPES.CUSTOMER_UPDATED.id, `تعديل عميل: ${c.name}`, { id: c.id }));
  events.on(EVENTS.CUSTOMER_DELETED, (c) => logActivity(ACTIVITY_TYPES.CUSTOMER_DELETED.id, `حذف عميل: ${c.name}`, { id: c.id }));

  events.on(EVENTS.ORDER_ADDED, (o) => logActivity(ACTIVITY_TYPES.ORDER_ADDED.id, `إضافة طلب: ${o.garmentType || ''} (${o.totalPrice || 0} جنيه)`, { id: o.id }));
  events.on(EVENTS.ORDER_UPDATED, (o) => logActivity(ACTIVITY_TYPES.ORDER_UPDATED.id, `تعديل طلب: ${o.garmentType || ''}`, { id: o.id }));
  events.on(EVENTS.ORDER_DELETED, (o) => logActivity(ACTIVITY_TYPES.ORDER_DELETED.id, `حذف طلب: ${o.garmentType || ''}`, { id: o.id }));

  events.on(EVENTS.PAYMENT_ADDED, (p) => logActivity(ACTIVITY_TYPES.PAYMENT_ADDED.id, `تسجيل دفعة: ${p.amount || 0} جنيه`, { id: p.id }));

  events.on('expense:added', (e) => logActivity(ACTIVITY_TYPES.EXPENSE_ADDED.id, `إضافة مصروف: ${e.amount || 0} جنيه`, { id: e.id }));
  events.on('expense:deleted', (e) => logActivity(ACTIVITY_TYPES.EXPENSE_DELETED.id, `حذف مصروف: ${e.amount || 0} جنيه`, { id: e.id }));

  events.on('inventory:added', (i) => logActivity(ACTIVITY_TYPES.INVENTORY_ADDED.id, `إضافة للمخزون: ${i.name}`, { id: i.id }));
  events.on('inventory:updated', (i) => logActivity(ACTIVITY_TYPES.INVENTORY_UPDATED.id, `تعديل مخزون: ${i.name}`, { id: i.id }));
  events.on('inventory:deleted', (i) => logActivity(ACTIVITY_TYPES.INVENTORY_DELETED.id, `حذف من المخزون: ${i.name}`, { id: i.id }));

  events.on('worker:added', (w) => logActivity(ACTIVITY_TYPES.WORKER_ADDED.id, `إضافة عامل: ${w.name}`, { id: w.id }));
  events.on('worker:deleted', (w) => logActivity(ACTIVITY_TYPES.WORKER_DELETED.id, `حذف عامل: ${w.name}`, { id: w.id }));

  events.on('commitment:added', (c) => logActivity(ACTIVITY_TYPES.COMMITMENT_ADDED.id, `إضافة التزام: ${c.name}`, { id: c.id }));
  events.on('commitment:deleted', (c) => logActivity(ACTIVITY_TYPES.COMMITMENT_DELETED.id, `حذف التزام: ${c.name}`, { id: c.id }));

  events.on('loan:added', (l) => logActivity(ACTIVITY_TYPES.LOAN_ADDED.id, `إضافة قرض: ${l.personName} (${l.amount} جنيه)`, { id: l.id }));
  events.on('loan:deleted', (l) => logActivity(ACTIVITY_TYPES.LOAN_DELETED.id, `حذف قرض: ${l.personName}`, { id: l.id }));

  events.on('houseExpense:added', (e) => logActivity(ACTIVITY_TYPES.HOUSE_EXPENSE_ADDED.id, `إضافة مصروف بيت: ${e.amount} جنيه`, { id: e.id }));
  events.on('houseExpense:deleted', (e) => logActivity(ACTIVITY_TYPES.HOUSE_EXPENSE_DELETED.id, `حذف مصروف بيت: ${e.amount} جنيه`, { id: e.id }));

  console.log('✅ تم تفعيل سجل النشاط التلقائي');
}
