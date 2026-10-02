/* ============================================================
   main.js - نقطة الدخول الرئيسية (V2)
   ============================================================ */

import { APP_CONFIG } from './core/config.js';
import * as db from './core/db.js';
import { events, EVENTS } from './core/events.js';
import { initToast } from './ui/toast.js';
import { initModal } from './ui/modal.js';
import { renderSidebar } from './ui/sidebar.js';
import { renderTopbar } from './ui/topbar.js';
import { router } from './ui/router.js';

// استيراد الصفحات
import { renderDashboardPage } from './pages/dashboard.js';
import { renderCustomersPage } from './pages/customers.js';
import { renderOrdersPage } from './pages/orders.js';
import { renderPaymentsPage } from './pages/payments.js';

console.log(`🚀 ${APP_CONFIG.name} v${APP_CONFIG.version}`);

async function init() {
  try {
    console.log('📦 تحميل البيانات...');
    db.load();

    console.log('🎨 تهيئة الواجهة...');
    initToast();
    initModal();
    
    renderAppLayout();
    
    // تسجيل الصفحات في الراوتر
    router.register('/dashboard', renderDashboardPage);
    router.register('/customers', renderCustomersPage);
    router.register('/orders', renderOrdersPage);
    router.register('/payments', renderPaymentsPage);

    // تشغيل الراوتر
    router.init('.main-content');

    console.log('✅ التطبيق جاهز');
  } catch (e) {
    console.error('❌ فشل التهيئة:', e);
    showError(e);
  }
}

/* بناء الهيكل الأساسي للتطبيق */
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

function showError(e) {
  document.body.innerHTML = `
    <div style="padding:40px;text-align:center;font-family:sans-serif;">
      <h1>⚠️ خطأ في التهيئة</h1>
      <p>${e.message}</p>
      <button onclick="location.reload()">إعادة التحميل</button>
    </div>
  `;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

window.__app = { version: APP_CONFIG.version, db, events, EVENTS };
