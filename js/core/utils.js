/* ============================================================
   utils.js - دوال مساعدة (V2)
   (مُحدَّث: أداء أفضل + تحقق محسّن)
   ============================================================ */

/* ============================================================
   التواريخ
   ============================================================ */

export function today() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function parseDate(str) {
  if (str instanceof Date) return str;
  if (typeof str === 'string' && /^\d{4}-\d{2}-\d{2}/.test(str)) {
    return new Date(str + 'T00:00:00');
  }
  return new Date(str);
}

export function formatDate(str) {
  if (!str) return '-';
  const parts = String(str).split('-');
  if (parts.length !== 3) return str;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function daysBetween(date1, date2) {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);
  if (isNaN(d1) || isNaN(d2)) return 0;
  return Math.round((d1 - d2) / 86400000);
}

/* ============================================================
   الأرقام
   ============================================================ */

export function num(value, fallback = 0) {
  const n = Number(value);
  return isFinite(n) ? n : fallback;
}

export function money(value) {
  return num(value).toLocaleString('ar-EG');
}

export function round(value, decimals = 0) {
  const factor = Math.pow(10, decimals);
  return Math.round(num(value) * factor) / factor;
}

/* ============================================================
   النصوص - أمان HTML
   ============================================================ */

const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const ESCAPE_REGEX = /[&<>"']/g;

export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  if (typeof str === 'number') return String(str);
  return String(str).replace(ESCAPE_REGEX, m => ESCAPE_MAP[m]);
}

/* ============================================================
   المعرّفات الفريدة
   ============================================================ */

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ============================================================
   العملاء
   ============================================================ */

export function customerName(customer) {
  return customer ? customer.name : 'عميل محذوف';
}

/* ============================================================
   DOM
   ============================================================ */

export function $(selector, root = document) {
  return root.querySelector(selector);
}

export function $$(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

export function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') e.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'text') e.textContent = v;
    else e.setAttribute(k, v);
  });
  children.forEach(c => {
    if (typeof c === 'string') e.appendChild(document.createTextNode(c));
    else if (c instanceof Node) e.appendChild(c);
  });
  return e;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/* ============================================================
   دوال التحكم بالوقت
   ============================================================ */

export function debounce(fn, ms) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

export function throttle(fn, ms) {
  let last = 0;
  let trailingTimer = null;
  let lastArgs = null;

  return function (...args) {
    const now = Date.now();
    const remaining = ms - (now - last);
    lastArgs = args;

    if (remaining <= 0) {
      if (trailingTimer) {
        clearTimeout(trailingTimer);
        trailingTimer = null;
      }
      last = now;
      fn.apply(this, args);
    } else if (!trailingTimer) {
      trailingTimer = setTimeout(() => {
        last = Date.now();
        trailingTimer = null;
        fn.apply(this, lastArgs);
      }, remaining);
    }
  };
}

/* ============================================================
   التحقق من المدخلات
   ============================================================ */

export function isValidEgyptPhone(phone) {
  if (!phone) return false;
  const digits = String(phone).replace(/[\s-]/g, '');
  return /^01[0125]\d{8}$/.test(digits);
}

export function isValidPin(pin) {
  return /^\d{4}$/.test(String(pin));
}

export function isValidEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

export function validatePasswordStrength(password) {
  const errors = [];
  if (!password || password.length < 8) errors.push('8 أحرف على الأقل');
  if (!/[a-zA-Z]/.test(password)) errors.push('حرف واحد على الأقل');
  if (!/[0-9]/.test(password)) errors.push('رقم واحد على الأقل');
  return errors;
}

/* ============================================================
   الاستنساخ العميق (محسّن للأداء)
   ============================================================ */

export function deepClone(obj) {
  // structuredClone أسرع 3-5x من JSON.parse(JSON.stringify())
  // مدعوم في Chrome 98+ و Safari 15.4+
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(obj);
    } catch (e) {
      // fallback للحالات النادرة (functions, symbols, إلخ)
    }
  }
  return JSON.parse(JSON.stringify(obj));
}

/* ============================================================
   دمج الكائنات
   ============================================================ */

export function merge(target, source) {
  const result = { ...target };
  Object.entries(source).forEach(([k, v]) => {
    if (v !== undefined) result[k] = v;
  });
  return result;
}

/* ============================================================
   دوال إضافية للتنسيق
   ============================================================ */

export function formatTime(timestamp) {
  const d = new Date(timestamp);
  const p = n => String(n).padStart(2, '0');
  let hours = d.getHours();
  const minutes = p(d.getMinutes());
  const period = hours >= 12 ? 'م' : 'ص';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${period}`;
}

export function formatDuration(ms) {
  if (!ms || ms < 0) return '0 دقيقة';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours} س ${minutes} د`;
  if (minutes > 0) return `${minutes} دقيقة`;
  return `${totalSeconds} ثانية`;
}

export function formatAgo(seconds) {
  if (seconds < 60) return 'ثوانٍ';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} دقيقة`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} ساعة`;
  return `${Math.floor(seconds / 86400)} يوم`;
}

/* ============================================================
   دوال آمنة لتنفيذ الكود
   ============================================================ */

export function safeExecute(fn, fallback = null) {
  try {
    return fn();
  } catch (e) {
    console.error('❌ خطأ:', e);
    return fallback;
  }
}

export async function safeAsyncExecute(fn, fallback = null) {
  try {
    return await fn();
  } catch (e) {
    console.error('❌ خطأ غير متزامن:', e);
    return fallback;
  }
}
