/* ============================================================
   main.js - نقطة الدخول الرئيسية (V2)
   (النسخة النهائية المُصلحة)
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
import { initActivityLogger } from './core/activity-log.js';
import { cleanOldTrashItems } from './core/trash.js';
import { showDueOrdersNotification } from './core/notifications.js';
import { initSearchShortcut } from './ui/universal-search.js';
import { initSync, syncNow } from './core/sync.js';
import { isSignedIn, waitForAuthReady } from './core/cloud-auth.js';

// استيراد الصفحات - العمليات
import { renderDashboardPage } from './pages/dashboard.js';
import { renderCustomersPage } from './pages/customers.js';
import { renderOrdersPage } from './pages/orders.js';
import { renderCalendarPage } from './pages/calendar.js';
import { renderPaymentsPage } from './pages/payments.js';

// استيراد الصفحات - إدارة الورشة
import { renderInventoryPage } from './pages/inventory.js';
import { renderWorkersPage } from './pages/workers.js';
import { renderExpensesPage } from './pages/expenses.js';
import { renderPricingCalculatorPage } from './pages/pricing-calculator.js';

// استيراد الصفحات - التسويق والعرض
import { renderPortfolioPage } from './pages/portfolio.js';
import { renderReferralsPage } from './pages/referrals.js';

// استيراد الصفحات - المالية الشخصية
import { renderCommitmentsPage } from './pages/commitments.js';
import { renderHouseExpensesPage } from './pages/house-expenses.js';
import { renderLoansPage } from './pages/loans.js';

// استيراد الصفحات - النظام
import { renderActivityLogPage } from './pages/activity-log.js';
import { renderTrashPage } from './pages/trash.js';

// استيراد الصفحات - التحليل والإعدادات
import { renderFinancialCenterPage } from './pages/financial-center.js';
import { renderKpisPage } from './pages/kpis.js';
import { renderReportsPage } from './pages/reports.js';
import { renderCloudSyncPage } from './pages/cloud-sync.js';
import { renderSettingsPage } from './pages/settings.js';

console.log(`🚀 ${APP_CONFIG.name} v${APP_CONFIG.version}`);

/* ============================================================
   الدالة الرئيسية للتهيئة
   ============================================================ */
async function init() {
  try {
    console.log('📦 تحميل البيانات...');
    db.load();

    console.log('📜 تفعيل سجل النشاط التلقائي...');
    initActivityLogger();

    console.log('🧹 تنظيف سلة المحذوفات...');
    const removedCount = cleanOldTrashItems();
    if (removedCount > 0) {
      console.log(`   تم حذف ${removedCount} عنصر قديم`);
    }

    console.log('🎨 تحميل الألوان وأوضاع العرض...');
    loadTheme();

    console.log('🎨 تهيئة الواجهة...');
    initToast();
    initModal();

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

  // ============================================================
  // تسجيل جميع الصفحات في الراوتر
  // ============================================================

  // العمليات
  router.register('/dashboard', renderDashboardPage);
  router.register('/customers', renderCustomersPage);
  router.register('/orders', renderOrdersPage);
  router.register('/calendar', renderCalendarPage);
  router.register('/payments', renderPaymentsPage);

  // إدارة الورشة
  router.register('/inventory', renderInventoryPage);
  router.register('/workers', renderWorkersPage);
  router.register('/expenses', renderExpensesPage);
  router.register('/pricing-calculator', renderPricingCalculatorPage);

  // التسويق والعرض
  router.register('/portfolio', renderPortfolioPage);
  router.register('/referrals', renderReferralsPage);

  // المالية الشخصية
  router.register('/commitments', renderCommitmentsPage);
  router.register('/house-expenses', renderHouseExpensesPage);
  router.register('/loans', renderLoansPage);

  // النظام
  router.register('/activity-log', renderActivityLogPage);
  router.register('/trash', renderTrashPage);

  // التحليل والتقارير
  router.register('/financial-center', renderFinancialCenterPage);
  router.register('/kpis', renderKpisPage);
  router.register('/reports', renderReportsPage);
  router.register('/cloud-sync', renderCloudSyncPage);
  router.register('/settings', renderSettingsPage);

  // تشغيل الراوتر
  router.init('.main-content');

  // تفعيل اختصار البحث Ctrl+K
  initSearchShortcut();

  // بدء مؤقت القفل التلقائي
  startIdleTimer();

  // إغلاق القائمة الجانبية عند تغيير الصفحة (للجوال)
  events.on(EVENTS.PAGE_CHANGED, () => {
    closeSidebar();
  });

  console.log('✅ التطبيق جاهز');

  // عرض إشعارات المواعيد بعد ثانية
  setTimeout(() => {
    showDueOrdersNotification();
  }, 1000);

  // ✅ إصلاح: تفعيل المزامنة بعد التأكد من جاهزية Firebase
  setupCloudSync();
}

/* ============================================================
   ✅ إصلاح: إعداد المزامنة السحابية (بشكل موثوق)
   ============================================================ */
function setupCloudSync() {
  // 1. حالة المستخدم مسجل دخول بالفعل
  if (isSignedIn()) {
    console.log('☁️ المستخدم مسجّل دخول، بدء المزامنة...');
    initSync().then(ready => {
      if (ready) setTimeout(() => syncNow(), 1500);
    }).catch(e => console.warn('⚠️ فشل المزامنة:', e));
  }

  // 2. الاستماع لتسجيل الدخول لاحقاً
  events.on('cloud:auth:signin', () => {
    console.log('🔓 تم تسجيل الدخول، بدء المزامنة...');
    initSync().then(ready => {
      if (ready) setTimeout(() => syncNow(), 1500);
    }).catch(e => console.warn('⚠️ فشل المزامنة:', e));
  });
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

/* ============================================================
   محاولة مزامنة أخيرة عند إغلاق الصفحة
   ============================================================ */
window.addEventListener('beforeunload', () => {
  try {
    if (navigator.onLine && isSignedIn()) syncNow();
  } catch (e) { /* ignore */ }
});

/* ============================================================
   تسجيل Service Worker (PWA)
   ============================================================ */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js', { scope: './' })
      .then((registration) => {
        console.log('✅ [PWA] Service Worker registered:', registration.scope);
      })
      .catch((error) => {
        console.warn('⚠️ [PWA] Service Worker registration failed:', error);
      });
  });
}

window.__app = { version: APP_CONFIG.version, db, events, EVENTS };
