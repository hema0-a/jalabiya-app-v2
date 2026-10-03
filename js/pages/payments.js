/* ============================================================
   payments.js - صفحة الدفعات (V2)
   (النسخة الكاملة مع العرض التدريجي)
   ============================================================ */

import * as db from '../core/db.js';
import { toast } from '../ui/toast.js';
import { openModal, closeModal } from '../ui/modal.js';
import { today, money, formatDate, escapeHtml } from '../core/utils.js';
import { initProgressiveList } from '../core/list-renderer.js';

let searchQuery = '';

/* ============================================================
   الصفحة الرئيسية
   ============================================================ */
export function renderPaymentsPage(container) {
  const payments = db.getPayments();
  const orders = db.getOrders();
  const customers = db.getCustomers();

  // الإحصائيات
  const totalAmount = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const todayStr = today();
  const todayTotal = payments
    .filter(p => p.date === todayStr)
    .reduce((s, p) => s + (p.amount || 0), 0);
  const monthStr = todayStr.slice(0, 7);
  const monthTotal = payments
    .filter(p => (p.date || '').startsWith(monthStr))
    .reduce((s, p) => s + (p.amount || 0), 0);

  // تصفية بالبحث
  const filteredPayments = payments.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const order = orders.find(o => o.id === p.orderId);
    const customer = order ? customers.find(c => c.id === order.customerId) : null;
    const custName = customer ? customer.name.toLowerCase() : '';
    const note = (p.note || '').toLowerCase();
    return custName.includes(q) || note.includes(q);
  }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  let html = `
    <div class="card">
      <div class="flex-between mb-2">
        <h2 class="card-title no-border" style="margin:0;">💰 سجل الدفعات</h2>
        <button class="btn btn-primary" id="add-payment-btn">+ إضافة دفعة</button>
      </div>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px;">
        <div class="stat-card" style="padding: 10px 6px;">
          <div class="stat-value" style="font-size: 18px; color: var(--primary-color);">${money(totalAmount)}</div>
          <div class="stat-label">الإجمالي</div>
        </div>
        <div class="stat-card" style="padding: 10px 6px;">
          <div class="stat-value" style="font-size: 18px; color: #2E7D32;">${money(todayTotal)}</div>
          <div class="stat-label">اليوم</div>
        </div>
        <div class="stat-card" style="padding: 10px 6px;">
          <div class="stat-value" style="font-size: 18px; color: var(--accent-color);">${money(monthTotal)}</div>
          <div class="stat-label">هذا الشهر</div>
        </div>
      </div>

      <div class="form-group" style="margin-bottom: 12px;">
        <input type="text" id="search-payment-input" class="form-control" placeholder="🔍 ابحث باسم العميل أو الملاحظة..." value="${escapeHtml(searchQuery)}">
      </div>

      ${filteredPayments.length > 20 ? `
        <div style="background: #E3F2FD; padding: 8px 12px; border-radius: var(--radius-md); margin-bottom: 12px; font-size: 12px; color: #1565C0;">
          ℹ️ يتم عرض 20 دفعة في البداية، وسيتم تحميل المزيد عند التمرير.
        </div>
      ` : ''}

      <div id="payments-progressive-list"></div>
    </div>
  `;

  container.innerHTML = html;

  /* ============================================================
     بناء عنصر دفعة واحد
     ============================================================ */
  function buildPaymentItem(p) {
    const order = orders.find(o => o.id === p.orderId);
    const customer = order ? customers.find(c => c.id === order.customerId) : null;
    const custName = customer ? customer.name : 'عميل محذوف';

    return `
      <div class="payment-item" data-id="${p.id}" style="border: 1px solid var(--border-color); border-right: 4px solid var(--primary-color); padding: 12px; border-radius: var(--radius-md); background: var(--bg-color); cursor: pointer; margin-bottom: 8px;">
        <div class="flex-between" style="margin-bottom: 6px;">
          <div style="font-weight: bold; font-size: 15px;">👤 ${escapeHtml(custName)}</div>
          <div style="font-weight: 800; color: var(--primary-color); font-size: 15px;">${money(p.amount)} ج</div>
        </div>
        <div style="font-size: 12px; color: var(--text-muted);">
          📅 ${formatDate(p.date)}${p.note ? ' | 📝 ' + escapeHtml(p.note) : ''}
        </div>
        ${order ? `<div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">🧵 ${escapeHtml(order.garmentType || 'طلب')}</div>` : ''}
      </div>
    `;
  }

  /* ============================================================
     استخدام العرض التدريجي
     ============================================================ */
  const listContainer = document.getElementById('payments-progressive-list');
  if (listContainer) {
    if (filteredPayments.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💰</div>
          <p>${searchQuery ? 'لا توجد نتائج مطابقة.' : 'لا يوجد دفعات مسجلة حتى الآن.'}</p>
        </div>
      `;
    } else {
      initProgressiveList('payments-progressive-list', filteredPayments, buildPaymentItem, {
        batchSize: 20,
        emptyMessage: 'لا توجد دفعات'
      });
    }
  }

  /* ============================================================
     ربط أحداث العناصر المُحمّلة
     ============================================================ */
  function bindProgressiveEvents() {
    container.querySelectorAll('.payment-item').forEach(item => {
      if (item.dataset.bound === '1') return;
      item.dataset.bound = '1';
      item.addEventListener('click', () => {
        const payment = db.getPayment(item.dataset.id);
        if (payment) openPaymentDetails(payment);
      });
    });
  }

  setTimeout(bindProgressiveEvents, 100);
  window.addEventListener('scroll', bindProgressiveEvents, { passive: true });

  /* ============================================================
     نموذج إضافة دفعة
     ============================================================ */
  function openPaymentModal() {
    if (orders.length === 0) {
      toast.error('يجب إضافة طلب أولاً قبل تسجيل دفعة!');
      return;
    }

    const orderOptions = orders.map(o => {
      const customer = customers.find(c => c.id === o.customerId);
      const custName = customer ? customer.name : 'عميل محذوف';
      const remaining = (o.totalPrice || 0) - (o.deposit || 0);
      return `<option value="${o.id}">${escapeHtml(custName)} - ${escapeHtml(o.garmentType || 'طلب')} (المتبقي: ${money(remaining)})</option>`;
    }).join('');

    const formHtml = `
      <h3 class="card-title no-border">تسجيل دفعة جديدة</h3>
      <form id="payment-form">
        <div class="form-group">
          <label>الطلب *</label>
          <select id="payment-order" class="form-control" required>
            <option value="">اختر الطلب...</option>
            ${orderOptions}
          </select>
        </div>
        <div class="form-group">
          <label>المبلغ المدفوع *</label>
          <input type="number" id="payment-amount" class="form-control" placeholder="0" min="0" step="any" required>
        </div>
        <div class="form-group">
          <label>التاريخ *</label>
          <input type="date" id="payment-date" class="form-control" value="${today()}" required>
        </div>
        <div class="form-group">
          <label>ملاحظات</label>
          <input type="text" id="payment-note" class="form-control" placeholder="اختياري">
        </div>
        <div class="flex-between mt-2">
          <button type="button" class="btn btn-outline" id="cancel-payment-btn">إلغاء</button>
          <button type="submit" class="btn btn-primary">حفظ الدفعة</button>
        </div>
      </form>
    `;

    openModal(formHtml);

    document.getElementById('payment-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const orderId = document.getElementById('payment-order').value;
      const amount = parseFloat(document.getElementById('payment-amount').value);
      const date = document.getElementById('payment-date').value;
      const note = document.getElementById('payment-note').value.trim();

      if (!orderId || !amount || amount <= 0) {
        toast.error('الرجاء إدخال مبلغ صحيح');
        return;
      }

      db.addPayment({ orderId, amount, note, date });

      const order = db.getOrder(orderId);
      if (order) {
        const newDeposit = (order.deposit || 0) + amount;
        db.updateOrder(orderId, { deposit: newDeposit });
      }

      closeModal();
      toast.success('تم تسجيل الدفعة بنجاح');
      renderPaymentsPage(container);
    });

    document.getElementById('cancel-payment-btn').addEventListener('click', closeModal);
  }

  /* ============================================================
     تفاصيل دفعة
     ============================================================ */
  function openPaymentDetails(payment) {
    const order = orders.find(o => o.id === payment.orderId);
    const customer = order ? customers.find(c => c.id === order.customerId) : null;
    const custName = customer ? customer.name : 'عميل محذوف';

    const html = `
      <h3 class="card-title no-border">💰 تفاصيل الدفعة</h3>
      <div style="background: var(--bg-color); padding: 16px; border-radius: var(--radius-md); margin-bottom: 16px; text-align: center;">
        <div style="font-size: 32px; font-weight: 800; color: var(--primary-color); margin-bottom: 6px;">${money(payment.amount)} ج</div>
        <div style="font-size: 13px; color: var(--text-muted);">👤 ${escapeHtml(custName)}</div>
        ${order ? `<div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">🧵 ${escapeHtml(order.garmentType || 'طلب')}</div>` : ''}
        <div style="font-size: 13px; color: var(--text-muted); margin-top: 8px;">📅 ${formatDate(payment.date)}</div>
        ${payment.note ? `<div style="font-size: 13px; color: var(--text-secondary); margin-top: 8px;">📝 ${escapeHtml(payment.note)}</div>` : ''}
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <button class="btn btn-danger" id="delete-payment-btn">🗑️ حذف</button>
        <button class="btn btn-outline" id="close-payment-details">إغلاق</button>
      </div>
    `;

    openModal(html);

    document.getElementById('delete-payment-btn').addEventListener('click', () => {
      if (confirm('هل أنت متأكد من حذف هذه الدفعة؟')) {
        if (order) {
          const newDeposit = Math.max(0, (order.deposit || 0) - payment.amount);
          db.updateOrder(order.id, { deposit: newDeposit });
        }
        db.deletePayment(payment.id);
        toast.success('تم حذف الدفعة');
        closeModal();
        renderPaymentsPage(container);
      }
    });

    document.getElementById('close-payment-details').addEventListener('click', closeModal);
  }

  /* ============================================================
     ربط الأحداث
     ============================================================ */
  const addBtn = container.querySelector('#add-payment-btn');
  if (addBtn) addBtn.addEventListener('click', openPaymentModal);

  const searchInput = container.querySelector('#search-payment-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      const pos = e.target.selectionStart;
      renderPaymentsPage(container);
      const newInput = container.querySelector('#search-payment-input');
      if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(pos, pos);
      }
    });
  }

  /* ============================================================
     ربط FAB
     ============================================================ */
  if (window.__paymentsQuickListener) {
    document.removeEventListener('quick-action', window.__paymentsQuickListener);
  }
  window.__paymentsQuickListener = (e) => {
    if (e.detail.action === 'new-payment') {
      setTimeout(() => {
        const btn = container.querySelector('#add-payment-btn');
        if (btn) btn.click();
      }, 150);
    }
  };
  document.addEventListener('quick-action', window.__paymentsQuickListener);
}
