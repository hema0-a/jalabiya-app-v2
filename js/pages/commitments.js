/* ============================================================
   commitments.js - صفحة الالتزامات الشهرية والادخار (V2)
   (تدعم: الإضافة، التعديل، الحذف، البحث، الفلترة، الدفعات، أهداف الادخار)
   ============================================================ */

import * as db from '../core/db.js';
import { toast } from '../ui/toast.js';
import { openModal, closeModal } from '../ui/modal.js';
import { today, money, formatDate } from '../core/utils.js';
import { COMMITMENT_CATEGORIES, COMMITMENT_FREQUENCIES } from '../core/config.js';

// متغيرات حالة الصفحة
let searchQuery = '';
let selectedCategory = 'all';
let viewMode = 'list'; // 'list' أو 'goals'

export function renderCommitmentsPage(container) {
  const allCommitments = db.getCommitments();
  const allPayments = db.getCommitmentPayments();
  const savingsGoals = db.getSavingsGoals();

  // 1. تصفية الالتزامات
  const commitments = allCommitments.filter(c => {
    if (selectedCategory !== 'all' && c.category !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (c.name || '').toLowerCase().includes(q);
    }
    return true;
  });

  // 2. حساب الإحصائيات
  const activeCommitments = allCommitments.filter(c => c.active !== false);
  
  // حساب إجمالي الالتزامات الشهرية (تحويل كل الأنواع إلى قيمة شهرية)
  const monthlyTotal = activeCommitments.reduce((sum, c) => {
    return sum + getMonthlyEquivalent(c);
  }, 0);

  // دفعات هذا الشهر
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthlyPayments = allPayments.filter(p => {
    const d = new Date(p.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const totalPaidThisMonth = monthlyPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const remainingThisMonth = Math.max(0, monthlyTotal - totalPaidThisMonth);

  // 3. بناء الهيكل الأساسي
  let html = `
    <div class="card">
      <div class="flex-between mb-2">
        <h2 class="card-title no-border" style="margin:0;">💳 المالية الشخصية</h2>
        <button class="btn btn-primary" id="add-commitment-btn">+ التزام جديد</button>
      </div>

      <!-- إحصائيات -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px;">
        <div class="stat-card" style="padding: 10px 6px;">
          <div class="stat-value" style="font-size: 18px;">${money(monthlyTotal)}</div>
          <div class="stat-label">إجمالي شهري</div>
        </div>
        <div class="stat-card" style="padding: 10px 6px;">
          <div class="stat-value" style="font-size: 18px; color: #2E7D32;">${money(totalPaidThisMonth)}</div>
          <div class="stat-label">مدفوع هذا الشهر</div>
        </div>
        <div class="stat-card" style="padding: 10px 6px;">
          <div class="stat-value" style="font-size: 18px; color: ${remainingThisMonth > 0 ? '#dc3545' : '#2E7D32'};">${money(remainingThisMonth)}</div>
          <div class="stat-label">متبقي</div>
        </div>
      </div>

      <!-- تبديل: الالتزامات / أهداف الادخار -->
      <div class="kanban-toggle">
        <button class="btn ${viewMode === 'list' ? 'btn-primary' : 'btn-outline'}" id="view-list-btn">
          📋 الالتزامات
        </button>
        <button class="btn ${viewMode === 'goals' ? 'btn-primary' : 'btn-outline'}" id="view-goals-btn">
          🏦 أهداف الادخار
        </button>
      </div>

      ${viewMode === 'list' ? `
        <!-- حقل البحث -->
        <div class="form-group" style="margin-bottom: 10px;">
          <input type="text" id="search-commitment-input" class="form-control" placeholder="🔍 ابحث في الالتزامات..." value="${searchQuery}">
        </div>
        
        <!-- فلترة التصنيف -->
        <div style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 12px;">
          <button class="btn ${selectedCategory === 'all' ? 'btn-primary' : 'btn-outline'} category-filter-btn" data-cat="all" style="font-size: 12px; padding: 6px 12px; white-space: nowrap; min-height: 32px;">
            الكل
          </button>
          ${COMMITMENT_CATEGORIES.map(cat => `
            <button class="btn ${selectedCategory === cat.id ? 'btn-primary' : 'btn-outline'} category-filter-btn" data-cat="${cat.id}" style="font-size: 12px; padding: 6px 12px; white-space: nowrap; min-height: 32px;">
              ${cat.icon} ${cat.label}
            </button>
          `).join('')}
        </div>
      ` : ''}
  `;

  // 4. عرض المحتوى
  if (viewMode === 'list') {
    html += renderCommitmentsList(commitments);
  } else {
    html += renderGoalsList(savingsGoals);
  }

  html += `</div>`;
  container.innerHTML = html;

  // ============================================================
  // دوال مساعدة
  // ============================================================
  function getCategoryInfo(catId) {
    return COMMITMENT_CATEGORIES.find(c => c.id === catId) || COMMITMENT_CATEGORIES[7];
  }

  function getFrequencyInfo(freqId) {
    return COMMITMENT_FREQUENCIES.find(f => f.id === freqId) || COMMITMENT_FREQUENCIES[0];
  }

  function getMonthlyEquivalent(commitment) {
    const amount = commitment.amount || 0;
    const freq = commitment.frequency || 'monthly';
    switch (freq) {
      case 'monthly': return amount;
      case 'quarterly': return amount / 3;
      case 'semi_annual': return amount / 6;
      case 'annual': return amount / 12;
      case 'weekly': return amount * 4.33;
      case 'once': return 0; // مرة واحدة - لا تحسب شهري
      default: return amount;
    }
  }

  function getCommitmentPaidThisMonth(commitmentId) {
    return allPayments
      .filter(p => p.commitmentId === commitmentId)
      .filter(p => {
        const d = new Date(p.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }

  // ============================================================
  // عرض قائمة الالتزامات
  // ============================================================
  function renderCommitmentsList(commitments) {
    if (commitments.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon">💳</div>
          <p>${searchQuery || selectedCategory !== 'all' ? 'لا توجد نتائج مطابقة.' : 'لا توجد التزامات مسجلة حتى الآن.'}</p>
        </div>
      `;
    }

    let result = `<div style="display:flex; flex-direction:column; gap:8px;">`;
    commitments.forEach(c => {
      const cat = getCategoryInfo(c.category);
      const freq = getFrequencyInfo(c.frequency);
      const paid = getCommitmentPaidThisMonth(c.id);
      const monthlyAmount = getMonthlyEquivalent(c);
      const remaining = Math.max(0, monthlyAmount - paid);
      const isPaid = c.frequency === 'monthly' && paid >= monthlyAmount && monthlyAmount > 0;
      const isInactive = c.active === false;

      result += `
        <div class="commitment-item" data-id="${c.id}" style="border: 1px solid var(--border-color); padding: 12px; border-radius: var(--radius-md); background: var(--bg-color); cursor: pointer; ${isInactive ? 'opacity: 0.6;' : ''}">
          <div class="flex-between" style="margin-bottom: 6px;">
            <div style="font-weight: bold; font-size: 15px;">
              ${cat.icon} ${c.name}
              ${isPaid ? '<span class="badge badge-success" style="margin-right: 6px;">✓ مكتمل</span>' : ''}
              ${isInactive ? '<span class="badge badge-danger" style="margin-right: 6px;">موقوف</span>' : ''}
            </div>
            <span class="badge badge-primary">${freq.icon} ${freq.label}</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 12px; color: var(--text-muted);">
            <div>💰 المبلغ: <span style="color: var(--primary-color); font-weight: 700;">${money(c.amount)}</span></div>
            <div>📅 يوم الاستحقاق: ${c.dueDay || '-'}</div>
            ${c.frequency === 'monthly' ? `
              <div>✅ مدفوع: <span style="color: #2E7D32; font-weight: 700;">${money(paid)}</span></div>
              <div>⏳ متبقي: <span style="color: ${remaining > 0 ? '#dc3545' : '#2E7D32'}; font-weight: 700;">${money(remaining)}</span></div>
            ` : ''}
          </div>
        </div>
      `;
    });
    result += `</div>`;
    return result;
  }

  // ============================================================
  // عرض قائمة أهداف الادخار
  // ============================================================
  function renderGoalsList(goals) {
    if (goals.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon">🏦</div>
          <p>لا توجد أهداف ادخار حتى الآن.</p>
          <button class="btn btn-primary mt-3" id="add-goal-btn">+ إضافة هدف ادخار</button>
        </div>
      `;
    }

    let result = `
      <button class="btn btn-primary btn-full mb-3" id="add-goal-btn">+ إضافة هدف ادخار</button>
      <div style="display:flex; flex-direction:column; gap:8px;">
    `;

    goals.forEach(g => {
      const progress = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;
      const remaining = Math.max(0, g.targetAmount - g.currentAmount);

      result += `
        <div class="goal-item" data-id="${g.id}" style="border: 1px solid var(--border-color); padding: 12px; border-radius: var(--radius-md); background: var(--bg-color); cursor: pointer;">
          <div class="flex-between" style="margin-bottom: 6px;">
            <div style="font-weight: bold; font-size: 15px;">🎯 ${g.name}</div>
            <span class="badge badge-primary">${progress}%</span>
          </div>
          <div style="background: var(--border-color); height: 8px; border-radius: var(--radius-full); overflow: hidden; margin: 8px 0;">
            <div style="width: ${progress}%; height: 100%; background: linear-gradient(90deg, var(--primary-color), var(--accent-color)); border-radius: var(--radius-full); transition: width 0.5s;"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted);">
            <div>✅ <strong style="color: var(--primary-color);">${money(g.currentAmount)}</strong></div>
            <div>🎯 ${money(g.targetAmount)}</div>
          </div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
            ⏳ المتبقي: ${money(remaining)}
          </div>
        </div>
      `;
    });

    result += `</div>`;
    return result;
  }

  // ============================================================
  // نموذج إضافة/تعديل التزام
  // ============================================================
  function openCommitmentModal(commitment = null) {
    const isEdit = commitment !== null;
    const title = isEdit ? 'تعديل الالتزام' : 'التزام جديد';

    const categoryOptions = COMMITMENT_CATEGORIES.map(c => {
      const selected = (isEdit && c.id === commitment.category) ? 'selected' : '';
      return `<option value="${c.id}" ${selected}>${c.icon} ${c.label}</option>`;
    }).join('');

    const frequencyOptions = COMMITMENT_FREQUENCIES.map(f => {
      const selected = (isEdit && f.id === commitment.frequency) ? 'selected' : '';
      return `<option value="${f.id}" ${selected}>${f.icon} ${f.label}</option>`;
    }).join('');

    const formHtml = `
      <h3 class="card-title no-border">${title}</h3>
      <form id="commitment-form">
        <div class="form-group">
          <label>اسم الالتزام *</label>
          <input type="text" id="c-name" class="form-control" value="${isEdit ? commitment.name : ''}" placeholder="مثال: إيجار الشقة" required>
        </div>
        <div class="form-group">
          <label>التصنيف *</label>
          <select id="c-category" class="form-control" required>${categoryOptions}</select>
        </div>
        <div class="form-group">
          <label>المبلغ *</label>
          <input type="number" id="c-amount" class="form-control" value="${isEdit ? commitment.amount : ''}" placeholder="0" min="0" step="any" required>
        </div>
        <div class="form-group">
          <label>الدورية *</label>
          <select id="c-frequency" class="form-control" required>${frequencyOptions}</select>
        </div>
        <div class="form-group">
          <label>يوم الاستحقاق في الشهر (1-31)</label>
          <input type="number" id="c-due-day" class="form-control" value="${isEdit ? (commitment.dueDay || '') : ''}" min="1" max="31" placeholder="اختياري">
        </div>
        <div class="form-group">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" id="c-active" ${!isEdit || commitment.active !== false ? 'checked' : ''} style="width: 18px; height: 18px;">
            <span>الالتزام نشط حالياً</span>
          </label>
        </div>
        <div class="form-group">
          <label>ملاحظات</label>
          <input type="text" id="c-note" class="form-control" value="${isEdit ? (commitment.note || '') : ''}" placeholder="اختياري">
        </div>
        <div class="flex-between mt-2">
          <div>
            ${isEdit ? `<button type="button" class="btn btn-danger" id="delete-commitment-btn">حذف</button>` : ''}
          </div>
          <div>
            <button type="button" class="btn btn-outline" id="cancel-commitment-btn">إلغاء</button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'تحديث' : 'حفظ'}</button>
          </div>
        </div>
      </form>
    `;

    openModal(formHtml);

    const form = document.getElementById('commitment-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('c-name').value.trim();
      const category = document.getElementById('c-category').value;
      const amount = parseFloat(document.getElementById('c-amount').value) || 0;
      const frequency = document.getElementById('c-frequency').value;
      const dueDay = parseInt(document.getElementById('c-due-day').value) || null;
      const active = document.getElementById('c-active').checked;
      const note = document.getElementById('c-note').value.trim();

      if (!name || amount <= 0) {
        toast.error('الرجاء ملء جميع الحقول المطلوبة');
        return;
      }

      const data = { name, category, amount, frequency, dueDay, active, note };

      if (isEdit) {
        db.updateCommitment(commitment.id, data);
        toast.success('تم تحديث الالتزام');
      } else {
        db.addCommitment(data);
        toast.success('تم إضافة الالتزام بنجاح');
      }

      closeModal();
      renderCommitmentsPage(container);
    });

    document.getElementById('cancel-commitment-btn').addEventListener('click', closeModal);

    if (isEdit) {
      document.getElementById('delete-commitment-btn').addEventListener('click', () => {
        if (confirm('هل أنت متأكد من حذف هذا الالتزام؟ سيتم حذف كل دفعاته أيضاً.')) {
          db.deleteCommitment(commitment.id);
          toast.success('تم حذف الالتزام');
          closeModal();
          renderCommitmentsPage(container);
        }
      });
    }
  }

  // ============================================================
  // نافذة تفاصيل التزام + الدفعات
  // ============================================================
  function openCommitmentDetails(commitment) {
    const cat = getCategoryInfo(commitment.category);
    const freq = getFrequencyInfo(commitment.frequency);
    const payments = db.getCommitmentPaymentsByCommitment(commitment.id)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const totalPaidAll = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const paidThisMonth = getCommitmentPaidThisMonth(commitment.id);
    const monthlyAmount = getMonthlyEquivalent(commitment);

    const paymentsHtml = payments.length === 0
      ? `<p style="text-align:center; color:var(--text-muted); padding: 12px; font-size: 13px;">لا توجد دفعات بعد.</p>`
      : payments.slice(0, 8).map(p => `
        <div style="padding: 8px 0; border-bottom: 1px solid var(--border-color); font-size: 13px;">
          <div class="flex-between">
            <span style="color: var(--text-muted);">📅 ${formatDate(p.date)}</span>
            <span style="font-weight: bold; color: var(--primary-color);">${money(p.amount)}</span>
          </div>
          ${p.note ? `<div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${p.note}</div>` : ''}
        </div>
      `).join('');

    const detailsHtml = `
      <h3 class="card-title no-border">${cat.icon} ${commitment.name}</h3>
      
      <div style="background: var(--bg-color); padding: 12px; border-radius: var(--radius-md); margin-bottom: 16px; font-size: 13px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div><strong>💰 المبلغ:</strong> ${money(commitment.amount)}</div>
          <div><strong>🔁 الدورية:</strong> ${freq.icon} ${freq.label}</div>
          <div><strong>📅 يوم الاستحقاق:</strong> ${commitment.dueDay || '-'}</div>
          <div><strong>📌 التصنيف:</strong> ${cat.label}</div>
        </div>
      </div>

      ${commitment.frequency === 'monthly' ? `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px;">
          <div style="text-align: center; padding: 10px; background: var(--bg-color); border-radius: var(--radius-md);">
            <div style="font-size: 16px; font-weight: 800; color: #2E7D32;">${money(paidThisMonth)}</div>
            <div style="font-size: 11px; color: var(--text-muted);">مدفوع هذا الشهر</div>
          </div>
          <div style="text-align: center; padding: 10px; background: var(--bg-color); border-radius: var(--radius-md);">
            <div style="font-size: 16px; font-weight: 800; color: #dc3545;">${money(Math.max(0, monthlyAmount - paidThisMonth))}</div>
            <div style="font-size: 11px; color: var(--text-muted);">متبقي هذا الشهر</div>
          </div>
        </div>
      ` : `
        <div style="text-align: center; padding: 10px; background: var(--bg-color); border-radius: var(--radius-md); margin-bottom: 16px;">
          <div style="font-size: 16px; font-weight: 800; color: var(--primary-color);">${money(totalPaidAll)}</div>
          <div style="font-size: 11px; color: var(--text-muted);">إجمالي المدفوع</div>
        </div>
      `}

      <h4 style="font-size: 14px; margin-bottom: 8px;">📜 آخر الدفعات:</h4>
      <div style="max-height: 180px; overflow-y: auto; margin-bottom: 12px;">${paymentsHtml}</div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <button class="btn btn-primary" id="pay-commitment-btn">💵 دفعة جديدة</button>
        <button class="btn btn-outline" id="edit-commitment-btn">✏️ تعديل</button>
      </div>
      <button class="btn btn-outline btn-full mt-2" id="close-commitment-details">إغلاق</button>
    `;

    openModal(detailsHtml);

    document.getElementById('pay-commitment-btn').addEventListener('click', () => {
      closeModal();
      setTimeout(() => openPaymentModal(commitment), 300);
    });

    document.getElementById('edit-commitment-btn').addEventListener('click', () => {
      closeModal();
      setTimeout(() => openCommitmentModal(commitment), 300);
    });

    document.getElementById('close-commitment-details').addEventListener('click', closeModal);
  }

  // ============================================================
  // نموذج دفع التزام
  // ============================================================
  function openPaymentModal(commitment) {
    const formHtml = `
      <h3 class="card-title no-border">💵 دفعة: ${commitment.name}</h3>
      <form id="commitment-payment-form">
        <div class="form-group">
          <label>المبلغ *</label>
          <input type="number" id="cp-amount" class="form-control" placeholder="0" value="${commitment.frequency === 'monthly' ? commitment.amount : ''}" required>
        </div>
        <div class="form-group">
          <label>التاريخ *</label>
          <input type="date" id="cp-date" class="form-control" value="${today()}" required>
        </div>
        <div class="form-group">
          <label>ملاحظات</label>
          <input type="text" id="cp-note" class="form-control" placeholder="اختياري">
        </div>
        <div class="flex-between mt-2">
          <button type="button" class="btn btn-outline" id="cancel-cp-btn">إلغاء</button>
          <button type="submit" class="btn btn-primary">حفظ الدفعة</button>
        </div>
      </form>
    `;

    openModal(formHtml);

    const form = document.getElementById('commitment-payment-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById('cp-amount').value);
      const date = document.getElementById('cp-date').value;
      const note = document.getElementById('cp-note').value.trim();

      if (!amount || amount <= 0) {
        toast.error('الرجاء إدخال مبلغ صحيح');
        return;
      }

      db.addCommitmentPayment({ commitmentId: commitment.id, amount, date, note });
      toast.success('تم تسجيل الدفعة بنجاح');
      closeModal();
      renderCommitmentsPage(container);
    });

    document.getElementById('cancel-cp-btn').addEventListener('click', closeModal);
  }

  // ============================================================
  // نموذج إضافة/تعديل هدف ادخار
  // ============================================================
  function openGoalModal(goal = null) {
    const isEdit = goal !== null;
    const title = isEdit ? 'تعديل الهدف' : 'هدف ادخار جديد';

    const formHtml = `
      <h3 class="card-title no-border">${title}</h3>
      <form id="goal-form">
        <div class="form-group">
          <label>اسم الهدف *</label>
          <input type="text" id="g-name" class="form-control" value="${isEdit ? goal.name : ''}" placeholder="مثال: شراء ماكينة خياطة" required>
        </div>
        <div class="form-group">
          <label>المبلغ المستهدف *</label>
          <input type="number" id="g-target" class="form-control" value="${isEdit ? goal.targetAmount : ''}" placeholder="0" min="0" required>
        </div>
        <div class="form-group">
          <label>المبلغ الحالي</label>
          <input type="number" id="g-current" class="form-control" value="${isEdit ? goal.currentAmount : 0}" min="0">
        </div>
        <div class="form-group">
          <label>ملاحظات</label>
          <input type="text" id="g-note" class="form-control" value="${isEdit ? (goal.note || '') : ''}" placeholder="اختياري">
        </div>
        <div class="flex-between mt-2">
          <div>
            ${isEdit ? `<button type="button" class="btn btn-danger" id="delete-goal-btn">حذف</button>` : ''}
          </div>
          <div>
            <button type="button" class="btn btn-outline" id="cancel-goal-btn">إلغاء</button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'تحديث' : 'حفظ'}</button>
          </div>
        </div>
      </form>
    `;

    openModal(formHtml);

    const form = document.getElementById('goal-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('g-name').value.trim();
      const targetAmount = parseFloat(document.getElementById('g-target').value) || 0;
      const currentAmount = parseFloat(document.getElementById('g-current').value) || 0;
      const note = document.getElementById('g-note').value.trim();

      if (!name || targetAmount <= 0) {
        toast.error('الرجاء ملء الحقول المطلوبة');
        return;
      }

      const data = { name, targetAmount, currentAmount, note };

      if (isEdit) {
        db.updateSavingsGoal(goal.id, data);
        toast.success('تم تحديث الهدف');
      } else {
        db.addSavingsGoal(data);
        toast.success('تم إضافة الهدف بنجاح');
      }

      closeModal();
      renderCommitmentsPage(container);
    });

    document.getElementById('cancel-goal-btn').addEventListener('click', closeModal);

    if (isEdit) {
      document.getElementById('delete-goal-btn').addEventListener('click', () => {
        if (confirm('هل أنت متأكد من حذف هذا الهدف؟')) {
          db.deleteSavingsGoal(goal.id);
          toast.success('تم حذف الهدف');
          closeModal();
          renderCommitmentsPage(container);
        }
      });
    }
  }

  // ============================================================
  // تفاصيل هدف ادخار + إيداع
  // ============================================================
  function openGoalDetails(goal) {
    const progress = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0;
    const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

    const detailsHtml = `
      <h3 class="card-title no-border">🎯 ${goal.name}</h3>
      
      <div style="background: var(--bg-color); padding: 16px; border-radius: var(--radius-md); margin-bottom: 16px; text-align: center;">
        <div style="font-size: 32px; font-weight: 800; color: var(--primary-color); margin-bottom: 8px;">${progress}%</div>
        <div style="background: var(--border-color); height: 12px; border-radius: var(--radius-full); overflow: hidden; margin-bottom: 12px;">
          <div style="width: ${progress}%; height: 100%; background: linear-gradient(90deg, var(--primary-color), var(--accent-color)); border-radius: var(--radius-full);"></div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 13px;">
          <div>✅ <strong style="color: var(--primary-color);">${money(goal.currentAmount)}</strong></div>
          <div>🎯 <strong>${money(goal.targetAmount)}</strong></div>
        </div>
        <div style="font-size: 13px; color: #dc3545; margin-top: 8px;">
          ⏳ المتبقي: <strong>${money(remaining)}</strong>
        </div>
      </div>

      <div class="form-group">
        <label>إضافة مبلغ للهدف (إيداع)</label>
        <input type="number" id="deposit-amount" class="form-control" placeholder="0" min="1">
      </div>
      <button class="btn btn-primary btn-full" id="deposit-btn">💰 إيداع</button>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 16px;">
        <button class="btn btn-outline" id="edit-goal-details-btn">✏️ تعديل</button>
        <button class="btn btn-outline" id="close-goal-details">إغلاق</button>
      </div>
    `;

    openModal(detailsHtml);

    document.getElementById('deposit-btn').addEventListener('click', () => {
      const amount = parseFloat(document.getElementById('deposit-amount').value);
      if (!amount || amount <= 0) {
        toast.error('الرجاء إدخال مبلغ صحيح');
        return;
      }
      db.depositToSavingsGoal(goal.id, amount);
      toast.success(`تم إيداع ${money(amount)} بنجاح`);
      closeModal();
      renderCommitmentsPage(container);
    });

    document.getElementById('edit-goal-details-btn').addEventListener('click', () => {
      closeModal();
      setTimeout(() => openGoalModal(goal), 300);
    });

    document.getElementById('close-goal-details').addEventListener('click', closeModal);
  }

  // ============================================================
  // ربط الأحداث
  // ============================================================

  // زر الإضافة الرئيسي
  const addBtn = container.querySelector('#add-commitment-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      if (viewMode === 'goals') {
        openGoalModal(null);
      } else {
        openCommitmentModal(null);
      }
    });
  }

  // زر إضافة هدف من الحالة الفارغة
  const addGoalBtn = container.querySelector('#add-goal-btn');
  if (addGoalBtn) {
    addGoalBtn.addEventListener('click', () => openGoalModal(null));
  }

  // تبديل العرض
  const viewListBtn = container.querySelector('#view-list-btn');
  if (viewListBtn) {
    viewListBtn.addEventListener('click', () => {
      viewMode = 'list';
      renderCommitmentsPage(container);
    });
  }

  const viewGoalsBtn = container.querySelector('#view-goals-btn');
  if (viewGoalsBtn) {
    viewGoalsBtn.addEventListener('click', () => {
      viewMode = 'goals';
      renderCommitmentsPage(container);
    });
  }

  // البحث
  const searchInput = container.querySelector('#search-commitment-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      const pos = e.target.selectionStart;
      renderCommitmentsPage(container);
      const newInput = container.querySelector('#search-commitment-input');
      if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(pos, pos);
      }
    });
  }

  // فلترة التصنيف
  container.querySelectorAll('.category-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedCategory = btn.dataset.cat;
      renderCommitmentsPage(container);
    });
  });

  // النقر على التزام
  container.querySelectorAll('.commitment-item').forEach(item => {
    item.addEventListener('click', () => {
      const commitment = db.getCommitment(item.dataset.id);
      if (commitment) openCommitmentDetails(commitment);
    });
  });

  // النقر على هدف ادخار
  container.querySelectorAll('.goal-item').forEach(item => {
    item.addEventListener('click', () => {
      const goal = db.getSavingsGoal(item.dataset.id);
      if (goal) openGoalDetails(goal);
    });
  });
}
