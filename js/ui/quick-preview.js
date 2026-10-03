/* ============================================================
   quick-preview.js - المعاينة السريعة (V2)
   (نوافذ معاينة مصغّرة للعملاء والطلبات)
   ============================================================ */

import * as db from '../core/db.js';
import { toast } from './toast.js';
import { openModal, closeModal } from './modal.js';
import { money, formatDate, daysBetween, today, escapeHtml } from '../core/utils.js';
import { DEFAULT_SETTINGS } from '../core/config.js';
import * as storage from '../core/storage.js';

/* ============================================================
   معاينة سريعة لعميل
   ============================================================ */
export function previewCustomer(customerId) {
  const customer = db.getCustomer(customerId);
  if (!customer) {
    toast.error('العميل غير موجود');
    return;
  }

  const customerOrders = db.getOrders().filter(o => o.customerId === customer.id);
  const totalSpent = customerOrders.reduce((s, o) => s + (o.totalPrice || 0), 0);
  const totalPaid = customerOrders.reduce((s, o) => s + (o.deposit || 0), 0);
  const remaining = totalSpent - totalPaid;
  const recentOrders = [...customerOrders]
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 3);

  const html = `
    <div style="text-align: center; margin-bottom: 16px;">
      <div style="width: 60px; height: 60px; background: linear-gradient(135deg, var(--primary-color), var(--primary-dark)); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; color: white; font-size: 24px; font-weight: 800;">
  ${escapeHtml(customer.name).charAt(0)}
</div>
<h3 style="margin: 0; font-size: 17px;">
  ${customer.isVip ? '👑 ' : ''}${escapeHtml(customer.name)}
</h3>
${customer.phone ? `<div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">📞 ${escapeHtml(customer.phone)}</div>` : ''}
    </div>

    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 12px;">
      <div style="text-align: center; padding: 8px; background: var(--bg-color); border-radius: var(--radius-md);">
        <div style="font-size: 16px; font-weight: 800; color: var(--primary-color);">${customerOrders.length}</div>
        <div style="font-size: 10px; color: var(--text-muted);">طلبات</div>
      </div>
      <div style="text-align: center; padding: 8px; background: var(--bg-color); border-radius: var(--radius-md);">
        <div style="font-size: 13px; font-weight: 800; color: #2E7D32;">${money(totalPaid)}</div>
        <div style="font-size: 10px; color: var(--text-muted);">مدفوع</div>
      </div>
      <div style="text-align: center; padding: 8px; background: var(--bg-color); border-radius: var(--radius-md);">
        <div style="font-size: 13px; font-weight: 800; color: ${remaining > 0 ? '#dc3545' : '#2E7D32'};">${money(remaining)}</div>
        <div style="font-size: 10px; color: var(--text-muted);">متبقي</div>
      </div>
    </div>

    ${recentOrders.length > 0 ? `
      <div style="margin-bottom: 12px;">
        <div style="font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">📋 آخر الطلبات:</div>
        ${recentOrders.map(o => {
          const statusColors = { pending: '#FFA726', in_progress: '#29B6F6', ready: '#AB47BC', delivered: '#66BB6A' };
          const statusLabels = { pending: 'انتظار', in_progress: 'تنفيذ', ready: 'جاهز', delivered: 'مُسلَّم' };
          const status = o.status || 'pending';
          return `
            <div style="padding: 6px 8px; border-right: 3px solid ${statusColors[status]}; background: var(--bg-color); border-radius: var(--radius-md); margin-bottom: 4px; font-size: 12px;">
              <div class="flex-between">
                <span style="font-weight: 600;">${o.garmentType || 'طلب'}</span>
                <span style="color: ${statusColors[status]}; font-size: 10px; font-weight: 700;">${statusLabels[status]}</span>
              </div>
              <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">
                ${money(o.totalPrice)} ج — ${formatDate(o.date)}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    ` : ''}

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
      ${customer.phone ? `
        <button class="btn" id="qp-wa-btn" style="background: #25D366; color: white;">💬 واتساب</button>
      ` : '<div></div>'}
      <button class="btn btn-primary" id="qp-view-btn">👁️ التفاصيل الكاملة</button>
    </div>
    <button class="btn btn-outline btn-full" id="qp-close-btn">إغلاق</button>
  `;

  openModal(html);

  if (customer.phone) {
    document.getElementById('qp-wa-btn').addEventListener('click', () => {
      let cleanPhone = String(customer.phone).replace(/\D/g, '');
      if (cleanPhone.startsWith('0')) cleanPhone = '2' + cleanPhone;
      window.open(`https://wa.me/${cleanPhone}`, '_blank');
    });
  }

  document.getElementById('qp-view-btn').addEventListener('click', () => {
    closeModal();
    setTimeout(() => {
      window.location.hash = '/customers';
      toast.info('افتح بطاقة العميل لعرض التفاصيل');
    }, 200);
  });

  document.getElementById('qp-close-btn').addEventListener('click', closeModal);
}

/* ============================================================
   معاينة سريعة لطلب
   ============================================================ */
export function previewOrder(orderId) {
  const order = db.getOrder(orderId);
  if (!order) {
    toast.error('الطلب غير موجود');
    return;
  }

  const customer = db.getCustomer(order.customerId);
  const custName = customer ? customer.name : 'عميل محذوف';
  const remaining = (order.totalPrice || 0) - (order.deposit || 0);
  const statusColors = { pending: '#FFA726', in_progress: '#29B6F6', ready: '#AB47BC', delivered: '#66BB6A' };
  const statusLabels = { pending: '⏳ قيد الانتظار', in_progress: '🧵 قيد التنفيذ', ready: '✅ جاهز', delivered: '📦 مُسلَّم' };
  const status = order.status || 'pending';

  // ملخص العناصر
  const itemsSummary = order.items && Array.isArray(order.items) && order.items.length > 0
    ? order.items.map(i => `• ${i.name} ×${i.quantity} = ${money((i.price || 0) * (i.quantity || 1))} ج`).join('<br>')
    : `• ${order.garmentType || 'طلب'} ×${order.quantity || 1}`;

  // معلومات الموعد
  let deadlineHtml = '';
  if (order.dueDate && order.status !== 'delivered') {
    const daysLeft = daysBetween(order.dueDate, today());
    let deadlineText, deadlineColor;
    if (daysLeft < 0) { deadlineText = `متأخر ${Math.abs(daysLeft)} يوم`; deadlineColor = '#C62828'; }
    else if (daysLeft === 0) { deadlineText = 'اليوم'; deadlineColor = '#F57C00'; }
    else if (daysLeft === 1) { deadlineText = 'غداً'; deadlineColor = '#F57C00'; }
    else { deadlineText = `بعد ${daysLeft} يوم`; deadlineColor = '#2E7D32'; }
    deadlineHtml = `
      <div style="background: ${deadlineColor}15; border-right: 3px solid ${deadlineColor}; padding: 8px 10px; border-radius: var(--radius-md); margin-bottom: 12px; font-size: 12px;">
        <strong style="color: ${deadlineColor};">📅 التسليم:</strong>
        <span style="color: var(--text-muted);">${formatDate(order.dueDate)} — </span>
        <strong style="color: ${deadlineColor};">${deadlineText}</strong>
      </div>
    `;
  }

  const html = `
    <div style="text-align: center; margin-bottom: 12px;">
      <div style="display: inline-block; padding: 4px 12px; border-radius: var(--radius-full); background: ${statusColors[status]}20; color: ${statusColors[status]}; font-size: 12px; font-weight: 700;">
        ${statusLabels[status]}
      </div>
      <h3 style="margin: 8px 0 0 0; font-size: 17px;">👤 ${escapeHtml(custName)}</h3>
${customer && customer.phone ? `<div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">📞 ${escapeHtml(customer.phone)}</div>` : ''}
    </div>

    ${deadlineHtml}

    <div style="background: var(--bg-color); border-radius: var(--radius-md); padding: 10px; margin-bottom: 12px; font-size: 12px;">
      <div style="font-weight: 700; margin-bottom: 6px; color: var(--primary-dark);">🧵 العناصر:</div>
      <div style="color: var(--text-secondary); line-height: 1.7;">${itemsSummary}</div>
    </div>

    <div style="background: linear-gradient(135deg, var(--primary-color), var(--primary-dark)); color: white; padding: 12px; border-radius: var(--radius-md); margin-bottom: 12px;">
      <div class="flex-between" style="font-size: 12px; padding: 2px 0;">
        <span style="opacity: 0.85;">الإجمالي:</span>
        <strong>${money(order.totalPrice)} ج</strong>
      </div>
      <div class="flex-between" style="font-size: 12px; padding: 2px 0;">
        <span style="opacity: 0.85;">المدفوع:</span>
        <strong>${money(order.deposit || 0)} ج</strong>
      </div>
      <div class="flex-between" style="font-size: 14px; padding: 6px 0; border-top: 1px dashed rgba(255,255,255,0.3); margin-top: 4px;">
        <span style="font-weight: 700;">المتبقي:</span>
        <strong style="color: ${remaining > 0 ? '#FFD54F' : '#90EE90'}; font-size: 16px;">${money(remaining)} ج</strong>
      </div>
    </div>

    ${order.discountAmount > 0 || order.extraFeesTotal > 0 ? `
      <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px; padding: 6px 10px; background: var(--bg-color); border-radius: var(--radius-md);">
        ${order.discountAmount > 0 ? `💸 خصم: ${money(order.discountAmount)} ج` : ''}
        ${order.discountAmount > 0 && order.extraFeesTotal > 0 ? ' | ' : ''}
        ${order.extraFeesTotal > 0 ? `➕ رسوم: ${money(order.extraFeesTotal)} ج` : ''}
      </div>
    ` : ''}

    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-bottom: 8px;">
      <button class="btn btn-outline" id="qp-invoice-btn" style="font-size: 11px; padding: 8px 4px;">🖨️ فاتورة</button>
      ${customer && customer.phone ? `
        <button class="btn btn-outline" id="qp-wa-btn" style="font-size: 11px; padding: 8px 4px; color: #25D366; border-color: #25D366;">💬 واتساب</button>
      ` : '<div></div>'}
      <button class="btn btn-primary" id="qp-view-btn" style="font-size: 11px; padding: 8px 4px;">👁️ التفاصيل</button>
    </div>
    <button class="btn btn-outline btn-full" id="qp-close-btn">إغلاق</button>
  `;

  openModal(html);

  // زر الفاتورة
  document.getElementById('qp-invoice-btn').addEventListener('click', () => {
    closeModal();
    setTimeout(async () => {
      const { printInvoice } = await import('../core/invoice.js');
      printInvoice(order);
    }, 200);
  });

  // زر واتساب
  if (customer && customer.phone) {
    document.getElementById('qp-wa-btn').addEventListener('click', () => {
      closeModal();
      setTimeout(async () => {
        const { shareInvoiceWhatsApp } = await import('../core/invoice.js');
        shareInvoiceWhatsApp(order);
      }, 200);
    });
  }

  // زر التفاصيل
  document.getElementById('qp-view-btn').addEventListener('click', () => {
    closeModal();
    setTimeout(() => {
      window.location.hash = '/orders';
      toast.info('افتح الطلب لعرض التفاصيل الكاملة');
    }, 200);
  });

  document.getElementById('qp-close-btn').addEventListener('click', closeModal);
}
