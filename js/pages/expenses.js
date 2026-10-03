/* ============================================================
   expenses.js - صفحة مصروفات الورشة (V2)
   (النسخة الكاملة مع العرض التدريجي)
   ============================================================ */

import * as db from '../core/db.js';
import { toast } from '../ui/toast.js';
import { openModal, closeModal } from '../ui/modal.js';
import { today, money, formatDate, escapeHtml } from '../core/utils.js';
import { EXPENSE_CATEGORIES } from '../core/config.js';
import { initProgressiveList } from '../core/list-renderer.js';

let searchQuery = '';
let selectedCategory = 'all';

/* ============================================================
   الصفحة الرئيسية
   ============================================================ */
export function renderExpensesPage(container) {
  const allExpenses = db.getExpenses();

  // تصفية
  const expenses = allExpenses.filter(e => {
    if (selectedCategory !== 'all' && e.category !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const note = (e.note || '').toLowerCase();
      const cat = getCategoryLabel(e.category).toLowerCase();
      return note.includes(q) || cat.includes(q);
    }
    return true;
  }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // الإحصائيات
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthExpenses = allExpenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalAll = allExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const monthTotal = monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalFiltered = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // توزيع التصنيفات (للشهر الحالي)
  const categoryTotals = {};
  monthExpenses.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + (e.amount || 0);
  });

  let html = `
    <div class="card">
      <div class="flex-between mb-2">
        <h2 class="card-title no-border" style="margin:0;">💸 مصروفات الورشة</h2>
        <button class="btn btn-primary" id="add-expense-btn">+ إضافة مصروف</button>
      </div>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px;">
        <div class="stat-card" style="padding: 10px 6px;">
          <div class="stat-value" style="font-size: 16px; color: var(--accent-color);">${money(monthTotal)}</div>
          <div class="stat-label">هذا الشهر</div>
        </div>
        <div class="stat-card" style="padding: 10px 6px;">
          <div class="stat-value" style="font-size: 16px; color: #dc3545;">${money(totalAll)}</div>
          <div class="stat-label">الإجمالي</div>
        </div>
        <div class="stat-card" style="padding: 10px 6px;">
          <div class="stat-value" style="font-size: 16px;">${allExpenses.length}</div>
          <div class="stat-label">عدد المصاريف</div>
        </div>
      </div>

      <div class="form-group" style="margin-bottom: 10px;">
        <input type="text" id="search-expense-input" class="form-control" placeholder="🔍 ابحث في المصروفات..." value="${escapeHtml(searchQuery)}">
      </div>

      <div style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 12px;">
        <button class="btn ${selectedCategory === 'all' ? 'btn-primary' : 'btn-outline'} category-filter-btn" data-cat="all" style="font-size: 12px; padding: 6px 12px; white-space: nowrap; min-height: 32px;">
          الكل
        </button>
        ${EXPENSE_CATEGORIES.map(cat => `
          <button class="btn ${selectedCategory === cat.id ? 'btn-primary' : 'btn-outline'} category-filter-btn" data-cat="${cat.id}" style="font-size: 12px; padding: 6px 12px; white-space: nowrap; min-height: 32px;">
            ${cat.icon} ${cat.label}
          </button>
        `).join('')}
      </div>

      ${selectedCategory !== 'all' || searchQuery ? `
        <div style="padding: 8px 12px; background: #fff8e1; border-radius: var(--radius-md); margin-bottom: 10px; font-size: 13px;">
          <strong>إجمالي النتائج:</strong> ${money(totalFiltered)} (${expenses.length} مصروف)
        </div>
      ` : ''}

      ${expenses.length > 20 ? `
        <div style="background: #E3F2FD; padding: 8px 12px; border-radius: var(--radius-md); margin-bottom: 12px; font-size: 12px; color: #1565C0;">
          ℹ️ يتم عرض 20 مصروف في البداية، وسيتم تحميل المزيد عند التمرير.
        </div>
      ` : ''}

      <div id="expenses-progressive-list"></div>
    </div>
  `;

  // قسم توزيع التصنيفات
  if (Object.keys(categoryTotals).length > 0) {
    const sortedCats = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    const maxCatTotal = sortedCats[0][1];

    html += `
      <div class="card">
        <h3 class="card-title" style="font-size: 15px;">📊 توزيع مصاريف الشهر</h3>
        ${sortedCats.map(([catId, total]) => {
          const cat = EXPENSE_CATEGORIES.find(c => c.id === catId) || EXPENSE_CATEGORIES[7];
          const percent = Math.round((total / maxCatTotal) * 100);
          return `
            <div style="padding: 6px 0; border-bottom: 1px solid var(--border-color);">
              <div class="flex-between" style="margin-bottom: 4px;">
                <span style="font-size: 13px; font-weight: 600;">${cat.icon} ${cat.label}</span>
                <strong style="font-size: 13px; color: #dc3545;">${money(total)} ج</strong>
              </div>
              <div style="background: var(--border-color); height: 6px; border-radius: var(--radius-full); overflow: hidden;">
                <div style="width: ${percent}%; height: 100%; background: linear-gradient(90deg, var(--accent-color), var(--accent-light)); border-radius: var(--radius-full);"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  container.innerHTML = html;

  /* ============================================================
     بناء عنصر مصروف واحد
     ============================================================ */
  function buildExpenseItem(e) {
    const cat = EXPENSE_CATEGORIES.find(c => c.id === e.category) || EXPENSE_CATEGORIES[7];
    return `
      <div class="expense-item" data-id="${e.id}" style="border: 1px solid var(--border-color); border-right: 4px solid var(--accent-color); padding: 12px; border-radius: var(--radius-md); background: var(--bg-color); cursor: pointer; margin-bottom: 8px;">
        <div class="flex-between" style="margin-bottom: 4px;">
          <div style="font-weight: bold; font-size: 15px;">${cat.icon} ${cat.label}</div>
          <div style="font-weight: bold; color: #dc3545; font-size: 15px;">${money(e.amount)}</div>
        </div>
        <div style="font-size: 12px; color: var(--text-muted);">
          📅 ${formatDate(e.date)}${e.note ? ' | 📝 ' + escapeHtml(e.note) : ''}
        </div>
      </div>
    `;
  }

  /* ============================================================
     استخدام العرض التدريجي
     ============================================================ */
  const listContainer = document.getElementById('expenses-progressive-list');
  if (listContainer) {
    if (expenses.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💸</div>
          <p>${searchQuery || selectedCategory !== 'all' ? 'لا توجد نتائج مطابقة.' : 'لا توجد مصروفات مسجلة حتى الآن.'}</p>
        </div>
      `;
    } else {
      initProgressiveList('expenses-progressive-list', expenses, buildExpenseItem, {
        batchSize: 20,
        emptyMessage: 'لا توجد مصروفات'
      });
    }
  }

  /* ============================================================
     ربط أحداث العناصر
     ============================================================ */
  function bindProgressiveEvents() {
    container.querySelectorAll('.expense-item').forEach(item => {
      if (item.dataset.bound === '1') return;
      item.dataset.bound = '1';
      item.addEventListener('click', () => {
        const expense = db.getExpense(item.dataset.id);
        if (expense) openExpenseModal(expense);
      });
    });
  }

  setTimeout(bindProgressiveEvents, 100);
  window.addEventListener('scroll', bindProgressiveEvents, { passive: true });

  /* ============================================================
     نموذج إضافة/تعديل مصروف
     ============================================================ */
  function openExpenseModal(expense = null) {
    const isEdit = expense !== null;
    const title = isEdit ? 'تعديل المصروف' : 'إضافة مصروف جديد';

    const categoryOptions = EXPENSE_CATEGORIES.map(c => {
      const selected = (isEdit && c.id === expense.category) ? 'selected' : '';
      return `<option value="${c.id}" ${selected}>${c.icon} ${c.label}</option>`;
    }).join('');

    const formHtml = `
      <h3 class="card-title no-border">${title}</h3>
      <form id="expense-form">
        <div class="form-group">
          <label>التصنيف *</label>
          <select id="expense-category" class="form-control" required>${categoryOptions}</select>
        </div>
        <div class="form-group">
          <label>المبلغ *</label>
          <input type="number" id="expense-amount" class="form-control" value="${isEdit ? expense.amount : ''}" placeholder="0" min="0" step="any" required>
        </div>
        <div class="form-group">
          <label>التاريخ *</label>
          <input type="date" id="expense-date" class="form-control" value="${isEdit ? expense.date : today()}" required>
        </div>
        <div class="form-group">
          <label>ملاحظات</label>
          <input type="text" id="expense-note" class="form-control" value="${isEdit ? escapeHtml(expense.note || '') : ''}" placeholder="اختياري">
        </div>
        <div class="flex-between mt-2">
          <div>
            ${isEdit ? `<button type="button" class="btn btn-danger" id="delete-expense-btn">حذف</button>` : ''}
          </div>
          <div>
            <button type="button" class="btn btn-outline" id="cancel-expense-btn">إلغاء</button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'تحديث' : 'حفظ'}</button>
          </div>
        </div>
      </form>
    `;

    openModal(formHtml);

    document.getElementById('expense-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const category = document.getElementById('expense-category').value;
      const amount = parseFloat(document.getElementById('expense-amount').value);
      const date = document.getElementById('expense-date').value;
      const note = document.getElementById('expense-note').value.trim();

      if (!category || !amount || amount <= 0 || !date) {
        toast.error('الرجاء ملء جميع الحقول المطلوبة');
        return;
      }

      const expenseData = { category, amount, date, note };

      if (isEdit) {
        db.updateExpense(expense.id, expenseData);
        toast.success('تم تحديث المصروف');
      } else {
        db.addExpense(expenseData);
        toast.success('تم إضافة المصروف بنجاح');
      }

      closeModal();
      renderExpensesPage(container);
    });

    document.getElementById('cancel-expense-btn').addEventListener('click', closeModal);

    if (isEdit) {
      document.getElementById('delete-expense-btn').addEventListener('click', () => {
        if (confirm('هل أنت متأكد من حذف هذا المصروف؟')) {
          db.deleteExpense(expense.id);
          toast.success('تم حذف المصروف');
          closeModal();
          renderExpensesPage(container);
        }
      });
    }
  }

  /* ============================================================
     ربط الأحداث
     ============================================================ */
  const addBtn = container.querySelector('#add-expense-btn');
  if (addBtn) addBtn.addEventListener('click', () => openExpenseModal(null));

  const searchInput = container.querySelector('#search-expense-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      const pos = e.target.selectionStart;
      renderExpensesPage(container);
      const newInput = container.querySelector('#search-expense-input');
      if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(pos, pos);
      }
    });
  }

  container.querySelectorAll('.category-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedCategory = btn.dataset.cat;
      renderExpensesPage(container);
    });
  });

  /* ============================================================
     ربط FAB
     ============================================================ */
  if (window.__expensesQuickListener) {
    document.removeEventListener('quick-action', window.__expensesQuickListener);
  }
  window.__expensesQuickListener = (e) => {
    if (e.detail.action === 'new-expense') {
      setTimeout(() => {
        const btn = container.querySelector('#add-expense-btn');
        if (btn) btn.click();
      }, 150);
    }
  };
  document.addEventListener('quick-action', window.__expensesQuickListener);
}

/* ============================================================
   دالة مساعدة: ترجمة التصنيف
   ============================================================ */
function getCategoryLabel(catId) {
  const cat = EXPENSE_CATEGORIES.find(c => c.id === catId);
  return cat ? cat.label : 'أخرى';
}
