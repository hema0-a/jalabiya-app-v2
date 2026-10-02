/* ============================================================
   activity-log.js - صفحة سجل النشاط (V2)
   ============================================================ */

import { toast } from '../ui/toast.js';
import { openModal, closeModal } from '../ui/modal.js';
import {
  getActivities,
  filterActivities,
  clearActivityLog,
  getActivityInfo,
  deleteActivity
} from '../core/activity-log.js';
import { ACTIVITY_TYPES } from '../core/config.js';

let searchQuery = '';
let selectedType = 'all';

export function renderActivityLogPage(container) {
  const activities = filterActivities({ type: selectedType, searchQuery });
  const totalActivities = getActivities().length;
  const todayActivities = getActivities().filter(a => {
    const d = new Date(a.timestamp);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  let html = `
    <div class="card">
      <div class="flex-between mb-2">
        <h2 class="card-title no-border" style="margin:0;">📜 سجل النشاط</h2>
        <button class="btn btn-danger" id="clear-log-btn" style="font-size: 12px; padding: 6px 12px; min-height: 36px;">🗑️ مسح</button>
      </div>

      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 16px;">
        <div class="stat-card" style="padding: 10px 6px;">
          <div class="stat-value" style="font-size: 20px;">${totalActivities}</div>
          <div class="stat-label">إجمالي الأحداث</div>
        </div>
        <div class="stat-card" style="padding: 10px 6px;">
          <div class="stat-value" style="font-size: 20px; color: var(--primary-color);">${todayActivities}</div>
          <div class="stat-label">أحداث اليوم</div>
        </div>
      </div>

      <div class="form-group" style="margin-bottom: 10px;">
        <input type="text" id="search-activity-input" class="form-control" placeholder="🔍 ابحث في السجل..." value="${searchQuery}">
      </div>

      <div class="form-group" style="margin-bottom: 12px;">
        <select id="activity-type-filter" class="form-control">
          <option value="all" ${selectedType === 'all' ? 'selected' : ''}>جميع الأنواع</option>
          <option value="${ACTIVITY_TYPES.CUSTOMER_ADDED.id}" ${selectedType === ACTIVITY_TYPES.CUSTOMER_ADDED.id ? 'selected' : ''}>👤 العملاء</option>
          <option value="${ACTIVITY_TYPES.ORDER_ADDED.id}" ${selectedType === ACTIVITY_TYPES.ORDER_ADDED.id ? 'selected' : ''}>📋 الطلبات</option>
          <option value="${ACTIVITY_TYPES.PAYMENT_ADDED.id}" ${selectedType === ACTIVITY_TYPES.PAYMENT_ADDED.id ? 'selected' : ''}>💰 الدفعات</option>
          <option value="${ACTIVITY_TYPES.EXPENSE_ADDED.id}" ${selectedType === ACTIVITY_TYPES.EXPENSE_ADDED.id ? 'selected' : ''}>💸 المصروفات</option>
          <option value="${ACTIVITY_TYPES.INVENTORY_ADDED.id}" ${selectedType === ACTIVITY_TYPES.INVENTORY_ADDED.id ? 'selected' : ''}>📦 المخزون</option>
          <option value="${ACTIVITY_TYPES.WORKER_ADDED.id}" ${selectedType === ACTIVITY_TYPES.WORKER_ADDED.id ? 'selected' : ''}>👷 العمال</option>
          <option value="${ACTIVITY_TYPES.LOAN_ADDED.id}" ${selectedType === ACTIVITY_TYPES.LOAN_ADDED.id ? 'selected' : ''}>💵 القروض</option>
        </select>
      </div>
  `;

  if (activities.length === 0) {
    html += `
      <div class="empty-state">
        <div class="empty-state-icon">📜</div>
        <p>${searchQuery || selectedType !== 'all' ? 'لا توجد نتائج مطابقة.' : 'لا يوجد نشاط مسجل حتى الآن.'}</p>
      </div>
    `;
  } else {
    const grouped = groupByDay(activities);
    html += `<div style="display:flex; flex-direction:column; gap:12px;">`;

    Object.keys(grouped).forEach(day => {
      html += `
        <div>
          <div style="font-size: 12px; color: var(--text-muted); font-weight: 700; padding: 4px 0; border-bottom: 1px solid var(--border-color); margin-bottom: 8px;">
            ${day} (${grouped[day].length} حدث)
          </div>
          <div style="display:flex; flex-direction:column; gap:6px;">
            ${grouped[day].map(a => {
              const info = getActivityInfo(a.type);
              const time = formatTime(a.timestamp);
              return `
                <div class="activity-item" data-id="${a.id}" style="border-right: 3px solid ${info.color}; padding: 10px 12px; border-radius: var(--radius-md); background: var(--bg-color); cursor: pointer; display: flex; gap: 10px; align-items: center;">
                  <div style="font-size: 20px;">${info.icon}</div>
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 13px; font-weight: 600; color: var(--text-main); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      ${a.description}
                    </div>
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                      🕒 ${time} — ${info.label}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    });

    html += `</div>`;
  }

  html += `</div>`;
  container.innerHTML = html;

  function groupByDay(activities) {
    const groups = {};
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    activities.forEach(a => {
      const d = new Date(a.timestamp);
      const todayStr = now.toDateString();
      const yesterdayStr = yesterday.toDateString();
      let key;
      if (d.toDateString() === todayStr) key = 'اليوم';
      else if (d.toDateString() === yesterdayStr) key = 'أمس';
      else {
        const p = n => String(n).padStart(2, '0');
        key = `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    });

    return groups;
  }

  function formatTime(timestamp) {
    const d = new Date(timestamp);
    const p = n => String(n).padStart(2, '0');
    let hours = d.getHours();
    const minutes = p(d.getMinutes());
    const period = hours >= 12 ? 'م' : 'ص';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${period}`;
  }

  // مسح السجل
  container.querySelector('#clear-log-btn').addEventListener('click', () => {
    if (confirm('هل أنت متأكد من مسح كامل سجل النشاط؟')) {
      clearActivityLog();
      toast.success('تم مسح سجل النشاط');
      renderActivityLogPage(container);
    }
  });

  // البحث
  const searchInput = container.querySelector('#search-activity-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      const pos = e.target.selectionStart;
      renderActivityLogPage(container);
      const newInput = container.querySelector('#search-activity-input');
      if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(pos, pos);
      }
    });
  }

  // فلترة النوع
  const typeFilter = container.querySelector('#activity-type-filter');
  if (typeFilter) {
    typeFilter.addEventListener('change', (e) => {
      selectedType = e.target.value;
      renderActivityLogPage(container);
    });
  }

  // النقر على نشاط
  container.querySelectorAll('.activity-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      const activity = getActivities().find(a => a.id === id);
      if (activity) {
        const info = getActivityInfo(activity.type);
        const detailsHtml = `
          <h3 class="card-title no-border">${info.icon} ${info.label}</h3>
          <div style="background: var(--bg-color); padding: 12px; border-radius: var(--radius-md); margin-bottom: 16px;">
            <p style="margin: 0 0 8px 0; font-size: 14px;">${activity.description}</p>
            <div style="font-size: 12px; color: var(--text-muted);">
              🕒 ${new Date(activity.timestamp).toLocaleString('ar-EG')}
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <button class="btn btn-danger" id="delete-activity-btn">🗑️ حذف</button>
            <button class="btn btn-outline" id="close-activity-details">إغلاق</button>
          </div>
        `;
        openModal(detailsHtml);

        document.getElementById('delete-activity-btn').addEventListener('click', () => {
          deleteActivity(activity.id);
          toast.success('تم حذف النشاط من السجل');
          closeModal();
          renderActivityLogPage(container);
        });

        document.getElementById('close-activity-details').addEventListener('click', closeModal);
      }
    });
  });
}
