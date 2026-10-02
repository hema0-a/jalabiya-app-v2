/* ============================================================
   orders.js - صفحة الطلبات المتقدمة (V2)
   (يشمل: إضافة، تعديل، حذف، بحث، كانبان، فاتورة، حالة،
    + تتبع وقت الشغل + تسليم جزئي + توقيع التسليم)
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
let viewMode = 'list';

/* ============================================================
   دوال مساعدة لوقت الشغل
   ============================================================ */
function formatDuration(ms) {
  if (!ms || ms < 0) return '0 دقيقة';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours} س ${minutes} د`;
  if (minutes > 0) return `${minutes} دقيقة`;
  return `${totalSeconds} ثانية`;
}

function getOrderTotalWorkTime(order) {
  const sessions = order.workSessions || [];
  return sessions.reduce((sum, s) => sum + ((s.end || Date.now()) - s.start), 0);
}

function isOrderTimerActive(order) {
  const sessions = order.workSessions || [];
  return sessions.length > 0 && !sessions[sessions.length - 1].end;
}

/* ============================================================
   الصفحة الرئيسية
   ============================================================ */
export function renderOrdersPage(container) {
  const allOrders = db.getOrders();
  const customers = db.getCustomers();

  // تصفية
  const filteredOrders = allOrders.filter(o => {
    if (selectedStatus !== 'all' && (o.status || 'pending') !== selectedStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const customer = customers.find(c => c.id === o.customerId);
      const custName = customer ? customer.name.toLowerCase() : '';
      const garment = (o.garmentType || '').toLowerCase();
      return custName.includes(q) || garment.includes(q);
    }
    return true;
  }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  // إحصائيات
  const stats = {
    pending: allOrders.filter(o => (o.status || 'pending') === 'pending').length,
    in_progress: allOrders.filter(o => o.status === 'in_progress').length,
    ready: allOrders.filter(o => o.status === 'ready').length,
    delivered: allOrders.filter(o => o.status === 'delivered').length
  };

  // بناء الواجهة
  let html = `
    <div class="card">
      <div class="flex-between mb-2">
        <h2 class="card-title no-border" style="margin:0;">📋 الطلبات</h2>
        <button class="btn btn-primary" id="add-order-btn">+ إضافة طلب</button>
      </div>

      <!-- إحصائيات -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 12px;">
        <div style="text-align: center; padding: 8px 4px; background: #FFF3E0; border-radius: var(--radius-md);">
          <div style="font-size: 18px; font-weight: 800; color: #E65100;">${stats.pending}</div>
          <div style="font-size: 10px; color: #E65100;">انتظار</div>
        </div>
        <div style="text-align: center; padding: 8px 4px; background: #E1F5FE; border-radius: var(--radius-md);">
          <div style="font-size: 18px; font-weight: 800; color: #0277BD;">${stats.in_progress}</div>
          <div style="font-size: 10px; color: #0277BD;">تنفيذ</div>
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

      <!-- تبديل العرض -->
      <div class="kanban-toggle">
        <button class="btn ${viewMode === 'list' ? 'btn-primary' : 'btn-outline'}" id="view-list-btn">📋 قائمة</button>
        <button class="btn ${viewMode === 'kanban' ? 'btn-primary' : 'btn-outline'}" id="view-kanban-btn">🎯 كانبان</button>
      </div>

      <!-- البحث -->
      <div class="form-group" style="margin-bottom: 10px;">
        <input type="text" id="search-order-input" class="form-control" placeholder="🔍 ابحث باسم العميل أو نوع الجلابية..." value="${searchQuery}">
      </div>

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

  if (viewMode === 'list') {
    html += renderListView(filteredOrders, customers);
  } else {
    html += renderKanbanView(allOrders, customers);
  }

  html += `</div>`;
  container.innerHTML = html;

  /* ============================================================
     عرض قائمة الطلبات
     ============================================================ */
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
      const status = ORDER_STATUSES.find(s => s.id === (o.status || 'pending')) || ORDER_STATUSES[0];
      const timerActive = isOrderTimerActive(o);
      const totalTime = getOrderTotalWorkTime(o);
      const hasPartial = o.quantity > 1;
      const deliveredQty = o.deliveredQuantity || 0;
      const remainingQty = hasPartial ? o.quantity - deliveredQty : 0;

      result += `
        <div class="order-item" data-id="${o.id}" style="border: 1px solid var(--border-color); padding: 12px; border-radius: var(--radius-md); background: var(--bg-color); cursor: pointer;">
          <div class="flex-between" style="margin-bottom: 6px;">
            <div style="font-weight:bold; font-size:15px;">
              👤 ${custName}
              ${timerActive ? '<span class="badge" style="background: #E1F5FE; color: #0277BD; margin-right: 6px; animation: pulse 1.5s infinite;">⏱️ يعمل</span>' : ''}
            </div>
            <span class="status-badge ${o.status || 'pending'}">${status.icon} ${status.label}</span>
          </div>
          <div style="font-size:13px; margin-bottom: 6px;">🧵 ${o.garmentType} (الكمية: ${o.quantity})</div>
          ${hasPartial ? `
            <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">
              📦 تم تسليم: ${deliveredQty} | متبقي: ${remainingQty}
            </div>
          ` : ''}
          <div style="font-size:12px; color:var(--text-muted);">
            💰 الإجمالي: ${money(o.totalPrice)} | المدفوع: ${money(o.deposit)} | المتبقي: <span style="color:${remaining > 0 ? '#dc3545' : '#2E7D32'}; font-weight: bold;">${money(remaining)}</span>
          </div>
          ${totalTime > 0 ? `<div style="font-size: 11px; color: #6A1B9A; margin-top: 4px;">⏱️ وقت الشغل: ${formatDuration(totalTime)}</div>` : ''}
        </div>
      `;
    });
    result += `</div>`;
    return result;
  }

  /* ============================================================
     عرض كانبان
     ============================================================ */
  function renderKanbanView(orders, customers) {
    let result = `<div class="kanban-board">`;

    ORDER_STATUSES.forEach(status => {
      const statusOrders = orders.filter(o => (o.status || 'pending') === status.id);

      result += `
        <div class="kanban-column" data-status="${status.id}">
          <div class="kanban-column-header">
            <div class="kanban-column-title"><span>${status.icon}</span><span>${status.label}</span></div>
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
          const timerActive = isOrderTimerActive(o);

          result += `
            <div class="kanban-card" data-id="${o.id}" data-status="${o.status || 'pending'}">
              <div class="kanban-card-title">
                <span>👤 ${custName}</span>
                ${timerActive ? '<span style="font-size: 14px;">⏱️</span>' : ''}
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
              <div class="kanban-card-date">📅 ${formatDate(o.date)}</div>
            </div>
          `;
        });
      }

      result += `</div></div>`;
    });

    result += `</div>`;
    return result;
  }

  /* ============================================================
     نموذج الإضافة/التعديل
     ============================================================ */
  function openOrderModal(order = null) {
    if (customers.length === 0) {
      toast.error('يجب إضافة عميل أولاً قبل إضافة طلب!');
      return;
    }

    const isEdit = order !== null;
    const title = isEdit ? 'تفاصيل الطلب' : 'إضافة طلب جديد';
    const currentStatus = isEdit ? (order.status || 'pending') : 'pending';
    const timerActive = isEdit ? isOrderTimerActive(order) : false;
    const totalTime = isEdit ? getOrderTotalWorkTime(order) : 0;
    const deliveredQty = isEdit ? (order.deliveredQuantity || 0) : 0;
    const hasSignature = isEdit && order.signature;

    const customerOptions = customers.map(c => {
      const selected = (isEdit && c.id === order.customerId) ? 'selected' : '';
      return `<option value="${c.id}" ${selected}>${c.name}</option>`;
    }).join('');

    const statusOptions = ORDER_STATUSES.map(s => `
      <div class="status-option ${s.id === currentStatus ? 'selected' : ''}" data-status="${s.id}">
        <span>${s.icon}</span><span>${s.label}</span>
      </div>
    `).join('');

    const formHtml = `
      <h3 class="card-title no-border">${title}</h3>
      
      ${isEdit ? `
        <!-- عداد الوقت -->
        <div style="background: linear-gradient(135deg, #F3E5F5, #E1BEE7); padding: 12px; border-radius: var(--radius-md); margin-bottom: 12px;">
          <div class="flex-between" style="margin-bottom: 8px;">
            <div>
              <div style="font-size: 11px; color: #6A1B9A;">⏱️ وقت الشغل الإجمالي</div>
              <div style="font-size: 20px; font-weight: 800; color: #6A1B9A;" id="work-time-display">${formatDuration(totalTime)}</div>
            </div>
            <button type="button" class="btn ${timerActive ? 'btn-danger' : 'btn-primary'}" id="timer-btn" style="min-height: 44px;">
              ${timerActive ? '⏸️ إيقاف' : '▶️ بدء العمل'}
            </button>
          </div>
        </div>
      ` : ''}
      
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
          <label>المقدم</label>
          <input type="number" id="order-deposit" class="form-control" value="${isEdit ? (order.deposit || 0) : 0}">
        </div>
        <div class="form-group">
          <label>حالة الطلب</label>
          <input type="hidden" id="order-status" value="${currentStatus}">
          <div class="status-selector">${statusOptions}</div>
        </div>
        
        ${isEdit && hasSignature ? `
          <div style="margin-bottom: 12px;">
            <label style="font-size: 12px; color: var(--text-muted); margin-bottom: 6px; display: block;">✍️ توقيع التسليم:</label>
            <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 8px; background: white; text-align: center;">
              <img src="${order.signature}" alt="التوقيع" style="max-width: 100%; max-height: 80px;">
            </div>
          </div>
        ` : ''}
        
        ${isEdit ? `
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
            <button type="button" class="btn btn-outline" id="print-invoice-btn">🖨️ طباعة</button>
            <button type="button" class="btn btn-outline" id="share-invoice-btn" style="color: #25D366; border-color: #25D366;">📱 واتساب</button>
          </div>
          ${(order.quantity > 1 && deliveredQty < order.quantity) || currentStatus !== 'delivered' ? `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
              ${order.quantity > 1 && deliveredQty < order.quantity ? `
                <button type="button" class="btn btn-accent" id="partial-delivery-btn" style="grid-column: span 2;">
                  ✂️ تسليم جزئي (${deliveredQty}/${order.quantity})
                </button>
              ` : ''}
              ${currentStatus !== 'delivered' ? `
                <button type="button" class="btn btn-primary" id="full-delivery-btn" style="grid-column: span 2;">
                  📦 تسليم كامل + توقيع
                </button>
              ` : ''}
            </div>
          ` : ''}
        ` : ''}
        
        <div class="flex-between mt-2">
          <div>
            ${isEdit ? `<button type="button" class="btn btn-danger" id="delete-order-btn">حذف</button>` : ''}
          </div>
          <div>
            <button type="button" class="btn btn-outline" id="cancel-order-btn">إلغاء</button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'حفظ التغييرات' : 'حفظ'}</button>
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

    // ===== زر بدء/إيقاف العمل =====
    if (isEdit) {
      const timerBtn = document.getElementById('timer-btn');
      const timeDisplay = document.getElementById('work-time-display');
      let liveInterval = null;

      function updateTimeDisplay() {
        const freshOrder = db.getOrder(order.id);
        const total = getOrderTotalWorkTime(freshOrder);
        timeDisplay.textContent = formatDuration(total);
      }

      if (timerBtn) {
        timerBtn.addEventListener('click', () => {
          const freshOrder = db.getOrder(order.id);
          const sessions = freshOrder.workSessions || [];
          const active = sessions.length > 0 && !sessions[sessions.length - 1].end;

          if (active) {
            // إيقاف: أغلق آخر جلسة
            sessions[sessions.length - 1].end = Date.now();
            db.updateOrder(order.id, { workSessions: sessions });
            toast.success('تم إيقاف العداد');
            timerBtn.textContent = '▶️ بدء العمل';
            timerBtn.classList.remove('btn-danger');
            timerBtn.classList.add('btn-primary');
            if (liveInterval) clearInterval(liveInterval);
            liveInterval = null;
          } else {
            // بدء: أضف جلسة جديدة
            sessions.push({ start: Date.now(), end: null });
            db.updateOrder(order.id, { workSessions: sessions });
            toast.success('تم بدء العداد');
            timerBtn.textContent = '⏸️ إيقاف';
            timerBtn.classList.remove('btn-primary');
            timerBtn.classList.add('btn-danger');
            // عداد حي
            if (liveInterval) clearInterval(liveInterval);
            liveInterval = setInterval(updateTimeDisplay, 1000);
          }
          updateTimeDisplay();
        });
      }
    }

    // ===== التسليم الجزئي =====
    if (isEdit && document.getElementById('partial-delivery-btn')) {
      document.getElementById('partial-delivery-btn').addEventListener('click', () => {
        const freshOrder = db.getOrder(order.id);
        const current = freshOrder.deliveredQuantity || 0;
        const maxQty = freshOrder.quantity;
        
        const inputHtml = `
          <h3 class="card-title no-border">✂️ تسليم جزئي</h3>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">
            الطلب: ${freshOrder.garmentType}<br>
            الكمية الكلية: ${maxQty} | تم التسليم: ${current} | متبقي: ${maxQty - current}
          </p>
          <form id="partial-form">
            <div class="form-group">
              <label>الكمية المسلَّمة الآن *</label>
              <input type="number" id="partial-qty" class="form-control" value="1" min="1" max="${maxQty - current}" required>
            </div>
            <div class="flex-between mt-2">
              <button type="button" class="btn btn-outline" id="cancel-partial-btn">إلغاء</button>
              <button type="submit" class="btn btn-primary">تسليم</button>
            </div>
          </form>
        `;
        openModal(inputHtml);

        document.getElementById('partial-form').addEventListener('submit', (e) => {
          e.preventDefault();
          const qty = parseInt(document.getElementById('partial-qty').value);
          if (!qty || qty <= 0 || qty > (maxQty - current)) {
            toast.error('كمية غير صحيحة');
            return;
          }
          const newDelivered = current + qty;
          const updates = { deliveredQuantity: newDelivered };
          // إذا اكتمل التسليم → غيّر الحالة
          if (newDelivered >= maxQty) {
            updates.status = 'delivered';
            updates.deliveredAt = Date.now();
          }
          db.updateOrder(order.id, updates);
          toast.success(`تم تسليم ${qty} قطعة بنجاح`);
          closeModal();
          setTimeout(() => openOrderModal(db.getOrder(order.id)), 200);
        });

        document.getElementById('cancel-partial-btn').addEventListener('click', () => {
          closeModal();
          setTimeout(() => openOrderModal(db.getOrder(order.id)), 200);
        });
      });
    }

    // ===== التسليم الكامل + التوقيع =====
    if (isEdit && document.getElementById('full-delivery-btn')) {
      document.getElementById('full-delivery-btn').addEventListener('click', () => {
        closeModal();
        setTimeout(() => openSignatureModal(order), 200);
      });
    }

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

    // ===== الطباعة والواتساب =====
    if (isEdit) {
      document.getElementById('print-invoice-btn').addEventListener('click', () => {
        const currentOrder = db.getOrder(order.id);
        if (currentOrder) printInvoice(currentOrder);
      });

      document.getElementById('share-invoice-btn').addEventListener('click', () => {
        const currentOrder = db.getOrder(order.id);
        if (currentOrder) shareInvoiceWhatsApp(currentOrder);
      });

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

  /* ============================================================
     نافذة التوقيع
     ============================================================ */
  function openSignatureModal(order) {
    const formHtml = `
      <h3 class="card-title no-border">✍️ توقيع التسليم</h3>
      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">
        اطلب من العميل التوقيع في المساحة التالية بإصبعه.
      </p>
      
      <div style="background: var(--bg-color); padding: 10px; border-radius: var(--radius-md); margin-bottom: 12px;">
        <div style="font-size: 12px; color: var(--text-muted);">العميل:</div>
        <div style="font-weight: 700;">${order.garmentType} ×${order.quantity}</div>
        <div style="font-size: 12px; color: var(--text-muted);">الإجمالي: ${money(order.totalPrice)} جنيه</div>
      </div>
      
      <div style="position: relative; border: 2px dashed var(--border-color); border-radius: var(--radius-md); background: white; margin-bottom: 12px; overflow: hidden;">
        <canvas id="signature-canvas" style="display: block; width: 100%; height: 200px; touch-action: none; cursor: crosshair;"></canvas>
        <div id="canvas-hint" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #ccc; font-size: 14px; pointer-events: none;">
          ✍️ وقّع هنا
        </div>
      </div>
      
      <div class="flex-between mt-2" style="gap: 8px;">
        <button type="button" class="btn btn-outline" id="clear-sig-btn" style="flex: 1;">🗑️ مسح</button>
        <button type="button" class="btn btn-outline" id="cancel-sig-btn" style="flex: 1;">إلغاء</button>
      </div>
      <button type="button" class="btn btn-primary btn-full mt-2" id="confirm-delivery-btn">
        📦 تأكيد التسليم
      </button>
    `;

    openModal(formHtml);

    // ===== إعداد Canvas =====
    const canvas = document.getElementById('signature-canvas');
    const hint = document.getElementById('canvas-hint');
    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let hasDrawn = false;

    // ضبط دقة الـ Canvas
    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#1F6D57';
    }

    setTimeout(resizeCanvas, 50);

    // الحصول على إحداثيات اللمس/الماوس
    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches ? e.touches[0] : e;
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    }

    function startDrawing(e) {
      e.preventDefault();
      isDrawing = true;
      hasDrawn = true;
      hint.style.display = 'none';
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }

    function draw(e) {
      if (!isDrawing) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }

    function stopDrawing() {
      isDrawing = false;
    }

    // ربط الأحداث (لمس + ماوس)
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchcancel', stopDrawing);

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);

    // زر المسح
    document.getElementById('clear-sig-btn').addEventListener('click', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasDrawn = false;
      hint.style.display = 'block';
    });

    // إلغاء
    document.getElementById('cancel-sig-btn').addEventListener('click', () => {
      closeModal();
      setTimeout(() => openOrderModal(order), 200);
    });

    // تأكيد التسليم
    document.getElementById('confirm-delivery-btn').addEventListener('click', () => {
      const signatureData = hasDrawn ? canvas.toDataURL('image/png') : null;
      const updates = {
        status: 'delivered',
        deliveredAt: Date.now(),
        deliveredQuantity: order.quantity,
        signature: signatureData
      };
      db.updateOrder(order.id, updates);
      toast.success('✅ تم تسليم الطلب بنجاح' + (signatureData ? ' مع التوقيع' : ''));
      closeModal();
      renderOrdersPage(container);
    });
  }

  /* ============================================================
     ربط الأحداث الرئيسية
     ============================================================ */

  const addBtn = container.querySelector('#add-order-btn');
  if (addBtn) addBtn.addEventListener('click', () => openOrderModal(null));

  container.querySelector('#view-list-btn').addEventListener('click', () => {
    viewMode = 'list';
    renderOrdersPage(container);
  });

  container.querySelector('#view-kanban-btn').addEventListener('click', () => {
    viewMode = 'kanban';
    renderOrdersPage(container);
  });

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

  container.querySelectorAll('.status-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedStatus = btn.dataset.status;
      renderOrdersPage(container);
    });
  });

  container.querySelectorAll('.order-item').forEach(item => {
    item.addEventListener('click', () => {
      const order = db.getOrder(item.dataset.id);
      if (order) openOrderModal(order);
    });
  });

  container.querySelectorAll('.kanban-card').forEach(card => {
    card.addEventListener('click', () => {
      const order = db.getOrder(card.dataset.id);
      if (order) openOrderModal(order);
    });
  });
}
