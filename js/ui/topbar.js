/* ============================================================
   topbar.js - الشريط العلوي (V2)
   (يعرض الشعار + اسم الورشة + زر الوضع الليلي)
   ============================================================ */

import { toggleSidebar } from './sidebar.js';
import { toggleDarkMode, isDarkMode } from '../core/theme.js';
import { DEFAULT_SETTINGS } from '../core/config.js';
import * as storage from '../core/storage.js';

export function renderTopbar() {
  const settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  const workshopName = settings.workshopName || DEFAULT_SETTINGS.workshopName;
  const workshopLogo = settings.workshopLogo || null;
  const darkModeEnabled = settings.darkMode || false;

  const topbar = document.createElement('header');
  topbar.className = 'topbar';
  
  topbar.innerHTML = `
    <button id="menu-toggle" class="menu-toggle" aria-label="القائمة">
      ☰
    </button>
    <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; justify-content: center;">
      ${workshopLogo ? `<img src="${workshopLogo}" alt="الشعار" class="topbar-logo">` : ''}
      <h1>${workshopName}</h1>
    </div>
    <button id="dark-mode-toggle" class="menu-toggle" aria-label="الوضع الليلي" title="الوضع الليلي">
      ${darkModeEnabled ? '☀️' : '🌙'}
    </button>
  `;

  // زر فتح/إغلاق القائمة
  topbar.querySelector('#menu-toggle').addEventListener('click', toggleSidebar);

  // زر الوضع الليلي
  const darkBtn = topbar.querySelector('#dark-mode-toggle');
  darkBtn.addEventListener('click', () => {
    const newState = toggleDarkMode();
    darkBtn.textContent = newState ? '☀️' : '🌙';
  });

  return topbar;
}
