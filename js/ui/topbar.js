/* ============================================================
   topbar.js - الشريط العلوي (V2)
   (الشعار + اسم الورشة + زر البحث + زر الوضع الليلي)
   ============================================================ */

import { toggleSidebar } from './sidebar.js';
import { toggleDarkMode, isDarkMode } from '../core/theme.js';
import { openUniversalSearch } from './universal-search.js';
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
    <button id="menu-toggle" class="menu-toggle" aria-label="القائمة">☰</button>

    <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; justify-content: center;">
      ${workshopLogo ? `<img src="${workshopLogo}" alt="الشعار" class="topbar-logo">` : ''}
      <h1 style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${workshopName}</h1>
    </div>

    <button id="search-toggle" class="menu-toggle" aria-label="بحث" title="بحث شامل (Ctrl+K)" style="position: relative;">
      🔍
      <span style="position: absolute; top: 4px; right: 4px; background: var(--accent-color); color: white; font-size: 8px; padding: 1px 4px; border-radius: 4px; font-weight: 700; display: none;" class="kbd-hint">K</span>
    </button>

    <button id="dark-mode-toggle" class="menu-toggle" aria-label="الوضع الليلي" title="الوضع الليلي">
      ${darkModeEnabled ? '☀️' : '🌙'}
    </button>
  `;

  // زر فتح القائمة
  topbar.querySelector('#menu-toggle').addEventListener('click', toggleSidebar);

  // زر البحث الشامل
  topbar.querySelector('#search-toggle').addEventListener('click', () => {
    openUniversalSearch();
  });

  // زر الوضع الليلي
  const darkBtn = topbar.querySelector('#dark-mode-toggle');
  darkBtn.addEventListener('click', () => {
    const newState = toggleDarkMode();
    darkBtn.textContent = newState ? '☀️' : '🌙';
  });

  return topbar;
}
