/* ============================================================
   orders.js - صفحة الطلبات (V2)
   (النسخة النهائية الشاملة - مُصلحة بالكامل)
   ============================================================ */

import * as db from '../core/db.js';
import { toast } from '../ui/toast.js';
import { openModal, closeModal } from '../ui/modal.js';
import { today, money, formatDate, daysBetween, uid, escapeHtml, formatDuration } from '../core/utils.js';
import { printInvoice, shareInvoiceWhatsApp } from '../core/invoice.js';
import { DEFAULT_SETTINGS } from '../core/config.js';
import * as storage from '../core/storage.js';
import { previewOrder } from '../ui/quick-preview.js';
import { groupOrders, getGroupMeasurementsSummary, getGroupStats, getGroupingSettings } from '../core/order-grouping.js';

/* ============================================================
   الثوابت
   ============================================================ */
const ORDER_STATUSES = [
  { id: 'pending', label: 'قيد الانتظار', icon: '⏳' },
  { id: 'in_progress', label: 'قيد التنفيذ', icon: '🧵' },
  { id: 'ready', label: 'جاهز للتسليم', icon: '✅' },
  { id: 'delivered', label: 'تم التسليم', icon: '📦' }
];

const EXTRA_FEE_TYPES = [
  { id: 'urgent', label: 'استعجال', icon: '⚡', defaultPercent: 20 },
  { id: 'modification', label: 'تعديلات', icon: '✏️', defaultPercent: 0 },
  { id: 'express', label: 'خدمة سريعة', icon: '🚀', defaultPercent: 15 },
  { id: 'delivery', label: 'توصيل', icon: '🚚', defaultPercent: 0 },
  { id: 'other', label: 'أخرى', icon: '📌', defaultPercent: 0 }
];

/* ============================================================
   حالة الصفحة
   ============================================================ */
let searchQuery = '';
let selectedStatus = 'all';
let viewMode = 'list';

/* ============================================================
   دوال مساعدة (على مستوى الملف)
   ============================================================ */

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

function getOrderSummary(order) {
  if (order.items && Array.isArray(order.items) && order.items.length > 0) {
    const totalQty = order.items.reduce((s, it) => s + (it.quantity || 0), 0);
    const names = order.items.map(it => it.name).join(' + ');
    return { summary: names, totalQty, itemsCount: order.items.length, isMulti: order.items.length > 1 };
  }
  return { summary: order.garmentType || '', totalQty: order.quantity || 0, itemsCount: 1, isMulti: false };
}

function getOrderRemaining(order) {
  const finalTotal = order.totalPrice || 0;
  const paid = order.deposit || 0;
  return Math.max(0, finalTotal - paid);
}

function suggestDueDate(newOrderTotal) {
  const settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  const limit = settings.dailyOrderLimit || 700;
  if (limit <= 0) return null;
  const orders = db.getOrders();
  const candidate = new Date();
  candidate.setDate(candidate.getDate() + 1);
  for (let i = 0; i < 30; i++) {
    const y = candidate.getFullYear();
    const m = String(candidate.getMonth() + 1).padStart(2, '0');
    const d = String(candidate.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const dayTotal = orders
      .filter(o => o.dueDate === dateStr && o.status !== 'delivered')
      .reduce((s, o) => s + (o.totalPrice || 0), 0);
    if (dayTotal + newOrderTotal <= limit) return dateStr;
    candidate.setDate(candidate.getDate() + 1);
  }
  return null;
}

function openWhatsApp(phone, message) {
  if (!phone) { toast.error('لا يوجد رقم هاتف'); return; }
  let cleanPhone = String(phone).replace(/\D/g, '');
  if (cleanPhone.startsWith('0')) cleanPhone = '2' + cleanPhone;
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

function customerHasPhone(order, customers) {
  const cust = customers.find(c => c.id === order.customerId);
  return cust && cust.phone;
}

/* ============================================================
   الصفحة الرئيسية
   ============================================================ */
export function renderOrdersPage(container) {
  const allOrders = db.getOrders();
  const customers = db.getCustomers();
  const settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  const dailyLimit = settings.dailyOrderLimit || 700;

  const todayStr = today();
  const todayOrders = allOrders.filter(o => o.date === todayStr);
  const todayTotal = todayOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
  const isOverLimit = todayTotal > dailyLimit;
  const remainingLimit = Math.max(0, dailyLimit - todayTotal);
  const limitPercent = Math.min(100, Math.round((todayTotal / dailyLimit) * 100));

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

  /* ============================================================
     بناء HTML الصفحة
     ============================================================ */
  let html = `
    <div class="card">
      <div class="flex-between mb-2">
        <h2 class="card-title no-border" style="margin:0;">📋 الطلبات</h2>
        <button class="btn btn-primary" id="add-order-btn">+ إضافة طلب</button>
      </div>

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
          <div style="width: ${limitPercent}%; height: 100%; background: ${isOverLimit ? 'linear-gradient(90deg, #EF5350, #C62828)' : 'linear-gradient(90deg, #66BB6A, #2E7D32)'};"></div>
        </div>
        <div style="font-size: 11px; color: ${isOverLimit ? '#B71C1C' : '#1B5E20'};">
          ${isOverLimit ? `تجاوزت الحد بـ ${money(todayTotal - dailyLimit)} جنيه` : `متبقٍ لك ${money(remainingLimit)} جنيه اليوم`}
          &nbsp;|&nbsp; ${todayOrders.length} طلب
        </div>
      </div>

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
          🚨 <strong>تنبيه:</strong> لديك <strong>${overdueCount}</strong> طلب متأخر!
        </div>
      ` : ''}

      <div class="kanban-toggle" style="flex-wrap: wrap;">
        <button class="btn ${viewMode === 'list' ? 'btn-primary' : 'btn-outline'}" id="view-list-btn">📋 قائمة</button>
        <button class="btn ${viewMode === 'kanban' ? 'btn-primary' : 'btn-outline'}" id="view-kanban-btn">🎯 كانبان</button>
        <button class="btn ${viewMode === 'grouping' ? 'btn-primary' : 'btn-outline'}" id="view-grouping-btn" style="font-size: 12px;">🧵 تجميع</button>
      </div>

      <div class="form-group" style="margin-bottom: 10px;">
        <input type="text" id="search-order-input" class="form-control" placeholder="🔍 ابحث باسم العميل أو نوع الجلابية..." value="${escapeHtml(searchQuery)}">
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
  } else if (viewMode === 'kanban') {
    html += renderKanbanView(allOrders, customers);
  } else if (viewMode === 'grouping') {
    html += renderGroupingView();
  }

  html += `</div>`;
  container.innerHTML = html;

  /* ============================================================
     عرض القائمة
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
      const remaining = getOrderRemaining(o);
      const status = ORDER_STATUSES.find(s => s.id === (o.status || 'pending')) || ORDER_STATUSES[0];
      const timerActive = isOrderTimerActive(o);
      const totalTime = getOrderTotalWorkTime(o);
      const summary = getOrderSummary(o);
      const deadline = getDeadlineInfo(o);
      const hasDiscount = (o.discountAmount || 0) > 0;
      const hasExtraFees = (o.extraFeesTotal || 0) > 0;
      const hasImage = !!o.referenceImage;

      result += `
        <div class="order-item" data-id="${o.id}" style="border: 1px solid var(--border-color); ${deadline && deadline.type === 'overdue' ? 'border-right: 4px solid #C62828;' : ''} padding: 12px; border-radius: var(--radius-md); background: var(--bg-color); cursor: pointer;">
          <div class="flex-between" style="margin-bottom: 6px;">
            <div style="font-weight:bold; font-size:15px;">
              👤 ${escapeHtml(custName)}
              ${timerActive ? '<span class="badge" style="background: #E1F5FE; color: #0277BD; margin-right: 6px;">⏱️ يعمل</span>' : ''}
              ${summary.isMulti ? '<span class="badge" style="background: #F3E5F5; color: #6A1B9A; margin-right: 6px;">' + summary.itemsCount + ' أنواع</span>' : ''}
              ${hasDiscount ? '<span class="badge" style="background: #FFF8E1; color: #F57F17; margin-right: 6px;">💸 خصم</span>' : ''}
              ${hasExtraFees ? '<span class="badge" style="background: #FFF3E0; color: #E65100; margin-right: 6px;">➕ رسوم</span>' : ''}
              ${hasImage ? '<span class="badge" style="background: #E3F2FD; color: #1565C0; margin-right: 6px;">📷</span>' : ''}
            </div>
            <div style="display: flex; gap: 4px; align-items: center;">
              <button class="order-preview-btn" data-id="${o.id}" title="معاينة" style="background: var(--surface-color); color: var(--primary-color); border: 1px solid var(--border-color); padding: 4px 8px; border-radius: var(--radius-md); font-size: 12px; cursor: pointer; min-height: 26px;">👁️</button>
              <span class="status-badge ${o.status || 'pending'}">${status.icon} ${status.label}</span>
            </div>
          </div>
          <div style="font-size:13px; margin-bottom: 6px;">🧵 ${escapeHtml(summary.summary)}</div>
          <div style="font-size:11px; color:var(--text-muted); margin-bottom: 4px;">📦 الكمية: ${summary.totalQty}</div>
          ${deadline ? `<div style="font-size: 11px; font-weight: 700; color: ${deadline.color}; margin-bottom: 4px;">📅 التسليم: ${formatDate(o.dueDate)} — ${deadline.text}</div>` : ''}
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
          const remaining = getOrderRemaining(o);
          const timerActive = isOrderTimerActive(o);
          const deadline = getDeadlineInfo(o);
          const summary = getOrderSummary(o);
          result += `
            <div class="kanban-card" data-id="${o.id}" data-status="${o.status || 'pending'}">
              <div class="kanban-card-title"><span>👤 ${escapeHtml(custName)}</span>${timerActive ? '<span style="font-size:14px;">⏱️</span>' : ''}</div>
              <div class="kanban-card-info">
                <div class="kanban-card-info-row"><span>🧵 ${escapeHtml(summary.summary.length > 20 ? summary.summary.slice(0, 20) + '...' : summary.summary)}</span><span>×${summary.totalQty}</span></div>
                <div class="kanban-card-info-row"><span>الإجمالي:</span><span class="kanban-card-price">${money(o.totalPrice)}</span></div>
                <div class="kanban-card-info-row"><span>المتبقي:</span><span class="kanban-card-remaining ${remaining === 0 ? 'paid' : ''}">${money(remaining)}</span></div>
                ${deadline ? `<div style="font-size:10px; font-weight:700; color:${deadline.color}; margin-top:4px;">📅 ${deadline.text}</div>` : ''}
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
     عرض التجميع
     ============================================================ */
  function renderGroupingView() {
    const settings = getGroupingSettings();
    if (!settings.enabled) {
      return `
        <div class="card" style="text-align: center; padding: 24px; background: #FFF3E0; border: none;">
          <div style="font-size: 40px; margin-bottom: 8px;">🧵</div>
          <h3 style="font-size: 16px; margin-bottom: 8px;">تجميع القياسات غير مفعّل</h3>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">لتفعيل هذه الميزة، اذهب إلى الإعدادات وفعّل "تجميع الطلبات المتشابهة".</p>
          <a href="#/settings" class="btn btn-primary" style="text-decoration: none;">⚙️ فتح الإعدادات</a>
        </div>
      `;
    }
    const result = groupOrders();
    if (result.totalGroups === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon">🧵</div>
          <p>لا توجد طلبات قابلة للتجميع حالياً.</p>
          <p style="font-size: 12px; color: var(--text-muted); margin-top: 8px;">السبب: القياسات غير متقاربة أو لا توجد طلبات نشطة.</p>
        </div>
      `;
    }
    let html = `
      <div style="background: linear-gradient(135deg, var(--primary-color), var(--primary-dark)); color: white; padding: 12px; border-radius: var(--radius-md); margin-bottom: 16px;">
        <div class="flex-between">
          <div><div style="font-size: 12px; opacity: 0.85;">🧵 مجموعات قابلة للتجميع</div><div style="font-size: 22px; font-weight: 800; margin-top: 2px;">${result.totalGroups} مجموعة</div></div>
          <div style="text-align: left;"><div style="font-size: 12px; opacity: 0.85;">إجمالي الطلبات</div><div style="font-size: 22px; font-weight: 800; margin-top: 2px;">${result.totalGroupedOrders}</div></div>
        </div>
        <div style="font-size: 11px; opacity: 0.8; margin-top: 6px;">📏 نسبة التقارب: ${settings.tolerance} سم</div>
      </div>
    `;
    result.groups.forEach((group, idx) => {
      const summary = getGroupMeasurementsSummary(group);
      const stats = getGroupStats(group);
      let measHtml = '';
      Object.keys(summary).forEach(fieldId => {
        const m = summary[fieldId];
        measHtml += `
          <div style="display:flex; justify-content:space-between; padding:4px 0; font-size:12px; border-bottom:1px dashed var(--border-color);">
            <span style="color:var(--text-muted);">${m.label}:</span>
            <span style="font-weight:600;">${m.min} - ${m.max} سم ${m.range === 0 ? '<span style="color:#2E7D32;font-size:10px;">(متطابق)</span>' : ''}</span>
          </div>
        `;
      });
      const itemsHtml = group.items.map(item => {
        const statusColors = { pending: '#FFA726', in_progress: '#29B6F6', ready: '#AB47BC', delivered: '#66BB6A' };
        const status = item.order.status || 'pending';
        const orderSummary = getOrderSummary(item.order);
        return `
          <div class="group-order-item" data-id="${item.order.id}" style="display:flex; align-items:center; gap:8px; padding:8px; background:var(--surface-color); border-radius:var(--radius-md); border-right:3px solid ${statusColors[status]}; cursor:pointer; margin-bottom:4px;">
            <span style="font-size:16px;">👤</span>
            <div style="flex:1; min-width:0;">
              <div style="font-weight:600; font-size:13px;">${escapeHtml(item.customer ? item.customer.name : 'عميل محذوف')}</div>
              <div style="font-size:11px; color:var(--text-muted);">${escapeHtml(orderSummary.summary.length > 25 ? orderSummary.summary.slice(0, 25) + '...' : orderSummary.summary)}</div>
            </div>
            <span style="font-size:12px; font-weight:700; color:var(--primary-color);">${money(item.order.totalPrice)} ج</span>
          </div>
        `;
      }).join('');
      html += `
        <div class="card" style="margin-bottom:12px; border-right:4px solid var(--accent-color);">
          <div class="flex-between" style="margin-bottom:10px;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-size:20px;">🧵</span>
              <div><div style="font-weight:800; font-size:14px;">مجموعة ${idx + 1} — ${group.items.length} طلبات</div><div style="font-size:11px; color:var(--text-muted);">${escapeHtml(group.garmentType || 'نوع عام')}</div></div>
            </div>
            <div style="text-align:left; font-size:11px;">
              <div style="color:var(--text-muted);">الكمية الكلية</div>
              <div style="font-weight:800; color:var(--accent-color); font-size:14px;">${stats.totalQuantity} قطعة</div>
            </div>
          </div>
          <div style="background:var(--bg-color); padding:8px 12px; border-radius:var(--radius-md); margin-bottom:10px;">
            <div style="font-size:12px; font-weight:700; color:var(--primary-dark); margin-bottom:6px;">📏 نطاق القياسات:</div>
            ${measHtml || '<div style="font-size:12px; color:var(--text-muted);">لا توجد قياسات مفصّلة</div>'}
          </div>
          <div style="margin-bottom:10px;">
            <div style="font-size:12px; font-weight:700; color:var(--primary-dark); margin-bottom:6px;">📋 الطلبات في المجموعة:</div>
            ${itemsHtml}
          </div>
          <div style="display:flex; justify-content:space-between; padding-top:8px; border-top:1px solid var(--border-color); font-size:12px;">
            <span style="color:var(--text-muted);">💰 إجمالي القيمة:</span>
            <strong style="color:var(--primary-color);">${money(stats.totalValue)} جنيه</strong>
          </div>
        </div>
      `;
    });
    return html;
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

    let discountType = isEdit ? (order.discountType || 'none') : 'none';
    let discountValue = isEdit ? (order.discountValue || 0) : 0;
    let extraFees = isEdit && Array.isArray(order.extraFees) ? JSON.parse(JSON.stringify(order.extraFees)) : [];

    let items = [];
    if (isEdit && order.items && Array.isArray(order.items) && order.items.length > 0) {
      items = JSON.parse(JSON.stringify(order.items));
    } else if (isEdit) {
      items = [{
        id: uid(),
        typeId: null,
        name: order.garmentType || '',
        price: (order.subtotal || order.totalPrice || 0) / (order.quantity || 1),
        quantity: order.quantity || 1
      }];
    } else {
      items = [{ id: uid(), typeId: null, name: '', price: 0, quantity: 1 }];
    }

    let referenceImage = isEdit ? (order.referenceImage || null) : null;

    const customerOptions = customers.map(c => {
      const selected = (isEdit && c.id === order.customerId) ? 'selected' : '';
      return `<option value="${c.id}" ${selected}>${escapeHtml(c.name)}</option>`;
    }).join('');

    const statusOptions = ORDER_STATUSES.map(s => `
      <div class="status-option ${s.id === currentStatus ? 'selected' : ''}" data-status="${s.id}">
        <span>${s.icon}</span><span>${s.label}</span>
      </div>
    `).join('');

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

        <div style="background: var(--bg-color); padding: 12px; border-radius: var(--radius-md); margin-bottom: 12px;">
          <div class="flex-between" style="margin-bottom: 10px;">
            <h4 style="font-size: 14px; margin: 0; color: var(--primary-dark);">🧵 أنواع الجلابيات</h4>
            <button type="button" class="btn btn-primary" id="add-item-btn" style="font-size: 12px; padding: 4px 10px; min-height: 30px;">+ إضافة نوع</button>
          </div>
          <div id="order-items-container" style="display: flex; flex-direction: column; gap: 10px;"></div>
        </div>

        <div class="form-group">
          <label style="display: flex; align-items: center; justify-content: space-between;">
            <span>📷 صورة مرجعية (اختياري)</span>
            ${referenceImage ? `<button type="button" id="remove-image-btn" style="background: none; border: none; color: #dc3545; font-size: 12px; cursor: pointer;">🗑️ حذف</button>` : ''}
          </label>
          <div id="reference-image-preview" style="width: 100%; height: ${referenceImage ? '150px' : '60px'}; background: var(--bg-color); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; border: 2px dashed var(--border-color); margin-bottom: 8px; overflow: hidden;">
            ${referenceImage ? `<img src="${referenceImage}" style="width: 100%; height: 100%; object-fit: cover; border-radius: var(--radius-md);">` : `<span style="font-size: 12px; color: var(--text-muted);">لا توجد صورة</span>`}
          </div>
          <button type="button" class="btn btn-outline btn-full" id="pick-from-portfolio-btn" style="min-height: 36px; font-size: 12px;">
            🖼️ اختر من معرض الأعمال
          </button>
        </div>

        <div class="form-group">
          <label>💸 الخصم</label>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-bottom: 8px;">
            <button type="button" class="btn ${discountType === 'none' ? 'btn-primary' : 'btn-outline'} discount-type-btn" data-type="none" style="font-size: 11px; min-height: 34px; padding: 4px;">بدون</button>
            <button type="button" class="btn ${discountType === 'percent' ? 'btn-primary' : 'btn-outline'} discount-type-btn" data-type="percent" style="font-size: 11px; min-height: 34px; padding: 4px;">نسبة %</button>
            <button type="button" class="btn ${discountType === 'fixed' ? 'btn-primary' : 'btn-outline'} discount-type-btn" data-type="fixed" style="font-size: 11px; min-height: 34px; padding: 4px;">مبلغ ثابت</button>
          </div>
          ${discountType !== 'none' ? `
            <input type="number" id="discount-value" class="form-control" value="${discountValue}" min="0" step="any" placeholder="${discountType === 'percent' ? 'النسبة %' : 'المبلغ بالجنيه'}">
          ` : ''}
        </div>

        <div class="form-group">
          <div class="flex-between" style="margin-bottom: 8px;">
            <label style="margin: 0;">➕ الرسوم الإضافية</label>
            <button type="button" class="btn btn-primary" id="add-extra-fee-btn" style="font-size: 11px; padding: 4px 10px; min-height: 28px;">+ إضافة</button>
          </div>
          <div id="extra-fees-container" style="display: flex; flex-direction: column; gap: 8px;"></div>
          <div id="extra-fees-total" style="margin-top: 8px; font-size: 12px; color: var(--accent-color); font-weight: 700; text-align: left; display: none;">
            إجمالي الرسوم: <span id="extra-fees-total-value">0</span> جنيه
          </div>
        </div>

        <div class="form-group">
          <label>المقدم</label>
          <input type="number" id="order-deposit" class="form-control" value="${isEdit ? (order.deposit || 0) : 0}">
        </div>

        <div style="background: linear-gradient(135deg, var(--primary-color), var(--primary-dark)); border-radius: var(--radius-md); padding: 12px; margin-bottom: 12px; color: white;">
          <div class="flex-between" style="padding: 4px 0; font-size: 13px;">
            <span style="opacity: 0.85;">المجموع الفرعي:</span>
            <strong id="subtotal-display">0</strong>
          </div>
          <div class="flex-between" style="padding: 4px 0; font-size: 13px;">
            <span style="opacity: 0.85;">الخصم:</span>
            <strong id="discount-display" style="color: #FFD54F;">0</strong>
          </div>
          <div class="flex-between" style="padding: 4px 0; font-size: 13px; border-bottom: 1px dashed rgba(255,255,255,0.3); padding-bottom: 8px;">
            <span style="opacity: 0.85;">الرسوم الإضافية:</span>
            <strong id="extrafees-display" style="color: #FF8A65;">0</strong>
          </div>
          <div class="flex-between" style="padding: 8px 0 4px 0; font-size: 14px;">
            <span style="font-weight: 700;">الإجمالي النهائي:</span>
            <strong id="final-total-display" style="font-size: 20px;">0</strong>
          </div>
          <div class="flex-between" style="padding: 4px 0; font-size: 13px; border-top: 1px dashed rgba(255,255,255,0.3); padding-top: 8px;">
            <span style="opacity: 0.85;">المدفوع:</span>
            <strong id="paid-display">0</strong>
          </div>
          <div class="flex-between" style="padding: 4px 0; font-size: 15px; border-top: 2px solid rgba(255,255,255,0.4); padding-top: 8px; margin-top: 4px;">
            <span style="font-weight: 800;">✨ المتبقي:</span>
            <strong id="remaining-display" style="font-size: 20px; color: #FFD54F;">0</strong>
          </div>
        </div>

        <div style="background: var(--bg-color); padding: 12px; border-radius: var(--radius-md); margin-bottom: 12px;">
          <h4 style="font-size: 13px; margin-bottom: 10px; color: var(--primary-dark);">📅 المواعيد</h4>
          <div class="form-group" style="margin-bottom: 10px;">
            <label style="font-size: 12px;">تاريخ استلام القماش</label>
            <input type="date" id="order-received-date" class="form-control" value="${isEdit ? (order.receivedDate || '') : ''}">
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label style="font-size: 12px; display: flex; align-items: center; justify-content: space-between;">
              <span>📆 تاريخ التسليم المتفق عليه</span>
              <button type="button" id="suggest-date-btn" style="background: none; border: none; color: var(--primary-color); font-size: 11px; cursor: pointer; font-weight: 700;">💡 اقترح تلقائياً</button>
            </label>
            <input type="date" id="order-due-date" class="form-control" value="${isEdit ? (order.dueDate || '') : ''}">
            <div id="suggest-hint" style="font-size: 11px; color: var(--primary-color); margin-top: 4px; display: none;"></div>
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
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
            <button type="button" class="btn btn-outline" id="print-invoice-btn">🖨️ طباعة</button>
            <button type="button" class="btn" id="share-invoice-btn" style="background: #25D366; color: white;">📱 واتساب</button>
          </div>
          ${getOrderRemaining(order) > 0 && customerHasPhone(order, customers) ? `
            <button type="button" class="btn btn-full" id="payment-reminder-btn" style="background: #FFF3E0; color: #E65100; border: 2px solid #E65100; margin-bottom: 8px; font-weight: 700;">
              🔔 إرسال تذكير بالدفع (${money(getOrderRemaining(order))} ج)
            </button>
          ` : ''}
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
            <button type="submit" class="btn btn-primary">حفظ</button>
          </div>
        </div>
      </form>
    `;

    openModal(formHtml);

    /* ===== إدارة العناصر ===== */
    const itemsContainer = document.getElementById('order-items-container');

    function calculateDiscount(subtotal) {
      if (discountType === 'none' || !discountValue) return 0;
      if (discountType === 'percent') return (subtotal * discountValue) / 100;
      return Math.min(discountValue, subtotal);
    }

    function calculateExtraFees(subtotal) {
      let total = 0;
      extraFees.forEach(fee => {
        if (fee.type === 'percent') total += (subtotal * (fee.value || 0)) / 100;
        else total += (fee.value || 0);
      });
      return total;
    }

    function updateSummary() {
      const subtotal = items.reduce((s, it) => s + ((it.price || 0) * (it.quantity || 0)), 0);
      const discount = calculateDiscount(subtotal);
      const extraFeesTotal = calculateExtraFees(subtotal);
      const finalTotal = subtotal - discount + extraFeesTotal;
      const deposit = parseFloat(document.getElementById('order-deposit').value) || 0;
      const remaining = Math.max(0, finalTotal - deposit);

      const subtotalEl = document.getElementById('subtotal-display');
      if (subtotalEl) subtotalEl.textContent = money(subtotal) + ' ج';
      const discountEl = document.getElementById('discount-display');
      if (discountEl) discountEl.textContent = discount > 0 ? '- ' + money(discount) + ' ج' : '0';
      const extraEl = document.getElementById('extrafees-display');
      if (extraEl) extraEl.textContent = extraFeesTotal > 0 ? '+ ' + money(extraFeesTotal) + ' ج' : '0';
      const finalEl = document.getElementById('final-total-display');
      if (finalEl) finalEl.textContent = money(finalTotal) + ' ج';
      const paidEl = document.getElementById('paid-display');
      if (paidEl) paidEl.textContent = money(deposit) + ' ج';
      const remainEl = document.getElementById('remaining-display');
      if (remainEl) remainEl.textContent = money(remaining) + ' ج';

      const feeTotalDiv = document.getElementById('extra-fees-total');
      const feeTotalValue = document.getElementById('extra-fees-total-value');
      if (feeTotalDiv) {
        if (extraFees.length > 0) {
          feeTotalDiv.style.display = 'block';
          feeTotalValue.textContent = money(extraFeesTotal);
        } else {
          feeTotalDiv.style.display = 'none';
        }
      }

      return { subtotal, discount, extraFeesTotal, finalTotal, deposit, remaining };
    }

    function renderItems() {
      itemsContainer.innerHTML = '';
      const garmentTypesList = db.getGarmentTypes();

      items.forEach((item, idx) => {
        const itemDiv = document.createElement('div');
        itemDiv.style.cssText = 'border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 10px; background: var(--surface-color);';
        itemDiv.innerHTML = `
          <div class="flex-between" style="margin-bottom: 8px;">
            <strong style="font-size: 13px;">عنصر ${idx + 1}</strong>
            ${items.length > 1 ? `<button type="button" class="btn btn-danger remove-item-btn" data-idx="${idx}" style="font-size: 11px; padding: 2px 8px; min-height: 26px;">✕</button>` : ''}
          </div>
          <div class="form-group" style="margin-bottom: 8px;">
            <label style="font-size: 11px;">النوع *</label>
            ${garmentTypesList.length > 0 ? `
              <select class="form-control item-type-select" data-idx="${idx}" style="min-height: 38px; margin-bottom: 6px;">
                <option value="">-- اختر نوعاً محفوظاً --</option>
                ${garmentTypesList.map(t => {
                  const selected = (item.typeId === t.id) ? 'selected' : '';
                  return `<option value="${t.id}" data-name="${escapeHtml(t.name)}" data-price="${t.price}" ${selected}>${escapeHtml(t.name)} - ${t.price} ج</option>`;
                }).join('')}
              </select>
            ` : ''}
            <input type="text" class="form-control item-name" data-idx="${idx}" placeholder="اسم الجلابية" value="${escapeHtml(item.name || '')}" style="min-height: 38px;">
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
            الإجمالي: <span class="item-total-display">${money((item.price || 0) * (item.quantity || 1))}</span> ج
          </div>
        `;
        itemsContainer.appendChild(itemDiv);
      });

      itemsContainer.querySelectorAll('.remove-item-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.idx);
          if (items.length > 1) {
            items.splice(idx, 1);
            renderItems();
            updateSummary();
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
            updateSummary();
          }
        });
      });

      itemsContainer.querySelectorAll('.item-name').forEach(inp => {
        inp.addEventListener('input', (e) => { items[parseInt(inp.dataset.idx)].name = e.target.value; });
      });

      itemsContainer.querySelectorAll('.item-price').forEach(inp => {
        inp.addEventListener('input', (e) => {
          const idx = parseInt(inp.dataset.idx);
          items[idx].price = parseFloat(e.target.value) || 0;
          itemsContainer.children[idx].querySelector('.item-total-display').textContent = money(items[idx].price * items[idx].quantity);
          updateSummary();
        });
      });

      itemsContainer.querySelectorAll('.item-qty').forEach(inp => {
        inp.addEventListener('input', (e) => {
          const idx = parseInt(inp.dataset.idx);
          items[idx].quantity = parseInt(e.target.value) || 1;
          itemsContainer.children[idx].querySelector('.item-total-display').textContent = money(items[idx].price * items[idx].quantity);
          updateSummary();
        });
      });

      updateSummary();
    }

    document.getElementById('add-item-btn').addEventListener('click', () => {
      items.push({ id: uid(), typeId: null, name: '', price: 0, quantity: 1 });
      renderItems();
    });

    renderItems();

    /* ===== الرسوم الإضافية ===== */
    const extraFeesContainer = document.getElementById('extra-fees-container');

    function renderExtraFees() {
      extraFeesContainer.innerHTML = '';
      if (extraFees.length === 0) {
        extraFeesContainer.innerHTML = `<p style="text-align: center; font-size: 12px; color: var(--text-muted); padding: 6px;">لا توجد رسوم إضافية</p>`;
        updateSummary();
        return;
      }

      extraFees.forEach((fee, idx) => {
        const feeDiv = document.createElement('div');
        feeDiv.style.cssText = 'border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 8px; background: var(--surface-color);';

        const typeOptions = EXTRA_FEE_TYPES.map(t => {
          const selected = (fee.feeType === t.id) ? 'selected' : '';
          return `<option value="${t.id}" ${selected}>${t.icon} ${t.label}</option>`;
        }).join('');

        feeDiv.innerHTML = `
          <div class="flex-between" style="margin-bottom: 6px;">
            <span style="font-size: 12px; font-weight: 700;">رسم ${idx + 1}</span>
            <button type="button" class="btn btn-danger remove-fee-btn" data-idx="${idx}" style="font-size: 11px; padding: 2px 8px; min-height: 24px;">✕</button>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
            <div>
              <label style="font-size: 10px; color: var(--text-muted);">النوع</label>
              <select class="form-control fee-type-select" data-idx="${idx}" style="min-height: 34px; font-size: 12px;">${typeOptions}</select>
            </div>
            <div>
              <label style="font-size: 10px; color: var(--text-muted);">القيمة</label>
              <input type="number" class="form-control fee-value" data-idx="${idx}" value="${fee.value || 0}" min="0" step="any" style="min-height: 34px; font-size: 12px;">
            </div>
          </div>
          <div style="margin-top: 6px; font-size: 11px;">
            <label style="display: flex; align-items: center; gap: 4px; cursor: pointer;">
              <input type="checkbox" class="fee-is-percent" data-idx="${idx}" ${fee.type === 'percent' ? 'checked' : ''} style="width: 14px; height: 14px;">
              <span>حسب النسبة % (بدلاً من مبلغ ثابت)</span>
            </label>
          </div>
        `;
        extraFeesContainer.appendChild(feeDiv);
      });

      extraFeesContainer.querySelectorAll('.remove-fee-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          extraFees.splice(parseInt(btn.dataset.idx), 1);
          renderExtraFees();
        });
      });

      extraFeesContainer.querySelectorAll('.fee-type-select').forEach(sel => {
        sel.addEventListener('change', (e) => {
          const idx = parseInt(sel.dataset.idx);
          extraFees[idx].feeType = e.target.value;
          const typeInfo = EXTRA_FEE_TYPES.find(t => t.id === e.target.value);
          if (typeInfo && typeInfo.defaultPercent > 0 && extraFees[idx].value === 0) {
            extraFees[idx].value = typeInfo.defaultPercent;
            extraFees[idx].type = 'percent';
            renderExtraFees();
          }
        });
      });

      extraFeesContainer.querySelectorAll('.fee-value').forEach(inp => {
        inp.addEventListener('input', (e) => {
          extraFees[parseInt(inp.dataset.idx)].value = parseFloat(e.target.value) || 0;
          updateSummary();
        });
      });

      extraFeesContainer.querySelectorAll('.fee-is-percent').forEach(chk => {
        chk.addEventListener('change', (e) => {
          extraFees[parseInt(chk.dataset.idx)].type = e.target.checked ? 'percent' : 'fixed';
          updateSummary();
        });
      });

      updateSummary();
    }

    document.getElementById('add-extra-fee-btn').addEventListener('click', () => {
      extraFees.push({ id: uid(), feeType: 'urgent', value: 0, type: 'fixed' });
      renderExtraFees();
    });

    renderExtraFees();

    /* ===== الخصم ===== */
    function bindDiscountUI() {
      document.querySelectorAll('.discount-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          discountType = btn.dataset.type;
          if (discountType === 'none') discountValue = 0;
          const discountSection = btn.closest('.form-group');
          const hasInput = document.getElementById('discount-value');
          if (discountType !== 'none' && !hasInput) {
            const input = document.createElement('input');
            input.type = 'number';
            input.id = 'discount-value';
            input.className = 'form-control';
            input.value = discountValue;
            input.min = 0;
            input.step = 'any';
            input.placeholder = discountType === 'percent' ? 'النسبة %' : 'المبلغ بالجنيه';
            input.addEventListener('input', (e) => {
              discountValue = parseFloat(e.target.value) || 0;
              updateSummary();
            });
            discountSection.appendChild(input);
          } else if (discountType === 'none' && hasInput) {
            hasInput.remove();
          } else if (hasInput) {
            hasInput.placeholder = discountType === 'percent' ? 'النسبة %' : 'المبلغ بالجنيه';
          }
          document.querySelectorAll('.discount-type-btn').forEach(b => {
            if (b.dataset.type === discountType) {
              b.classList.remove('btn-outline');
              b.classList.add('btn-primary');
            } else {
              b.classList.remove('btn-primary');
              b.classList.add('btn-outline');
            }
          });
          updateSummary();
        });
      });

      const existingInput = document.getElementById('discount-value');
      if (existingInput) {
        existingInput.addEventListener('input', (e) => {
          discountValue = parseFloat(e.target.value) || 0;
          updateSummary();
        });
      }
    }
    bindDiscountUI();

    document.getElementById('order-deposit').addEventListener('input', updateSummary);

    /* ===== الصورة المرجعية ===== */
    const portfolio = db.getPortfolio();

    document.getElementById('pick-from-portfolio-btn').addEventListener('click', () => {
      if (portfolio.length === 0) {
        toast.info('لا توجد صور في معرض الأعمال.');
        return;
      }

      const portfolioHtml = `
        <h3 class="card-title no-border">🖼️ اختر صورة من المعرض</h3>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; max-height: 50vh; overflow-y: auto;">
          ${portfolio.map(p => `
            <div class="portfolio-pick-item" data-id="${p.id}" style="border: 2px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden; cursor: pointer;">
              <img src="${p.image}" style="width: 100%; height: 100px; object-fit: cover;">
              <div style="padding: 6px; font-size: 11px; text-align: center;">${escapeHtml(p.title || '')}</div>
            </div>
          `).join('')}
        </div>
        <button class="btn btn-outline btn-full mt-3" id="cancel-pick-btn">إلغاء</button>
      `;
      openModal(portfolioHtml);

      document.querySelectorAll('.portfolio-pick-item').forEach(item => {
        item.addEventListener('click', () => {
          const p = db.getPortfolioItem(item.dataset.id);
          if (p) {
            referenceImage = p.image;
            closeModal();
            setTimeout(() => reopenOrderModal(order, items, discountType, discountValue, extraFees, referenceImage), 200);
          }
        });
      });

      document.getElementById('cancel-pick-btn').addEventListener('click', () => {
        closeModal();
        setTimeout(() => reopenOrderModal(order, items, discountType, discountValue, extraFees, referenceImage), 200);
      });
    });

    const removeImgBtn = document.getElementById('remove-image-btn');
    if (removeImgBtn) {
      removeImgBtn.addEventListener('click', () => {
        referenceImage = null;
        closeModal();
        setTimeout(() => reopenOrderModal(order, items, discountType, discountValue, extraFees, referenceImage), 200);
      });
    }

    /* ===== الموعد التلقائي ===== */
    document.getElementById('suggest-date-btn').addEventListener('click', () => {
      const subtotal = items.reduce((s, it) => s + ((it.price || 0) * (it.quantity || 0)), 0);
      const discount = calculateDiscount(subtotal);
      const extraFeesTotal = calculateExtraFees(subtotal);
      const currentTotal = subtotal - discount + extraFeesTotal;

      if (currentTotal <= 0) {
        toast.error('أضف عناصر أولاً لحساب الموعد');
        return;
      }
      const suggested = suggestDueDate(currentTotal);
      const hintDiv = document.getElementById('suggest-hint');
      if (suggested) {
        document.getElementById('order-due-date').value = suggested;
        hintDiv.textContent = '✅ تم اقتراح ' + formatDate(suggested) + ' (أول يوم متاح)';
        hintDiv.style.display = 'block';
        hintDiv.style.color = '#2E7D32';
      } else {
        hintDiv.textContent = '⚠️ لا يوجد موعد متاح خلال 30 يوماً.';
        hintDiv.style.display = 'block';
        hintDiv.style.color = '#dc3545';
      }
    });

    /* ===== الحالة ===== */
    document.querySelectorAll('.status-option').forEach(opt => {
      opt.addEventListener('click', () => {
        document.querySelectorAll('.status-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        document.getElementById('order-status').value = opt.dataset.status;
      });
    });

    /* ===== عداد الوقت ===== */
    if (isEdit) {
      const timerBtn = document.getElementById('timer-btn');
      const timeDisplay = document.getElementById('work-time-display');
      let liveInterval = null;

      function updateTimeDisplay() {
        const freshOrder = db.getOrder(order.id);
        timeDisplay.textContent = formatDuration(getOrderTotalWorkTime(freshOrder));
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

    /* ===== التسليم الكامل ===== */
    if (isEdit && document.getElementById('full-delivery-btn')) {
      document.getElementById('full-delivery-btn').addEventListener('click', () => {
        closeModal();
        setTimeout(() => openSignatureModal(order), 200);
      });
    }

    /* ===== تذكير الدفع ===== */
    if (isEdit && document.getElementById('payment-reminder-btn')) {
      document.getElementById('payment-reminder-btn').addEventListener('click', () => {
        const freshOrder = db.getOrder(order.id);
        const cust = customers.find(c => c.id === freshOrder.customerId);
        if (!cust || !cust.phone) { toast.error('لا يوجد رقم هاتف'); return; }
        const remaining = getOrderRemaining(freshOrder);
        const summary = getOrderSummary(freshOrder);
        const settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
        const workshopName = settings.workshopName || 'ورشة تفصيل الجلابيب';
        const msg = `السلام عليكم ${cust.name} 🌹\nتذكير ودّي من ${workshopName}\n\n━━━━━━━━━━━━━━━\n🧵 الطلب: ${summary.summary}\n💰 الإجمالي: ${money(freshOrder.totalPrice)} جنيه\n💵 المدفوع: ${money(freshOrder.deposit || 0)} جنيه\n━━━━━━━━━━━━━━━\n⏳ *المتبقي: ${money(remaining)} جنيه*\n\nنشكرك على تعاملك معنا 🌟`;
        openWhatsApp(cust.phone, msg);
      });
    }

    /* ===== حفظ النموذج ===== */
    document.getElementById('order-form').addEventListener('submit', (e) => {
      e.preventDefault();

      const customerId = document.getElementById('order-customer').value;
      const deposit = parseFloat(document.getElementById('order-deposit').value) || 0;
      const status = document.getElementById('order-status').value;
      const receivedDate = document.getElementById('order-received-date').value || null;
      const dueDate = document.getElementById('order-due-date').value || null;

      if (!customerId) { toast.error('الرجاء اختيار العميل'); return; }

      const validItems = items.filter(it => it.name && it.name.trim() !== '' && it.price > 0 && it.quantity > 0);
      if (validItems.length === 0) { toast.error('الرجاء إضافة عنصر واحد على الأقل'); return; }

      const subtotal = validItems.reduce((s, it) => s + (it.price * it.quantity), 0);
      const discount = calculateDiscount(subtotal);
      const extraFeesTotal = calculateExtraFees(subtotal);
      const finalTotal = subtotal - discount + extraFeesTotal;
      const totalQty = validItems.reduce((s, it) => s + it.quantity, 0);
      const firstItem = validItems[0];

      if (!isEdit) {
        const settings2 = storage.loadSettings() || { ...DEFAULT_SETTINGS };
        const limit = settings2.dailyOrderLimit || 700;
        const todayStr2 = today();
        const todayTotalNow = db.getOrders().filter(o => o.date === todayStr2).reduce((s, o) => s + (o.totalPrice || 0), 0);
        if (todayTotalNow + finalTotal > limit) {
          const proceed = confirm(`⚠️ تحذير: ستتجاوز الحد اليومي.\n\nالحد: ${limit}\nالإجمالي بعد الإضافة: ${todayTotalNow + finalTotal}\n\nهل تريد المتابعة؟`);
          if (!proceed) return;
        }
      }

      const orderData = {
        customerId,
        items: validItems,
        garmentType: firstItem.name + (validItems.length > 1 ? ` + ${validItems.length - 1}` : ''),
        quantity: totalQty,
        subtotal: subtotal,
        discountType: discountType,
        discountValue: discountValue,
        discountAmount: discount,
        extraFees: extraFees,
        extraFeesTotal: extraFeesTotal,
        totalPrice: finalTotal,
        deposit,
        status,
        receivedDate,
        dueDate,
        referenceImage,
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
     دالة إعادة فتح النموذج (بعد اختيار صورة)
     ============================================================ */
  function reopenOrderModal(order, items, discountType, discountValue, extraFees, referenceImage) {
    if (order) {
      const currentOrder = db.getOrder(order.id);
      const mergedOrder = { ...currentOrder, items, discountType, discountValue, extraFees, referenceImage };
      openOrderModal(mergedOrder);
    } else {
      openOrderModal({
        items, discountType, discountValue, extraFees, referenceImage,
        customerId: '', status: 'pending', date: today()
      });
    }
  }

  /* ============================================================
     نافذة التوقيع
     ============================================================ */
  function openSignatureModal(order) {
    const formHtml = `
      <h3 class="card-title no-border">✍️ توقيع التسليم</h3>
      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">اطلب من العميل التوقيع في المساحة التالية.</p>
      <div style="background: var(--bg-color); padding: 10px; border-radius: var(--radius-md); margin-bottom: 12px;">
        <div style="font-size: 12px; color: var(--text-muted);">الطلب:</div>
        <div style="font-weight: 700;">${escapeHtml(getOrderSummary(order).summary)}</div>
        <div style="font-size: 12px; color: var(--text-muted);">الإجمالي: ${money(order.totalPrice)} جنيه</div>
      </div>
      <div style="position: relative; border: 2px dashed var(--border-color); border-radius: var(--radius-md); background: white; margin-bottom: 12px; overflow: hidden;">
        <canvas id="signature-canvas" style="display: block; width: 100%; height: 200px; touch-action: none; cursor: crosshair;"></canvas>
        <div id="canvas-hint" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #ccc; font-size: 14px; pointer-events: none;">✍️ وقّع هنا</div>
      </div>
      <div class="flex-between mt-2" style="gap: 8px;">
        <button type="button" class="btn btn-outline" id="clear-sig-btn" style="flex: 1;">🗑️ مسح</button>
        <button type="button" class="btn btn-outline" id="cancel-sig-btn" style="flex: 1;">إلغاء</button>
      </div>
      <button type="button" class="btn btn-primary btn-full mt-2" id="confirm-delivery-btn">📦 تأكيد التسليم</button>
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
    function startDrawing(e) { e.preventDefault(); isDrawing = true; hasDrawn = true; hint.style.display = 'none'; const pos = getPos(e); ctx.beginPath(); ctx.moveTo(pos.x, pos.y); }
    function draw(e) { if (!isDrawing) return; e.preventDefault(); const pos = getPos(e); ctx.lineTo(pos.x, pos.y); ctx.stroke(); }
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
      db.updateOrder(order.id, { status: 'delivered', deliveredAt: Date.now(), signature: signatureData });
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

  container.querySelector('#view-list-btn').addEventListener('click', () => { viewMode = 'list'; renderOrdersPage(container); });
  container.querySelector('#view-kanban-btn').addEventListener('click', () => { viewMode = 'kanban'; renderOrdersPage(container); });
  const groupingBtn = container.querySelector('#view-grouping-btn');
  if (groupingBtn) groupingBtn.addEventListener('click', () => { viewMode = 'grouping'; renderOrdersPage(container); });

  const searchInput = container.querySelector('#search-order-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      const pos = e.target.selectionStart;
      renderOrdersPage(container);
      const newInput = container.querySelector('#search-order-input');
      if (newInput) { newInput.focus(); newInput.setSelectionRange(pos, pos); }
    });
  }

  container.querySelectorAll('.status-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => { selectedStatus = btn.dataset.status; renderOrdersPage(container); });
  });

  container.querySelectorAll('.order-preview-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      previewOrder(btn.dataset.id);
    });
  });

  container.querySelectorAll('.group-order-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const order = db.getOrder(item.dataset.id);
      if (order) openOrderModal(order);
    });
  });

  container.querySelectorAll('.order-item').forEach(item => {
    item.addEventListener('click', () => {
      const order = db.getOrder(item.dataset.id);
      if (order) openOrderModal(order);
    });
  });
// ✅ الاستماع لإجراءات FAB السريعة
if (window.__ordersQuickListener) {
  document.removeEventListener('quick-action', window.__ordersQuickListener);
}
window.__ordersQuickListener = (e) => {
  if (e.detail.action === 'new-order') {
    setTimeout(() => openOrderModal(null), 150);
  }
};
document.addEventListener('quick-action', window.__ordersQuickListener);
   
   
  container.querySelectorAll('.kanban-card').forEach(card => {
    card.addEventListener('click', () => {
      const order = db.getOrder(card.dataset.id);
      if (order) openOrderModal(order);
    });
  });
}
