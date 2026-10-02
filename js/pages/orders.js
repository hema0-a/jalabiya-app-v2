/* ============================================================
   orders.js - صفحة إدارة الطلبات (V2)
   (تدعم: الإضافة، التعديل، الحذف، البحث، الحالة، كانبان، الفاتورة)
   ============================================================ */

import * as db from '../core/db.js';
import { toast } from '../ui/toast.js';
import { openModal, closeModal } from '../ui/modal.js';
import { today, money, formatDate } from '../core/utils.js';
import { printInvoice, shareInvoiceWhatsApp } from '../core/invoice.js';

// حالات الطلب
const ORDER_STATUSES = [
  { id: 'pending', label: 'قيد الانتظار', icon: '⏳' },
  { id: 'in_progress', label: 'قيد التنفيذ', icon: '🧵' },
  { id: 'ready', label: 'جاهز للتسليم', icon: '✅' },
  { id: 'delivered', label: 'تم التسليم', icon: '📦' }
];

// متغيرات حالة الصفحة
let searchQuery = '';
let selectedStatus = 'all';
let viewMode = 'list'; // 'list' أو 'kanban'

export function renderOrdersPage(container) {
  const allOrders = db.getOrders();
  const customers = db.getCustomers();

  // 1. تصفية الطلبات
  const filteredOrders = allOrders.filter(o => {
    // فلترة بالحالة
    if (selectedStatus !== 'all' && (o.status || 'pending') !== selectedStatus) return false;
    
    // فلترة بالبحث
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const customer = customers.find(c => c.id === o.customerId);
      const custName = customer ? customer.name.toLowerCase() : '';
      const garment = (o.garmentType || '').toLowerCase();
      return custName.includes(q) || garment.includes(q);
    }
    return true;
  }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  // 2. حساب الإحصائيات
  const stats = {
    pending: allOrders.filter(o => (o.status || 'pending') === 'pending').length,
    in_progress: allOrders.filter(o => o.status === 'in_progress').length,
    ready: allOrders.filter(o => o.status === 'ready').length,
    delivered: allOrders.filter(o => o.status === 'delivered').length
  };

  // 3. بناء الهيكل الأساسي
  let html = `
    <div class="card">
      <div class="flex-between mb-2">
        <h2 class="card-title no-border" style="margin:0;">📋 الطلبات</h2>
        <button class="btn btn-primary" id="add-order-btn">+ إضافة طلب</button>
      </div>

      <!-- إحصائيات الحالات -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 12px;">
        <div style="text-align: center; padding: 8px 4px; background: #FFF3E0; border-radius: var(--radius-md);">
          <div style="font-size: 18px; font-weight: 800; color: #E65100;">${stats.pending}</div>
          <div style="font-size: 10px; color: #E65100;">قيد الانتظار</div>
        </div>
        <div style="text-align: center; padding: 8px 4px; background: #E1F5FE; border-radius: var(--radius-md);">
          <div style="font-size: 18px; font-weight: 800; color: #0277BD;">${stats.in_progress}</div>
          <div style="font-size: 10px; color: #0277BD;">قيد التنفيذ</div>
        </div>
        <div style="text-align: center; padding: 8px 4px; background: #F3E5F5; border-radius: var(--radius-md);">
          <div style="font-size: 18px; font-weight: 800; color: #6A1B9A;">${stats.ready}</div>
          <div style="font-size: 10px; color: #6A1B9A;">جاهز</div>
        </div>
        <div style="text-align: center; padding: 8px 4px; background: #E8F5E9; border-radius: var(--radius-md);">
          <div style="font-size: 18px; font-weight: 800; color: #2E7D32;">${stats.delivered}</div>
          <div style="font-size: 10px; color: #2E7D32;">تم التسليم</div>
        </div>
      </div>

      <!-- تبديل بين قائمة وكانبان -->
      <div class="kanban-toggle">
        <button class="btn ${viewMode === 'list' ? 'btn-primary' : 'btn-outline'}" id="view-list-btn">
          📋 قائمة
        </button>
        <button class="btn ${viewMode === 'kanban' ? 'btn-primary' : 'btn-outline'}" id="view-kanban-btn">
          🎯 كانبان
        </button>
      </div>

      <!-- حقل البحث -->
      <div class="form-group" style="margin-bottom: 10px;">
        <input type="text" id="search-order-input" class="form-control" placeholder="🔍 ابحث باسم العميل أو نوع الجلابية..." value="${searchQuery}">
      </div>

      <!-- فلترة الحالة (للوضع قائمة فقط) -->
      ${viewMode === 'list' ? `
        <div style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 12px;">
          <button class="btn ${selectedStatus === 'all' ? 'btn-primary' : 'btn-outline'} status-filter-btn" data-status="all" style="font-size: 12px; padding: 6px 12px; white-space: nowrap; min-height: 32px;">الكل</button>
          ${ORDER_STATUSES.map(s => `
            <button class="btn ${selectedStatus === s.id ? 'btn-primary' : 'btn-outline'} status-filter-btn" data-status="${s.id}" style="font-size: 12px; padding: 6px 12px; white-space: nowrap; min-height: 32px;">
              ${s.icon} ${s.label}
            </button>
          `).join('')}
        </div>
      ` : ''}
  `;

  // 4. عرض المحتوى
  if (viewMode === 'list') {
    html += renderListView(filteredOrders, customers);
  } else {
    html += renderKanbanView(allOrders, customers);
  }

  html += `</div>`;
  container.innerHTML = html;

  // ============================================================
  // دوال مساعدة
  // ============================================================
  function getStatusInfo(status) {
    return ORDER_STATUSES.find(s => s.id === status) || ORDER_STATUSES[0];
  }

  // ============================================================
  // عرض قائمة الطلبات (ListView)
  // ============================================================
  function renderListView(orders, customers) {
    if (orders.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <p>${searchQuery || selectedStatus !== 'all' ? 'لا توجد نتائج مطابقة.' : 'لا توجد طلبات مسجلة حتى الآن.'}</p>
        </div>
      `;
    }

    let result = `<div style="display:flex; flex-direction:column; gap:8px;">`;
    orders.forEach(o => {
      const customer = customers.find(c => c.id === o.customerId);
      const custName = customer ? customer.name : 'عميل محذوف';
      const remaining = (o.totalPrice || 0) - (o.deposit || 0);
      const status = getStatusInfo(o.status || 'pending');
      
      result += `
        <div class="order-item" data-id="${o.id}" style="border: 1px solid var(--border-color); padding: 12px; border-radius: var(--radius-md); background: var(--bg-color); cursor: pointer;">
          <div class="flex-between" style="margin-bottom: 6px;">
            <div style="font-weight:bold; font-size:15px;">👤 ${custName}</div>
            <span class="status-badge ${o.status || 'pending'}">${status.icon} ${status.label}</span>
          </div>
          <div style="font-size:13px; margin-bottom: 6px;">🧵 ${o.garmentType} (الكمية: ${o.quantity})</div>
          <div style="font-size:12px; color:var(--text-muted);">
            💰 الإجمالي: ${money(o.totalPrice)} | المدفوع: ${money(o.deposit)} | المتبقي: <span style="color:${remaining > 0 ? '#dc3545' : '#2E7D32'}; font-weight: bold;">${money(remaining)}</span>
          </div>
        </div>
      `;
    });
    result += `</div>`;
    return result;
  }

  // ============================================================
  // عرض كانبان (KanbanView)
  // ============================================================
  function renderKanbanView(orders, customers) {
    let result = `<div class="kanban-board">`;

    ORDER_STATUSES.forEach(status => {
      const statusOrders = orders.filter(o => (o.status || 'pending') === status.id);

      result += `
        <div class="kanban-column" data-status="${status.id}">
          <div class="kanban-column-header">
            <div class="kanban-column-title">
              <span>${status.icon}</span>
              <span>${status.label}</span>
            </div>
            <span class="kanban-column-count">${statusOrders.length}</span>
          </div>
          <div class="kanban-column-body">
      `;

      if (statusOrders.length === 0) {
        result += `<div class="kanban-empty">لا توجد طلبات</div>`;
      } else {
        statusOrders.forEach(o => {
          const customer = customers.find(c => c.id === o.customerId);
          const custName = customer ? customer.name : 'عميل محذوف';
          const remaining = (o.totalPrice || 0) - (o.deposit || 0);

          result += `
            <div class="kanban-card" data-id="${o.id}" data-status="${o.status || 'pending'}">
              <div class="kanban-card-title">
                <span>👤 ${custName}</span>
              </div>
              <div class="kanban-card-info">
                <div class="kanban-card-info-row">
                  <span>🧵 ${o.garmentType}</span>
                  <span>×${o.quantity}</span>
                </div>
                <div class="kanban-card-info-row">
                  <span>الإجمالي:</span>
                  <span class="kanban-card-price">${money(o.totalPrice)}</span>
                </div>
                <div class="kanban-card-info-row">
                  <span>المتبقي:</span>
                  <span class="kanban-card-remaining ${remaining === 0 ? 'paid' : ''}">${money(remaining)}</span>
                </div>
              </div>
              <div class="kanban-card-date">
                📅 ${formatDate(o.date)}
              </div>
            </div>
          `;
        });
      }

      result += `
          </div>
        </div>
      `;
    });

    result += `</div>`;
    return result;
  }

  // ============================================================
  // نموذج الإضافة/التعديل
  // ============================================================
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

    const currentStatus = isEdit ? (order.status || 'pending') : 'pending';

    const statusOptions = ORDER_STATUSES.map(s => `
      <div class="status-option ${s.id === currentStatus ? 'selected' : ''}" data-status="${s.id}">
        <span>${s.icon}</span>
        <span>${s.label}</span>
      </div>
    `).join('');

    const formHtml = `
      <h3 class="card-title no-border">${title}</h3>
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
        <div class="form-group">
          <label>حالة الطلب</label>
          <input type="hidden" id="order-status" value="${currentStatus}">
          <div class="status-selector">
            ${statusOptions}
          </div>
        </div>
        
        <!-- أزرار الطباعة والمشاركة (في وضع التعديل فقط) -->
        ${isEdit ? `
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
            <button type="button" class="btn btn-outline" id="print-invoice-btn">🖨️ طباعة</button>
            <button type="button" class="btn btn-outline" id="share-invoice-btn" style="color: #25D366; border-color: #25D366;">📱 واتساب</button>
          </div>
        ` : ''}
        
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

    // ===== اختيار الحالة =====
    document.querySelectorAll('.status-option').forEach(opt => {
      opt.addEventListener('click', () => {
        document.querySelectorAll('.status-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        document.getElementById('order-status').value = opt.dataset.status;
      });
    });

    // ===== حفظ النموذج =====
    const form = document.getElementById('order-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const customerId = document.getElementById('order-customer').value;
      const garmentType = document.getElementById('order-garment').value.trim();
      const quantity = parseInt(document.getElementById('order-qty').value);
      const totalPrice = parseFloat(document.getElementById('order-price').value);
      const deposit = parseFloat(document.getElementById('order-deposit').value) || 0;
      const status = document.getElementById('order-status').value;

      if (!customerId || !garmentType || !quantity || !totalPrice) {
        toast.error('الرجاء ملء جميع الحقول المطلوبة');
        return;
      }

      const orderData = { customerId, garmentType, quantity, totalPrice, deposit, status, date: today() };

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

    // ===== طباعة الفاتورة =====
    if (isEdit) {
      document.getElementById('print-invoice-btn').addEventListener('click', () => {
        const currentOrder = db.getOrder(order.id);
        if (currentOrder) printInvoice(currentOrder);
      });

      // ===== مشاركة عبر واتساب =====
      document.getElementById('share-invoice-btn').addEventListener('click', () => {
        const currentOrder = db.getOrder(order.id);
        if (currentOrder) shareInvoiceWhatsApp(currentOrder);
      });

      // ===== حذف الطلب =====
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

  // ============================================================
  // ربط الأحداث
  // ============================================================

  // زر الإضافة
  const addBtn = container.querySelector('#add-order-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => openOrderModal(null));
  }

  // تبديل عرض قائمة/كانبان
  container.querySelector('#view-list-btn').addEventListener('click', () => {
    viewMode = 'list';
    renderOrdersPage(container);
  });

  container.querySelector('#view-kanban-btn').addEventListener('click', () => {
    viewMode = 'kanban';
    renderOrdersPage(container);
  });

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

  // فلترة الحالة (للوضع قائمة فقط)
  container.querySelectorAll('.status-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedStatus = btn.dataset.status;
      renderOrdersPage(container);
    });
  });

  // النقر على طلب في القائمة للتعديل
  container.querySelectorAll('.order-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      const order = db.getOrder(id);
      if (order) openOrderModal(order);
    });
  });

  // النقر على بطاقة كانبان للتعديل
  container.querySelectorAll('.kanban-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      const order = db.getOrder(id);
      if (order) openOrderModal(order);
    });
  });
}
