/* ============================================================
   theme.js - إدارة ألوان التطبيق (V2)
   ============================================================ */

import { APP_CONFIG, DEFAULT_SETTINGS } from './config.js';
import * as storage from './storage.js';

/**
 * تطبيق الألوان على الصفحة
 * @param {Object} theme - كائن يحتوي على الألوان (primary, accent, bg)
 */
export function applyTheme(theme) {
  if (!theme) return;
  const root = document.documentElement;
  
  if (theme.primary) {
    root.style.setProperty('--primary-color', theme.primary);
    // اشتقاق لون داكن تلقائياً (يمكن تحسينه لاحقاً)
    root.style.setProperty('--primary-dark', adjustColor(theme.primary, -30));
  }
  if (theme.accent) {
    root.style.setProperty('--accent-color', theme.accent);
  }
  if (theme.bg) {
    root.style.setProperty('--bg-color', theme.bg);
  }
}

/**
 * تحميل الألوان المحفوظة من التخزين وتطبيقها
 */
export function loadTheme() {
  const settings = storage.loadSettings();
  if (settings && settings.theme) {
    applyTheme(settings.theme);
  } else {
    // استخدام الألوان الافتراضية من config.js
    applyTheme(DEFAULT_SETTINGS.theme);
  }
}

/**
 * حفظ الألوان الجديدة في التخزين وتطبيقها
 * @param {Object} theme - كائن الألوان الجديد
 */
export function saveTheme(theme) {
  // جلب الإعدادات الحالية أو الافتراضية
  let settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  
  // تحديث قسم الثيم
  settings.theme = { ...settings.theme, ...theme };
  
  // حفظ الإعدادات
  storage.saveSettings(settings);
  
  // تطبيق الألوان فوراً
  applyTheme(settings.theme);
}

/**
 * دالة مساعدة لتغميق أو تفتيح لون معين (بصيغة HEX)
 * @param {string} hex - اللون بصيغة #RRGGBB
 * @param {number} percent - النسبة (سالب للتغميق، موجب للتفتيح)
 * @returns {string} اللون الجديد
 */
function adjustColor(hex, percent) {
  // إزالة علامة # إذا وجدت
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
