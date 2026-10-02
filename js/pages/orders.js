/* ============================================================
   orders.js - صفحة إدارة الطلبات (V2)
   (تدعم الإضافة، التعديل، الحذف، والبحث)
   ============================================================ */

import * as db from '../core/db.js';
import { toast } from '../ui/toast.js';
import { openModal, closeModal } from '../ui/modal.js';
import { today, money } from '../core/utils.js';

// متغير لتخزين نص البحث
let searchQuery = '';

export function renderOrdersPage(container) {
  const allOrders = db.getOrders();
  const customers = db.getCustomers();

  // 1. تصفية الطلبات بناءً على نص البحث (اسم العميل أو نوع الجلابية)
  const orders = searchQuery
    ? allOrders.filter(o => {
        const customer = customers.find(c => c.id === o.customerId);
        const custName = customer ? customer.name : '';
        return custName.toLowerCase().includes(searchQuery.toLowerCase()) ||
               (o.garmentType && o.garmentType.toLowerCase().includes(searchQuery.toLowerCase()));
      })
    : allOrders;

  let html = `
    <div class="card">
      <div class="flex-between mb-2">
        <h2 class="card-title" style="margin:0; border:none;">قائمة الطلبات</h2>
        <button class="btn btn-primary" id="add-order-btn">+ إضافة طلب</button>
      </div>
      
      <!-- حقل البحث -->
      <div class="form-group" style="margin-bottom: 16px;">
        <input type="text" id="search-order-input" class="form-control" placeholder="🔍 ابحث باسم العميل أو نوع الجلابية..." value="${searchQuery}">
      </div>
  `;

  if (orders.length === 0) {
    html += `
      <div class="text-center" style="padding: 40px 10px; color: var(--text-muted);">
        <div style="font-size: 40px; margin-bottom: 10px;">📋</div>
        <p>${searchQuery ? 'لا توجد نتائج مطابقة لبحثك.' : 'لا يوجد طلبات مسجلة حتى الآن.'}</p>
      </div>
    `;
  } else {
    html += `<div style="display:flex; flex-direction:column; gap:8px;">`;
    orders.forEach(o => {
      const customer = customers.find(c => c.id === o.customerId);
      const custName = customer ? customer.name : 'عميل محذوف';
      const remaining = (o.totalPrice || 0) - (o.deposit || 0);
      
      html += `
        <div class="order-item" data-id="${o.id}" style="border: 1px solid var(--border-color); padding: 12px; border-radius: var(--radius-md); background: var(--bg-color); cursor: pointer;">
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

  // ===== دالة فتح نموذج الإضافة/التعديل =====
  function openOrderModal(order = null) {
    if (customers.length === 0) {
      toast.error('يجب إضافة عميل أولاً قبل إضافة طلب!');
      return;
    }

    const isEdit = order !== null;
    const title = isEdit ? 'تعديل الطلب' : 'إضافة طلب جديد';

    const customerOptions = customers.map(c => {
      const selected = (isEdit && c.id === order.customerId) ? 'selected' : '';
      return `<option value="${c.id}" ${selected}>${c.name}</option>`;
    }).join('');

    const formHtml = `
      <h3 class="card-title">${title}</h3>
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
          <input type="text" id="order-garment" class="form-control" value="${isEdit ? order.garmentType : ''}" required>
        </div>
        <div class="form-group">
          <label>الكمية *</label>
          <input type="number" id="order-qty" class="form-control" value="${isEdit ? order.quantity : 1}" min="1" required>
        </div>
        <div class="form-group">
          <label>السعر الإجمالي *</label>
          <input type="number" id="order-price" class="form-control" value="${isEdit ? order.totalPrice : ''}" required>
        </div>
        <div class="form-group">
          <label>المقدم (الدفعة الأولى)</label>
          <input type="number" id="order-deposit" class="form-control" value="${isEdit ? (order.deposit || 0) : 0}">
        </div>
        <div class="flex-between mt-2">
          <div>
            ${isEdit ? `<button type="button" class="btn btn-danger" id="delete-order-btn">حذف</button>` : ''}
          </div>
          <div>
            <button type="button" class="btn btn-outline" id="cancel-order-btn">إلغاء</button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'تحديث' : 'حفظ'}</button>
          </div>
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

      const orderData = { customerId, garmentType, quantity, totalPrice, deposit, date: today() };

      if (isEdit) {
        db.updateOrder(order.id, orderData);
        toast.success('تم تحديث الطلب');
      } else {
        db.addOrder(orderData);
        toast.success('تم إضافة الطلب بنجاح');
      }

      closeModal();
      renderOrdersPage(container);
    });

    document.getElementById('cancel-order-btn').addEventListener('click', closeModal);

    if (isEdit) {
      document.getElementById('delete-order-btn').addEventListener('click', () => {
        if (confirm('هل أنت متأكد من حذف هذا الطلب؟')) {
          db.deleteOrder(order.id);
          toast.success('تم حذف الطلب');
          closeModal();
          renderOrdersPage(container);
        }
      });
    }
  }

  // ===== ربط الأحداث =====
  
  // زر الإضافة
  const addBtn = container.querySelector('#add-order-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => openOrderModal(null));
  }

  // حقل البحث
  const searchInput = container.querySelector('#search-order-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      const pos = e.target.selectionStart;
      renderOrdersPage(container);
      const newInput = container.querySelector('#search-order-input');
      if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(pos, pos);
      }
    });
  }

  // النقر على طلب للتعديل
  container.querySelectorAll('.order-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      const order = db.getOrder(id);
      if (order) openOrderModal(order);
    });
  });
}
