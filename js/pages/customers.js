/* ============================================================
   customers.js - صفحة إدارة العملاء (V2)
   (تدعم الإضافة، التعديل، والحذف)
   ============================================================ */

import * as db from '../core/db.js';
import { toast } from '../ui/toast.js';
import { openModal, closeModal } from '../ui/modal.js';

export function renderCustomersPage(container) {
  const customers = db.getCustomers();
  
  // بناء الهيكل الأساسي للصفحة
  let html = `
    <div class="card">
      <div class="flex-between mb-2">
        <h2 class="card-title" style="margin:0; border:none;">قائمة العملاء</h2>
        <button class="btn btn-primary" id="add-customer-btn">+ إضافة عميل</button>
      </div>
  `;

  if (customers.length === 0) {
    html += `
      <div class="text-center" style="padding: 40px 10px; color: var(--text-muted);">
        <div style="font-size: 40px; margin-bottom: 10px;">👥</div>
        <p>لا يوجد عملاء مسجلين حتى الآن.</p>
      </div>
    `;
  } else {
    html += `<div style="display:flex; flex-direction:column; gap:8px;">`;
    customers.forEach(c => {
      html += `
        <div class="customer-item" data-id="${c.id}" style="border: 1px solid var(--border-color); padding: 12px; border-radius: var(--radius-md); background: var(--bg-color); cursor: pointer;">
          <div style="font-weight:bold; font-size:16px;">${c.name}</div>
          <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">
            📞 ${c.phone || 'لا يوجد هاتف'}
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }

  html += `</div>`;
  container.innerHTML = html;

  // ===== دالة فتح نموذج الإضافة/التعديل =====
  function openCustomerModal(customer = null) {
    const isEdit = customer !== null;
    const title = isEdit ? 'تعديل بيانات العميل' : 'إضافة عميل جديد';
    const nameVal = isEdit ? customer.name : '';
    const phoneVal = isEdit ? (customer.phone || '') : '';

    const formHtml = `
      <h3 class="card-title">${title}</h3>
      <form id="customer-form">
        <div class="form-group">
          <label>اسم العميل *</label>
          <input type="text" id="customer-name" class="form-control" value="${nameVal}" required>
        </div>
        <div class="form-group">
          <label>رقم الهاتف (اختياري)</label>
          <input type="tel" id="customer-phone" class="form-control" value="${phoneVal}">
        </div>
        <div class="flex-between mt-2">
          <div>
            ${isEdit ? `<button type="button" class="btn btn-danger" id="delete-customer-btn">حذف</button>` : ''}
          </div>
          <div>
            <button type="button" class="btn btn-outline" id="cancel-btn">إلغاء</button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'تحديث' : 'حفظ'}</button>
          </div>
        </div>
      </form>
    `;
    
    openModal(formHtml);

    const form = document.getElementById('customer-form');
    
    // حفظ (إضافة أو تعديل)
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('customer-name').value.trim();
      const phone = document.getElementById('customer-phone').value.trim();
      
      if (!name) {
        toast.error('الرجاء إدخال اسم العميل');
        return;
      }

      if (isEdit) {
        db.updateCustomer(customer.id, { name, phone });
        toast.success('تم تحديث بيانات العميل');
      } else {
        db.addCustomer({ name, phone });
        toast.success('تم إضافة العميل بنجاح');
      }
      
      closeModal();
      renderCustomersPage(container);
    });

    // إلغاء
    document.getElementById('cancel-btn').addEventListener('click', closeModal);

    // حذف (في حال التعديل فقط)
    if (isEdit) {
      document.getElementById('delete-customer-btn').addEventListener('click', () => {
        if (confirm('هل أنت متأكد من حذف هذا العميل؟')) {
          db.deleteCustomer(customer.id);
          toast.success('تم حذف العميل');
          closeModal();
          renderCustomersPage(container);
        }
      });
    }
  }

  // ===== ربط الأحداث =====
  
  // زر الإضافة
  const addBtn = container.querySelector('#add-customer-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => openCustomerModal(null));
  }

  // النقر على عميل للتعديل
  container.querySelectorAll('.customer-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      const customer = db.getCustomer(id);
      if (customer) openCustomerModal(customer);
    });
  });
}
