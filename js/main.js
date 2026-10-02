/* ============================================================
   main.js - نقطة الدخول الرئيسية الشاملة (V2)
   ============================================================ */

import { APP_CONFIG } from './core/config.js';
import * as db from './core/db.js';
import { events, EVENTS } from './core/events.js';
import { initToast } from './ui/toast.js';
import { initModal } from './ui/modal.js';
import { renderSidebar, closeSidebar } from './ui/sidebar.js';
import { renderTopbar } from './ui/topbar.js';
import { router } from './ui/router.js';
import { loadTheme } from './core/theme.js';
import { initAuth, startIdleTimer } from './core/auth.js';

// استيراد الصفحات
import { renderDashboardPage } from './pages/dashboard.js';
import { renderCustomersPage } from './pages/customers.js';
import { renderOrdersPage } from './pages/orders.js';
import { renderPaymentsPage } from './pages/payments.js';
import { renderExpensesPage } from './pages/expenses.js';
import { renderInventoryPage } from './pages/inventory.js';
import { renderWorkersPage } from './pages/workers.js';
import { renderCommitmentsPage } from './pages/commitments.js';
import { renderHouseExpensesPage } from './pages/house-expenses.js';
import { renderLoansPage } from './pages/loans.js';
import { renderReportsPage } from './pages/reports.js';
import { renderSettingsPage } from './pages/settings.js';

console.log(`🚀 ${APP_CONFIG.name} v${APP_CONFIG.version}`);

/* ============================================================
   الدالة الرئيسية للتهيئة
   ============================================================ */
async function init() {
  try {
    console.log('📦 تحميل البيانات...');
    db.load();

    console.log('🎨 تحميل الألوان...');
    loadTheme();

    console.log('🎨 تهيئة الواجهة...');
    initToast();
    initModal();

    // تهيئة نظام القفل
    console.log('🔒 تهيئة نظام القفل...');
    const isUnlocked = initAuth();

    if (!isUnlocked) {
      console.log('🔒 التطبيق مقفل. في انتظار الـ PIN...');
      events.on('auth:unlocked', () => {
        console.log('🔓 تم فتح القفل. بدء التطبيق...');
        startApp();
      });
      return;
    }

    startApp();
  } catch (e) {
    console.error('❌ فشل التهيئة:', e);
    showError(e);
  }
}

/* ============================================================
   بدء التطبيق
   ============================================================ */
function startApp() {
  renderAppLayout();

  // تسجيل جميع الصفحات في الراوتر
  router.register('/dashboard', renderDashboardPage);
  router.register('/customers', renderCustomersPage);
  router.register('/orders', renderOrdersPage);
  router.register('/payments', renderPaymentsPage);
  router.register('/expenses', renderExpensesPage);
  router.register('/inventory', renderInventoryPage);
  router.register('/workers', renderWorkersPage);
  router.register('/commitments', renderCommitmentsPage);
  router.register('/house-expenses', renderHouseExpensesPage);
  router.register('/loans', renderLoansPage);
  router.register('/reports', renderReportsPage);
  router.register('/settings', renderSettingsPage);

  // تشغيل الراوتر
  router.init('.main-content');

  // بدء مؤقت القفل التلقائي
  startIdleTimer();

  // إغلاق القائمة الجانبية عند تغيير الصفحة (للجوال)
  events.on(EVENTS.PAGE_CHANGED, () => {
    closeSidebar();
  });

  console.log('✅ التطبيق جاهز');
}

/* ============================================================
   بناء الهيكل الأساسي للتطبيق
   ============================================================ */
function renderAppLayout() {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = '';

  const appContainer = document.createElement('div');
  appContainer.className = 'app-container';

  const sidebar = renderSidebar();
  appContainer.appendChild(sidebar);

  const mainWrapper = document.createElement('div');
  mainWrapper.className = 'main-wrapper';

  const topbar = renderTopbar();
  mainWrapper.appendChild(topbar);

  const mainContent = document.createElement('main');
  mainContent.className = 'main-content';
  mainWrapper.appendChild(mainContent);

  appContainer.appendChild(mainWrapper);
  app.appendChild(appContainer);
}

/* ============================================================
   معالجة الأخطاء
   ============================================================ */
function showError(e) {
  document.body.innerHTML = `
    <div style="padding:40px;text-align:center;font-family:sans-serif;">
      <h1>⚠️ خطأ في التهيئة</h1>
      <p>${e.message}</p>
      <button onclick="location.reload()">إعادة التحميل</button>
    </div>
  `;
}

/* ============================================================
   بدء التطبيق عند تحميل الصفحة
   ============================================================ */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

window.__app = { version: APP_CONFIG.version, db, events, EVENTS };
