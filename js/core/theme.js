/* ============================================================
   theme.js - إدارة الألوان والثيمات والخطوط (V2)
   ============================================================ */

import { DEFAULT_SETTINGS } from './config.js';
import * as storage from './storage.js';

/* ============================================================
   الثيمات الجاهزة
   ============================================================ */
export const THEME_PRESETS = {
  classic: {
    name: 'كلاسيكي',
    icon: '🟢',
    colors: { primary: '#1F6D57', primaryDark: '#123C2F', accent: '#B8863B', bg: '#F6F1E6' }
  },
  modern: {
    name: 'عصري',
    icon: '🔵',
    colors: { primary: '#1565C0', primaryDark: '#0D47A1', accent: '#00ACC1', bg: '#F0F4F8' }
  },
  purple: {
    name: 'بنفسجي',
    icon: '🟣',
    colors: { primary: '#6A1B9A', primaryDark: '#4A148C', accent: '#E91E63', bg: '#F6F0F8' }
  },
  warm: {
    name: 'دافئ',
    icon: '🔴',
    colors: { primary: '#C62828', primaryDark: '#8E0000', accent: '#F57C00', bg: '#FBF3E8' }
  },
  mono: {
    name: 'بسيط',
    icon: '⚫',
    colors: { primary: '#424242', primaryDark: '#212121', accent: '#757575', bg: '#F5F5F5' }
  }
};

/* ============================================================
   الخطوط المتاحة
   ============================================================ */
export const FONT_FAMILIES = {
  default: { name: 'IBM Plex Sans Arabic', stack: "'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif" },
  tajawal: { name: 'تجوال', stack: "'Tajawal', Tahoma, Arial, sans-serif" },
  cairo: { name: 'القاهرة', stack: "'Cairo', Tahoma, Arial, sans-serif" },
  almarai: { name: 'الماري', stack: "'Almarai', Tahoma, Arial, sans-serif" },
  notokufi: { name: 'نوتو كوفي', stack: "'Noto Kufi Arabic', Tahoma, Arial, sans-serif" }
};

export const FONT_SIZES = {
  small: { name: 'صغير', value: 0.9 },
  normal: { name: 'متوسط', value: 1 },
  large: { name: 'كبير', value: 1.12 },
  xlarge: { name: 'كبير جداً', value: 1.25 }
};

/* ============================================================
   تطبيق الألوان
   ============================================================ */
export function applyTheme(theme) {
  if (!theme) return;
  const root = document.documentElement;
  if (theme.primary) {
    root.style.setProperty('--primary-color', theme.primary);
    root.style.setProperty('--primary-dark', theme.primaryDark || adjustColor(theme.primary, -30));
  }
  if (theme.primaryDark) root.style.setProperty('--primary-dark', theme.primaryDark);
  if (theme.accent) root.style.setProperty('--accent-color', theme.accent);
  if (theme.bg) root.style.setProperty('--bg-color', theme.bg);
}

/* ============================================================
   تطبيق الخط
   ============================================================ */
export function applyFont(fontFamily, fontSize) {
  const root = document.documentElement;
  const family = FONT_FAMILIES[fontFamily] || FONT_FAMILIES.default;
  root.style.setProperty('--font-family', family.stack);
  
  const size = FONT_SIZES[fontSize] ? FONT_SIZES[fontSize].value : 1;
  document.body.style.fontSize = (16 * size) + 'px';
  root.style.setProperty('--font-scale', String(size));
}

/* ============================================================
   تحميل كل الإعدادات
   ============================================================ */
export function loadTheme() {
  const settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  
  if (settings.theme) {
    applyTheme(settings.theme);
  } else {
    applyTheme(DEFAULT_SETTINGS.theme);
  }
  
  applyDisplayModes(settings);
  applyFont(settings.fontFamily || 'default', settings.fontSize || 'normal');
}

/* ============================================================
   حفظ الألوان
   ============================================================ */
export function saveTheme(theme) {
  let settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  settings.theme = { ...settings.theme, ...theme };
  storage.saveSettings(settings);
  applyTheme(settings.theme);
}

/* ============================================================
   تطبيق ثيم جاهز
   ============================================================ */
export function applyThemePreset(presetId) {
  const preset = THEME_PRESETS[presetId];
  if (!preset) return false;
  saveTheme(preset.colors);
  return true;
}

/* ============================================================
   حفظ الخط
   ============================================================ */
export function saveFontSettings(fontFamily, fontSize) {
  let settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  settings.fontFamily = fontFamily;
  settings.fontSize = fontSize;
  storage.saveSettings(settings);
  applyFont(fontFamily, fontSize);
}

/* ============================================================
   استعادة الخط الافتراضي
   ============================================================ */
export function resetFontSettings() {
  saveFontSettings('default', 'normal');
}

/* ============================================================
   أوضاع العرض
   ============================================================ */
export function applyDisplayModes(settings) {
  if (!settings) settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  const body = document.body;
  if (settings.darkMode) body.classList.add('dark-mode');
  else body.classList.remove('dark-mode');
  if (settings.highContrast) body.classList.add('high-contrast');
  else body.classList.remove('high-contrast');
  if (settings.compactMode) body.classList.add('compact-mode');
  else body.classList.remove('compact-mode');
  if (settings.clientMode) body.classList.add('client-mode');
  else body.classList.remove('client-mode');
}

export function toggleDarkMode() {
  let settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  settings.darkMode = !settings.darkMode;
  storage.saveSettings(settings);
  if (settings.darkMode) document.body.classList.add('dark-mode');
  else document.body.classList.remove('dark-mode');
  return settings.darkMode;
}

export function setDisplayMode(key, value) {
  let settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  settings[key] = value;
  storage.saveSettings(settings);
  applyDisplayModes(settings);
  return settings;
}

export function isDarkMode() {
  return document.body.classList.contains('dark-mode');
}

/* ============================================================
   مساعدة: تعديل درجة اللون
   ============================================================ */
function adjustColor(hex, percent) {
  hex = hex.replace('#', '');
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);
  r = Math.max(0, Math.min(255, r + percent));
  g = Math.max(0, Math.min(255, g + percent));
  b = Math.max(0, Math.min(255, b + percent));
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}
