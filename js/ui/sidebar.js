/* ============================================================
   sidebar.js - القائمة الجانبية للتنقل (V2)
   ============================================================ */

import { router } from './router.js';
import { events, EVENTS } from '../core/events.js';

export function renderSidebar() {
  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  sidebar.id = 'sidebar';
  
  // أقسام القائمة
  const menuSections = [
    {
      title: 'الرئيسية',
      items: [
        { path: '/dashboard', label: 'لوحة التحكم', icon: '🏠' }
      ]
    },
    {
      title: 'العمليات',
      items: [
        { path: '/customers', label: 'العملاء', icon: '👥' },
        { path: '/orders', label: 'الطلبات', icon: '📋' },
        { path: '/payments', label: 'الدفعات', icon: '💰' }
      ]
    },
    {
      title: 'إدارة الورشة',
      items: [
        { path: '/inventory', label: 'المخزون', icon: '📦' },
        { path: '/workers', label: 'العمال', icon: '👷' },
        { path: '/expenses', label: 'مصروفات الورشة', icon: '💸' }
      ]
    },
    {
      title: 'المالية الشخصية',
      items: [
        { path: '/commitments', label: 'الالتزامات', icon: '💳' },
        { path: '/house-expenses', label: 'مصاريف البيت', icon: '🏠' },
        { path: '/loans', label: 'القروض', icon: '💵' }
      ]
    },
    {
      title: 'التقارير والإعدادات',
      items: [
        { path: '/reports', label: 'التقارير', icon: '📊' },
        { path: '/settings', label: 'الإعدادات', icon: '⚙️' }
      ]
    }
  ];

  sidebar.innerHTML = `
    <div class="sidebar-header">
      <h2>🧵 ورشة الجلابيب</h2>
    </div>
    <nav class="sidebar-nav">
      ${menuSections.map(section => `
        <div style="padding: 8px 0;">
          <div style="font-size: 11px; color: var(--text-muted); font-weight: 700; padding: 4px 16px; text-transform: uppercase; letter-spacing: 0.5px;">
            ${section.title}
          </div>
          ${section.items.map(item => `
            <a href="#${item.path}" class="sidebar-item" data-path="${item.path}">
              <span class="icon">${item.icon}</span>
              <span class="label">${item.label}</span>
            </a>
          `).join('')}
        </div>
      `).join('')}
    </nav>
  `;

  // إضافة تفاعل عند النقر على عنصر في القائمة
  sidebar.querySelectorAll('.sidebar-item').forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        closeSidebar();
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
  if (!sidebar) return;
  
  if (sidebar.classList.contains('open')) {
    closeSidebar();
  } else {
    openSidebar();
  }
}

/* فتح القائمة الجانبية */
export function openSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  
  sidebar.classList.add('open');
  
  // إضافة طبقة معتمة خلف القائمة
  let backdrop = document.getElementById('sidebar-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'sidebar-backdrop';
    backdrop.className = 'sidebar-backdrop';
    backdrop.addEventListener('click', closeSidebar);
    document.body.appendChild(backdrop);
  }
  setTimeout(() => backdrop.classList.add('open'), 10);
}

/* إغلاق القائمة الجانبية */
export function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  
  sidebar.classList.remove('open');
  
  // إزالة الطبقة المعتمة
  const backdrop = document.getElementById('sidebar-backdrop');
  if (backdrop) {
    backdrop.classList.remove('open');
    setTimeout(() => {
      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
    }, 300);
  }
}
