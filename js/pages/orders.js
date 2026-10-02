/* ============================================================
   orders.js - صفحة الطلبات المتقدمة (V2)
   (يشمل: تعدد أنواع في الطلب + مواعيد + حد يومي + وقت شغل + تسليم جزئي + توقيع + كانبان)
   ============================================================ */

import * as db from '../core/db.js';
import { toast } from '../ui/toast.js';
import { openModal, closeModal } from '../ui/modal.js';
import { today, money, formatDate, daysBetween, uid } from '../core/utils.js';
import { printInvoice, shareInvoiceWhatsApp } from '../core/invoice.js';
import { DEFAULT_SETTINGS } from '../core/config.js';
import * as storage from '../core/storage.js';

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
   دوال مساعدة
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

function getDeadlineInfo(order) {
  if (!order.dueDate) return null;
  if (order.status === 'delivered') return { type: 'done', text: 'تم التسليم', color: '#2E7D32' };
  const daysLeft = daysBetween(order.dueDate, today());
  if (daysLeft < 0) return { type: 'overdue', text: `متأخر ${Math.abs(daysLeft)} يوم`, color: '#C62828', daysLeft };
  if (daysLeft === 0) return { type: 'today', text: 'التسليم اليوم!', color: '#F57C00', daysLeft };
  if (daysLeft === 1) return { type: 'soon', text: 'التسليم غداً', color: '#F57C00', daysLeft };
  if (daysLeft <= 3) return { type: 'near', text: `بعد ${daysLeft} أيام`, color: '#F57C00', daysLeft };
  return { type: 'far', text: `بعد ${daysLeft} يوم`, color: '#2E7D32', daysLeft };
}

/* الحصول على ملخص الطلب (متوافق مع النظام الجديد والقديم) */
function getOrderSummary(order) {
  if (order.items && Array.isArray(order.items) && order.items.length > 0) {
    const totalQty = order.items.reduce((s, it) => s + (it.quantity || 0), 0);
    const names = order.items.map(it => it.name).join(' + ');
    return {
      summary: names,
      totalQty: totalQty,
      itemsCount: order.items.length,
      isMulti: order.items.length > 1
    };
  }
  // النظام القديم
  return {
    summary: order.garmentType || '',
    totalQty: order.quantity || 0,
    itemsCount: 1,
    isMulti: false
  };
}

/* ============================================================
   الصفحة الرئيسية
   ============================================================ */
export function renderOrdersPage(container) {
  const allOrders = db.getOrders();
  const customers = db.getCustomers();
  const settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  const dailyLimit = settings.dailyOrderLimit || 700;

  // الحد اليومي
  const todayStr = today();
  const todayOrders = allOrders.filter(o => o.date === todayStr);
  const todayTotal = todayOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
  const isOverLimit = todayTotal > dailyLimit;
  const remainingLimit = Math.max(0, dailyLimit - todayTotal);
  const limitPercent = Math.min(100, Math.round((todayTotal / dailyLimit) * 100));

  // تصفية
  const filteredOrders = allOrders.filter(o => {
    if (selectedStatus !== 'all' && (o.status || 'pending') !== selectedStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const customer = customers.find(c => c.id === o.customerId);
      const custName = customer ? customer.name.toLowerCase() : '';
      const summary = getOrderSummary(o).summary.toLowerCase();
      return custName.includes(q) || summary.includes(q);
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

  const overdueCount = allOrders.filter(o => {
    if (o.status === 'delivered' || !o.dueDate) return false;
    return daysBetween(o.dueDate, today()) < 0;
  }).length;

  // بناء الواجهة
  let html = `
    <div class="card">
      <div class="flex-between mb-2">
        <h2 class="card-title no-border" style="margin:0;">📋 الطلبات</h2>
        <button class="btn btn-primary" id="add-order-btn">+ إضافة طلب</button>
      </div>

      <!-- الحد اليومي -->
      <div class="card" style="background: ${isOverLimit ? 'linear-gradient(135deg, #FFEBEE, #FFCDD2)' : 'linear-gradient(135deg, #E8F5E9, #C8E6C9)'}; border: none; margin-bottom: 12px; padding: 12px;">
        <div class="flex-between" style="margin-bottom: 8px;">
          <div style="font-size: 13px; font-weight: 700; color: ${isOverLimit ? '#B71C1C' : '#1B5E20'};">
            ${isOverLimit ? '⚠️ تجاوزت الحد اليومي!' : '📊 طلبات اليوم'}
          </div>
          <div style="font-size: 13px; font-weight: 800; color: ${isOverLimit ? '#C62828' : '#2E7D32'};">
            ${money(todayTotal)} / ${money(dailyLimit)}
          </div>
        </div>
        <div style="background: rgba(255,255,255,0.5); height: 8px; border-radius: var(--radius-full); overflow: hidden; margin-bottom: 6px;">
          <div style="width: ${limitPercent}%; height: 100%; background: ${isOverLimit ? 'linear-gradient(90deg, #EF5350, #C62828)' : 'linear-gradient(90deg, #66BB6A, #2E7D32)'}; transition: width 0.5s;"></div>
        </div>
        <div style="font-size: 11px; color: ${isOverLimit ? '#B71C1C' : '#1B5E20'};">
          ${isOverLimit 
            ? `تجاوزت الحد بـ ${money(todayTotal - dailyLimit)} جنيه` 
            : `متبقٍ لك ${money(remainingLimit)} جنيه اليوم`}
          &nbsp;|&nbsp; ${todayOrders.length} طلب
        </div>
      </div>

      <!-- إحصائيات الحالات -->
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

      ${overdueCount > 0 ? `
        <div style="background: #FFEBEE; border-right: 4px solid #C62828; padding: 10px 12px; border-radius: var(--radius-md); margin-bottom: 12px; font-size: 13px; color: #B71C1C;">
          🚨 <strong>تنبيه:</strong> لديك <strong>${overdueCount}</strong> طلب متأخر عن موعد التسليم!
        </div>
      ` : ''}

      <div class="kanban-toggle">
        <button class="btn ${viewMode === 'list' ? 'btn-primary' : 'btn-outline'}" id="view-list-btn">📋 قائمة</button>
        <button class="btn ${viewMode === 'kanban' ? 'btn-primary' : 'btn-outline'}" id="view-kanban-btn">🎯 كانبان</button>
      </div>

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
      const summary = getOrderSummary(o);
      const deadline = getDeadlineInfo(o);

      result += `
        <div class="order-item" data-id="${o.id}" style="border: 1px solid var(--border-color); ${deadline && deadline.type === 'overdue' ? 'border-right: 4px solid #C62828;' : ''} padding: 12px; border-radius: var(--radius-md); background: var(--bg-color); cursor: pointer;">
          <div class="flex-between" style="margin-bottom: 6px;">
            <div style="font-weight:bold; font-size:15px;">
              👤 ${custName}
              ${timerActive ? '<span class="badge" style="background: #E1F5FE; color: #0277BD; margin-right: 6px;">⏱️ يعمل</span>' : ''}
              ${summary.isMulti ? '<span class="badge" style="background: #F3E5F5; color: #6A1B9A; margin-right: 6px;">' + summary.itemsCount + ' أنواع</span>' : ''}
            </div>
            <span class="status-badge ${o.status || 'pending'}">${status.icon} ${status.label}</span>
          </div>
          <div style="font-size:13px; margin-bottom: 6px;">🧵 ${summary.summary}</div>
          <div style="font-size:11px; color:var(--text-muted); margin-bottom: 4px;">📦 الكمية الإجمالية: ${summary.totalQty}</div>
          ${deadline ? `
            <div style="font-size: 11px; font-weight: 700; color: ${deadline.color}; margin-bottom: 4px;">
              📅 التسليم: ${formatDate(o.dueDate)} — ${deadline.text}
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
          const deadline = getDeadlineInfo(o);
          const summary = getOrderSummary(o);

          result += `
            <div class="kanban-card" data-id="${o.id}" data-status="${o.status || 'pending'}">
              <div class="kanban-card-title">
                <span>👤 ${custName}</span>
                ${timerActive ? '<span style="font-size: 14px;">⏱️</span>' : ''}
              </div>
              <div class="kanban-card-info">
                <div class="kanban-card-info-row">
                  <span>🧵 ${summary.summary.length > 20 ? summary.summary.slice(0, 20) + '...' : summary.summary}</span>
                  <span>×${summary.totalQty}</span>
                </div>
                <div class="kanban-card-info-row">
                  <span>الإجمالي:</span>
                  <span class="kanban-card-price">${money(o.totalPrice)}</span>
                </div>
                <div class="kanban-card-info-row">
                  <span>المتبقي:</span>
                  <span class="kanban-card-remaining ${remaining === 0 ? 'paid' : ''}">${money(remaining)}</span>
                </div>
                ${deadline ? `
                  <div style="font-size: 10px; font-weight: 700; color: ${deadline.color}; margin-top: 4px;">
                    📅 ${deadline.text}
                  </div>
                ` : ''}
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
    const hasSignature = isEdit && order.signature;
    const garmentTypes = db.getGarmentTypes();

    // ===== تحضير العناصر (Items) =====
    let items = [];
    if (isEdit && order.items && Array.isArray(order.items) && order.items.length > 0) {
      items = JSON.parse(JSON.stringify(order.items));
    } else if (isEdit) {
      // ترحيل من النظام القديم
      items = [{
        id: uid(),
        typeId: null,
        name: order.garmentType || '',
        price: order.totalPrice || 0,
        quantity: order.quantity || 1
      }];
    } else {
      // طلب جديد: عنصر واحد فارغ
      items = [{ id: uid(), typeId: null, name: '', price: 0, quantity: 1 }];
    }

    const customerOptions = customers.map(c => {
      const selected = (isEdit && c.id === order.customerId) ? 'selected' : '';
      return `<option value="${c.id}" ${selected}>${c.name}</option>`;
    }).join('');

    const statusOptions = ORDER_STATUSES.map(s => `
      <div class="status-option ${s.id === currentStatus ? 'selected' : ''}" data-status="${s.id}">
        <span>${s.icon}</span><span>${s.label}</span>
      </div>
    `).join('');

    // خيارات أنواع الجلابيات
    const garmentTypeOptions = garmentTypes.length === 0
      ? '<option value="">لا توجد أنواع - أدخل يدوياً</option>'
      : garmentTypes.map(t => `<option value="${t.id}">${t.name} - ${t.price} ج</option>`).join('');

    const formHtml = `
      <h3 class="card-title no-border">${title}</h3>
      
      ${isEdit ? `
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

        <!-- ============================================================
             أنواع الجلابيات في الطلب (جديد)
             ============================================================ -->
        <div style="background: var(--bg-color); padding: 12px; border-radius: var(--radius-md); margin-bottom: 12px;">
          <div class="flex-between" style="margin-bottom: 10px;">
            <h4 style="font-size: 14px; margin: 0; color: var(--primary-dark);">🧵 أنواع الجلابيات</h4>
            <button type="button" class="btn btn-primary" id="add-item-btn" style="font-size: 12px; padding: 4px 10px; min-height: 30px;">+ إضافة نوع</button>
          </div>
          
          <div id="order-items-container" style="display: flex; flex-direction: column; gap: 10px;"></div>
          
          <!-- الإجمالي -->
          <div style="margin-top: 12px; padding: 10px; background: linear-gradient(135deg, var(--primary-color), var(--primary-dark)); border-radius: var(--radius-md); color: white;">
            <div class="flex-between">
              <span style="font-size: 13px; opacity: 0.9;">الإجمالي الكلي:</span>
              <strong style="font-size: 20px;" id="order-total-display">0</strong>
            </div>
            <div style="font-size: 11px; opacity: 0.8; text-align: right; margin-top: 4px;">
              <span id="order-items-count-display">0</span> عنصر | 
              <span id="order-qty-total-display">0</span> قطعة
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>المقدم</label>
          <input type="number" id="order-deposit" class="form-control" value="${isEdit ? (order.deposit || 0) : 0}">
        </div>

        <!-- المواعيد -->
        <div style="background: var(--bg-color); padding: 12px; border-radius: var(--radius-md); margin-bottom: 12px;">
          <h4 style="font-size: 13px; margin-bottom: 10px; color: var(--primary-dark);">📅 المواعيد</h4>
          <div class="form-group" style="margin-bottom: 10px;">
            <label style="font-size: 12px;">تاريخ استلام القماش</label>
            <input type="date" id="order-received-date" class="form-control" value="${isEdit ? (order.receivedDate || '') : ''}">
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label style="font-size: 12px;">📆 تاريخ التسليم المتفق عليه</label>
            <input type="date" id="order-due-date" class="form-control" value="${isEdit ? (order.dueDate || '') : ''}">
          </div>
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
          ${currentStatus !== 'delivered' ? `
            <button type="button" class="btn btn-primary btn-full" id="full-delivery-btn" style="margin-bottom: 12px;">
              📦 تسليم كامل + توقيع
            </button>
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

    /* ============================================================
       إدارة العناصر (Items)
       ============================================================ */
    const itemsContainer = document.getElementById('order-items-container');
    const totalDisplay = document.getElementById('order-total-display');
    const countDisplay = document.getElementById('order-items-count-display');
    const qtyDisplay = document.getElementById('order-qty-total-display');

    function calculateTotals() {
      const total = items.reduce((s, it) => s + ((it.price || 0) * (it.quantity || 0)), 0);
      const qty = items.reduce((s, it) => s + (it.quantity || 0), 0);
      totalDisplay.textContent = money(total) + ' جنيه';
      countDisplay.textContent = items.length;
      qtyDisplay.textContent = qty;
      return total;
    }

    function renderItems() {
      itemsContainer.innerHTML = '';
      items.forEach((item, idx) => {
        const itemDiv = document.createElement('div');
        itemDiv.style.cssText = 'border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 10px; background: var(--surface-color); position: relative;';
        itemDiv.innerHTML = `
          <div class="flex-between" style="margin-bottom: 8px;">
            <strong style="font-size: 13px;">عنصر ${idx + 1}</strong>
            ${items.length > 1 ? `<button type="button" class="btn btn-danger remove-item-btn" data-idx="${idx}" style="font-size: 11px; padding: 2px 8px; min-height: 26px;">✕</button>` : ''}
          </div>
          
          <div class="form-group" style="margin-bottom: 8px;">
            <label style="font-size: 11px;">النوع *</label>
            ${garmentTypes.length > 0 ? `
              <select class="form-control item-type-select" data-idx="${idx}" style="min-height: 38px; margin-bottom: 6px;">
                <option value="">-- اختر نوعاً محفوظاً --</option>
                ${garmentTypes.map(t => {
                  const selected = (item.typeId === t.id) ? 'selected' : '';
                  return `<option value="${t.id}" data-name="${t.name}" data-price="${t.price}" ${selected}>${t.name} - ${t.price} ج</option>`;
                }).join('')}
              </select>
            ` : ''}
            <input type="text" class="form-control item-name" data-idx="${idx}" placeholder="اسم الجلابية" value="${item.name || ''}" style="min-height: 38px;">
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div class="form-group" style="margin: 0;">
              <label style="font-size: 11px;">سعر الوحدة</label>
              <input type="number" class="form-control item-price" data-idx="${idx}" value="${item.price || 0}" min="0" step="any" style="min-height: 38px;">
            </div>
            <div class="form-group" style="margin: 0;">
              <label style="font-size: 11px;">الكمية</label>
              <input type="number" class="form-control item-qty" data-idx="${idx}" value="${item.quantity || 1}" min="1" style="min-height: 38px;">
            </div>
          </div>
          
          <div style="text-align: left; margin-top: 8px; font-size: 12px; color: var(--accent-color); font-weight: 700;">
            الإجمالي: <span class="item-total-display">${money((item.price || 0) * (item.quantity || 1))}</span> جنيه
          </div>
        `;
        itemsContainer.appendChild(itemDiv);
      });

      // ربط الأحداث
      itemsContainer.querySelectorAll('.remove-item-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.idx);
          if (items.length > 1) {
            items.splice(idx, 1);
            renderItems();
            calculateTotals();
          }
        });
      });

      itemsContainer.querySelectorAll('.item-type-select').forEach(sel => {
        sel.addEventListener('change', (e) => {
          const idx = parseInt(sel.dataset.idx);
          const opt = e.target.selectedOptions[0];
          if (opt && opt.value) {
            items[idx].typeId = opt.value;
            items[idx].name = opt.dataset.name;
            items[idx].price = parseFloat(opt.dataset.price) || 0;
            renderItems();
            calculateTotals();
          }
        });
      });

      itemsContainer.querySelectorAll('.item-name').forEach(inp => {
        inp.addEventListener('input', (e) => {
          const idx = parseInt(inp.dataset.idx);
          items[idx].name = e.target.value;
        });
      });

      itemsContainer.querySelectorAll('.item-price').forEach(inp => {
        inp.addEventListener('input', (e) => {
          const idx = parseInt(inp.dataset.idx);
          items[idx].price = parseFloat(e.target.value) || 0;
          // تحديث عرض العنصر
          const itemDiv = itemsContainer.children[idx];
          const totalSpan = itemDiv.querySelector('.item-total-display');
          totalSpan.textContent = money(items[idx].price * items[idx].quantity);
          calculateTotals();
        });
      });

      itemsContainer.querySelectorAll('.item-qty').forEach(inp => {
        inp.addEventListener('input', (e) => {
          const idx = parseInt(inp.dataset.idx);
          items[idx].quantity = parseInt(e.target.value) || 1;
          const itemDiv = itemsContainer.children[idx];
          const totalSpan = itemDiv.querySelector('.item-total-display');
          totalSpan.textContent = money(items[idx].price * items[idx].quantity);
          calculateTotals();
        });
      });
    }

    document.getElementById('add-item-btn').addEventListener('click', () => {
      items.push({ id: uid(), typeId: null, name: '', price: 0, quantity: 1 });
      renderItems();
      calculateTotals();
    });

    renderItems();
    calculateTotals();

    /* ============================================================
       اختيار الحالة
       ============================================================ */
    document.querySelectorAll('.status-option').forEach(opt => {
      opt.addEventListener('click', () => {
        document.querySelectorAll('.status-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        document.getElementById('order-status').value = opt.dataset.status;
      });
    });

    /* ============================================================
       زر بدء/إيقاف العمل
       ============================================================ */
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
            sessions[sessions.length - 1].end = Date.now();
            db.updateOrder(order.id, { workSessions: sessions });
            toast.success('تم إيقاف العداد');
            timerBtn.textContent = '▶️ بدء العمل';
            timerBtn.classList.remove('btn-danger');
            timerBtn.classList.add('btn-primary');
            if (liveInterval) clearInterval(liveInterval);
            liveInterval = null;
          } else {
            sessions.push({ start: Date.now(), end: null });
            db.updateOrder(order.id, { workSessions: sessions });
            toast.success('تم بدء العداد');
            timerBtn.textContent = '⏸️ إيقاف';
            timerBtn.classList.remove('btn-primary');
            timerBtn.classList.add('btn-danger');
            if (liveInterval) clearInterval(liveInterval);
            liveInterval = setInterval(updateTimeDisplay, 1000);
          }
          updateTimeDisplay();
        });
      }
    }

    /* ============================================================
       التسليم الكامل + التوقيع
       ============================================================ */
    if (isEdit && document.getElementById('full-delivery-btn')) {
      document.getElementById('full-delivery-btn').addEventListener('click', () => {
        closeModal();
        setTimeout(() => openSignatureModal(order), 200);
      });
    }

    /* ============================================================
       حفظ النموذج
       ============================================================ */
    const form = document.getElementById('order-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const customerId = document.getElementById('order-customer').value;
      const deposit = parseFloat(document.getElementById('order-deposit').value) || 0;
      const status = document.getElementById('order-status').value;
      const receivedDate = document.getElementById('order-received-date').value || null;
      const dueDate = document.getElementById('order-due-date').value || null;

      if (!customerId) {
        toast.error('الرجاء اختيار العميل');
        return;
      }

      // التحقق من العناصر
      const validItems = items.filter(it => it.name && it.name.trim() !== '' && it.price > 0 && it.quantity > 0);
      if (validItems.length === 0) {
        toast.error('الرجاء إضافة عنصر واحد على الأقل ببيانات صحيحة');
        return;
      }

      // حساب الإجماليات
      const totalPrice = validItems.reduce((s, it) => s + (it.price * it.quantity), 0);
      const totalQty = validItems.reduce((s, it) => s + it.quantity, 0);
      const firstItem = validItems[0];

      // التحقق من الحد اليومي
      if (!isEdit) {
        const settings2 = storage.loadSettings() || { ...DEFAULT_SETTINGS };
        const limit = settings2.dailyOrderLimit || 700;
        const todayStr2 = today();
        const todayTotalNow = db.getOrders().filter(o => o.date === todayStr2).reduce((s, o) => s + (o.totalPrice || 0), 0);
        const newTotal = todayTotalNow + totalPrice;

        if (newTotal > limit) {
          const over = newTotal - limit;
          const proceed = confirm(`⚠️ تحذير: ستتجاوز الحد اليومي بمقدار ${over} جنيه.\n\nالحد: ${limit}\nالإجمالي بعد الإضافة: ${newTotal}\n\nهل تريد المتابعة؟`);
          if (!proceed) return;
        }
      }

      const orderData = {
        customerId,
        items: validItems,
        // حقول متوافقة مع النظام القديم
        garmentType: firstItem.name + (validItems.length > 1 ? ` + ${validItems.length - 1}` : ''),
        quantity: totalQty,
        totalPrice: totalPrice,
        deposit,
        status,
        receivedDate,
        dueDate,
        date: isEdit ? (order.date || today()) : today()
      };

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
        <div style="font-size: 12px; color: var(--text-muted);">الطلب:</div>
        <div style="font-weight: 700;">${getOrderSummary(order).summary}</div>
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

    const canvas = document.getElementById('signature-canvas');
    const hint = document.getElementById('canvas-hint');
    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let hasDrawn = false;

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

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches ? e.touches[0] : e;
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
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

    function stopDrawing() { isDrawing = false; }

    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchcancel', stopDrawing);
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);

    document.getElementById('clear-sig-btn').addEventListener('click', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasDrawn = false;
      hint.style.display = 'block';
    });

    document.getElementById('cancel-sig-btn').addEventListener('click', () => {
      closeModal();
      setTimeout(() => openOrderModal(order), 200);
    });

    document.getElementById('confirm-delivery-btn').addEventListener('click', () => {
      const signatureData = hasDrawn ? canvas.toDataURL('image/png') : null;
      const updates = {
        status: 'delivered',
        deliveredAt: Date.now(),
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
