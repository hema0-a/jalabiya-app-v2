/* ============================================================
   customers.js - صفحة إدارة العملاء (V2)
   ============================================================ */

import * as db from '../core/db.js';
import { toast } from '../ui/toast.js';

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

  // ربط زر الإضافة
  const addBtn = container.querySelector('#add-customer-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      toast.info('سيتم إضافة نموذج إضافة العميل في المرحلة القادمة!');
    });
  }
}
