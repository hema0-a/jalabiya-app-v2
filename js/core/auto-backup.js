/* ============================================================
   auto-backup.js - النسخ الاحتياطي التلقائي (V2.1)
   (حفظ نسخ دورية + استرجاع + إدارة)
   (مُحدَّث: حساب الحجم بالبايتات بدقة عبر Blob)
   ============================================================ */

import * as db from './db.js';
import { DEFAULT_SETTINGS } from './config.js';
import * as storage from './storage.js';
import { events } from './events.js';

const BACKUPS_KEY = 'jalabiya_v2_auto_backups';
const LAST_BACKUP_KEY = 'jalabiya_v2_last_auto_backup';
const MAX_BACKUPS = 7;

/* ============================================================
   الحصول على قائمة النسخ الاحتياطية
   ============================================================ */
export function getAutoBackups() {
  try {
    const raw = localStorage.getItem(BACKUPS_KEY);
    if (!raw) return [];
    const backups = JSON.parse(raw);
    return Array.isArray(backups) ? backups : [];
  } catch (e) {
    console.error('❌ فشل قراءة النسخ:', e);
    return [];
  }
}

/* ============================================================
   حفظ قائمة النسخ
   ============================================================ */
function saveAutoBackups(backups) {
  try {
    localStorage.setItem(BACKUPS_KEY, JSON.stringify(backups));
    return true;
  } catch (e) {
    console.error('❌ فشل حفظ النسخ:', e);
    return false;
  }
}

/* ============================================================
   إنشاء نسخة احتياطية جديدة
   ============================================================ */
export function createAutoBackup(reason = 'scheduled') {
  try {
    const data = db.getStateCopy();
    const jsonString = JSON.stringify(data);
    const bytes = new Blob([jsonString]).size;
    const sizeKB = (bytes / 1024).toFixed(1);

    const backup = {
      id: 'backup_' + Date.now(),
      createdAt: Date.now(),
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      reason: reason, // 'scheduled' | 'manual' | 'before-import'
      size: bytes,
      sizeKB: sizeKB,
      payload: data,
      counts: {
        customers: data.customers?.length || 0,
        orders: data.orders?.length || 0,
        payments: data.payments?.length || 0,
        expenses: data.expenses?.length || 0
      }
    };

    const backups = getAutoBackups();
    backups.unshift(backup); // الأحدث أولاً

    // الاحتفاظ بـ 7 نسخ فقط
    while (backups.length > MAX_BACKUPS) {
      backups.pop();
    }

    const saved = saveAutoBackups(backups);

    if (saved) {
      localStorage.setItem(LAST_BACKUP_KEY, String(Date.now()));
      events.emit('backup:created', { backup, count: backups.length });
      console.log(`✅ تم إنشاء نسخة احتياطية (${sizeKB}KB) - السبب: ${reason}`);
      return backup;
    }

    return null;
  } catch (e) {
    console.error('❌ فشل إنشاء نسخة احتياطية:', e);
    return null;
  }
}

/* ============================================================
   التحقق من الحاجة لنسخة تلقائية
   ============================================================ */
export function needsAutoBackup(hoursInterval = 24) {
  const lastBackupAt = Number(localStorage.getItem(LAST_BACKUP_KEY) || 0);
  if (!lastBackupAt) return true;
  const hoursSinceLastBackup = (Date.now() - lastBackupAt) / (1000 * 60 * 60);
  return hoursSinceLastBackup >= hoursInterval;
}

/* ============================================================
   تشغيل الفحص التلقائي (يُستدعى عند بدء التطبيق)
   ============================================================ */
export function initAutoBackup() {
  const settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };

  // إذا كان معطّلاً
  if (settings.autoBackupEnabled === false) {
    console.log('⏸️ النسخ التلقائي معطّل');
    return;
  }

  const intervalHours = settings.autoBackupIntervalHours || 24;

  if (needsAutoBackup(intervalHours)) {
    console.log('📦 النسخ التلقائي مطلوب - جاري الإنشاء...');
    setTimeout(() => {
      createAutoBackup('scheduled');
    }, 3000); // ننتظر 3 ثوانٍ لبدء التطبيق
  } else {
    console.log('✅ نسخة احتياطية حديثة موجودة');
  }

  // فحص دوري كل ساعة
  setInterval(() => {
    if (needsAutoBackup(intervalHours)) {
      createAutoBackup('scheduled');
    }
  }, 60 * 60 * 1000);
}

/* ============================================================
   الحصول على معلومات آخر نسخة
   ============================================================ */
export function getLastBackupInfo() {
  const backups = getAutoBackups();
  if (backups.length === 0) return null;
  return backups[0];
}

/* ============================================================
   حساب الوقت منذ آخر نسخة
   ============================================================ */
export function getTimeSinceLastBackup() {
  const lastBackupAt = Number(localStorage.getItem(LAST_BACKUP_KEY) || 0);
  if (!lastBackupAt) return null;

  const seconds = Math.floor((Date.now() - lastBackupAt) / 1000);
  return seconds;
}

/* ============================================================
   استرجاع نسخة احتياطية
   ============================================================ */
export function restoreAutoBackup(backupId) {
  try {
    const backups = getAutoBackups();
    const backup = backups.find(b => b.id === backupId);
    if (!backup) {
      return { success: false, error: 'النسخة غير موجودة' };
    }

    // إنشاء نسخة طوارئ قبل الاسترجاع
    createAutoBackup('before-restore');

    // استرجاع البيانات
    db.setState(backup.payload);

    events.emit('backup:restored', { backup });
    return { success: true };
  } catch (e) {
    console.error('❌ فشل استرجاع النسخة:', e);
    return { success: false, error: e.message };
  }
}

/* ============================================================
   حذف نسخة احتياطية
   ============================================================ */
export function deleteAutoBackup(backupId) {
  try {
    const backups = getAutoBackups();
    const newBackups = backups.filter(b => b.id !== backupId);
    if (newBackups.length === backups.length) {
      return { success: false, error: 'النسخة غير موجودة' };
    }
    saveAutoBackups(newBackups);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/* ============================================================
   مسح كل النسخ الاحتياطية
   ============================================================ */
export function clearAllBackups() {
  try {
    localStorage.removeItem(BACKUPS_KEY);
    localStorage.removeItem(LAST_BACKUP_KEY);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/* ============================================================
   تحميل نسخة كملف JSON
   ============================================================ */
export function downloadBackup(backupId) {
  const backups = getAutoBackups();
  const backup = backups.find(b => b.id === backupId);
  if (!backup) return false;

  const jsonString = JSON.stringify(backup.payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `jalabiya_backup_${backup.date}_${backup.id.slice(-6)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return true;
}

/* ============================================================
   إحصائيات النسخ
   ============================================================ */
export function getBackupsStats() {
  const backups = getAutoBackups();
  const totalSize = backups.reduce((s, b) => s + (b.size || 0), 0);

  return {
    count: backups.length,
    maxBackups: MAX_BACKUPS,
    totalSize,
    totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    oldest: backups[backups.length - 1] || null,
    newest: backups[0] || null
  };
}
