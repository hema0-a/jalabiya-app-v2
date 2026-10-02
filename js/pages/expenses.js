/* ============================================================
   expenses.js - صفحة إدارة مصروفات الورشة (V2)
   (تدعم الإضافة، التعديل، الحذف، البحث، والفلترة)
   ============================================================ */

import * as db from '../core/db.js';
import { toast } from '../ui/toast.js';
import { openModal, closeModal } from '../ui/modal.js';
import { today, money, formatDate } from '../core/utils.js';

// متغيرات حالة الصفحة
let searchQuery = '';
let selectedCategory = 'all';

// التصنيفات المتاحة للمصروفات
const EXPENSE_CATEGORIES = [
  { id: 'materials', label: 'خامات وأقمشة', icon: '🧵' },
  { id: 'rent', label: 'إيجار', icon: '🏠' },
  { id: 'electricity', label: 'كهرباء ومياه', icon: '💡' },
  { id: 'workers', label: 'أجور عمال', icon: '👷' },
  { id: 'maintenance', label: 'صيانة', icon: '🔧' },
  { id: 'transport', label: 'مواصلات', icon: '🚗' },
  { id: 'supplies', label: 'أدوات ومستلزمات', icon: '📦' },
  { id: 'other', label: 'أخرى', icon: '📌' }
];

export function renderExpensesPage(container) {
  const allExpenses = db.getExpenses();

  // 1. تصفية المصروفات
  const expenses = allExpenses.filter(e => {
    // فلترة بالتصنيف
    if (selectedCategory !== 'all' && e.category !== selectedCategory) return false;
    // فلترة بالبحث
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const note = (e.note || '').toLowerCase();
      const cat = getCategoryLabel(e.category).toLowerCase();
      return note.includes(q) || cat.includes(q);
    }
    return true;
  }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // 2. حساب الإحصائيات
  const totalAll = allExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalFiltered = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // حساب مصروفات الشهر الحالي
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthlyTotal = allExpenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).reduce((sum, e) => sum + (e.amount || 0), 0);

  // 3. بناء الهيكل الأساسي
  let html = `
    <div class="card">
      <div class="flex-between mb-2">
        <h2 class="card-title" style="margin:0; border:none;">🧵 مصروفات الورشة</h2>
        <button class="btn btn-primary" id="add-expense-btn">+ إضافة مصروف</button>
      </div>

      <!-- ملخص الإحصائيات -->
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 16px;">
        <div style="text-align: center; padding: 12px; background: var(--bg-color); border-radius: var(--radius-md);">
          <div style="font-size: 18px; font-weight: 800; color: var(--accent-color);">${money(monthlyTotal)}</div>
          <div style="font-size: 11px; color: var(--text-muted);">مصروفات هذا الشهر</div>
        </div>
        <div style="text-align: center; padding: 12px; background: var(--bg-color); border-radius: var(--radius-md);">
          <div style="font-size: 18px; font-weight: 800; color: #dc3545;">${money(totalAll)}</div>
          <div style="font-size: 11px; color: var(--text-muted);">إجمالي المصروفات</div>
        </div>
      </div>

      <!-- حقل البحث -->
      <div class="form-group" style="margin-bottom: 10px;">
        <input type="text" id="search-expense-input" class="form-control" placeholder="🔍 ابحث في المصروفات..." value="${searchQuery}">
      </div>

      <!-- أزرار الفلترة بالتصنيف -->
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
  `;

  // 4. عرض قائمة المصروفات
  if (expenses.length === 0) {
    html += `
      <div class="text-center" style="padding: 40px 10px; color: var(--text-muted);">
        <div style="font-size: 40px; margin-bottom: 10px;">🧵</div>
        <p>${searchQuery || selectedCategory !== 'all' ? 'لا توجد نتائج مطابقة.' : 'لا توجد مصروفات مسجلة حتى الآن.'}</p>
      </div>
    `;
  } else {
    // عرض الإجمالي المفلتر
    if (selectedCategory !== 'all' || searchQuery) {
      html += `
        <div style="padding: 8px 12px; background: #fff8e1; border-radius: var(--radius-md); margin-bottom: 10px; font-size: 13px;">
          <strong>إجمالي النتائج:</strong> ${money(totalFiltered)} (${expenses.length} مصروف)
        </div>
      `;
    }

    html += `<div style="display:flex; flex-direction:column; gap:8px;">`;
    expenses.forEach(e => {
      const cat = EXPENSE_CATEGORIES.find(c => c.id === e.category) || EXPENSE_CATEGORIES[7];
      html += `
        <div class="expense-item" data-id="${e.id}" style="border: 1px solid var(--border-color); padding: 12px; border-radius: var(--radius-md); background: var(--bg-color); cursor: pointer;">
          <div class="flex-between">
            <div style="font-weight:bold; font-size:15px;">${cat.icon} ${cat.label}</div>
            <div style="font-weight:bold; color: #dc3545; font-size: 15px;">${money(e.amount)}</div>
          </div>
          <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">
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
    const cat = EXPENSE_CATEGORIES.find(c => c.id === catId);
    return cat ? cat.label : 'أخرى';
  }

  // ============================================================
  // نموذج الإضافة/التعديل
  // ============================================================
  
  function openExpenseModal(expense = null) {
    const isEdit = expense !== null;
    const title = isEdit ? 'تعديل المصروف' : 'إضافة مصروف جديد';

    const categoryOptions = EXPENSE_CATEGORIES.map(c => {
      const selected = (isEdit && c.id === expense.category) ? 'selected' : '';
      return `<option value="${c.id}" ${selected}>${c.icon} ${c.label}</option>`;
    }).join('');

    const formHtml = `
      <h3 class="card-title">${title}</h3>
      <form id="expense-form">
        <div class="form-group">
          <label>التصنيف *</label>
          <select id="expense-category" class="form-control" required>
            ${categoryOptions}
          </select>
        </div>
        <div class="form-group">
          <label>المبلغ *</label>
          <input type="number" id="expense-amount" class="form-control" placeholder="0" value="${isEdit ? expense.amount : ''}" required>
        </div>
        <div class="form-group">
          <label>التاريخ *</label>
          <input type="date" id="expense-date" class="form-control" value="${isEdit ? expense.date : today()}" required>
        </div>
        <div class="form-group">
          <label>ملاحظات</label>
          <input type="text" id="expense-note" class="form-control" placeholder="اختياري" value="${isEdit ? (expense.note || '') : ''}">
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

    const form = document.getElementById('expense-form');
    
    form.addEventListener('submit', (e) => {
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

  // ============================================================
  // ربط الأحداث
  // ============================================================

  // زر الإضافة
  const addBtn = container.querySelector('#add-expense-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => openExpenseModal(null));
  }

  // حقل البحث
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

  // أزرار الفلترة بالتصنيف
  container.querySelectorAll('.category-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedCategory = btn.dataset.cat;
      renderExpensesPage(container);
    });
  });

  // النقر على مصروف للتعديل
  container.querySelectorAll('.expense-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      const expense = db.getExpense(id);
      if (expense) openExpenseModal(expense);
    });
  });
}
