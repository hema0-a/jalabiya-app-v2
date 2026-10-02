/* ============================================================
   theme.js - إدارة الألوان وأوضاع العرض (V2)
   ============================================================ */

import { DEFAULT_SETTINGS } from './config.js';
import * as storage from './storage.js';

/* ============================================================
   تطبيق الألوان على الصفحة
   ============================================================ */
export function applyTheme(theme) {
  if (!theme) return;
  const root = document.documentElement;
  
  if (theme.primary) {
    root.style.setProperty('--primary-color', theme.primary);
    root.style.setProperty('--primary-dark', adjustColor(theme.primary, -30));
  }
  if (theme.accent) {
    root.style.setProperty('--accent-color', theme.accent);
  }
  if (theme.bg) {
    root.style.setProperty('--bg-color', theme.bg);
  }
}

/* ============================================================
   تحميل الألوان + أوضاع العرض المحفوظة
   ============================================================ */
export function loadTheme() {
  const settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  
  // تطبيق الألوان
  if (settings.theme) {
    applyTheme(settings.theme);
  } else {
    applyTheme(DEFAULT_SETTINGS.theme);
  }
  
  // تطبيق أوضاع العرض
  applyDisplayModes(settings);
}

/* ============================================================
   حفظ الألوان الجديدة
   ============================================================ */
export function saveTheme(theme) {
  let settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  settings.theme = { ...settings.theme, ...theme };
  storage.saveSettings(settings);
  applyTheme(settings.theme);
}

/* ============================================================
   تطبيق أوضاع العرض
   ============================================================ */
export function applyDisplayModes(settings) {
  if (!settings) settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  const body = document.body;
  
  // الوضع الليلي
  if (settings.darkMode) {
    body.classList.add('dark-mode');
  } else {
    body.classList.remove('dark-mode');
  }
  
  // التباين العالي
  if (settings.highContrast) {
    body.classList.add('high-contrast');
  } else {
    body.classList.remove('high-contrast');
  }
  
  // الوضع المضغوط
  if (settings.compactMode) {
    body.classList.add('compact-mode');
  } else {
    body.classList.remove('compact-mode');
  }
  
  // وضع العميل
  if (settings.clientMode) {
    body.classList.add('client-mode');
  } else {
    body.classList.remove('client-mode');
  }
}

/* ============================================================
   تبديل الوضع الليلي
   ============================================================ */
export function toggleDarkMode() {
  let settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  settings.darkMode = !settings.darkMode;
  storage.saveSettings(settings);
  
  if (settings.darkMode) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
  
  return settings.darkMode;
}

/* ============================================================
   تحديث وضع عرض معين
   ============================================================ */
export function setDisplayMode(key, value) {
  let settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  settings[key] = value;
  storage.saveSettings(settings);
  applyDisplayModes(settings);
  return settings;
}

/* ============================================================
   دالة مساعدة: تعديل درجة اللون
   ============================================================ */
function adjustColor(hex, percent) {
  hex = hex.replace('#', '');
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);
  r = Math.max(0, Math.min(255, r + percent));
  g = Math.max(0, Math.min(255, g + percent));
  b = Math.max(0, Math.min(255, b + percent));
  const rr = r.toString(16).padStart(2, '0');
  const gg = g.toString(16).padStart(2, '0');
  const bb = b.toString(16).padStart(2, '0');
  return `#${rr}${gg}${bb}`;
}

/* ============================================================
   التحقق من الوضع الليلي الحالي
   ============================================================ */
export function isDarkMode() {
  return document.body.classList.contains('dark-mode');
}
