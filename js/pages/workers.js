/* ============================================================
   workers.js - صفحة إدارة العمال (V2)
   (تدعم: الإضافة، التعديل، الحذف، البحث، الدفعات، سجل الأجور)
   ============================================================ */

import * as db from '../core/db.js';
import { toast } from '../ui/toast.js';
import { openModal, closeModal } from '../ui/modal.js';
import { today, money, formatDate } from '../core/utils.js';
import { WORKER_SALARY_TYPES, WORKER_SPECIALTIES } from '../core/config.js';

// متغيرات حالة الصفحة
let searchQuery = '';
let viewMode = 'list'; // 'list' أو 'payments'

export function renderWorkersPage(container) {
  const allWorkers = db.getWorkers();
  const workerPayments = db.getWorkerPayments();

  // 1. تصفية العمال بالبحث
  const workers = allWorkers.filter(w => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = (w.name || '').toLowerCase();
    const phone = (w.phone || '').toLowerCase();
    return name.includes(q) || phone.includes(q);
  });

  // 2. حساب الإحصائيات
  const totalWorkers = allWorkers.filter(w => w.active !== false).length;
  const totalMonthlySalaries = allWorkers
    .filter(w => w.active !== false && w.salaryType === 'fixed')
    .reduce((sum, w) => sum + (w.salary || 0), 0);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyPayments = workerPayments.filter(p => {
    const d = new Date(p.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const monthlyTotal = monthlyPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // 3. بناء الهيكل الأساسي
  let html = `
    <div class="card">
      <div class="flex-between mb-2">
        <h2 class="card-title no-border" style="margin:0;">👷 العمال</h2>
        <button class="btn btn-primary" id="add-worker-btn">+ إضافة عامل</button>
      </div>

      <!-- إحصائيات -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px;">
        <div class="stat-card" style="padding: 10px 6px;">
          <div class="stat-value" style="font-size: 20px;">${totalWorkers}</div>
          <div class="stat-label">عامل نشط</div>
        </div>
        <div class="stat-card" style="padding: 10px 6px;">
          <div class="stat-value" style="font-size: 18px; color: var(--accent-color);">${money(totalMonthlySalaries)}</div>
          <div class="stat-label">رواتب ثابتة/شهر</div>
        </div>
        <div class="stat-card" style="padding: 10px 6px;">
          <div class="stat-value" style="font-size: 18px; color: #dc3545;">${money(monthlyTotal)}</div>
          <div class="stat-label">مدفوع هذا الشهر</div>
        </div>
      </div>

      <!-- تبديل بين العمال والدفعات -->
      <div class="kanban-toggle">
        <button class="btn ${viewMode === 'list' ? 'btn-primary' : 'btn-outline'}" id="view-workers-btn">
          👷 قائمة العمال
        </button>
        <button class="btn ${viewMode === 'payments' ? 'btn-primary' : 'btn-outline'}" id="view-payments-btn">
          💵 سجل الدفعات
        </button>
      </div>

      ${viewMode === 'list' ? `
        <!-- حقل البحث -->
        <div class="form-group" style="margin-bottom: 12px;">
          <input type="text" id="search-worker-input" class="form-control" placeholder="🔍 ابحث باسم العامل أو رقم الهاتف..." value="${searchQuery}">
        </div>
      ` : ''}
  `;

  // 4. عرض المحتوى حسب الوضع
  if (viewMode === 'list') {
    html += renderWorkersList(workers);
  } else {
    html += renderPaymentsList(workerPayments);
  }

  html += `</div>`;
  container.innerHTML = html;

  // ============================================================
  // دوال مساعدة
  // ============================================================
  function getSalaryTypeInfo(typeId) {
    return WORKER_SALARY_TYPES.find(s => s.id === typeId) || WORKER_SALARY_TYPES[0];
  }

  function getSpecialtyInfo(specId) {
    return WORKER_SPECIALTIES.find(s => s.id === specId) || null;
  }

  // ============================================================
  // عرض قائمة العمال
  // ============================================================
  function renderWorkersList(workers) {
    if (workers.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon">👷</div>
          <p>${searchQuery ? 'لا توجد نتائج مطابقة.' : 'لا يوجد عمال مسجلين حتى الآن.'}</p>
        </div>
      `;
    }

    let result = `<div style="display:flex; flex-direction:column; gap:8px;">`;
    workers.forEach(w => {
      const salaryInfo = getSalaryTypeInfo(w.salaryType);
      const specInfo = w.specialty ? getSpecialtyInfo(w.specialty) : null;
      const workerPaymentsList = db.getWorkerPaymentsByWorker(w.id);
      const totalPaid = workerPaymentsList.reduce((sum, p) => sum + (p.amount || 0), 0);
      const isInactive = w.active === false;

      result += `
        <div class="worker-item" data-id="${w.id}" style="border: 1px solid var(--border-color); padding: 12px; border-radius: var(--radius-md); background: var(--bg-color); cursor: pointer; ${isInactive ? 'opacity: 0.6;' : ''}">
          <div class="flex-between" style="margin-bottom: 6px;">
            <div style="font-weight: bold; font-size: 15px;">
              👤 ${w.name}
              ${isInactive ? '<span class="badge badge-danger" style="margin-right: 6px;">موقوف</span>' : ''}
            </div>
            <span class="badge badge-primary">${salaryInfo.icon} ${salaryInfo.label}</span>
          </div>
          <div style="font-size: 12px; color: var(--text-muted); display: flex; flex-direction: column; gap: 3px;">
            ${w.phone ? `<div>📞 ${w.phone}</div>` : ''}
            ${specInfo ? `<div>🎯 ${specInfo.icon} ${specInfo.label}</div>` : ''}
            <div>💰 ${w.salaryType === 'per_piece' ? 'سعر القطعة' : 'الراتب'}: <span style="color: var(--primary-color); font-weight: 700;">${money(w.salary)}</span></div>
            <div>💵 إجمالي المدفوع له: <span style="color: var(--accent-color); font-weight: 700;">${money(totalPaid)}</span></div>
          </div>
        </div>
      `;
    });
    result += `</div>`;
    return result;
  }

  // ============================================================
  // عرض سجل الدفعات
  // ============================================================
  function renderPaymentsList(payments) {
    if (payments.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon">💵</div>
          <p>لا توجد دفعات مسجلة للعمال حتى الآن.</p>
        </div>
      `;
    }

    // ترتيب الدفعات من الأحدث
    const sorted = [...payments].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    let result = `<div style="display:flex; flex-direction:column; gap:8px;">`;
    sorted.forEach(p => {
      const worker = db.getWorker(p.workerId);
      const workerName = worker ? worker.name : 'عامل محذوف';
      
      result += `
        <div class="worker-payment-item" data-id="${p.id}" style="border: 1px solid var(--border-color); padding: 12px; border-radius: var(--radius-md); background: var(--bg-color); cursor: pointer;">
          <div class="flex-between" style="margin-bottom: 4px;">
            <div style="font-weight: bold; font-size: 14px;">👤 ${workerName}</div>
            <div style="font-weight: bold; color: var(--accent-color); font-size: 15px;">${money(p.amount)}</div>
          </div>
          <div style="font-size: 12px; color: var(--text-muted);">
            📅 ${formatDate(p.date)}${p.note ? ' | 📝 ' + p.note : ''}
          </div>
        </div>
      `;
    });
    result += `</div>`;
    return result;
  }

  // ============================================================
  // نموذج الإضافة/التعديل للعامل
  // ============================================================
  function openWorkerModal(worker = null) {
    const isEdit = worker !== null;
    const title = isEdit ? 'تعديل بيانات العامل' : 'إضافة عامل جديد';

    const salaryTypeOptions = WORKER_SALARY_TYPES.map(s => {
      const selected = (isEdit && s.id === worker.salaryType) ? 'selected' : '';
      return `<option value="${s.id}" ${selected}>${s.icon} ${s.label}</option>`;
    }).join('');

    const specialtyOptions = `
      <option value="">بدون تخصص</option>
      ${WORKER_SPECIALTIES.map(s => {
        const selected = (isEdit && s.id === worker.specialty) ? 'selected' : '';
        return `<option value="${s.id}" ${selected}>${s.icon} ${s.label}</option>`;
      }).join('')}
    `;

    const formHtml = `
      <h3 class="card-title no-border">${title}</h3>
      <form id="worker-form">
        <div class="form-group">
          <label>اسم العامل *</label>
          <input type="text" id="worker-name" class="form-control" value="${isEdit ? worker.name : ''}" required>
        </div>
        <div class="form-group">
          <label>رقم الهاتف (اختياري)</label>
          <input type="tel" id="worker-phone" class="form-control" value="${isEdit ? (worker.phone || '') : ''}">
        </div>
        <div class="form-group">
          <label>التخصص</label>
          <select id="worker-specialty" class="form-control">
            ${specialtyOptions}
          </select>
        </div>
        <div class="form-group">
          <label>نوع الأجر *</label>
          <select id="worker-salary-type" class="form-control" required>
            ${salaryTypeOptions}
          </select>
        </div>
        <div class="form-group">
          <label id="salary-label">${isEdit && worker.salaryType === 'per_piece' ? 'سعر القطعة' : 'الراتب الشهري'} *</label>
          <input type="number" id="worker-salary" class="form-control" value="${isEdit ? (worker.salary || 0) : 0}" min="0" required>
        </div>
        <div class="form-group">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" id="worker-active" ${!isEdit || worker.active !== false ? 'checked' : ''} style="width: 18px; height: 18px;">
            <span>عامل نشط حالياً</span>
          </label>
        </div>
        <div class="form-group">
          <label>ملاحظات</label>
          <input type="text" id="worker-note" class="form-control" value="${isEdit ? (worker.note || '') : ''}" placeholder="اختياري">
        </div>
        <div class="flex-between mt-2">
          <div>
            ${isEdit ? `<button type="button" class="btn btn-danger" id="delete-worker-btn">حذف</button>` : ''}
          </div>
          <div>
            <button type="button" class="btn btn-outline" id="cancel-worker-btn">إلغاء</button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'تحديث' : 'حفظ'}</button>
          </div>
        </div>
      </form>
    `;

    openModal(formHtml);

    // تغيير اسم حقل الراتب بناءً على النوع
    const salaryTypeSelect = document.getElementById('worker-salary-type');
    const salaryLabel = document.getElementById('salary-label');
    salaryTypeSelect.addEventListener('change', (e) => {
      const type = e.target.value;
      if (type === 'per_piece') salaryLabel.textContent = 'سعر القطعة *';
      else if (type === 'daily') salaryLabel.textContent = 'الأجر اليومي *';
      else if (type === 'hourly') salaryLabel.textContent = 'الأجر بالساعة *';
      else salaryLabel.textContent = 'الراتب الشهري *';
    });

    const form = document.getElementById('worker-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('worker-name').value.trim();
      const phone = document.getElementById('worker-phone').value.trim();
      const specialty = document.getElementById('worker-specialty').value;
      const salaryType = document.getElementById('worker-salary-type').value;
      const salary = parseFloat(document.getElementById('worker-salary').value) || 0;
      const active = document.getElementById('worker-active').checked;
      const note = document.getElementById('worker-note').value.trim();

      if (!name) {
        toast.error('الرجاء إدخال اسم العامل');
        return;
      }

      const workerData = { name, phone, specialty, salaryType, salary, active, note };

      if (isEdit) {
        db.updateWorker(worker.id, workerData);
        toast.success('تم تحديث بيانات العامل');
      } else {
        db.addWorker(workerData);
        toast.success('تم إضافة العامل بنجاح');
      }

      closeModal();
      renderWorkersPage(container);
    });

    document.getElementById('cancel-worker-btn').addEventListener('click', closeModal);

    if (isEdit) {
      document.getElementById('delete-worker-btn').addEventListener('click', () => {
        if (confirm('هل أنت متأكد من حذف هذا العامل؟ سيتم أيضاً حذف كل سجل دفعاته.')) {
          // حذف جميع دفعات هذا العامل أولاً
          const workerPays = db.getWorkerPaymentsByWorker(worker.id);
          workerPays.forEach(p => db.deleteWorkerPayment(p.id));
          // ثم حذف العامل
          db.deleteWorker(worker.id);
          toast.success('تم حذف العامل');
          closeModal();
          renderWorkersPage(container);
        }
      });
    }
  }

  // ============================================================
  // نموذج دفعة عامل جديدة
  // ============================================================
  function openWorkerPaymentModal(worker) {
    if (!worker) return;

    const formHtml = `
      <h3 class="card-title no-border">💵 دفعة للعامل: ${worker.name}</h3>
      <form id="worker-payment-form">
        <div class="form-group">
          <label>المبلغ *</label>
          <input type="number" id="wp-amount" class="form-control" placeholder="0" required>
        </div>
        <div class="form-group">
          <label>التاريخ *</label>
          <input type="date" id="wp-date" class="form-control" value="${today()}" required>
        </div>
        <div class="form-group">
          <label>ملاحظات</label>
          <input type="text" id="wp-note" class="form-control" placeholder="مثال: راتب شهر كذا / دفعة أولى">
        </div>
        <div class="flex-between mt-2">
          <button type="button" class="btn btn-outline" id="cancel-wp-btn">إلغاء</button>
          <button type="submit" class="btn btn-primary">حفظ الدفعة</button>
        </div>
      </form>
    `;

    openModal(formHtml);

    const form = document.getElementById('worker-payment-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById('wp-amount').value);
      const date = document.getElementById('wp-date').value;
      const note = document.getElementById('wp-note').value.trim();

      if (!amount || amount <= 0) {
        toast.error('الرجاء إدخال مبلغ صحيح');
        return;
      }

      db.addWorkerPayment({ workerId: worker.id, amount, date, note });
      // تسجيل الدفعة كـ مصروف أيضاً
      db.addExpense({ category: 'workers', amount, date, note: `دفعة للعامل ${worker.name}`, });
      
      toast.success('تم تسجيل الدفعة بنجاح');
      closeModal();
      renderWorkersPage(container);
    });

    document.getElementById('cancel-wp-btn').addEventListener('click', closeModal);
  }

  // ============================================================
  // نافذة تفاصيل العامل (عند النقر على بطاقة عامل)
  // ============================================================
  function openWorkerDetails(worker) {
    const salaryInfo = getSalaryTypeInfo(worker.salaryType);
    const specInfo = worker.specialty ? getSpecialtyInfo(worker.specialty) : null;
    const workerPays = db.getWorkerPaymentsByWorker(worker.id).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const totalPaid = workerPays.reduce((sum, p) => sum + (p.amount || 0), 0);

    const paymentsHtml = workerPays.length === 0
      ? `<p style="text-align:center; color:var(--text-muted); padding: 12px;">لا توجد دفعات بعد.</p>`
      : workerPays.slice(0, 10).map(p => `
        <div style="padding: 8px 0; border-bottom: 1px solid var(--border-color); font-size: 13px;">
          <div class="flex-between">
            <span style="color: var(--text-muted);">📅 ${formatDate(p.date)}</span>
            <span style="font-weight: bold; color: var(--accent-color);">${money(p.amount)}</span>
          </div>
          ${p.note ? `<div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${p.note}</div>` : ''}
        </div>
      `).join('');

    const detailsHtml = `
      <h3 class="card-title no-border">👤 ${worker.name}</h3>
      
      <div style="background: var(--bg-color); padding: 12px; border-radius: var(--radius-md); margin-bottom: 16px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px;">
          ${worker.phone ? `<div><strong>📞 الهاتف:</strong> ${worker.phone}</div>` : ''}
          ${specInfo ? `<div><strong>🎯 التخصص:</strong> ${specInfo.icon} ${specInfo.label}</div>` : ''}
          <div><strong>💰 نوع الأجر:</strong> ${salaryInfo.icon} ${salaryInfo.label}</div>
          <div><strong>💵 القيمة:</strong> ${money(worker.salary)}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px;">
        <div style="text-align: center; padding: 10px; background: var(--bg-color); border-radius: var(--radius-md);">
          <div style="font-size: 16px; font-weight: 800; color: var(--accent-color);">${money(totalPaid)}</div>
          <div style="font-size: 11px; color: var(--text-muted);">إجمالي المدفوع</div>
        </div>
        <div style="text-align: center; padding: 10px; background: var(--bg-color); border-radius: var(--radius-md);">
          <div style="font-size: 16px; font-weight: 800; color: var(--primary-color);">${workerPays.length}</div>
          <div style="font-size: 11px; color: var(--text-muted);">عدد الدفعات</div>
        </div>
      </div>

      <h4 style="font-size: 14px; margin-bottom: 8px;">📜 آخر الدفعات:</h4>
      <div style="max-height: 200px; overflow-y: auto;">${paymentsHtml}</div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 16px;">
        <button class="btn btn-primary" id="add-payment-for-worker">💵 دفعة جديدة</button>
        <button class="btn btn-outline" id="edit-worker-details">✏️ تعديل البيانات</button>
      </div>
      <button class="btn btn-outline btn-full mt-2" id="close-worker-details">إغلاق</button>
    `;

    openModal(detailsHtml);

    document.getElementById('add-payment-for-worker').addEventListener('click', () => {
      closeModal();
      setTimeout(() => openWorkerPaymentModal(worker), 300);
    });

    document.getElementById('edit-worker-details').addEventListener('click', () => {
      closeModal();
      setTimeout(() => openWorkerModal(worker), 300);
    });

    document.getElementById('close-worker-details').addEventListener('click', closeModal);
  }

  // ============================================================
  // نافذة تفاصيل دفعة عامل (تعديل/حذف)
  // ============================================================
  function openPaymentDetails(payment) {
    const worker = db.getWorker(payment.workerId);
    const workerName = worker ? worker.name : 'عامل محذوف';

    const detailsHtml = `
      <h3 class="card-title no-border">💵 دفعة للعامل: ${workerName}</h3>
      
      <div style="background: var(--bg-color); padding: 16px; border-radius: var(--radius-md); margin-bottom: 16px; text-align: center;">
        <div style="font-size: 28px; font-weight: 800; color: var(--accent-color); margin-bottom: 6px;">${money(payment.amount)}</div>
        <div style="font-size: 13px; color: var(--text-muted);">📅 ${formatDate(payment.date)}</div>
        ${payment.note ? `<div style="font-size: 13px; color: var(--text-secondary); margin-top: 8px;">📝 ${payment.note}</div>` : ''}
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <button class="btn btn-danger" id="delete-payment-btn">🗑️ حذف</button>
        <button class="btn btn-outline" id="close-payment-details">إغلاق</button>
      </div>
    `;

    openModal(detailsHtml);

    document.getElementById('delete-payment-btn').addEventListener('click', () => {
      if (confirm('هل أنت متأكد من حذف هذه الدفعة؟')) {
        db.deleteWorkerPayment(payment.id);
        toast.success('تم حذف الدفعة');
        closeModal();
        renderWorkersPage(container);
      }
    });

    document.getElementById('close-payment-details').addEventListener('click', closeModal);
  }

  // ============================================================
  // ربط الأحداث
  // ============================================================

  // زر الإضافة
  const addBtn = container.querySelector('#add-worker-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => openWorkerModal(null));
  }

  // تبديل قائمة العمال / الدفعات
  const workersViewBtn = container.querySelector('#view-workers-btn');
  if (workersViewBtn) {
    workersViewBtn.addEventListener('click', () => {
      viewMode = 'list';
      renderWorkersPage(container);
    });
  }

  const paymentsViewBtn = container.querySelector('#view-payments-btn');
  if (paymentsViewBtn) {
    paymentsViewBtn.addEventListener('click', () => {
      viewMode = 'payments';
      renderWorkersPage(container);
    });
  }

  // حقل البحث
  const searchInput = container.querySelector('#search-worker-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      const pos = e.target.selectionStart;
      renderWorkersPage(container);
      const newInput = container.querySelector('#search-worker-input');
      if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(pos, pos);
      }
    });
  }

  // النقر على عامل
  container.querySelectorAll('.worker-item').forEach(item => {
    item.addEventListener('click', () => {
      const worker = db.getWorker(item.dataset.id);
      if (worker) openWorkerDetails(worker);
    });
  });

  // النقر على دفعة
  container.querySelectorAll('.worker-payment-item').forEach(item => {
    item.addEventListener('click', () => {
      const payment = db.getWorkerPayment(item.dataset.id);
      if (payment) openPaymentDetails(payment);
    });
  });
}
