/* ============================================================
   quick-actions.js - زر الإجراءات السريعة (FAB) (V2)
   (زر عائم يفتح قائمة بالإجراءات الأكثر استخداماً)
   ============================================================ */

import { router } from './router.js';
import { toast } from './toast.js';

let isOpen = false;
let fabElement = null;

/* ============================================================
   الإجراءات المتاحة
   ============================================================ */
const ACTIONS = [
  {
    id: 'new-order',
    label: 'طلب جديد',
    icon: '🧵',
    color: '#1F6D57',
    route: '/orders',
    hint: 'إضافة طلب جديد'
  },
  {
    id: 'new-customer',
    label: 'عميل جديد',
    icon: '👤',
    color: '#1565C0',
    route: '/customers',
    hint: 'إضافة عميل جديد'
  },
  {
    id: 'new-payment',
    label: 'دفعة جديدة',
    icon: '💰',
    color: '#F57C00',
    route: '/payments',
    hint: 'تسجيل دفعة'
  },
  {
    id: 'new-expense',
    label: 'مصروف',
    icon: '💸',
    color: '#C62828',
    route: '/expenses',
    hint: 'تسجيل مصروف'
  },
  {
    id: 'search',
    label: 'بحث شامل',
    icon: '🔍',
    color: '#6A1B9A',
    action: 'search',
    hint: 'البحث في كل البيانات'
  }
];

/* ============================================================
   إنشاء الزر العائم
   ============================================================ */
export function renderQuickActions() {
  if (fabElement) return fabElement;

  fabElement = document.createElement('div');
  fabElement.id = 'quick-actions-fab';
  fabElement.innerHTML = `
    <div id="fab-menu" style="
      position: fixed;
      bottom: 90px;
      left: 20px;
      display: flex;
      flex-direction: column-reverse;
      gap: 12px;
      z-index: 999;
      pointer-events: none;
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.25s ease, transform 0.25s ease;
    ">
      ${ACTIONS.map(a => `
        <button class="fab-action-btn" data-action="${a.id}" style="
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px 10px 12px;
          background: white;
          border: none;
          border-radius: 30px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          cursor: pointer;
          font-family: inherit;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-main);
          white-space: nowrap;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        ">
          <span style="
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: ${a.color};
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            flex-shrink: 0;
          ">${a.icon}</span>
          <span>${a.label}</span>
        </button>
      `).join('')}
    </div>

    <button id="fab-main-btn" aria-label="الإجراءات السريعة" style="
      position: fixed;
      bottom: 20px;
      left: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      border: none;
      background: linear-gradient(135deg, #B8863B, #8F6626);
      color: white;
      font-size: 28px;
      font-weight: 300;
      box-shadow: 0 6px 20px rgba(184,134,59,0.5);
      cursor: pointer;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    ">+</button>
  `;

  document.body.appendChild(fabElement);

  // ربط الأحداث
  const mainBtn = document.getElementById('fab-main-btn');
  const menu = document.getElementById('fab-menu');

  mainBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFab();
  });

  // اختيار إجراء
  fabElement.querySelectorAll('.fab-action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const actionId = btn.dataset.action;
      handleAction(actionId);
    });
  });

  // إغلاق عند النقر خارجها
  document.addEventListener('click', (e) => {
    if (isOpen && !fabElement.contains(e.target)) {
      closeFab();
    }
  });

  // إغلاق عند التنقل
  window.addEventListener('hashchange', () => {
    if (isOpen) closeFab();
  });

  return fabElement;
}

/* ============================================================
   فتح/إغلاق القائمة
   ============================================================ */
function toggleFab() {
  if (isOpen) closeFab();
  else openFab();
}

function openFab() {
  const menu = document.getElementById('fab-menu');
  const mainBtn = document.getElementById('fab-main-btn');
  if (!menu || !mainBtn) return;

  isOpen = true;
  menu.style.pointerEvents = 'auto';
  menu.style.opacity = '1';
  menu.style.transform = 'translateY(0)';
  mainBtn.style.transform = 'rotate(45deg)';
  mainBtn.style.background = 'linear-gradient(135deg, #C62828, #8E0000)';
  mainBtn.style.boxShadow = '0 6px 20px rgba(198,40,40,0.5)';
}

function closeFab() {
  const menu = document.getElementById('fab-menu');
  const mainBtn = document.getElementById('fab-main-btn');
  if (!menu || !mainBtn) return;

  isOpen = false;
  menu.style.pointerEvents = 'none';
  menu.style.opacity = '0';
  menu.style.transform = 'translateY(20px)';
  mainBtn.style.transform = 'rotate(0deg)';
  mainBtn.style.background = 'linear-gradient(135deg, #B8863B, #8F6626)';
  mainBtn.style.boxShadow = '0 6px 20px rgba(184,134,59,0.5)';
}

/* ============================================================
   معالجة الإجراء المختار
   ============================================================ */
function handleAction(actionId) {
  const action = ACTIONS.find(a => a.id === actionId);
  if (!action) return;

  closeFab();

  // إذا كان إجراءً خاصاً (مثل البحث)
  if (action.action === 'search') {
    setTimeout(async () => {
      const { openUniversalSearch } = await import('./universal-search.js');
      openUniversalSearch();
    }, 300);
    return;
  }

  // إجراء التنقل + إخبار الصفحة بفتح النموذج
  const currentRoute = window.location.hash.slice(1) || '/dashboard';

  if (currentRoute === action.route) {
    // نحن في نفس الصفحة → نُطلق حدث لفتح النموذج مباشرة
    setTimeout(() => {
      document.dispatchEvent(new CustomEvent('quick-action', {
        detail: { action: actionId }
      }));
    }, 200);
  } else {
    // ننتقل إلى الصفحة ثم نُطلق الحدث
    window.location.hash = action.route;
    setTimeout(() => {
      document.dispatchEvent(new CustomEvent('quick-action', {
        detail: { action: actionId }
      }));
    }, 500);
  }

  if (action.hint) {
    toast.info(action.hint);
  }
}

/* ============================================================
   إظهار/إخفاء الـ FAB
   ============================================================ */
export function showFab() {
  const fab = document.getElementById('fab-main-btn');
  if (fab) fab.style.display = 'flex';
}

export function hideFab() {
  const fab = document.getElementById('fab-main-btn');
  if (fab) fab.style.display = 'none';
  if (isOpen) closeFab();
              }
