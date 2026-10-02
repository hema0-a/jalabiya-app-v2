/* ============================================================
   notifications.js - نظام إشعارات المواعيد (V2)
   (يعرض تنبيهات بالطلبات المتأخرة والمستحقة اليوم عند فتح التطبيق)
   ============================================================ */

import * as db from './db.js';
import { today, daysBetween, formatDate, money } from './utils.js';
import { openModal, closeModal } from '../ui/modal.js';

/* ============================================================
   تحليل الطلبات للبحث عن مواعيد مهمة
   ============================================================ */
export function getDueOrdersInfo() {
  const orders = db.getOrders();
  const customers = db.getCustomers();

  const overdue = [];
  const today_ = [];
  const tomorrow = [];
  const soon = [];

  orders.forEach(order => {
    // نتجاهل الطلبات المسلَّمة أو التي ليس لها تاريخ تسليم
    if (order.status === 'delivered' || !order.dueDate) return;

    const daysLeft = daysBetween(order.dueDate, today());
    const customer = customers.find(c => c.id === order.customerId);
    const custName = customer ? customer.name : 'عميل محذوف';

    const info = {
      order,
      customerName: custName,
      daysLeft,
      dueDate: order.dueDate
    };

    if (daysLeft < 0) overdue.push(info);
    else if (daysLeft === 0) today_.push(info);
    else if (daysLeft === 1) tomorrow.push(info);
    else if (daysLeft <= 3) soon.push(info);
  });

  // ترتيب الأكثر إلحاحاً أولاً
  overdue.sort((a, b) => a.daysLeft - b.daysLeft);

  return { overdue, today: today_, tomorrow, soon };
}

/* ============================================================
   عدد الإشعارات المهمة (لعرض شارة)
   ============================================================ */
export function getNotificationCount() {
  const info = getDueOrdersInfo();
  return info.overdue.length + info.today.length + info.tomorrow.length;
}

/* ============================================================
   عرض نافذة الإشعارات عند فتح التطبيق
   ============================================================ */
export function showDueOrdersNotification() {
  const info = getDueOrdersInfo();
  const total = info.overdue.length + info.today.length + info.tomorrow.length;

  // لا تعرض النافذة إذا لا يوجد شيء مهم
  if (total === 0) return;

  // بناء الأقسام
  let html = `
    <h3 class="card-title no-border">🔔 إشعارات المواعيد</h3>
    <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">
      لديك <strong>${total}</strong> ${total === 1 ? 'طلب يحتاج' : 'طلبات تحتاج'} انتباهك:
    </p>
  `;

  // الطلبات المتأخرة
  if (info.overdue.length > 0) {
    html += `
      <div style="background: #FFEBEE; border-right: 4px solid #C62828; padding: 10px 12px; border-radius: var(--radius-md); margin-bottom: 10px;">
        <div style="font-size: 14px; font-weight: 800; color: #B71C1C; margin-bottom: 6px;">
          🚨 متأخرة (${info.overdue.length})
        </div>
        ${info.overdue.slice(0, 5).map(o => `
          <div class="notification-item" data-id="${o.order.id}" style="padding: 6px 0; border-bottom: 1px dashed rgba(183,28,28,0.2); font-size: 13px; cursor: pointer;">
            <div class="flex-between">
              <span><strong>${o.customerName}</strong> - ${o.order.garmentType || ''}</span>
              <span style="color: #C62828; font-weight: 700; font-size: 11px;">متأخر ${Math.abs(o.daysLeft)} يوم</span>
            </div>
            <div style="font-size: 11px; color: #666; margin-top: 2px;">
              📅 ${formatDate(o.dueDate)} | 💰 ${money(o.order.totalPrice || 0)} ج
            </div>
          </div>
        `).join('')}
        ${info.overdue.length > 5 ? `<div style="font-size: 11px; color: #666; text-align: center; margin-top: 6px;">و ${info.overdue.length - 5} طلبات أخرى...</div>` : ''}
      </div>
    `;
  }

  // اليوم
  if (info.today.length > 0) {
    html += `
      <div style="background: #FFF3E0; border-right: 4px solid #F57C00; padding: 10px 12px; border-radius: var(--radius-md); margin-bottom: 10px;">
        <div style="font-size: 14px; font-weight: 800; color: #E65100; margin-bottom: 6px;">
          ⏰ التسليم اليوم (${info.today.length})
        </div>
        ${info.today.slice(0, 5).map(o => `
          <div class="notification-item" data-id="${o.order.id}" style="padding: 6px 0; border-bottom: 1px dashed rgba(230,81,0,0.2); font-size: 13px; cursor: pointer;">
            <div class="flex-between">
              <span><strong>${o.customerName}</strong> - ${o.order.garmentType || ''}</span>
              <span style="color: #E65100; font-weight: 700; font-size: 11px;">اليوم</span>
            </div>
            <div style="font-size: 11px; color: #666; margin-top: 2px;">
              💰 ${money(o.order.totalPrice || 0)} ج
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // غداً
  if (info.tomorrow.length > 0) {
    html += `
      <div style="background: #FFF8E1; border-right: 4px solid #FBC02D; padding: 10px 12px; border-radius: var(--radius-md); margin-bottom: 10px;">
        <div style="font-size: 14px; font-weight: 800; color: #F57F17; margin-bottom: 6px;">
          📅 غداً (${info.tomorrow.length})
        </div>
        ${info.tomorrow.slice(0, 5).map(o => `
          <div class="notification-item" data-id="${o.order.id}" style="padding: 6px 0; border-bottom: 1px dashed rgba(245,127,23,0.2); font-size: 13px; cursor: pointer;">
            <div class="flex-between">
              <span><strong>${o.customerName}</strong> - ${o.order.garmentType || ''}</span>
              <span style="color: #F57F17; font-weight: 700; font-size: 11px;">غداً</span>
            </div>
            <div style="font-size: 11px; color: #666; margin-top: 2px;">
              💰 ${money(o.order.totalPrice || 0)} ج
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  html += `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px;">
      <button class="btn btn-primary" id="go-to-orders-btn">📋 فتح الطلبات</button>
      <button class="btn btn-outline" id="dismiss-notif-btn">تجاهل</button>
    </div>
  `;

  openModal(html);

  // زر الانتقال للطلبات
  document.getElementById('go-to-orders-btn').addEventListener('click', () => {
    closeModal();
    window.location.hash = '/orders';
  });

  // زر التجاهل
  document.getElementById('dismiss-notif-btn').addEventListener('click', closeModal);

  // النقر على طلب معين للانتقال إليه
  document.querySelectorAll('.notification-item').forEach(item => {
    item.addEventListener('click', () => {
      closeModal();
      window.location.hash = '/orders';
    });
  });
}

/* ============================================================
   عرض بانر بسيط في أعلى الصفحة (بديل خفيف)
   ============================================================ */
export function renderNotificationBanner() {
  const info = getDueOrdersInfo();
  const total = info.overdue.length + info.today.length + info.tomorrow.length;

  if (total === 0) return null;

  const banner = document.createElement('div');
  banner.style.cssText = `
    background: linear-gradient(135deg, #C62828, #B71C1C);
    color: white;
    padding: 10px 14px;
    border-radius: var(--radius-md);
    margin-bottom: 12px;
    font-size: 13px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    box-shadow: var(--shadow-md);
  `;

  let text = '';
  if (info.overdue.length > 0) {
    text = `🚨 ${info.overdue.length} طلب متأخر`;
  } else if (info.today.length > 0) {
    text = `⏰ ${info.today.length} طلب للتسليم اليوم`;
  } else {
    text = `📅 ${info.tomorrow.length} طلب للتسليم غداً`;
  }

  banner.innerHTML = `
    <span><strong>🔔 تنبيه:</strong> ${text}</span>
    <span style="background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: var(--radius-full); font-size: 12px;">عرض ←</span>
  `;

  banner.addEventListener('click', showDueOrdersNotification);

  return banner;
}
