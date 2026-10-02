/* ============================================================
   main.js - نقطة الدخول (V2)
   ============================================================ */

import { APP_CONFIG } from './core/config.js';
import * as db from './core/db.js';
import { events, EVENTS } from './core/events.js';

console.log(`🚀 ${APP_CONFIG.name} v${APP_CONFIG.version}`);

async function init() {
  try {
    console.log('📦 تحميل البيانات...');
    db.load();
    
    console.log('🎨 تهيئة الواجهة...');
    renderApp();
    
    console.log('✅ التطبيق جاهز');
  } catch (e) {
    console.error('❌ فشل التهيئة:', e);
    showError(e);
  }
}

function renderApp() {
  const app = document.getElementById('app');
  if (!app) return;
  
  const state = db.getState();
  
  app.innerHTML = `
    <header class="v2-header">
      <h1>${APP_CONFIG.name}</h1>
      <p>النسخة ${APP_CONFIG.version}</p>
    </header>
    
    <main class="v2-main">
      <div class="v2-status">
        <div class="v2-stat">
          <div class="num">${state.customers.length}</div>
          <div class="lbl">عميل</div>
        </div>
        <div class="v2-stat">
          <div class="num">${state.orders.length}</div>
          <div class="lbl">طلب</div>
        </div>
        <div class="v2-stat">
          <div class="num">${state.payments.length}</div>
          <div class="lbl">دفعة</div>
        </div>
      </div>
      
      <div class="v2-info">
        <h2>🎉 V2.0 قيد الإنشاء</h2>
        <p>هذه هي المرحلة الأولى (الأساس).</p>
        <p>المرحلة القادمة: الواجهة الكاملة.</p>
      </div>
    </main>
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

window.__app = {
  version: APP_CONFIG.version,
  db,
  events,
  EVENTS,
};
