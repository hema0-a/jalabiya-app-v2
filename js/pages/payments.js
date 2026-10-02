/* ============================================================
   payments.js - صفحة إدارة الدفعات (V2)
   ============================================================ */

import * as db from '../core/db.js';
import { toast } from '../ui/toast.js';
import { openModal, closeModal } from '../ui/modal.js';
import { today, money } from '../core/utils.js';

export function renderPaymentsPage(container) {
  const payments = db.getPayments();
  const orders = db.getOrders();
  const customers = db.getCustomers();

  let html = `
    <div class="card">
      <div class="flex-between mb-2">
        <h2 class="card-title" style="margin:0; border:none;">سجل الدفعات</h2>
        <button class="btn btn-primary" id="add-payment-btn">+ إضافة دفعة</button>
      </div>
  `;

  if (payments.length === 0) {
    html += `
      <div class="text-center" style="padding: 40px 10px; color: var(--text-muted);">
        <div style="font-size: 40px; margin-bottom: 10px;">💰</div>
        <p>لا يوجد دفعات مسجلة حتى الآن.</p>
      </div>
    `;
  } else {
    html += `<div style="display:flex; flex-direction:column; gap:8px;">`;
    payments.forEach(p => {
      const order = orders.find(o => o.id === p.orderId);
      const customer = order ? customers.find(c => c.id === order.customerId) : null;
      const custName = customer ? customer.name : 'عميل محذوف';
      
      html += `
        <div style="border: 1px solid var(--border-color); padding: 12px; border-radius: var(--radius-md); background: var(--bg-color);">
          <div style="font-weight:bold; font-size:16px;">👤 ${custName}</div>
          <div style="font-size:13px; margin-top:4px;">💵 المبلغ: ${money(p.amount)}</div>
          <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">
            📅 التاريخ: ${p.date} | 📝 ${p.note || 'بدون ملاحظات'}
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }

  html += `</div>`;
  container.innerHTML = html;

  // ربط زر الإضافة
  const addBtn = container.querySelector('#add-payment-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      if (orders.length === 0) {
        toast.error('يجب إضافة طلب أولاً قبل تسجيل دفعة!');
        return;
      }

      // بناء قائمة الطلبات مع أسماء العملاء
      const orderOptions = orders.map(o => {
        const customer = customers.find(c => c.id === o.customerId);
        const custName = customer ? customer.name : 'عميل محذوف';
        const remaining = (o.totalPrice || 0) - (o.deposit || 0);
        return `<option value="${o.id}">${custName} - ${o.garmentType} (المتبقي: ${remaining})</option>`;
      }).join('');

      const formHtml = `
        <h3 class="card-title">تسجيل دفعة جديدة</h3>
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
            <input type="number" id="payment-amount" class="form-control" placeholder="0" required>
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

      const form = document.getElementById('payment-form');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const orderId = document.getElementById('payment-order').value;
        const amount = parseFloat(document.getElementById('payment-amount').value);
        const note = document.getElementById('payment-note').value.trim();

        if (!orderId || !amount || amount <= 0) {
          toast.error('الرجاء إدخال مبلغ صحيح');
          return;
        }

        // 1. إضافة الدفعة إلى قاعدة البيانات
        db.addPayment({
          orderId,
          amount,
          note,
          date: today()
        });

        // 2. تحديث الطلب (إضافة المبلغ إلى المقدم)
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
    });
  }
}
