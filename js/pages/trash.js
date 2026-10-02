/* ============================================================
   trash.js - صفحة سلة المحذوفات (V2)
   (عرض، فلترة، استرجاع، حذف نهائي، تفريغ)
   ============================================================ */

import { toast } from '../ui/toast.js';
import { openModal, closeModal } from '../ui/modal.js';
import { formatDate, money } from '../core/utils.js';
import {
  getTrashItems,
  filterTrashItems,
  restoreItem,
  permanentlyDelete,
  emptyTrash,
  getTrashItemInfo,
  getDaysRemaining
} from '../core/trash.js';
import { TRASH_ITEM_TYPES } from '../core/config.js';

// متغيرات حالة الصفحة
let searchQuery = '';
let selectedType = 'all';

export function renderTrashPage(container) {
  const items = filterTrashItems({ type: selectedType, searchQuery });
  const allItems = getTrashItems();

  // حساب ملخص
  const summary = {};
  allItems.forEach(i => {
    summary[i.type] = (summary[i.type] || 0) + 1;
  });

  let html = `
    <div class="card">
      <div class="flex-between mb-2">
        <h2 class="card-title no-border" style="margin:0;">🗑️ سلة المحذوفات</h2>
        ${allItems.length > 0 ? `<button class="btn btn-danger" id="empty-trash-btn" style="font-size: 12px; padding: 6px 12px; min-height: 36px;">🗑️ تفريغ السلة</button>` : ''}
      </div>

      <div style="padding: 10px 12px; background: #FFF3E0; border-radius: var(--radius-md); margin-bottom: 16px; font-size: 12px; color: #E65100;">
        ⚠️ يتم حذف عناصر السلة تلقائياً بعد 7 أيام من حذفها.
      </div>

      <!-- إحصائيات -->
      ${allItems.length > 0 ? `
        <div style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 12px;">
          <button class="btn ${selectedType === 'all' ? 'btn-primary' : 'btn-outline'} type-filter-btn" data-type="all" style="font-size: 12px; padding: 6px 12px; white-space: nowrap; min-height: 32px;">
            الكل (${allItems.length})
          </button>
          ${Object.keys(summary).map(type => {
            const info = getTrashItemInfo(type);
            return `
              <button class="btn ${selectedType === type ? 'btn-primary' : 'btn-outline'} type-filter-btn" data-type="${type}" style="font-size: 12px; padding: 6px 12px; white-space: nowrap; min-height: 32px;">
                ${info.icon} ${info.label} (${summary[type]})
              </button>
            `;
          }).join('')}
        </div>
      ` : ''}

      <!-- حقل البحث -->
      ${allItems.length > 0 ? `
        <div class="form-group" style="margin-bottom: 12px;">
          <input type="text" id="search-trash-input" class="form-control" placeholder="🔍 ابحث في السلة..." value="${searchQuery}">
        </div>
      ` : ''}
  `;

  // عرض العناصر
  if (items.length === 0) {
    html += `
      <div class="empty-state">
        <div class="empty-state-icon">🗑️</div>
        <p>${searchQuery || selectedType !== 'all' ? 'لا توجد نتائج مطابقة.' : 'سلة المحذوفات فارغة.'}</p>
      </div>
    `;
  } else {
    html += `<div style="display:flex; flex-direction:column; gap:8px;">`;
    items.forEach(item => {
      const info = getTrashItemInfo(item.type);
      const data = item.data || {};
      const name = data.name || data.personName || data.garmentType || (data.amount ? money(data.amount) + ' جنيه' : 'عنصر');
      const daysLeft = getDaysRemaining(item);
      const isUrgent = daysLeft <= 2;

      html += `
        <div class="trash-item" data-id="${item.id}" style="border: 1px solid var(--border-color); border-right: 4px solid ${info.color}; padding: 12px; border-radius: var(--radius-md); background: var(--bg-color);">
          <div class="flex-between" style="margin-bottom: 6px;">
            <div style="font-weight: bold; font-size: 14px;">${info.icon} ${name}</div>
            <span class="badge" style="background: ${info.color}20; color: ${info.color};">${info.label}</span>
          </div>
          <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px;">
            🗓️ حُذف في: ${formatDate(item.deletedAt)}
            <span style="color: ${isUrgent ? '#dc3545' : 'var(--text-muted)'}; font-weight: ${isUrgent ? 'bold' : 'normal'}; margin-right: 6px;">
              ⏳ متبقي: ${daysLeft} يوم
            </span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
            <button class="btn btn-primary restore-btn" data-id="${item.id}" style="font-size: 12px; min-height: 32px; padding: 4px;">♻️ استرجاع</button>
            <button class="btn btn-danger delete-btn" data-id="${item.id}" style="font-size: 12px; min-height: 32px; padding: 4px;">🗑️ حذف نهائي</button>
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }

  html += `</div>`;
  container.innerHTML = html;

  // ============================================================
  // ربط الأحداث
  // ============================================================

  // تفريغ السلة
  const emptyBtn = container.querySelector('#empty-trash-btn');
  if (emptyBtn) {
    emptyBtn.addEventListener('click', () => {
      if (confirm('هل أنت متأكد من تفريغ السلة بالكامل؟ لا يمكن التراجع!')) {
        if (confirm('تأكيد أخير: سيتم الحذف النهائي لكل العناصر!')) {
          emptyTrash();
          toast.success('تم تفريغ السلة');
          renderTrashPage(container);
        }
      }
    });
  }

  // البحث
  const searchInput = container.querySelector('#search-trash-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      const pos = e.target.selectionStart;
      renderTrashPage(container);
      const newInput = container.querySelector('#search-trash-input');
      if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(pos, pos);
      }
    });
  }

  // فلترة النوع
  container.querySelectorAll('.type-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedType = btn.dataset.type;
      renderTrashPage(container);
    });
  });

  // استرجاع
  container.querySelectorAll('.restore-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (confirm('هل تريد استرجاع هذا العنصر؟')) {
        if (restoreItem(id)) {
          toast.success('تم استرجاع العنصر بنجاح');
          renderTrashPage(container);
        } else {
          toast.error('فشل استرجاع العنصر');
        }
      }
    });
  });

  // حذف نهائي
  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (confirm('هل أنت متأكد من الحذف النهائي؟ لا يمكن التراجع!')) {
        if (permanentlyDelete(id)) {
          toast.success('تم الحذف النهائي');
          renderTrashPage(container);
        } else {
          toast.error('فشل الحذف');
        }
      }
    });
  });
}
