/* ============================================================
   modal.js - نظام النوافذ المنبثقة (V2)
   ============================================================ */

import { events, EVENTS } from '../core/events.js';

let overlay = null;
let onCloseCallback = null;

/* تهيئة الحاوية الأساسية للنوافذ */
export function initModal() {
  if (overlay) return;

  // إنشاء الخلفية المعتمة
  overlay = document.createElement('div');
  overlay.className = 'modal-overlay hidden';
  
  // إغلاق النافذة عند الضغط على الخلفية المعتمة (خارج المحتوى)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  document.body.appendChild(overlay);
}

/* فتح نافذة جديدة وعرض محتوى بداخلها */
export function openModal(htmlContent, onClose = null) {
  if (!overlay) initModal();

  // وضع المحتوى داخل النافذة
  overlay.innerHTML = `<div class="modal-content">${htmlContent}</div>`;
  
  // إظهار النافذة
  overlay.classList.remove('hidden');
  
  // حفظ دالة الإغلاق إن وجدت
  onCloseCallback = onClose;

  // إطلاق حدث فتح النافذة
  events.emit(EVENTS.MODAL_OPENED);
}

/* إغلاق النافذة الحالية */
export function closeModal() {
  if (!overlay) return;

  // إخفاء النافذة ومسح محتواها
  overlay.classList.add('hidden');
  overlay.innerHTML = '';

  // تنفيذ دالة الإغلاق إن وجدت
  if (typeof onCloseCallback === 'function') {
    onCloseCallback();
    onCloseCallback = null;
  }

  // إطلاق حدث إغلاق النافذة
  events.emit(EVENTS.MODAL_CLOSED);
}

/* التحقق مما إذا كانت هناك نافذة مفتوحة حالياً */
export function isModalOpen() {
  return overlay && !overlay.classList.contains('hidden');
}
