/* ============================================================
   universal-search.js - واجهة البحث الشامل (V2)
   (نافذة بحث منبثقة + نتائج مصنفة + تنقل سريع)
   ============================================================ */

import { searchAll } from '../core/search.js';
import { openModal, closeModal } from './modal.js';

let isSearchOpen = false;
let currentSearchInput = null;
let searchDebounceTimer = null;

/* ============================================================
   فتح نافذة البحث الشامل
   ============================================================ */
export function openUniversalSearch() {
  if (isSearchOpen) {
    // إذا كانت مفتوحة، ركّز على الحقل
    if (currentSearchInput) currentSearchInput.focus();
    return;
  }

  isSearchOpen = true;

  const html = `
    <div id="universal-search-modal" style="
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(4px);
      z-index: 9999;
      padding: 20px;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      animation: fadeIn 0.2s ease;
    ">
      <div style="
        width: 100%;
        max-width: 600px;
        background: var(--surface-color);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-xl);
        overflow: hidden;
        margin-top: 60px;
        max-height: calc(100vh - 120px);
        display: flex;
        flex-direction: column;
        animation: slideDown 0.25s ease;
      ">
        <!-- حقل البحث -->
        <div style="
          padding: 16px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--surface-color);
        ">
          <span style="font-size: 22px;">🔍</span>
          <input
            type="text"
            id="universal-search-input"
            placeholder="ابحث في كل شيء... (عميل، طلب، دفعة، مخزون)"
            autocomplete="off"
            style="
              flex: 1;
              border: none;
              outline: none;
              font-size: 16px;
              background: transparent;
              color: var(--text-main);
              font-family: inherit;
            "
          >
          <button id="close-search-btn" style="
            background: var(--bg-color);
            border: none;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            font-size: 16px;
            cursor: pointer;
            color: var(--text-muted);
            display: flex;
            align-items: center;
            justify-content: center;
          ">✕</button>
        </div>

        <!-- نتائج البحث -->
        <div id="search-results" style="
          flex: 1;
          overflow-y: auto;
          padding: 8px;
          min-height: 200px;
          max-height: 500px;
        ">
          <div class="search-hint" style="text-align:center; padding: 40px 20px; color: var(--text-muted);">
            <div style="font-size: 48px; margin-bottom: 12px;">🔍</div>
            <p style="font-size: 14px;">ابدأ الكتابة للبحث في كل شيء</p>
            <p style="font-size: 12px; margin-top: 8px; opacity: 0.7;">العملاء • الطلبات • الدفعات • المخزون • العمال • الأنواع</p>
          </div>
        </div>

        <!-- تلميح لوحة المفاتيح (للكمبيوتر) -->
        <div class="search-footer" style="
          padding: 8px 16px;
          border-top: 1px solid var(--border-color);
          font-size: 11px;
          color: var(--text-muted);
          display: flex;
          justify-content: space-between;
          background: var(--bg-color);
        ">
          <span>💡 يمكنك الكتابة والتنقل بالأسهم</span>
          <span><kbd style="background:var(--surface-color); padding:2px 6px; border-radius:4px; border:1px solid var(--border-color);">Esc</kbd> للإغلاق</span>
        </div>
      </div>
    </div>
    <style>
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slideDown {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .search-result-item {
        padding: 10px 12px;
        border-radius: var(--radius-md);
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 10px;
        transition: background 0.15s;
        margin-bottom: 4px;
      }
      .search-result-item:hover, .search-result-item.selected {
        background: var(--bg-color);
      }
      .search-result-item.selected {
        border-right: 3px solid var(--primary-color);
      }
    </style>
  `;

  // إضافة النافذة للصفحة
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper.firstElementChild);

  // الحصول على العناصر
  currentSearchInput = document.getElementById('universal-search-input');
  const resultsDiv = document.getElementById('search-results');
  const closeBtn = document.getElementById('close-search-btn');

  // تركيز تلقائي
  setTimeout(() => currentSearchInput.focus(), 100);

  // البحث الفوري (بـ debounce)
  currentSearchInput.addEventListener('input', (e) => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      performSearch(e.target.value, resultsDiv);
    }, 150);
  });

  // ESC للإغلاق
  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      closeUniversalSearch();
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);

  // زر الإغلاق
  closeBtn.addEventListener('click', closeUniversalSearch);

  // إغلاق بالضغط على الخلفية
  document.getElementById('universal-search-modal').addEventListener('click', (e) => {
    if (e.target.id === 'universal-search-modal') {
      closeUniversalSearch();
    }
  });

  // حفظ مرجع للإغلاق
  window.__closeUniversalSearch = () => {
    document.removeEventListener('keydown', escapeHandler);
  };
}

/* ============================================================
   إغلاق نافذة البحث
   ============================================================ */
export function closeUniversalSearch() {
  const modal = document.getElementById('universal-search-modal');
  if (modal) {
    modal.style.animation = 'fadeIn 0.15s ease reverse';
    setTimeout(() => modal.remove(), 150);
  }
  if (window.__closeUniversalSearch) {
    window.__closeUniversalSearch();
    window.__closeUniversalSearch = null;
  }
  isSearchOpen = false;
  currentSearchInput = null;
}

/* ============================================================
   تنفيذ البحث وعرض النتائج
   ============================================================ */
function performSearch(query, resultsDiv) {
  const q = (query || '').trim();

  // إذا كان الحقل فارغاً
  if (q.length === 0) {
    resultsDiv.innerHTML = `
      <div style="text-align:center; padding: 40px 20px; color: var(--text-muted);">
        <div style="font-size: 48px; margin-bottom: 12px;">🔍</div>
        <p style="font-size: 14px;">ابدأ الكتابة للبحث في كل شيء</p>
        <p style="font-size: 12px; margin-top: 8px; opacity: 0.7;">العملاء • الطلبات • الدفعات • المخزون • العمال • الأنواع</p>
      </div>
    `;
    return;
  }

  // إذا كان الاستعلام قصيراً
  if (q.length < 2) {
    resultsDiv.innerHTML = `
      <div style="text-align:center; padding: 40px 20px; color: var(--text-muted);">
        <p style="font-size: 14px;">اكتب حرفين على الأقل للبحث</p>
      </div>
    `;
    return;
  }

  // تنفيذ البحث
  const results = searchAll(q);

  // إذا لا توجد نتائج
  if (results.totalCount === 0) {
    resultsDiv.innerHTML = `
      <div style="text-align:center; padding: 40px 20px; color: var(--text-muted);">
        <div style="font-size: 48px; margin-bottom: 12px;">😔</div>
        <p style="font-size: 14px;">لا توجد نتائج لـ "<strong>${escapeHtml(q)}</strong>"</p>
        <p style="font-size: 12px; margin-top: 8px; opacity: 0.7;">جرب كلمات مختلفة</p>
      </div>
    `;
    return;
  }

  // بناء النتائج
  let html = `
    <div style="padding: 8px 12px; font-size: 12px; color: var(--text-muted); border-bottom: 1px solid var(--border-color); margin-bottom: 8px;">
      ${results.totalCount} نتيجة
    </div>
  `;

  // 1. العملاء
  if (results.customers.length > 0) {
    html += renderSection('👥 العملاء', results.customers, 'customer');
  }

  // 2. الطلبات
  if (results.orders.length > 0) {
    html += renderSection('📋 الطلبات', results.orders, 'order');
  }

  // 3. الدفعات
  if (results.payments.length > 0) {
    html += renderSection('💰 الدفعات', results.payments, 'payment');
  }

  // 4. المخزون
  if (results.inventory.length > 0) {
    html += renderSection('📦 المخزون', results.inventory, 'inventory');
  }

  // 5. العمال
  if (results.workers.length > 0) {
    html += renderSection('👷 العمال', results.workers, 'worker');
  }

  // 6. الأنواع
  if (results.garmentTypes.length > 0) {
    html += renderSection('🧵 أنواع الجلابيات', results.garmentTypes, 'garmentType');
  }

  // 7. المصروفات
  if (results.expenses.length > 0) {
    html += renderSection('💸 المصروفات', results.expenses, 'expense');
  }

  resultsDiv.innerHTML = html;

  // ربط النقر
  resultsDiv.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', () => {
      const type = item.dataset.type;
      navigateToResult(type);
    });
  });
}

/* ============================================================
   عرض قسم من النتائج
   ============================================================ */
function renderSection(title, items, type) {
  return `
    <div style="margin-bottom: 12px;">
      <div style="padding: 6px 12px; font-size: 12px; font-weight: 700; color: var(--text-muted); display: flex; justify-content: space-between;">
        <span>${title}</span>
        <span style="background: var(--bg-color); padding: 2px 8px; border-radius: var(--radius-full);">${items.length}</span>
      </div>
      ${items.slice(0, 5).map(item => `
        <div class="search-result-item" data-id="${item.id}" data-type="${type}">
          <div style="font-size: 20px; width: 32px; text-align: center;">${item.icon}</div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 600; font-size: 14px; color: var(--text-main); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${escapeHtml(item.title)}
              ${item.isVip ? '👑' : ''}
            </div>
            <div style="font-size: 11px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px;">
              ${escapeHtml(item.subtitle)}
              ${item.status ? ` • <span style="color:${item.status.color};">${item.status.label}</span>` : ''}
            </div>
          </div>
          <div style="font-size: 18px; color: var(--text-muted);">→</div>
        </div>
      `).join('')}
      ${items.length > 5 ? `<div style="text-align: center; padding: 6px; font-size: 11px; color: var(--text-muted);">+ ${items.length - 5} نتيجة أخرى</div>` : ''}
    </div>
  `;
}

/* ============================================================
   التنقل إلى النتيجة المحددة
   ============================================================ */
function navigateToResult(type) {
  const routes = {
    customer: '/customers',
    order: '/orders',
    payment: '/payments',
    inventory: '/inventory',
    worker: '/workers',
    garmentType: '/settings',
    expense: '/expenses'
  };

  const route = routes[type] || '/dashboard';
  closeUniversalSearch();

  setTimeout(() => {
    window.location.hash = route;
  }, 200);
}

/* ============================================================
   تنسيق آمن للنص
   ============================================================ */
function escapeHtml(str) {
  if (!str) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(str).replace(/[&<>"']/g, m => map[m]);
}

/* ============================================================
   ربط زر البحث في الشريط العلوي + اختصار Ctrl+K
   ============================================================ */
export function initSearchShortcut() {
  document.addEventListener('keydown', (e) => {
    // Ctrl + K أو Ctrl + /
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === '/')) {
      e.preventDefault();
      openUniversalSearch();
    }
  });
}
