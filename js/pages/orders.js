/* ============================================================
   orders.js - صفحة إدارة الطلبات (V2)
   ============================================================ */

import * as db from '../core/db.js';
import { toast } from '../ui/toast.js';
import { openModal, closeModal } from '../ui/modal.js';
import { today, money } from '../core/utils.js';

export function renderOrdersPage(container) {
  const orders = db.getOrders();
  const customers = db.getCustomers();

  let html = `
    <div class="card">
      <div class="flex-between mb-2">
        <h2 class="card-title" style="margin:0; border:none;">قائمة الطلبات</h2>
        <button class="btn btn-primary" id="add-order-btn">+ إضافة طلب</button>
      </div>
  `;

  if (orders.length === 0) {
    html += `
      <div class="text-center" style="padding: 40px 10px; color: var(--text-muted);">
        <div style="font-size: 40px; margin-bottom: 10px;">📋</div>
        <p>لا يوجد طلبات مسجلة حتى الآن.</p>
      </div>
    `;
  } else {
    html += `<div style="display:flex; flex-direction:column; gap:8px;">`;
    orders.forEach(o => {
      const customer = customers.find(c => c.id === o.customerId);
      const custName = customer ? customer.name : 'عميل محذوف';
      const remaining = (o.totalPrice || 0) - (o.deposit || 0);
      
      html += `
        <div style="border: 1px solid var(--border-color); padding: 12px; border-radius: var(--radius-md); background: var(--bg-color);">
          <div style="font-weight:bold; font-size:16px;">👤 ${custName}</div>
          <div style="font-size:13px; margin-top:4px;">🧵 ${o.garmentType} (الكمية: ${o.quantity})</div>
          <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">
            💰 الإجمالي: ${money(o.totalPrice)} | المدفوع: ${money(o.deposit)} | المتبقي: ${money(remaining)}
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }

  html += `</div>`;
  container.innerHTML = html;

  // ربط زر الإضافة
  const addBtn = container.querySelector('#add-order-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      if (customers.length === 0) {
        toast.error('يجب إضافة عميل أولاً قبل إضافة طلب!');
        return;
      }

      const customerOptions = customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

      const formHtml = `
        <h3 class="card-title">إضافة طلب جديد</h3>
        <form id="order-form">
          <div class="form-group">
            <label>العميل *</label>
            <select id="order-customer" class="form-control" required>
              <option value="">اختر العميل...</option>
              ${customerOptions}
            </select>
          </div>
          <div class="form-group">
            <label>نوع الجلابية *</label>
            <input type="text" id="order-garment" class="form-control" placeholder="مثال: جلابية سادة" required>
          </div>
          <div class="form-group">
            <label>الكمية *</label>
            <input type="number" id="order-qty" class="form-control" value="1" min="1" required>
          </div>
          <div class="form-group">
            <label>السعر الإجمالي *</label>
            <input type="number" id="order-price" class="form-control" placeholder="0" required>
          </div>
          <div class="form-group">
            <label>المقدم (الدفعة الأولى)</label>
            <input type="number" id="order-deposit" class="form-control" value="0">
          </div>
          <div class="flex-between mt-2">
            <button type="button" class="btn btn-outline" id="cancel-order-btn">إلغاء</button>
            <button type="submit" class="btn btn-primary">حفظ الطلب</button>
          </div>
        </form>
      `;
      
      openModal(formHtml);

      const form = document.getElementById('order-form');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const customerId = document.getElementById('order-customer').value;
        const garmentType = document.getElementById('order-garment').value.trim();
        const quantity = parseInt(document.getElementById('order-qty').value);
        const totalPrice = parseFloat(document.getElementById('order-price').value);
        const deposit = parseFloat(document.getElementById('order-deposit').value) || 0;

        if (!customerId || !garmentType || !quantity || !totalPrice) {
          toast.error('الرجاء ملء جميع الحقول المطلوبة');
          return;
        }

        db.addOrder({
          customerId,
          garmentType,
          quantity,
          totalPrice,
          deposit,
          date: today()
        });

        closeModal();
        toast.success('تم إضافة الطلب بنجاح');
        renderOrdersPage(container);
      });

      document.getElementById('cancel-order-btn').addEventListener('click', closeModal);
    });
  }
}
