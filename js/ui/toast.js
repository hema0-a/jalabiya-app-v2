/* ============================================================
   toast.js - نظام الإشعارات المنبثقة (V2)
   ============================================================ */

import { events, EVENTS } from '../core/events.js';

let container = null;

/* تهيئة الحاوية التي ستظهر فيها الإشعارات */
export function initToast() {
  if (container) return;
  
  container = document.createElement('div');
  container.className = 'toast-container';
  document.body.appendChild(container);

  // الاستماع لحدث الإشعارات
  events.on(EVENTS.TOAST_SHOWN, (data) => {
    showToast(data.message, data.type, data.duration);
  });
}

/* عرض الإشعار */
export function showToast(message, type = 'info', duration = 3000) {
  if (!container) initToast();

  // إنشاء عنصر الإشعار
  const toast = document.createElement('div');
  toast.className = `toast ${type}`; // type: success, error, info
  toast.textContent = message;

  // إضافته إلى الصفحة
  container.appendChild(toast);

  // إزالته تلقائياً بعد انتهاء المدة
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, duration);
}

/* دوال مساعدة للاختصار */
export const toast = {
  success: (msg) => showToast(msg, 'success'),
  error: (msg) => showToast(msg, 'error'),
  info: (msg) => showToast(msg, 'info')
};
