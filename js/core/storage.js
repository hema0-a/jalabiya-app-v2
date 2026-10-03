/* ============================================================
   storage.js - طبقة التخزين (V2)
   ============================================================ */

import { APP_CONFIG, DEFAULT_SETTINGS } from './config.js';

export function setItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error(`Storage set failed [${key}]:`, e);
    return false;
  }
}

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

export function removeItem(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    return false;
  }
}

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

export function checkStorageSpace() {
  const used = getStorageSize();
  const limit = 4 * 1024 * 1024;
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

export function saveDB(db) {
  return setItem(APP_CONFIG.storageKey, db);
}

export function loadDB() {
  return getItem(APP_CONFIG.storageKey, null);
}

export function saveBackup(db) {
  return setItem(APP_CONFIG.backupKey, {
    data: db,
    savedAt: Date.now(),
  });
}

export function loadBackup() {
  return getItem(APP_CONFIG.backupKey, null);
}

export function saveSettings(settings) {
  return setItem(APP_CONFIG.settingsKey, settings);
}

export function loadSettings() {
  const stored = getItem(APP_CONFIG.settingsKey, null);
  if (!stored || typeof stored !== 'object') {
    return { ...DEFAULT_SETTINGS };
  }
  return { ...DEFAULT_SETTINGS, ...stored };
}

export function saveSession(session) {
  return setItem(APP_CONFIG.sessionKey, session);
}

export function loadSession() {
  return getItem(APP_CONFIG.sessionKey, null);
}

export function clearSession() {
  return removeItem(APP_CONFIG.sessionKey);
}
