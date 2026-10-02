/* ============================================================
   topbar.js - الشريط العلوي (V2)
   ============================================================ */

import { toggleSidebar } from './sidebar.js';

export function renderTopbar() {
  const topbar = document.createElement('header');
  topbar.className = 'topbar';
  
  topbar.innerHTML = `
    <button id="menu-toggle" class="btn" style="background:none; padding: 8px; font-size: 24px; min-height: auto; cursor:pointer;">
      ☰
    </button>
    <h1 style="font-size: 16px; margin: 0; color: var(--primary-dark);">ورشة تفصيل الجلابيب</h1>
    <div style="width: 40px;"></div> <!-- مسافة فارغة لضمان توسط العنوان -->
  `;

  // إضافة حدث عند النقر على زر القائمة (☰)
  topbar.querySelector('#menu-toggle').addEventListener('click', toggleSidebar);

  return topbar;
}
