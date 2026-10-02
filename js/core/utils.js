/* ============================================================
   utils.js - دوال مساعدة (V2)
   ============================================================ */

// ═══ التاريخ ═══

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

// ═══ الأرقام ═══

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

// ═══ النصوص ═══

const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};
const ESCAPE_REGEX = /[&<>"']/g;

export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  if (typeof str === 'number') return String(str);
  return String(str).replace(ESCAPE_REGEX, m => ESCAPE_MAP[m]);
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function customerName(customer) {
  return customer ? customer.name : 'عميل محذوف';
}

// ═══ DOM ═══

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
    else if (k === 'style' && typeof v === 'object') {
      Object.assign(e.style, v);
    }
    else if (k.startsWith('on') && typeof v === 'function') {
      e.addEventListener(k.slice(2).toLowerCase(), v);
    }
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

// ═══ التخزين المؤقت ═══

export function debounce(fn, ms) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

export function throttle(fn, ms) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn.apply(this, args);
    }
  };
}

// ═══ التحقق ═══

export function isValidEgyptPhone(phone) {
  const digits = String(phone).replace(/[\s-]/g, '');
  return /^01[0125]\d{8}$/.test(digits);
}

export function isValidPin(pin) {
  return /^\d{4}$/.test(String(pin));
}

// ═══ JSON ═══

export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function merge(target, source) {
  const result = { ...target };
  Object.entries(source).forEach(([k, v]) => {
    if (v !== undefined) result[k] = v;
  });
  return result;
}
