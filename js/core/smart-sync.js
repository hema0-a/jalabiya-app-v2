/* ============================================================
   smart-sync.js - المزامنة الذكية (Delta Sync) (V2)
   (تسجيل التغييرات + رفع الفروقات فقط + توفير البيانات)
   ============================================================ */

import * as db from './db.js';
import { events } from './events.js';
import { uid } from './utils.js';

/* ============================================================
   مفاتيح التخزين
   ============================================================ */
const QUEUE_KEY = 'jalabiya_v2_sync_queue';
const LAST_SYNC_HASH_KEY = 'jalabiya_v2_last_sync_hash';
const SYNC_STATS_KEY = 'jalabiya_v2_sync_stats';

/* ============================================================
   قائمة التغييرات المعلقة (Queue)
   ============================================================ */
export function getSyncQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const queue = JSON.parse(raw);
    return Array.isArray(queue) ? queue : [];
  } catch (e) {
    return [];
  }
}

function saveSyncQueue(queue) {
  try {
    // الاحتفاظ بآخر 500 عملية فقط لتجنب تضخم الحجم
    if (queue.length > 500) {
      queue = queue.slice(-500);
    }
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return true;
  } catch (e) {
    console.error('❌ فشل حفظ Queue:', e);
    return false;
  }
}

/* ============================================================
   إضافة تغيير إلى Queue
   ============================================================ */
export function queueChange(type, data) {
  try {
    const queue = getSyncQueue();
    queue.push({
      id: uid(),
      type: type,           // 'customer:added', 'order:updated', إلخ
      data: data,
      timestamp: Date.now()
    });
    saveSyncQueue(queue);
    return true;
  } catch (e) {
    console.error('❌ فشل إضافة للتغييرات:', e);
    return false;
  }
}

/* ============================================================
   مسح Queue (بعد مزامنة ناجحة)
   ============================================================ */
export function clearSyncQueue() {
  try {
    localStorage.removeItem(QUEUE_KEY);
    return true;
  } catch (e) {
    return false;
  }
}

/* ============================================================
   عدد التغييرات المعلقة
   ============================================================ */
export function getPendingChangesCount() {
  return getSyncQueue().length;
}

/* ============================================================
   حساب Hash للبيانات (لتحديد ما إذا تغيرت)
   ============================================================ */
export function calculateDataHash(data) {
  try {
    // نستخدم عدد بسيط من الحقول والطول
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // تحويل إلى 32-bit
    }
    return Math.abs(hash).toString(36);
  } catch (e) {
    return 'error';
  }
}

/* ============================================================
   حساب Hash للبيانات الحالية
   ============================================================ */
export function getCurrentDataHash() {
  return calculateDataHash(db.getState());
}

/* ============================================================
   هل تغيرت البيانات منذ آخر مزامنة؟
   ============================================================ */
export function hasDataChanged() {
  const lastHash = localStorage.getItem(LAST_SYNC_HASH_KEY);
  const currentHash = getCurrentDataHash();
  return lastHash !== currentHash;
}

/* ============================================================
   تسجيل Hash بعد مزامنة ناجحة
   ============================================================ */
export function markSynced() {
  const hash = getCurrentDataHash();
  localStorage.setItem(LAST_SYNC_HASH_KEY, hash);
  clearSyncQueue();
  recordSyncSuccess();
}

/* ============================================================
   إحصائيات المزامنة
   ============================================================ */
export function getSyncStats() {
  try {
    const raw = localStorage.getItem(SYNC_STATS_KEY);
    if (!raw) return { totalSyncs: 0, lastSyncAt: 0, averageTime: 0 };
    return JSON.parse(raw);
  } catch (e) {
    return { totalSyncs: 0, lastSyncAt: 0, averageTime: 0 };
  }
}

function saveSyncStats(stats) {
  try {
    localStorage.setItem(SYNC_STATS_KEY, JSON.stringify(stats));
  } catch (e) { /* ignore */ }
}

/* ============================================================
   تسجيل مزامنة ناجحة
   ============================================================ */
export function recordSyncSuccess(durationMs = 0) {
  const stats = getSyncStats();
  stats.totalSyncs = (stats.totalSyncs || 0) + 1;
  stats.lastSyncAt = Date.now();

  if (durationMs > 0) {
    const totalTime = (stats.averageTime || 0) * (stats.totalSyncs - 1) + durationMs;
    stats.averageTime = Math.round(totalTime / stats.totalSyncs);
  }

  saveSyncStats(stats);
}

/* ============================================================
   الحصول على حجم البيانات (لتقليل حجم المزامنة)
   ============================================================ */
export function getDataSize() {
  try {
    const str = JSON.stringify(db.getState());
    const bytes = str.length;
    const kb = (bytes / 1024).toFixed(1);
    const mb = (bytes / (1024 * 1024)).toFixed(2);
    return { bytes, kb, mb };
  } catch (e) {
    return { bytes: 0, kb: '0', mb: '0' };
  }
}

/* ============================================================
   مقارنة الحجم (لتحديد إذا كانت المزامنة الكاملة ضرورية)
   ============================================================ */
export function shouldDoFullSync() {
  const stats = getSyncStats();
  const size = getDataSize();

  // مزامنة كاملة إذا:
  // 1. البيانات كبيرة (> 500KB)
  // 2. لم نزامن من قبل
  // 3. لم نزامن خلال آخر 3 أيام
  if (size.bytes > 500 * 1024) return true;
  if (!stats.lastSyncAt) return true;

  const daysSinceLastSync = (Date.now() - stats.lastSyncAt) / (1000 * 60 * 60 * 24);
  if (daysSinceLastSync > 3) return true;

  return false;
}

/* ============================================================
   تسجيل الأحداث تلقائياً في Queue
   ============================================================ */
export function initSmartSync() {
  const eventsToTrack = [
    'customer:added', 'customer:updated', 'customer:deleted',
    'order:added', 'order:updated', 'order:deleted',
    'payment:added', 'payment:deleted',
    'expense:added', 'expense:updated', 'expense:deleted',
    'inventory:added', 'inventory:updated', 'inventory:deleted',
    'worker:added', 'worker:updated', 'worker:deleted',
    'commitment:added', 'commitment:updated', 'commitment:deleted',
    'loan:added', 'loan:updated', 'loan:deleted',
    'savingsGoal:added', 'savingsGoal:updated', 'savingsGoal:deleted',
    'portfolio:added', 'portfolio:updated', 'portfolio:deleted',
    'garmentType:added', 'garmentType:updated', 'garmentType:deleted',
    'occasion:added', 'occasion:updated', 'occasion:deleted'
  ];

  eventsToTrack.forEach(eventName => {
    events.on(eventName, (data) => {
      queueChange(eventName, data ? { id: data.id } : null);
    });
  });

  console.log('✅ تم تفعيل المزامنة الذكية');
}

/* ============================================================
   تنظيف Queue من التغييرات القديمة
   ============================================================ */
export function cleanOldQueueChanges(maxAgeHours = 24) {
  try {
    const queue = getSyncQueue();
    const cutoff = Date.now() - (maxAgeHours * 60 * 60 * 1000);
    const cleaned = queue.filter(item => item.timestamp > cutoff);
    
    if (cleaned.length !== queue.length) {
      saveSyncQueue(cleaned);
      console.log(`🧹 تم حذف ${queue.length - cleaned.length} تغيير قديم من Queue`);
    }
    
    return cleaned.length;
  } catch (e) {
    return 0;
  }
}

/* ============================================================
   إحصائيات مفصلة
   ============================================================ */
export function getDetailedSyncStats() {
  const basic = getSyncStats();
  const size = getDataSize();
  const pendingCount = getPendingChangesCount();
  const needsFullSync = shouldDoFullSync();

  return {
    ...basic,
    size,
    pendingChanges: pendingCount,
    needsFullSync,
    lastSyncAgo: basic.lastSyncAt
      ? Math.floor((Date.now() - basic.lastSyncAt) / 1000)
      : null
  };
}
