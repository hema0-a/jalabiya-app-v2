/* ============================================================
   house-expenses.js - صفحة مصاريف البيت (V2)
   (تدعم: الإضافة، التعديل، الحذف، البحث، الفلترة، الإحصائيات)
   ============================================================ */

import * as db from '../core/db.js';
import { toast } from '../ui/toast.js';
import { openModal, closeModal } from '../ui/modal.js';
import { today, money, formatDate } from '../core/utils.js';
import { HOUSE_EXPENSE_CATEGORIES } from '../core/config.js';

// متغيرات حالة الصفحة
let searchQuery = '';
let selectedCategory = 'all';
let selectedPeriod = 'month'; // month, year, all

export function renderHouseExpensesPage(container) {
  const allExpenses = db.getHouseExpenses();

  // 1. فلترة بالفترة الزمنية
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const periodExpenses = allExpenses.filter(e => {
    const d = new Date(e.date);
    if (selectedPeriod === 'month') return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    if (selectedPeriod === 'year') return d.getFullYear() === currentYear;
    return true;
  });

  // 2. فلترة بالتصنيف والبحث
  const expenses = periodExpenses.filter(e => {
    if (selectedCategory !== 'all' && e.category !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const note = (e.note || '').toLowerCase();
      const cat = getCategoryLabel(e.category).toLowerCase();
      return note.includes(q) || cat.includes(q);
    }
    return true;
  }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // 3. حساب الإحصائيات
  const totalPeriod = periodExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalAll = allExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalFiltered = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const avgPerExpense = expenses.length > 0 ? totalFiltered / expenses.length : 0;

  // 4. بناء الهيكل الأساسي
  let html = `
    <div class="card">
      <div class="flex-between mb-2">
        <h2 class="card-title no-border" style="margin:0;">🏠 مصاريف البيت</h2>
        <button class="btn btn-primary" id="add-house-expense-btn">+ إضافة مصروف</button>
      </div>

      <!-- إحصائيات -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px;">
        <div class="stat-card" style="padding: 10px 6px;">
          <div class="stat-value" style="font-size: 18px; color: var(--accent-color);">${money(totalPeriod)}</div>
          <div class="stat-label">${selectedPeriod === 'month' ? 'هذا الشهر' : selectedPeriod === 'year' ? 'هذا العام' : 'الإجمالي'}</div>
        </div>
        <div class="stat-card" style="padding: 10px 6px;">
          <div class="stat-value" style="font-size: 18px; color: #dc3545;">${money(totalAll)}</div>
          <div class="stat-label">الإجمالي الكلي</div>
        </div>
        <div class="stat-card" style="padding: 10px 6px;">
          <div class="stat-value" style="font-size: 18px;">${expenses.length}</div>
          <div class="stat-label">عدد المصاريف</div>
        </div>
      </div>

      <!-- فلترة الفترة -->
      <div class="kanban-toggle">
        <button class="btn ${selectedPeriod === 'month' ? 'btn-primary' : 'btn-outline'} period-btn" data-period="month">📅 هذا الشهر</button>
        <button class="btn ${selectedPeriod === 'year' ? 'btn-primary' : 'btn-outline'} period-btn" data-period="year">🗓️ هذا العام</button>
        <button class="btn ${selectedPeriod === 'all' ? 'btn-primary' : 'btn-outline'} period-btn" data-period="all">📊 الكل</button>
      </div>

      <!-- حقل البحث -->
      <div class="form-group" style="margin-bottom: 10px;">
        <input type="text" id="search-house-input" class="form-control" placeholder="🔍 ابحث في مصاريف البيت..." value="${searchQuery}">
      </div>

      <!-- فلترة التصنيف -->
      <div style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 12px;">
        <button class="btn ${selectedCategory === 'all' ? 'btn-primary' : 'btn-outline'} cat-filter-btn" data-cat="all" style="font-size: 12px; padding: 6px 12px; white-space: nowrap; min-height: 32px;">
          الكل
        </button>
        ${HOUSE_EXPENSE_CATEGORIES.map(cat => `
          <button class="btn ${selectedCategory === cat.id ? 'btn-primary' : 'btn-outline'} cat-filter-btn" data-cat="${cat.id}" style="font-size: 12px; padding: 6px 12px; white-space: nowrap; min-height: 32px;">
            ${cat.icon} ${cat.label}
          </button>
        `).join('')}
      </div>
  `;

  // 5. عرض القائمة
  if (expenses.length === 0) {
    html += `
      <div class="empty-state">
        <div class="empty-state-icon">🏠</div>
        <p>${searchQuery || selectedCategory !== 'all' ? 'لا توجد نتائج مطابقة.' : 'لا توجد مصاريف مسجلة في هذه الفترة.'}</p>
      </div>
    `;
  } else {
    if (selectedCategory !== 'all' || searchQuery) {
      html += `
        <div style="padding: 8px 12px; background: #fff8e1; border-radius: var(--radius-md); margin-bottom: 10px; font-size: 13px;">
          <strong>إجمالي النتائج:</strong> ${money(totalFiltered)} (${expenses.length} مصروف) — المتوسط: ${money(avgPerExpense)}
        </div>
      `;
    }

    html += `<div style="display:flex; flex-direction:column; gap:8px;">`;
    expenses.forEach(e => {
      const cat = HOUSE_EXPENSE_CATEGORIES.find(c => c.id === e.category) || HOUSE_EXPENSE_CATEGORIES[9];
      html += `
        <div class="house-expense-item" data-id="${e.id}" style="border: 1px solid var(--border-color); padding: 12px; border-radius: var(--radius-md); background: var(--bg-color); cursor: pointer;">
          <div class="flex-between" style="margin-bottom: 4px;">
            <div style="font-weight: bold; font-size: 15px;">${cat.icon} ${cat.label}</div>
            <div style="font-weight: bold; color: #dc3545; font-size: 15px;">${money(e.amount)}</div>
          </div>
          <div style="font-size: 12px; color: var(--text-muted);">
            📅 ${formatDate(e.date)}${e.note ? ' | 📝 ' + e.note : ''}
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }

  html += `</div>`;
  container.innerHTML = html;

  // ============================================================
  // دوال مساعدة
  // ============================================================
  function getCategoryLabel(catId) {
    const cat = HOUSE_EXPENSE_CATEGORIES.find(c => c.id === catId);
    return cat ? cat.label : 'أخرى';
  }

  // ============================================================
  // نموذج إضافة/تعديل مصروف
  // ============================================================
  function openHouseExpenseModal(expense = null) {
    const isEdit = expense !== null;
    const title = isEdit ? 'تعديل مصروف البيت' : 'إضافة مصروف جديد';

    const categoryOptions = HOUSE_EXPENSE_CATEGORIES.map(c => {
      const selected = (isEdit && c.id === expense.category) ? 'selected' : '';
      return `<option value="${c.id}" ${selected}>${c.icon} ${c.label}</option>`;
    }).join('');

    const formHtml = `
      <h3 class="card-title no-border">${title}</h3>
      <form id="house-expense-form">
        <div class="form-group">
          <label>التصنيف *</label>
          <select id="he-category" class="form-control" required>${categoryOptions}</select>
        </div>
        <div class="form-group">
          <label>المبلغ *</label>
          <input type="number" id="he-amount" class="form-control" value="${isEdit ? expense.amount : ''}" placeholder="0" min="0" step="any" required>
        </div>
        <div class="form-group">
          <label>التاريخ *</label>
          <input type="date" id="he-date" class="form-control" value="${isEdit ? expense.date : today()}" required>
        </div>
        <div class="form-group">
          <label>ملاحظات</label>
          <input type="text" id="he-note" class="form-control" value="${isEdit ? (expense.note || '') : ''}" placeholder="اختياري">
        </div>
        <div class="flex-between mt-2">
          <div>
            ${isEdit ? `<button type="button" class="btn btn-danger" id="delete-he-btn">حذف</button>` : ''}
          </div>
          <div>
            <button type="button" class="btn btn-outline" id="cancel-he-btn">إلغاء</button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'تحديث' : 'حفظ'}</button>
          </div>
        </div>
      </form>
    `;

    openModal(formHtml);

    const form = document.getElementById('house-expense-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const category = document.getElementById('he-category').value;
      const amount = parseFloat(document.getElementById('he-amount').value);
      const date = document.getElementById('he-date').value;
      const note = document.getElementById('he-note').value.trim();

      if (!category || !amount || amount <= 0 || !date) {
        toast.error('الرجاء ملء جميع الحقول المطلوبة');
        return;
      }

      const data = { category, amount, date, note };

      if (isEdit) {
        db.updateHouseExpense(expense.id, data);
        toast.success('تم تحديث المصروف');
      } else {
        db.addHouseExpense(data);
        toast.success('تم إضافة المصروف بنجاح');
      }

      closeModal();
      renderHouseExpensesPage(container);
    });

    document.getElementById('cancel-he-btn').addEventListener('click', closeModal);

    if (isEdit) {
      document.getElementById('delete-he-btn').addEventListener('click', () => {
        if (confirm('هل أنت متأكد من حذف هذا المصروف؟')) {
          db.deleteHouseExpense(expense.id);
          toast.success('تم حذف المصروف');
          closeModal();
          renderHouseExpensesPage(container);
        }
      });
    }
  }

  // ============================================================
  // ربط الأحداث
  // ============================================================

  // زر الإضافة
  const addBtn = container.querySelector('#add-house-expense-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => openHouseExpenseModal(null));
  }

  // فلترة الفترة
  container.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedPeriod = btn.dataset.period;
      renderHouseExpensesPage(container);
    });
  });

  // البحث
  const searchInput = container.querySelector('#search-house-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      const pos = e.target.selectionStart;
      renderHouseExpensesPage(container);
      const newInput = container.querySelector('#search-house-input');
      if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(pos, pos);
      }
    });
  }

  // فلترة التصنيف
  container.querySelectorAll('.cat-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedCategory = btn.dataset.cat;
      renderHouseExpensesPage(container);
    });
  });

  // النقر على مصروف للتعديل
  container.querySelectorAll('.house-expense-item').forEach(item => {
    item.addEventListener('click', () => {
      const expense = db.getHouseExpense(item.dataset.id);
      if (expense) openHouseExpenseModal(expense);
    });
  });
}
