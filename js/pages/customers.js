/* ============================================================
   customers.js - صفحة إدارة العملاء (V2)
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

  // في حال عدم وجود عملاء
  if (customers.length === 0) {
    html += `
      <div class="text-center" style="padding: 40px 10px; color: var(--text-muted);">
        <div style="font-size: 40px; margin-bottom: 10px;">👥</div>
        <p>لا يوجد عملاء مسجلين حتى الآن.</p>
      </div>
    `;
  } else {
    // عرض العملاء في قائمة منسقة
    html += `<div style="display:flex; flex-direction:column; gap:8px;">`;
    customers.forEach(c => {
      html += `
        <div style="border: 1px solid var(--border-color); padding: 12px; border-radius: var(--radius-md); background: var(--bg-color);">
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

  // ربط زر الإضافة بفتح النافذة المنبثقة
  const addBtn = container.querySelector('#add-customer-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      // 1. تعريف نموذج الإدخال (HTML)
      const formHtml = `
        <h3 class="card-title">إضافة عميل جديد</h3>
        <form id="customer-form">
          <div class="form-group">
            <label>اسم العميل *</label>
            <input type="text" id="customer-name" class="form-control" placeholder="مثال: أحمد محمد" required>
          </div>
          <div class="form-group">
            <label>رقم الهاتف (اختياري)</label>
            <input type="tel" id="customer-phone" class="form-control" placeholder="01xxxxxxxxx">
          </div>
          <div class="flex-between mt-2">
            <button type="button" class="btn btn-outline" id="cancel-btn">إلغاء</button>
            <button type="submit" class="btn btn-primary">حفظ العميل</button>
          </div>
        </form>
      `;
      
      // 2. فتح النافذة المنبثقة
      openModal(formHtml);

      // 3. التعامل مع حفظ النموذج
      const form = document.getElementById('customer-form');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = document.getElementById('customer-name').value.trim();
        const phone = document.getElementById('customer-phone').value.trim();
        
        if (!name) {
          toast.error('الرجاء إدخال اسم العميل');
          return;
        }

        // حفظ في قاعدة البيانات
        db.addCustomer({ name, phone });
        
        // إغلاق النافذة وإظهار رسالة نجاح
        closeModal();
        toast.success('تم إضافة العميل بنجاح');
        
        // إعادة عرض الصفحة لتحديث القائمة فوراً
        renderCustomersPage(container);
      });

      // 4. التعامل مع زر الإلغاء
      document.getElementById('cancel-btn').addEventListener('click', closeModal);
    });
  }
}
