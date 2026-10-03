/* ============================================================
   sidebar.js - القائمة الجانبية للتنقل (V2)
   (النسخة الكاملة مع المواسم)
   ============================================================ */

import { router } from './router.js';
import { events, EVENTS } from '../core/events.js';

export function renderSidebar() {
  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  sidebar.id = 'sidebar';

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
        { path: '/calendar', label: 'تقويم المواعيد', icon: '📅' },
        { path: '/payments', label: 'الدفعات', icon: '💰' }
      ]
    },
    {
      title: 'إدارة الورشة',
      items: [
        { path: '/inventory', label: 'المخزون', icon: '📦' },
        { path: '/workers', label: 'العمال', icon: '👷' },
        { path: '/expenses', label: 'مصروفات الورشة', icon: '💸' },
        { path: '/pricing-calculator', label: 'حاسبة التسعير', icon: '🧮' }
      ]
    },
    {
      title: 'التسويق والعرض',
      items: [
        { path: '/portfolio', label: 'معرض الأعمال', icon: '📸' },
        { path: '/referrals', label: 'الإحالات', icon: '🤝' }
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
      title: 'المواسم والمناسبات',
      items: [
        { path: '/occasions', label: 'المواسم والأعياد', icon: '🎉' }
      ]
    },
    {
      title: 'النظام',
      items: [
        { path: '/activity-log', label: 'سجل النشاط', icon: '📜' },
        { path: '/trash', label: 'سلة المحذوفات', icon: '🗑️' }
      ]
    },
    {
      title: 'التحليل والتقارير',
      items: [
        { path: '/financial-center', label: 'المركز المالي', icon: '💰' },
        { path: '/kpis', label: 'مؤشرات الأداء', icon: '📊' },
        { path: '/reports', label: 'التقارير', icon: '📈' }
      ]
    },
    {
      title: 'النظام المتقدم',
      items: [
        { path: '/cloud-sync', label: 'المزامنة السحابية', icon: '☁️' },
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
        <div style="padding: 6px 0;">
          <div style="font-size: 11px; color: var(--text-muted); font-weight: 700; padding: 4px 16px; text-transform: uppercase; letter-spacing: 0.5px;">
            ${section.title}
          </div>
          ${section.items.map(item => `
            <a href="#${item.path}" class="sidebar-item" data-path="${item.path}">
              <span class="icon">${item.icon}</span>
              <span class="label">${item.label}</span>
              ${item.path === '/trash' ? `<span id="trash-count-badge" style="background: #dc3545; color: white; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: var(--radius-full); margin-right: auto;"></span>` : ''}
              ${item.path === '/occasions' ? `<span id="occasions-count-badge" style="background: #F57C00; color: white; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: var(--radius-full); margin-right: auto;"></span>` : ''}
            </a>
          `).join('')}
        </div>
      `).join('')}
    </nav>
  `;

  // إضافة تفاعل عند النقر
  sidebar.querySelectorAll('.sidebar-item').forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        closeSidebar();
      }
    });
  });

  // تحديث العنصر النشط
  events.on(EVENTS.PAGE_CHANGED, (data) => {
    sidebar.querySelectorAll('.sidebar-item').forEach(item => {
      if (item.dataset.path === data.route) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
    updateBadges();
  });

  // تحديث الشارات عند التغييرات
  events.on('trash:restored', updateBadges);
  events.on('trash:emptied', updateBadges);
  events.on('trash:permanentlyDeleted', updateBadges);
  events.on('occasion:added', updateBadges);
  events.on('occasion:updated', updateBadges);
  events.on('occasion:deleted', updateBadges);

  setTimeout(updateBadges, 100);

  function updateBadges() {
    // شارة سلة المحذوفات
    const trashBadge = document.getElementById('trash-count-badge');
    if (trashBadge) {
      import('../core/trash.js').then(module => {
        const count = module.getTrashCount();
        trashBadge.textContent = count > 0 ? count : '';
      }).catch(() => {});
    }

    // شارة المواسم
    const occBadge = document.getElementById('occasions-count-badge');
    if (occBadge) {
      import('../core/occasions.js').then(module => {
        const stats = module.getOccasionsStats();
        occBadge.textContent = stats.alertCount > 0 ? stats.alertCount : '';
      }).catch(() => {});
    }
  }

  return sidebar;
}

/* فتح/إغلاق القائمة */
export function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  if (sidebar.classList.contains('open')) {
    closeSidebar();
  } else {
    openSidebar();
  }
}

export function openSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  sidebar.classList.add('open');

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

export function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  sidebar.classList.remove('open');

  const backdrop = document.getElementById('sidebar-backdrop');
  if (backdrop) {
    backdrop.classList.remove('open');
    setTimeout(() => {
      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
    }, 300);
  }
}
