/* ============================================================
   storage.js - طبقة التخزين (V2)
   
   يعزل التطبيق عن localStorage مباشرة — يسهل التبديل إلى IndexedDB لاحقاً
   ============================================================ */

import { APP_CONFIG } from './config.js';

/**
 * حفظ JSON بأمان
 */
export function setItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error(`Storage set failed [${key}]:`, e);
    return false;
  }
}

/**
 * قراءة JSON بأمان
 */
export function getItem(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Storage get failed [${key}]:`, e);
    return fallback;
  }
}

/**
 * حذف مفتاح
 */
export function removeItem(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * حجم التخزين المستخدم (بالبايت)
 */
export function getStorageSize() {
  let total = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      total += (key ? key.length : 0) + (value ? value.length : 0);
    }
  } catch (e) {}
  return total;
}

/**
 * فحص المساحة
 */
export function checkStorageSpace() {
  const used = getStorageSize();
  const limit = 4 * 1024 * 1024; // 4 MB
  const percent = used / limit;
  return {
    used,
    usedMB: (used / (1024 * 1024)).toFixed(2),
    limit,
    percent,
    isWarning: percent > 0.7,
    isCritical: percent > 0.9,
  };
}

/**
 * حفظ قاعدة البيانات
 */
export function saveDB(db) {
  return setItem(APP_CONFIG.storageKey, db);
}

/**
 * قراءة قاعدة البيانات
 */
export function loadDB() {
  return getItem(APP_CONFIG.storageKey, null);
}

/**
 * حفظ نسخة احتياطية محلية
 */
export function saveBackup(db) {
  return setItem(APP_CONFIG.backupKey, {
    data: db,
    savedAt: Date.now(),
  });
}

/**
 * قراءة النسخة الاحتياطية
 */
export function loadBackup() {
  return getItem(APP_CONFIG.backupKey, null);
}

/**
 * حفظ الإعدادات
 */
export function saveSettings(settings) {
  return setItem(APP_CONFIG.settingsKey, settings);
}

/**
 * قراءة الإعدادات
 */
export function loadSettings() {
  return getItem(APP_CONFIG.settingsKey, null);
}

/**
 * حفظ الجلسة
 */
export function saveSession(session) {
  return setItem(APP_CONFIG.sessionKey, session);
}

/**
 * قراءة الجلسة
 */
export function loadSession() {
  return getItem(APP_CONFIG.sessionKey, null);
}

/**
 * حذف الجلسة
 */
export function clearSession() {
  return removeItem(APP_CONFIG.sessionKey);
}
