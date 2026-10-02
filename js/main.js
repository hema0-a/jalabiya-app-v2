/* ============================================================
   main.js - نقطة الدخول الرئيسية (V2)
   ============================================================ */

import { renderOrdersPage } from './pages/orders.js';
import { APP_CONFIG } from './core/config.js';
import * as db from './core/db.js';
import { events, EVENTS } from './core/events.js';
import { initToast } from './ui/toast.js';
import { initModal } from './ui/modal.js';
import { renderSidebar } from './ui/sidebar.js';
import { renderTopbar } from './ui/topbar.js';
import { router } from './ui/router.js';
import { renderCustomersPage } from './pages/customers.js';

console.log(`🚀 ${APP_CONFIG.name} v${APP_CONFIG.version}`);

async function init() {
  try {
    console.log('📦 تحميل البيانات...');
    db.load();

    console.log('🎨 تهيئة الواجهة...');
    initToast();
    initModal();
    
    renderAppLayout();
    
    // تسجيل الصفحات في الراوتر (سنضيف المزيد لاحقاً)
    router.register('/dashboard', renderDashboardPage);
     router.register('/customers', renderCustomersPage);
     router.register('/orders', renderOrdersPage);
    router.register('/404', render404Page);

    // تشغيل الراوتر ليبدأ عرض الصفحات
    router.init('.main-content');

    console.log('✅ التطبيق جاهز');
  } catch (e) {
    console.error('❌ فشل التهيئة:', e);
    showError(e);
  }
}

/* بناء الهيكل الأساسي للتطبيق (Sidebar + Topbar + Main Content) */
function renderAppLayout() {
  const app = document.getElementById('app');
  if (!app) return;
  
  app.innerHTML = ''; // مسح شاشة التحميل الأولية

  const appContainer = document.createElement('div');
  appContainer.className = 'app-container';
  
  // 1. إضافة القائمة الجانبية
  const sidebar = renderSidebar();
  appContainer.appendChild(sidebar);

  // 2. إعداد الحاوية اليمنى (الشريط العلوي + المحتوى)
  const mainWrapper = document.createElement('div');
  mainWrapper.className = 'main-wrapper';
  
  const topbar = renderTopbar();
  mainWrapper.appendChild(topbar);

  // 3. حاوية عرض الصفحات (سيتعامل معها الراوتر)
  const mainContent = document.createElement('main');
  mainContent.className = 'main-content';
  mainWrapper.appendChild(mainContent);

  appContainer.appendChild(mainWrapper);
  app.appendChild(appContainer);
}

/* صفحة رئيسية تجريبية للاختبار */
function renderDashboardPage(container) {
  const state = db.getState();
  container.innerHTML = `
    <div class="card">
      <h2 class="card-title">مرحباً بك في النسخة V2.0</h2>
      <p>هذه هي الصفحة الرئيسية (لوحة التحكم).</p>
      <div style="display: flex; gap: 10px; margin-top: 20px;">
        <div class="card" style="flex:1; text-align:center; margin-bottom:0;">
          <div style="font-size:28px; font-weight:800; color:var(--primary-color);">${state.customers.length}</div>
          <div style="font-size:12px; color:var(--text-muted);">عميل</div>
        </div>
        <div class="card" style="flex:1; text-align:center; margin-bottom:0;">
          <div style="font-size:28px; font-weight:800; color:var(--primary-color);">${state.orders.length}</div>
          <div style="font-size:12px; color:var(--text-muted);">طلب</div>
        </div>
        <div class="card" style="flex:1; text-align:center; margin-bottom:0;">
          <div style="font-size:28px; font-weight:800; color:var(--primary-color);">${state.payments.length}</div>
          <div style="font-size:12px; color:var(--text-muted);">دفعة</div>
        </div>
      </div>
    </div>
  `;
}

/* صفحة 404 */
function render404Page(container) {
  container.innerHTML = `
    <div class="card text-center">
      <h2>⚠️ 404</h2>
      <p>الصفحة غير موجودة.</p>
      <a href="#/dashboard" class="btn btn-primary mt-2">العودة للرئيسية</a>
    </div>
  `;
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
