/* ============================================================
   inventory.js - صفحة إدارة المخزون (V2)
   (تدعم: الإضافة، التعديل، الحذف، البحث، الفلترة، تعديل سريع للكمية)
   ============================================================ */

import * as db from '../core/db.js';
import { toast } from '../ui/toast.js';
import { openModal, closeModal } from '../ui/modal.js';
import { money } from '../core/utils.js';
import { INVENTORY_CATEGORIES } from '../core/config.js';

// متغيرات حالة الصفحة
let searchQuery = '';
let selectedCategory = 'all';
let showLowStockOnly = false;

export function renderInventoryPage(container) {
  const allItems = db.getInventory();

  // 1. تصفية العناصر
  const items = allItems.filter(i => {
    // فلترة بالتصنيف
    if (selectedCategory !== 'all' && i.category !== selectedCategory) return false;
    
    // فلترة بالحد الأدنى فقط
    if (showLowStockOnly && (i.quantity || 0) > (i.minQuantity || 0)) return false;
    
    // فلترة بالبحث
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (i.name || '').toLowerCase().includes(q);
    }
    return true;
  }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  // 2. حساب الإحصائيات
  const totalItems = allItems.length;
  const totalValue = allItems.reduce((sum, i) => sum + ((i.quantity || 0) * (i.price || 0)), 0);
  const lowStockCount = allItems.filter(i => (i.quantity || 0) <= (i.minQuantity || 0) && (i.minQuantity || 0) > 0).length;

  // 3. بناء الهيكل الأساسي
  let html = `
    <div class="card">
      <div class="flex-between mb-2">
        <h2 class="card-title no-border" style="margin:0;">📦 المخزون</h2>
        <button class="btn btn-primary" id="add-item-btn">+ إضافة عنصر</button>
      </div>

      <!-- إحصائيات -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px;">
        <div class="stat-card" style="padding: 10px 6px;">
          <div class="stat-value" style="font-size: 20px;">${totalItems}</div>
          <div class="stat-label">عنصر</div>
        </div>
        <div class="stat-card" style="padding: 10px 6px;">
          <div class="stat-value" style="font-size: 20px; color: var(--accent-color);">${money(totalValue)}</div>
          <div class="stat-label">قيمة المخزون</div>
        </div>
        <div class="stat-card" style="padding: 10px 6px;">
          <div class="stat-value" style="font-size: 20px; color: ${lowStockCount > 0 ? '#dc3545' : 'var(--primary-color)'};">${lowStockCount}</div>
          <div class="stat-label">نواقص</div>
        </div>
      </div>

      <!-- حقل البحث -->
      <div class="form-group" style="margin-bottom: 10px;">
        <input type="text" id="search-inventory-input" class="form-control" placeholder="🔍 ابحث في المخزون..." value="${searchQuery}">
      </div>

      <!-- فلتر: إظهار النواقص فقط -->
      <div style="margin-bottom: 10px;">
        <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; padding: 8px; background: var(--bg-color); border-radius: var(--radius-md);">
          <input type="checkbox" id="low-stock-filter" ${showLowStockOnly ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
          <span>⚠️ إظهار النواقص فقط</span>
        </label>
      </div>

      <!-- فلترة التصنيف -->
      <div style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 12px;">
        <button class="btn ${selectedCategory === 'all' ? 'btn-primary' : 'btn-outline'} category-filter-btn" data-cat="all" style="font-size: 12px; padding: 6px 12px; white-space: nowrap; min-height: 32px;">
          الكل
        </button>
        ${INVENTORY_CATEGORIES.map(cat => `
          <button class="btn ${selectedCategory === cat.id ? 'btn-primary' : 'btn-outline'} category-filter-btn" data-cat="${cat.id}" style="font-size: 12px; padding: 6px 12px; white-space: nowrap; min-height: 32px;">
            ${cat.icon} ${cat.label}
          </button>
        `).join('')}
      </div>
  `;

  // 4. عرض القائمة
  if (items.length === 0) {
    html += `
      <div class="empty-state">
        <div class="empty-state-icon">📦</div>
        <p>${searchQuery || selectedCategory !== 'all' || showLowStockOnly ? 'لا توجد نتائج مطابقة.' : 'لا توجد عناصر في المخزون حتى الآن.'}</p>
      </div>
    `;
  } else {
    html += `<div style="display:flex; flex-direction:column; gap:8px;">`;
    items.forEach(i => {
      const cat = INVENTORY_CATEGORIES.find(c => c.id === i.category) || INVENTORY_CATEGORIES[6];
      const isLow = (i.quantity || 0) <= (i.minQuantity || 0) && (i.minQuantity || 0) > 0;
      const itemValue = (i.quantity || 0) * (i.price || 0);

      html += `
        <div class="inventory-item" data-id="${i.id}" style="border: 1px solid ${isLow ? '#dc3545' : 'var(--border-color)'}; padding: 12px; border-radius: var(--radius-md); background: var(--bg-color);">
          <div class="flex-between" style="margin-bottom: 6px;">
            <div style="font-weight: bold; font-size: 15px;">${cat.icon} ${i.name}</div>
            ${isLow ? `<span class="badge badge-danger">⚠️ ناقص</span>` : ''}
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">
            <div>📊 الكمية: <span style="color: ${isLow ? '#dc3545' : 'var(--text-main)'}; font-weight: 700;">${i.quantity || 0}</span></div>
            <div>⚠️ الحد الأدنى: ${i.minQuantity || 0}</div>
            <div>💰 السعر: ${money(i.price)}</div>
            <div>💵 القيمة: <span style="font-weight: 700; color: var(--primary-color);">${money(itemValue)}</span></div>
          </div>
          <!-- أزرار تعديل سريع للكمية -->
          <div style="display: flex; gap: 6px; margin-top: 8px; border-top: 1px dashed var(--border-color); padding-top: 8px;">
            <button class="btn btn-outline quick-adjust-btn" data-id="${i.id}" data-delta="-1" style="flex: 1; font-size: 16px; min-height: 34px; padding: 4px;">−</button>
            <button class="btn btn-outline quick-adjust-btn" data-id="${i.id}" data-delta="1" style="flex: 1; font-size: 16px; min-height: 34px; padding: 4px;">+</button>
            <button class="btn btn-outline edit-item-btn" data-id="${i.id}" style="flex: 2; font-size: 12px; min-height: 34px; padding: 4px;">✏️ تعديل</button>
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }

  html += `</div>`;
  container.innerHTML = html;

  // ============================================================
  // نموذج الإضافة/التعديل
  // ============================================================
  function openItemModal(item = null) {
    const isEdit = item !== null;
    const title = isEdit ? 'تعديل عنصر' : 'إضافة عنصر جديد';

    const categoryOptions = INVENTORY_CATEGORIES.map(c => {
      const selected = (isEdit && c.id === item.category) ? 'selected' : '';
      return `<option value="${c.id}" ${selected}>${c.icon} ${c.label}</option>`;
    }).join('');

    const formHtml = `
      <h3 class="card-title no-border">${title}</h3>
      <form id="item-form">
        <div class="form-group">
          <label>اسم العنصر *</label>
          <input type="text" id="item-name" class="form-control" value="${isEdit ? item.name : ''}" placeholder="مثال: قماش قطني" required>
        </div>
        <div class="form-group">
          <label>التصنيف *</label>
          <select id="item-category" class="form-control" required>
            ${categoryOptions}
          </select>
        </div>
        <div class="form-group">
          <label>الكمية الحالية *</label>
          <input type="number" id="item-quantity" class="form-control" value="${isEdit ? (item.quantity || 0) : 0}" min="0" step="any" required>
        </div>
        <div class="form-group">
          <label>الحد الأدنى (تنبيه عند النقص)</label>
          <input type="number" id="item-min-quantity" class="form-control" value="${isEdit ? (item.minQuantity || 0) : 0}" min="0" step="any">
        </div>
        <div class="form-group">
          <label>سعر الوحدة</label>
          <input type="number" id="item-price" class="form-control" value="${isEdit ? (item.price || 0) : 0}" min="0" step="any">
        </div>
        <div class="form-group">
          <label>ملاحظات</label>
          <input type="text" id="item-note" class="form-control" value="${isEdit ? (item.note || '') : ''}" placeholder="اختياري">
        </div>
        <div class="flex-between mt-2">
          <div>
            ${isEdit ? `<button type="button" class="btn btn-danger" id="delete-item-btn">حذف</button>` : ''}
          </div>
          <div>
            <button type="button" class="btn btn-outline" id="cancel-item-btn">إلغاء</button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'تحديث' : 'حفظ'}</button>
          </div>
        </div>
      </form>
    `;

    openModal(formHtml);

    const form = document.getElementById('item-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('item-name').value.trim();
      const category = document.getElementById('item-category').value;
      const quantity = parseFloat(document.getElementById('item-quantity').value) || 0;
      const minQuantity = parseFloat(document.getElementById('item-min-quantity').value) || 0;
      const price = parseFloat(document.getElementById('item-price').value) || 0;
      const note = document.getElementById('item-note').value.trim();

      if (!name) {
        toast.error('الرجاء إدخال اسم العنصر');
        return;
      }

      const itemData = { name, category, quantity, minQuantity, price, note };

      if (isEdit) {
        db.updateInventoryItem(item.id, itemData);
        toast.success('تم تحديث العنصر');
      } else {
        db.addInventoryItem(itemData);
        toast.success('تم إضافة العنصر بنجاح');
      }

      closeModal();
      renderInventoryPage(container);
    });

    document.getElementById('cancel-item-btn').addEventListener('click', closeModal);

    if (isEdit) {
      document.getElementById('delete-item-btn').addEventListener('click', () => {
        if (confirm('هل أنت متأكد من حذف هذا العنصر؟')) {
          db.deleteInventoryItem(item.id);
          toast.success('تم حذف العنصر');
          closeModal();
          renderInventoryPage(container);
        }
      });
    }
  }

  // ============================================================
  // ربط الأحداث
  // ============================================================

  // زر الإضافة
  const addBtn = container.querySelector('#add-item-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => openItemModal(null));
  }

  // حقل البحث
  const searchInput = container.querySelector('#search-inventory-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      const pos = e.target.selectionStart;
      renderInventoryPage(container);
      const newInput = container.querySelector('#search-inventory-input');
      if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(pos, pos);
      }
    });
  }

  // فلتر النواقص
  const lowStockFilter = container.querySelector('#low-stock-filter');
  if (lowStockFilter) {
    lowStockFilter.addEventListener('change', (e) => {
      showLowStockOnly = e.target.checked;
      renderInventoryPage(container);
    });
  }

  // فلترة التصنيف
  container.querySelectorAll('.category-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedCategory = btn.dataset.cat;
      renderInventoryPage(container);
    });
  });

  // أزرار التعديل السريع (+ / -)
  container.querySelectorAll('.quick-adjust-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const delta = parseInt(btn.dataset.delta);
      db.adjustInventoryQuantity(id, delta);
      const item = db.getInventoryItem(id);
      toast.success(`${item.name}: الكمية الآن ${item.quantity}`);
      renderInventoryPage(container);
    });
  });

  // زر التعديل الكامل
  container.querySelectorAll('.edit-item-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const item = db.getInventoryItem(id);
      if (item) openItemModal(item);
    });
  });
}
