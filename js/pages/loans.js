/* ============================================================
   loans.js - صفحة القروض والمديونيات (V2)
   (تدعم: القروض المقدّمة والمستلمة، الدفعات، البحث، الفلترة)
   ============================================================ */

import * as db from '../core/db.js';
import { toast } from '../ui/toast.js';
import { openModal, closeModal } from '../ui/modal.js';
import { today, money, formatDate } from '../core/utils.js';
import { LOAN_TYPES } from '../core/config.js';

// متغيرات حالة الصفحة
let searchQuery = '';
let selectedType = 'all'; // all, given, received

export function renderLoansPage(container) {
  const allLoans = db.getPersonalLoans();
  const allLoanPayments = db.getLoanPayments();

  // 1. تصفية القروض
  const loans = allLoans.filter(l => {
    if (selectedType !== 'all' && l.type !== selectedType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (l.personName || '').toLowerCase().includes(q) || 
             (l.note || '').toLowerCase().includes(q);
    }
    return true;
  }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  // 2. حساب الإحصائيات
  const givenLoans = allLoans.filter(l => l.type === 'given');
  const receivedLoans = allLoans.filter(l => l.type === 'received');

  const totalGiven = givenLoans.reduce((sum, l) => sum + (l.amount || 0), 0);
  const totalReceived = receivedLoans.reduce((sum, l) => sum + (l.amount || 0), 0);

  const paidGiven = allLoanPayments
    .filter(p => {
      const loan = allLoans.find(l => l.id === p.loanId);
      return loan && loan.type === 'given';
    })
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const paidReceived = allLoanPayments
    .filter(p => {
      const loan = allLoans.find(l => l.id === p.loanId);
      return loan && loan.type === 'received';
    })
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const remainingGiven = Math.max(0, totalGiven - paidGiven); // لي (متأخرات)
  const remainingReceived = Math.max(0, totalReceived - paidReceived); // عليّ (التزامات)

  // 3. بناء الهيكل الأساسي
  let html = `
    <div class="card">
      <div class="flex-between mb-2">
        <h2 class="card-title no-border" style="margin:0;">💵 القروض والمديونيات</h2>
        <button class="btn btn-primary" id="add-loan-btn">+ إضافة قرض</button>
      </div>

      <!-- إحصائيات -->
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 16px;">
        <div class="stat-card" style="padding: 12px 8px; background: linear-gradient(135deg, #E8F5E9, #C8E6C9);">
          <div style="font-size: 12px; color: #1B5E20; font-weight: 700; margin-bottom: 4px;">📤 ليّ (مستحق)</div>
          <div class="stat-value" style="font-size: 20px; color: #2E7D32;">${money(remainingGiven)}</div>
          <div style="font-size: 10px; color: #1B5E20; margin-top: 4px;">من إجمالي ${money(totalGiven)}</div>
        </div>
        <div class="stat-card" style="padding: 12px 8px; background: linear-gradient(135deg, #FFEBEE, #FFCDD2);">
          <div style="font-size: 12px; color: #B71C1C; font-weight: 700; margin-bottom: 4px;">📥 عليّ (التزام)</div>
          <div class="stat-value" style="font-size: 20px; color: #C62828;">${money(remainingReceived)}</div>
          <div style="font-size: 10px; color: #B71C1C; margin-top: 4px;">من إجمالي ${money(totalReceived)}</div>
        </div>
      </div>

      <!-- صافي الرصيد -->
      <div style="padding: 12px; background: var(--bg-color); border-radius: var(--radius-md); margin-bottom: 16px; text-align: center;">
        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">💰 صافي الرصيد (ليّ - عليّ)</div>
        <div style="font-size: 22px; font-weight: 800; color: ${remainingGiven - remainingReceived >= 0 ? '#2E7D32' : '#C62828'};">
          ${remainingGiven - remainingReceived >= 0 ? '+' : ''}${money(remainingGiven - remainingReceived)}
        </div>
      </div>

      <!-- فلترة النوع -->
      <div class="kanban-toggle">
        <button class="btn ${selectedType === 'all' ? 'btn-primary' : 'btn-outline'} type-filter-btn" data-type="all">الكل (${allLoans.length})</button>
        <button class="btn ${selectedType === 'given' ? 'btn-primary' : 'btn-outline'} type-filter-btn" data-type="given">📤 ليّ (${givenLoans.length})</button>
        <button class="btn ${selectedType === 'received' ? 'btn-primary' : 'btn-outline'} type-filter-btn" data-type="received">📥 عليّ (${receivedLoans.length})</button>
      </div>

      <!-- حقل البحث -->
      <div class="form-group" style="margin-bottom: 12px;">
        <input type="text" id="search-loan-input" class="form-control" placeholder="🔍 ابحث باسم الشخص أو في الملاحظات..." value="${searchQuery}">
      </div>
  `;

  // 4. عرض القائمة
  if (loans.length === 0) {
    html += `
      <div class="empty-state">
        <div class="empty-state-icon">💵</div>
        <p>${searchQuery || selectedType !== 'all' ? 'لا توجد نتائج مطابقة.' : 'لا توجد قروض مسجلة حتى الآن.'}</p>
      </div>
    `;
  } else {
    html += `<div style="display:flex; flex-direction:column; gap:8px;">`;
    loans.forEach(l => {
      const typeInfo = LOAN_TYPES.find(t => t.id === l.type) || LOAN_TYPES[0];
      const payments = db.getLoanPaymentsByLoan(l.id);
      const paid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const remaining = Math.max(0, (l.amount || 0) - paid);
      const isFullyPaid = remaining === 0 && l.amount > 0;
      const progress = l.amount > 0 ? Math.min(100, Math.round((paid / l.amount) * 100)) : 0;
      
      // لون حسب النوع
      const isGiven = l.type === 'given';
      const borderColor = isFullyPaid ? '#2E7D32' : (isGiven ? '#66BB6A' : '#EF5350');
      const badgeClass = isGiven ? 'badge-success' : 'badge-danger';

      html += `
        <div class="loan-item" data-id="${l.id}" style="border: 1px solid var(--border-color); border-right: 4px solid ${borderColor}; padding: 12px; border-radius: var(--radius-md); background: var(--bg-color); cursor: pointer; ${isFullyPaid ? 'opacity: 0.75;' : ''}">
          <div class="flex-between" style="margin-bottom: 6px;">
            <div style="font-weight: bold; font-size: 15px;">
              👤 ${l.personName}
              ${isFullyPaid ? '<span class="badge badge-success" style="margin-right: 6px;">✓ مسدد</span>' : ''}
            </div>
            <span class="badge ${badgeClass}">${typeInfo.icon} ${typeInfo.label}</span>
          </div>
          
          <!-- شريط التقدم -->
          <div style="background: var(--border-color); height: 6px; border-radius: var(--radius-full); overflow: hidden; margin: 8px 0;">
            <div style="width: ${progress}%; height: 100%; background: ${isGiven ? 'linear-gradient(90deg, #66BB6A, #2E7D32)' : 'linear-gradient(90deg, #EF5350, #C62828)'}; border-radius: var(--radius-full); transition: width 0.5s;"></div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; font-size: 11px; color: var(--text-muted);">
            <div>💰 المبلغ: <strong style="color: var(--text-main);">${money(l.amount)}</strong></div>
            <div>✅ مدفوع: <strong style="color: #2E7D32;">${money(paid)}</strong></div>
            <div>⏳ متبقي: <strong style="color: ${remaining > 0 ? '#dc3545' : '#2E7D32'};">${money(remaining)}</strong></div>
          </div>
          ${l.dueDate ? `<div style="font-size: 11px; color: var(--text-muted); margin-top: 6px;">📅 تاريخ الاستحقاق: ${formatDate(l.dueDate)}</div>` : ''}
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
  function getLoanTypeInfo(typeId) {
    return LOAN_TYPES.find(t => t.id === typeId) || LOAN_TYPES[0];
  }

  // ============================================================
  // نموذج إضافة/تعديل قرض
  // ============================================================
  function openLoanModal(loan = null) {
    const isEdit = loan !== null;
    const title = isEdit ? 'تعديل القرض' : 'إضافة قرض جديد';

    const typeOptions = LOAN_TYPES.map(t => {
      const selected = (isEdit && t.id === loan.type) ? 'selected' : '';
      return `<option value="${t.id}" ${selected}>${t.icon} ${t.label}</option>`;
    }).join('');

    const formHtml = `
      <h3 class="card-title no-border">${title}</h3>
      <form id="loan-form">
        <div class="form-group">
          <label>النوع *</label>
          <select id="l-type" class="form-control" required>${typeOptions}</select>
        </div>
        <div class="form-group">
          <label>اسم الشخص *</label>
          <input type="text" id="l-person" class="form-control" value="${isEdit ? loan.personName : ''}" placeholder="مثال: أحمد محمد" required>
        </div>
        <div class="form-group">
          <label>المبلغ الإجمالي *</label>
          <input type="number" id="l-amount" class="form-control" value="${isEdit ? loan.amount : ''}" placeholder="0" min="0" step="any" required>
        </div>
        <div class="form-group">
          <label>تاريخ القرض</label>
          <input type="date" id="l-date" class="form-control" value="${isEdit ? (loan.date || today()) : today()}">
        </div>
        <div class="form-group">
          <label>تاريخ الاستحقاق (اختياري)</label>
          <input type="date" id="l-due" class="form-control" value="${isEdit ? (loan.dueDate || '') : ''}">
        </div>
        <div class="form-group">
          <label>رقم الهاتف (اختياري)</label>
          <input type="tel" id="l-phone" class="form-control" value="${isEdit ? (loan.phone || '') : ''}">
        </div>
        <div class="form-group">
          <label>ملاحظات</label>
          <input type="text" id="l-note" class="form-control" value="${isEdit ? (loan.note || '') : ''}" placeholder="اختياري">
        </div>
        <div class="flex-between mt-2">
          <div>
            ${isEdit ? `<button type="button" class="btn btn-danger" id="delete-loan-btn">حذف</button>` : ''}
          </div>
          <div>
            <button type="button" class="btn btn-outline" id="cancel-loan-btn">إلغاء</button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'تحديث' : 'حفظ'}</button>
          </div>
        </div>
      </form>
    `;

    openModal(formHtml);

    const form = document.getElementById('loan-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const type = document.getElementById('l-type').value;
      const personName = document.getElementById('l-person').value.trim();
      const amount = parseFloat(document.getElementById('l-amount').value) || 0;
      const date = document.getElementById('l-date').value;
      const dueDate = document.getElementById('l-due').value || null;
      const phone = document.getElementById('l-phone').value.trim();
      const note = document.getElementById('l-note').value.trim();

      if (!type || !personName || amount <= 0) {
        toast.error('الرجاء ملء الحقول المطلوبة');
        return;
      }

      const data = { type, personName, amount, date, dueDate, phone, note };

      if (isEdit) {
        db.updatePersonalLoan(loan.id, data);
        toast.success('تم تحديث القرض');
      } else {
        db.addPersonalLoan(data);
        toast.success('تم إضافة القرض بنجاح');
      }

      closeModal();
      renderLoansPage(container);
    });

    document.getElementById('cancel-loan-btn').addEventListener('click', closeModal);

    if (isEdit) {
      document.getElementById('delete-loan-btn').addEventListener('click', () => {
        if (confirm('هل أنت متأكد من حذف هذا القرض؟ سيتم حذف كل دفعاته أيضاً.')) {
          db.deletePersonalLoan(loan.id);
          toast.success('تم حذف القرض');
          closeModal();
          renderLoansPage(container);
        }
      });
    }
  }

  // ============================================================
  // تفاصيل القرض + الدفعات
  // ============================================================
  function openLoanDetails(loan) {
    const typeInfo = getLoanTypeInfo(loan.type);
    const payments = db.getLoanPaymentsByLoan(loan.id).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const remaining = Math.max(0, (loan.amount || 0) - totalPaid);
    const progress = loan.amount > 0 ? Math.min(100, Math.round((totalPaid / loan.amount) * 100)) : 0;
    const isGiven = loan.type === 'given';

    const paymentsHtml = payments.length === 0
      ? `<p style="text-align:center; color:var(--text-muted); padding: 12px; font-size: 13px;">لا توجد دفعات بعد.</p>`
      : payments.slice(0, 8).map(p => `
        <div style="padding: 8px 0; border-bottom: 1px solid var(--border-color); font-size: 13px;">
          <div class="flex-between">
            <span style="color: var(--text-muted);">📅 ${formatDate(p.date)}</span>
            <span style="font-weight: bold; color: ${isGiven ? '#2E7D32' : '#C62828'};">${money(p.amount)}</span>
          </div>
          ${p.note ? `<div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${p.note}</div>` : ''}
        </div>
      `).join('');

    const detailsHtml = `
      <h3 class="card-title no-border">${typeInfo.icon} ${loan.personName}</h3>
      
      <div style="background: var(--bg-color); padding: 12px; border-radius: var(--radius-md); margin-bottom: 16px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px;">
          <div><strong>💰 المبلغ:</strong> ${money(loan.amount)}</div>
          <div><strong>🏷️ النوع:</strong> ${typeInfo.label}</div>
          ${loan.phone ? `<div><strong>📞 الهاتف:</strong> ${loan.phone}</div>` : ''}
          ${loan.dueDate ? `<div><strong>📅 الاستحقاق:</strong> ${formatDate(loan.dueDate)}</div>` : ''}
        </div>
        ${loan.note ? `<div style="font-size: 12px; color: var(--text-muted); margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--border-color);">📝 ${loan.note}</div>` : ''}
      </div>

      <!-- شريط التقدم -->
      <div style="margin-bottom: 16px;">
        <div class="flex-between" style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">
          <span>نسبة السداد</span>
          <span>${progress}%</span>
        </div>
        <div style="background: var(--border-color); height: 10px; border-radius: var(--radius-full); overflow: hidden;">
          <div style="width: ${progress}%; height: 100%; background: ${isGiven ? 'linear-gradient(90deg, #66BB6A, #2E7D32)' : 'linear-gradient(90deg, #EF5350, #C62828)'}; border-radius: var(--radius-full); transition: width 0.5s;"></div>
        </div>
      </div>

      <!-- ملخص الأرقام -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px;">
        <div style="text-align: center; padding: 10px; background: #E8F5E9; border-radius: var(--radius-md);">
          <div style="font-size: 16px; font-weight: 800; color: #2E7D32;">${money(totalPaid)}</div>
          <div style="font-size: 11px; color: #1B5E20;">مدفوع</div>
        </div>
        <div style="text-align: center; padding: 10px; background: #FFEBEE; border-radius: var(--radius-md);">
          <div style="font-size: 16px; font-weight: 800; color: #C62828;">${money(remaining)}</div>
          <div style="font-size: 11px; color: #B71C1C;">متبقي</div>
        </div>
      </div>

      <h4 style="font-size: 14px; margin-bottom: 8px;">📜 آخر الدفعات:</h4>
      <div style="max-height: 180px; overflow-y: auto; margin-bottom: 12px;">${paymentsHtml}</div>

      ${remaining > 0 ? `
        <button class="btn btn-primary btn-full" id="add-loan-payment-btn">💵 إضافة دفعة سداد</button>
      ` : `
        <div style="text-align: center; padding: 12px; background: #E8F5E9; border-radius: var(--radius-md); color: #2E7D32; font-weight: 700; font-size: 14px;">
          ✅ تم سداد هذا القرض بالكامل
        </div>
      `}

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px;">
        <button class="btn btn-outline" id="edit-loan-details-btn">✏️ تعديل</button>
        <button class="btn btn-outline" id="close-loan-details">إغلاق</button>
      </div>
    `;

    openModal(detailsHtml);

    const paymentBtn = document.getElementById('add-loan-payment-btn');
    if (paymentBtn) {
      paymentBtn.addEventListener('click', () => {
        closeModal();
        setTimeout(() => openLoanPaymentModal(loan, remaining), 300);
      });
    }

    document.getElementById('edit-loan-details-btn').addEventListener('click', () => {
      closeModal();
      setTimeout(() => openLoanModal(loan), 300);
    });

    document.getElementById('close-loan-details').addEventListener('click', closeModal);
  }

  // ============================================================
  // نموذج دفعة قرض
  // ============================================================
  function openLoanPaymentModal(loan, suggestedAmount) {
    const typeInfo = getLoanTypeInfo(loan.type);
    const formHtml = `
      <h3 class="card-title no-border">💵 دفعة سداد: ${loan.personName}</h3>
      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">
        ${typeInfo.icon} ${typeInfo.label}
      </p>
      <form id="loan-payment-form">
        <div class="form-group">
          <label>المبلغ *</label>
          <input type="number" id="lp-amount" class="form-control" value="${suggestedAmount || ''}" placeholder="0" min="0" step="any" required>
        </div>
        <div class="form-group">
          <label>التاريخ *</label>
          <input type="date" id="lp-date" class="form-control" value="${today()}" required>
        </div>
        <div class="form-group">
          <label>ملاحظات</label>
          <input type="text" id="lp-note" class="form-control" placeholder="اختياري">
        </div>
        <div class="flex-between mt-2">
          <button type="button" class="btn btn-outline" id="cancel-lp-btn">إلغاء</button>
          <button type="submit" class="btn btn-primary">حفظ الدفعة</button>
        </div>
      </form>
    `;

    openModal(formHtml);

    const form = document.getElementById('loan-payment-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById('lp-amount').value);
      const date = document.getElementById('lp-date').value;
      const note = document.getElementById('lp-note').value.trim();

      if (!amount || amount <= 0) {
        toast.error('الرجاء إدخال مبلغ صحيح');
        return;
      }

      db.addLoanPayment({ loanId: loan.id, amount, date, note });
      toast.success('تم تسجيل الدفعة بنجاح');
      closeModal();
      renderLoansPage(container);
    });

    document.getElementById('cancel-lp-btn').addEventListener('click', closeModal);
  }

  // ============================================================
  // ربط الأحداث
  // ============================================================

  const addBtn = container.querySelector('#add-loan-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => openLoanModal(null));
  }

  // فلترة النوع
  container.querySelectorAll('.type-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedType = btn.dataset.type;
      renderLoansPage(container);
    });
  });

  // البحث
  const searchInput = container.querySelector('#search-loan-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      const pos = e.target.selectionStart;
      renderLoansPage(container);
      const newInput = container.querySelector('#search-loan-input');
      if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(pos, pos);
      }
    });
  }

  // النقر على قرض للتفاصيل
  container.querySelectorAll('.loan-item').forEach(item => {
    item.addEventListener('click', () => {
      const loan = db.getPersonalLoan(item.dataset.id);
      if (loan) openLoanDetails(loan);
    });
  });
}
