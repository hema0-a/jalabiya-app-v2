/* ============================================================
   customers.js - صفحة إدارة العملاء (V2)
   (النسخة الكاملة - مُصلحة)
   ============================================================ */

import * as db from '../core/db.js';
import { toast } from '../ui/toast.js';
import { openModal, closeModal } from '../ui/modal.js';
import { today, money, formatDate, escapeHtml } from '../core/utils.js';
import { DEFAULT_SETTINGS } from '../core/config.js';
import * as storage from '../core/storage.js';
import { previewCustomer } from '../ui/quick-preview.js';

let searchQuery = '';
let filterMode = 'all';
let sortMode = 'recent';

const MEASUREMENT_FIELDS = [
  { id: 'shoulder', label: 'الكتف', icon: '📏' },
  { id: 'chest', label: 'الصدر', icon: '📐' },
  { id: 'waist', label: 'الوسط', icon: '📏' },
  { id: 'length', label: 'الطول', icon: '📐' },
  { id: 'sleeve', label: 'طول الكم', icon: '📏' },
  { id: 'neck', label: 'الرقبة', icon: '📐' },
  { id: 'bottom', label: 'الوسع (أسفل)', icon: '📏' },
  { id: 'hip', label: 'الأرداف', icon: '📐' }
];

/* ============================================================
   حساب معلومات الدفع (إصلاح: يشمل الدفعات الإضافية)
   ============================================================ */
function getCustomerPaymentInfo(customerId, allOrders, allPayments) {
  const customerOrders = allOrders.filter(o => o.customerId === customerId);
  const orderIds = new Set(customerOrders.map(o => o.id));

  const totalSpent = customerOrders.reduce((s, o) => s + (o.totalPrice || 0), 0);

  const totalPaid = allPayments
    .filter(p => orderIds.has(p.orderId))
    .reduce((s, p) => s + (p.amount || 0), 0);

  return {
    ordersCount: customerOrders.length,
    totalSpent,
    totalPaid,
    remaining: Math.max(0, totalSpent - totalPaid)
  };
}

/* ============================================================
   حساب عدد الطلبات لكل عميل (تحسين أداء)
   ============================================================ */
function buildOrdersCountMap(allOrders) {
  const map = {};
  allOrders.forEach(o => {
    map[o.customerId] = (map[o.customerId] || 0) + 1;
  });
  return map;
}

/* ============================================================
   فتح محادثة واتساب
   ============================================================ */
function openWhatsApp(phone, message = '') {
  if (!phone) {
    toast.error('لا يوجد رقم هاتف محفوظ لهذا العميل');
    return;
  }
  let cleanPhone = String(phone).replace(/\D/g, '');
  if (cleanPhone.startsWith('0')) cleanPhone = '2' + cleanPhone;

  const url = message
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${cleanPhone}`;
  window.open(url, '_blank');
}

/* ============================================================
   الصفحة الرئيسية
   ============================================================ */
export function renderCustomersPage(container) {
  const allCustomers = db.getCustomers();
  const allOrders = db.getOrders();
  const allPayments = db.getPayments();
  const settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  const vipThreshold = settings.vipThreshold || 3;

  const ordersCountMap = buildOrdersCountMap(allOrders);

  allCustomers.forEach(c => {
    const orderCount = ordersCountMap[c.id] || 0;
    if (c.vipManual !== true) {
      const shouldBeVip = orderCount >= vipThreshold;
      if (c.isVip !== shouldBeVip) {
        db.updateCustomer(c.id, { isVip: shouldBeVip, vipAuto: true });
        c.isVip = shouldBeVip;
      }
    }
  });

  let customers = allCustomers.filter(c => {
    if (filterMode === 'vip' && !c.isVip) return false;
    if (filterMode === 'regular' && c.isVip) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (c.name || '').toLowerCase().includes(q) ||
             (c.phone && c.phone.includes(searchQuery));
    }
    return true;
  });

  customers = customers.sort((a, b) => {
    if (sortMode === 'name') return (a.name || '').localeCompare(b.name || '');
    if (sortMode === 'spend') {
      const aInfo = getCustomerPaymentInfo(a.id, allOrders, allPayments);
      const bInfo = getCustomerPaymentInfo(b.id, allOrders, allPayments);
      return bInfo.totalSpent - aInfo.totalSpent;
    }
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  const totalCustomers = allCustomers.length;
  const vipCount = allCustomers.filter(c => c.isVip).length;
  const regularCount = totalCustomers - vipCount;

  let html = `
    <div class="card">
      <div class="flex-between mb-2">
        <h2 class="card-title no-border" style="margin:0;">👥 العملاء</h2>
        <button class="btn btn-primary" id="add-customer-btn">+ إضافة عميل</button>
      </div>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px;">
        <div class="stat-card" style="padding: 10px 6px;">
          <div class="stat-value" style="font-size: 20px;">${totalCustomers}</div>
          <div class="stat-label">إجمالي</div>
        </div>
        <div class="stat-card" style="padding: 10px 6px; background: linear-gradient(135deg, #FFF8E1, #FFECB3);">
          <div class="stat-value" style="font-size: 20px; color: #F57F17;">${vipCount}</div>
          <div class="stat-label" style="color: #F57F17;">👑 VIP</div>
        </div>
        <div class="stat-card" style="padding: 10px 6px;">
          <div class="stat-value" style="font-size: 20px;">${regularCount}</div>
          <div class="stat-label">عادي</div>
        </div>
      </div>

      <div class="form-group" style="margin-bottom: 10px;">
        <input type="text" id="search-input" class="form-control" placeholder="🔍 ابحث بالاسم أو رقم الهاتف..." value="${escapeHtml(searchQuery)}">
      </div>

      <div class="kanban-toggle">
        <button class="btn ${filterMode === 'all' ? 'btn-primary' : 'btn-outline'} filter-btn" data-filter="all" style="font-size: 12px;">الكل</button>
        <button class="btn ${filterMode === 'vip' ? 'btn-primary' : 'btn-outline'} filter-btn" data-filter="vip" style="font-size: 12px;">👑 VIP</button>
        <button class="btn ${filterMode === 'regular' ? 'btn-primary' : 'btn-outline'} filter-btn" data-filter="regular" style="font-size: 12px;">عادي</button>
      </div>

      <div style="display: flex; gap: 6px; margin-bottom: 12px;">
        <button class="btn ${sortMode === 'recent' ? 'btn-primary' : 'btn-outline'} sort-btn" data-sort="recent" style="flex:1; font-size: 11px; min-height: 32px;">🕒 الأحدث</button>
        <button class="btn ${sortMode === 'spend' ? 'btn-primary' : 'btn-outline'} sort-btn" data-sort="spend" style="flex:1; font-size: 11px; min-height: 32px;">💰 الأعلى شراءً</button>
        <button class="btn ${sortMode === 'name' ? 'btn-primary' : 'btn-outline'} sort-btn" data-sort="name" style="flex:1; font-size: 11px; min-height: 32px;">🔤 أبجدي</button>
      </div>
  `;

  if (customers.length === 0) {
    html += `
      <div class="empty-state">
        <div class="empty-state-icon">👥</div>
        <p>${searchQuery || filterMode !== 'all' ? 'لا توجد نتائج مطابقة.' : 'لا يوجد عملاء مسجلين حتى الآن.'}</p>
      </div>
    `;
  } else {
    html += `<div style="display:flex; flex-direction:column; gap:8px;">`;
    customers.forEach(c => {
      const info = getCustomerPaymentInfo(c.id, allOrders, allPayments);
      const hasMeasurements = c.measurements && Object.values(c.measurements).some(v => v);

      html += `
        <div class="customer-item" data-id="${c.id}" style="border: 1px solid var(--border-color); ${c.isVip ? 'border-right: 4px solid #F57F17;' : ''} padding: 12px; border-radius: var(--radius-md); background: var(--bg-color); cursor: pointer;">
          <div class="flex-between" style="margin-bottom: 6px;">
            <div style="font-weight: bold; font-size: 15px;">
              ${c.isVip ? '👑 ' : ''}${escapeHtml(c.name)}
            </div>
            <div style="display: flex; gap: 6px; align-items: center;">
              ${c.isVip ? '<span class="badge" style="background: #FFF8E1; color: #F57F17;">VIP</span>' : ''}
              <button class="preview-btn" data-id="${c.id}" title="معاينة سريعة" style="background: var(--bg-color); color: var(--primary-color); border: 1px solid var(--border-color); padding: 6px 10px; border-radius: var(--radius-md); font-size: 13px; cursor: pointer; font-weight: 700; min-height: 30px;">
                👁️
              </button>
              ${c.phone ? `
                <button class="whatsapp-btn" data-phone="${escapeHtml(c.phone)}" data-name="${escapeHtml(c.name)}" style="background: #25D366; color: white; border: none; padding: 6px 10px; border-radius: var(--radius-md); font-size: 13px; cursor: pointer; font-weight: 700; min-height: 30px;">
                  📱
                </button>
              ` : ''}
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 12px; color: var(--text-muted);">
            ${c.phone ? `<div>📞 ${escapeHtml(c.phone)}</div>` : '<div></div>'}
            <div>📋 ${info.ordersCount} طلب</div>
            ${info.remaining > 0 ? `<div style="color: #dc3545;">💸 متبقي: ${money(info.remaining)}</div>` : '<div style="color: #2E7D32;">✓ مسدد بالكامل</div>'}
            ${hasMeasurements ? `<div style="color: var(--primary-color);">📏 مقاسات محفوظة</div>` : '<div></div>'}
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }

  html += `</div>`;
  container.innerHTML = html;

  /* ============================================================
     نموذج إضافة/تعديل عميل
     ============================================================ */
  function openCustomerModal(customer = null) {
    const isEdit = customer !== null;
    const title = isEdit ? 'تعديل بيانات العميل' : 'إضافة عميل جديد';
    const nameVal = isEdit ? customer.name : '';
    const phoneVal = isEdit ? (customer.phone || '') : '';
    const addressVal = isEdit ? (customer.address || '') : '';
    const noteVal = isEdit ? (customer.note || '') : '';
    const isVip = isEdit ? customer.isVip : false;
    const isManualVip = isEdit ? customer.vipManual === true : false;
    const meas = isEdit ? (customer.measurements || {}) : {};

    const measurementsHtml = MEASUREMENT_FIELDS.map(field => `
      <div class="form-group" style="margin-bottom: 8px;">
        <label style="font-size: 12px;">${field.icon} ${field.label}</label>
        <input type="number" id="meas-${field.id}" class="form-control" value="${meas[field.id] || ''}" placeholder="سم" step="0.5" style="min-height: 38px;">
      </div>
    `).join('');

    const formHtml = `
      <h3 class="card-title no-border">${title}</h3>
      <form id="customer-form">
        <div class="form-group">
          <label>اسم العميل *</label>
          <input type="text" id="customer-name" class="form-control" value="${escapeHtml(nameVal)}" required>
        </div>
        <div class="form-group">
          <label>رقم الهاتف</label>
          <input type="tel" id="customer-phone" class="form-control" value="${escapeHtml(phoneVal)}">
        </div>
        <div class="form-group">
          <label>العنوان</label>
          <input type="text" id="customer-address" class="form-control" value="${escapeHtml(addressVal)}" placeholder="اختياري">
        </div>
        <div class="form-group">
          <label>ملاحظات</label>
          <input type="text" id="customer-note" class="form-control" value="${escapeHtml(noteVal)}" placeholder="اختياري">
        </div>

        <div class="form-group">
          <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px; background: var(--bg-color); border-radius: var(--radius-md); cursor: pointer;">
            <span>
              <strong>👑 تصنيف VIP</strong>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">عميل مميز بأولوية وخصم</div>
            </span>
            <input type="checkbox" id="customer-vip" ${isVip ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
          </label>
          <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-muted); margin-top: 6px; cursor: pointer;">
            <input type="checkbox" id="customer-vip-manual" ${isManualVip ? 'checked' : ''} style="width: 16px; height: 16px;">
            <span>تثبيت التصنيف يدوياً (بدون تغيير تلقائي)</span>
          </label>
        </div>

        <div style="background: var(--bg-color); padding: 12px; border-radius: var(--radius-md); margin-bottom: 12px;">
          <div class="flex-between" style="margin-bottom: 10px;">
            <strong style="font-size: 14px;">📏 المقاسات (سم)</strong>
            <span style="font-size: 11px; color: var(--text-muted);">اختياري</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            ${measurementsHtml}
          </div>
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
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('customer-name').value.trim();
      const phone = document.getElementById('customer-phone').value.trim();
      const address = document.getElementById('customer-address').value.trim();
      const note = document.getElementById('customer-note').value.trim();
      const vip = document.getElementById('customer-vip').checked;
      const vipManual = document.getElementById('customer-vip-manual').checked;

      if (!name) {
        toast.error('الرجاء إدخال اسم العميل');
        return;
      }

      const measurements = {};
      MEASUREMENT_FIELDS.forEach(field => {
        const value = document.getElementById(`meas-${field.id}`).value;
        if (value) measurements[field.id] = parseFloat(value);
      });

      const customerData = { name, phone, address, note, isVip: vip, vipManual, measurements };

      if (isEdit) {
        db.updateCustomer(customer.id, customerData);
        toast.success('تم تحديث بيانات العميل');
      } else {
        db.addCustomer(customerData);
        toast.success('تم إضافة العميل بنجاح');
      }

      closeModal();
      renderCustomersPage(container);
    });

    document.getElementById('cancel-btn').addEventListener('click', closeModal);

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

  /* ============================================================
     تفاصيل العميل
     ============================================================ */
  function openCustomerDetails(customer) {
    const info = getCustomerPaymentInfo(customer.id, allOrders, allPayments);
    const customerOrders = allOrders
      .filter(o => o.customerId === customer.id)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const measurementsHtml = (() => {
      const m = customer.measurements || {};
      const filled = MEASUREMENT_FIELDS.filter(f => m[f.id]);
      if (filled.length === 0) {
        return `<p style="text-align:center; color:var(--text-muted); font-size:13px; padding: 8px;">لا توجد مقاسات محفوظة.</p>`;
      }
      return `
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
          ${filled.map(f => `
            <div style="background: var(--surface-color); padding: 8px; border-radius: var(--radius-md); font-size: 13px;">
              <div style="font-size: 11px; color: var(--text-muted);">${f.icon} ${f.label}</div>
              <div style="font-weight: 700; color: var(--primary-color);">${m[f.id]} سم</div>
            </div>
          `).join('')}
        </div>
      `;
    })();

    const ordersHtml = customerOrders.length === 0
      ? `<p style="text-align:center; color:var(--text-muted); font-size:13px; padding: 12px;">لا توجد طلبات بعد.</p>`
      : customerOrders.slice(0, 5).map(o => {
          const remainingOrder = (o.totalPrice || 0) - (o.deposit || 0);
          const statusColors = { pending: '#FFA726', in_progress: '#29B6F6', ready: '#AB47BC', delivered: '#66BB6A' };
          const statusLabels = { pending: 'قيد الانتظار', in_progress: 'قيد التنفيذ', ready: 'جاهز', delivered: 'تم التسليم' };
          const status = o.status || 'pending';
          return `
            <div style="background: var(--surface-color); padding: 10px; border-radius: var(--radius-md); border-right: 3px solid ${statusColors[status]}; margin-bottom: 6px;">
              <div class="flex-between" style="margin-bottom: 4px;">
                <div style="font-weight: 600; font-size: 13px;">${escapeHtml(o.garmentType || '')} (×${o.quantity})</div>
                <div style="font-size: 11px; color: ${statusColors[status]}; font-weight: 700;">${statusLabels[status]}</div>
              </div>
              <div style="font-size: 11px; color: var(--text-muted); display: flex; justify-content: space-between;">
                <span>${money(o.totalPrice)} جنيه</span>
                ${remainingOrder > 0 ? `<span style="color: #dc3545;">متبقي: ${money(remainingOrder)}</span>` : '<span style="color: #2E7D32;">✓ مسدد</span>'}
              </div>
              <div style="font-size: 10px; color: var(--text-muted); margin-top: 4px;">📅 ${formatDate(o.date)}</div>
            </div>
          `;
        }).join('');

    const detailsHtml = `
      <div style="text-align: center; margin-bottom: 16px;">
        <div style="width: 70px; height: 70px; background: linear-gradient(135deg, var(--primary-color), var(--primary-dark)); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; color: white; font-size: 28px; font-weight: 800; box-shadow: var(--shadow-md);">
          ${escapeHtml(customer.name.charAt(0))}
        </div>
        <h3 style="margin: 0; font-size: 18px;">
          ${customer.isVip ? '👑 ' : ''}${escapeHtml(customer.name)}
        </h3>
        ${customer.isVip ? '<span class="badge" style="background: #FFF8E1; color: #F57F17; margin-top: 6px;">VIP - عميل مميز</span>' : ''}
      </div>

      <div style="background: var(--bg-color); padding: 12px; border-radius: var(--radius-md); margin-bottom: 12px; font-size: 13px;">
        ${customer.phone ? `<div style="margin-bottom: 6px;"><strong>📞 الهاتف:</strong> ${escapeHtml(customer.phone)}</div>` : ''}
        ${customer.address ? `<div style="margin-bottom: 6px;"><strong>📍 العنوان:</strong> ${escapeHtml(customer.address)}</div>` : ''}
        ${customer.note ? `<div><strong>📝 ملاحظات:</strong> ${escapeHtml(customer.note)}</div>` : ''}
      </div>

      ${customer.phone ? `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
          <button class="btn btn-primary" id="wa-greeting-btn" style="background: #25D366;">💬 واتساب</button>
          <button class="btn btn-outline" id="wa-reminder-btn" style="color: #25D366; border-color: #25D366;">🔔 تذكير</button>
        </div>
      ` : ''}

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 12px;">
        <div style="text-align: center; padding: 8px; background: var(--bg-color); border-radius: var(--radius-md);">
          <div style="font-size: 16px; font-weight: 800; color: var(--primary-color);">${info.ordersCount}</div>
          <div style="font-size: 10px; color: var(--text-muted);">طلبات</div>
        </div>
        <div style="text-align: center; padding: 8px; background: var(--bg-color); border-radius: var(--radius-md);">
          <div style="font-size: 14px; font-weight: 800; color: #2E7D32;">${money(info.totalPaid)}</div>
          <div style="font-size: 10px; color: var(--text-muted);">مدفوع</div>
        </div>
        <div style="text-align: center; padding: 8px; background: var(--bg-color); border-radius: var(--radius-md);">
          <div style="font-size: 14px; font-weight: 800; color: ${info.remaining > 0 ? '#dc3545' : '#2E7D32'};">${money(info.remaining)}</div>
          <div style="font-size: 10px; color: var(--text-muted);">متبقي</div>
        </div>
      </div>

      <div style="margin-bottom: 12px;">
        <h4 style="font-size: 14px; margin-bottom: 8px; color: var(--primary-dark);">📏 المقاسات:</h4>
        ${measurementsHtml}
      </div>

      <div style="margin-bottom: 12px;">
        <h4 style="font-size: 14px; margin-bottom: 8px; color: var(--primary-dark);">📋 آخر الطلبات:</h4>
        ${ordersHtml}
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
        <button class="btn btn-primary" id="add-order-for-customer">+ طلب جديد</button>
        <button class="btn btn-outline" id="edit-customer-details">✏️ تعديل البيانات</button>
      </div>
      <button class="btn btn-outline btn-full" id="close-customer-details">إغلاق</button>
    `;

    openModal(detailsHtml);

    if (customer.phone) {
      const greetingMsg = `السلام عليكم ${customer.name} 🌹\n\nمن ورشة تفصيل الجلابيب.\nكيف حالك؟ نتشرف بخدمتك في أي وقت.`;

      document.getElementById('wa-greeting-btn').addEventListener('click', () => {
        openWhatsApp(customer.phone, greetingMsg);
      });

      const reminderMsg = info.remaining > 0
        ? `السلام عليكم ${customer.name} 🌹\n\nتذكير ودّي بوجود مبلغ متبقي:\n💰 المتبقي: ${money(info.remaining)} جنيه\n\nنشكرك على تعاملك معنا 🌟`
        : `السلام عليكم ${customer.name} 🌹\n\nنشكرك على سداد جميع مستحقاتك ✓\nنتشرف بخدمتك دائماً.`;

      document.getElementById('wa-reminder-btn').addEventListener('click', () => {
        openWhatsApp(customer.phone, reminderMsg);
      });
    }

    document.getElementById('add-order-for-customer').addEventListener('click', () => {
      closeModal();
      setTimeout(() => {
        toast.info(`انتقل إلى صفحة الطلبات وأضف طلباً للعميل: ${customer.name}`);
        window.location.hash = '/orders';
      }, 300);
    });

    document.getElementById('edit-customer-details').addEventListener('click', () => {
      closeModal();
      setTimeout(() => openCustomerModal(customer), 300);
    });

    document.getElementById('close-customer-details').addEventListener('click', closeModal);
  }

  /* ============================================================
     ربط الأحداث
     ============================================================ */
  const addBtn = container.querySelector('#add-customer-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => openCustomerModal(null));
  }

  const searchInput = container.querySelector('#search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      const pos = e.target.selectionStart;
      renderCustomersPage(container);
      const newInput = container.querySelector('#search-input');
      if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(pos, pos);
      }
    });
  }

  container.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      filterMode = btn.dataset.filter;
      renderCustomersPage(container);
    });
  });

  container.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      sortMode = btn.dataset.sort;
      renderCustomersPage(container);
    });
  });

  container.querySelectorAll('.preview-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      previewCustomer(btn.dataset.id);
    });
  });

  container.querySelectorAll('.whatsapp-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const phone = btn.dataset.phone;
      const name = btn.dataset.name;
      openWhatsApp(phone, `السلام عليكم ${name} 🌹`);
    });
  });

  container.querySelectorAll('.customer-item').forEach(item => {
    item.addEventListener('click', () => {
      const customer = db.getCustomer(item.dataset.id);
      if (customer) openCustomerDetails(customer);
    });
  });
}
