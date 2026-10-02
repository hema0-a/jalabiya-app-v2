/* ============================================================
   sidebar.js - القائمة الجانبية للتنقل (V2)
   ============================================================ */

import { router } from './router.js';
import { events, EVENTS } from '../core/events.js';

export function renderSidebar() {
  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  sidebar.id = 'sidebar';
  
  const menuItems = [
    { path: '/dashboard', label: 'الرئيسية', icon: '🏠' },
    { path: '/customers', label: 'العملاء', icon: '👥' },
    { path: '/orders', label: 'الطلبات', icon: '📋' },
    { path: '/payments', label: 'الدفعات', icon: '💰' },
    { path: '/expenses', label: 'المصروفات', icon: '💸' },
    { path: '/settings', label: 'الإعدادات', icon: '⚙️' }
  ];

  sidebar.innerHTML = `
    <div class="sidebar-header" style="padding: 20px; border-bottom: 1px solid var(--border-color);">
      <h2 style="margin: 0; font-size: 18px;">ورشة الجلابيب</h2>
    </div>
    <nav class="sidebar-nav">
      ${menuItems.map(item => `
        <a href="#${item.path}" class="sidebar-item" data-path="${item.path}">
          <span class="icon" style="margin-left: 10px;">${item.icon}</span>
          <span class="label">${item.label}</span>
        </a>
      `).join('')}
    </nav>
  `;

  // إضافة تفاعل عند النقر على عنصر في القائمة
  sidebar.querySelectorAll('.sidebar-item').forEach(item => {
    item.addEventListener('click', () => {
      // إغلاق القائمة تلقائياً على شاشات الجوال
      if (window.innerWidth <= 768) {
        sidebar.classList.remove('open');
      }
    });
  });

  // تحديث العنصر النشط عند تغيير الصفحة
  events.on(EVENTS.PAGE_CHANGED, (data) => {
    sidebar.querySelectorAll('.sidebar-item').forEach(item => {
      if (item.dataset.path === data.route) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  });

  return sidebar;
}

/* دالة لفتح وإغلاق القائمة من الشريط العلوي */
export function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.classList.toggle('open');
  }
}
