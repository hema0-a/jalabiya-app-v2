/* ============================================================
   invoice.js - توليد الفواتير ومشاركتها (V2)
   (يدعم: تعدد العناصر + الخصم + الصورة المرجعية + واتساب)
   ============================================================ */

import * as db from './db.js';
import { formatDate, money } from './utils.js';
import { DEFAULT_SETTINGS } from './config.js';
import * as storage from './storage.js';

/* ============================================================
   استخراج عناصر الطلب (متوافق مع النظام الجديد والقديم)
   ============================================================ */
function getOrderItems(order) {
  if (order.items && Array.isArray(order.items) && order.items.length > 0) {
    return order.items;
  }
  // النظام القديم
  return [{
    name: order.garmentType || 'جلابية',
    price: order.totalPrice || 0,
    quantity: order.quantity || 1
  }];
}

/* ============================================================
   توليد HTML الفاتورة (للطباعة)
   ============================================================ */
export function generateInvoiceHTML(order) {
  const customer = db.getCustomer(order.customerId);
  const settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  const workshopName = settings.workshopName || DEFAULT_SETTINGS.workshopName;
  const workshopLogo = settings.workshopLogo || null;
  const workshopPhone = settings.ownerPhone || '';
  const workshopAddress = settings.workshopAddress || '';

  const custName = customer ? customer.name : 'عميل محذوف';
  const custPhone = customer ? (customer.phone || '-') : '-';
  const remaining = (order.totalPrice || 0) - (order.deposit || 0);
  const payments = db.getPayments().filter(p => p.orderId === order.id);
  const invoiceNumber = order.id ? order.id.slice(-6).toUpperCase() : 'N/A';
  const invoiceDate = order.date || new Date().toISOString().slice(0, 10);

  const items = getOrderItems(order);
  const subtotal = order.subtotal || items.reduce((s, it) => s + (it.price * it.quantity), 0);
  const discountAmount = order.discountAmount || 0;
  const hasDiscount = discountAmount > 0;

  // بناء جدول العناصر
  const itemsRowsHtml = items.map(it => `
    <tr>
      <td>${it.name || '-'}</td>
      <td style="text-align: center;">${it.quantity || 1}</td>
      <td style="text-align: center;">${money(it.price || 0)}</td>
      <td style="text-align: center; font-weight: 700;">${money((it.price || 0) * (it.quantity || 1))}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>فاتورة #${invoiceNumber}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Tahoma, Arial, sans-serif; padding: 20px; background: #f5f5f5; }
        .invoice { max-width: 750px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1F6D57; padding-bottom: 20px; margin-bottom: 20px; gap: 10px; flex-wrap: wrap; }
        .workshop-info h1 { color: #1F6D57; font-size: 22px; margin-bottom: 5px; }
        .workshop-info p { color: #666; font-size: 13px; margin: 2px 0; }
        .logo { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid #1F6D57; }
        .invoice-number { text-align: left; }
        .invoice-number .num { font-size: 18px; color: #1F6D57; font-weight: bold; }
        .invoice-number .date { font-size: 13px; color: #666; margin-top: 5px; }
        .customer-section { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .customer-section h3 { color: #1F6D57; margin-bottom: 10px; font-size: 15px; }
        .customer-section p { color: #333; font-size: 14px; margin-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: #1F6D57; color: white; padding: 12px; text-align: right; font-size: 14px; }
        td { padding: 12px; border-bottom: 1px solid #eee; font-size: 14px; }
        tr:last-child td { border-bottom: none; }
        .totals { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
        .total-row .label { color: #666; }
        .total-row .value { font-weight: bold; }
        .total-row.discount .value { color: #F57F17; }
        .total-row.final { border-top: 2px solid #1F6D57; padding-top: 12px; margin-top: 8px; font-size: 18px; font-weight: bold; color: #1F6D57; }
        .total-row.remaining .value { color: #dc3545; }
        .total-row.remaining.paid .value { color: #2E7D32; }
        .reference-image { margin-bottom: 20px; text-align: center; }
        .reference-image img { max-width: 200px; max-height: 200px; border-radius: 8px; border: 2px solid #eee; }
        .reference-image p { font-size: 12px; color: #666; margin-bottom: 8px; }
        .footer { text-align: center; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px; }
        .footer p { margin: 4px 0; }
        @media print {
          body { background: white; padding: 0; }
          .invoice { box-shadow: none; border-radius: 0; }
        }
      </style>
    </head>
    <body>
      <div class="invoice">
        <div class="header">
          <div class="workshop-info">
            <h1>${workshopName}</h1>
            ${workshopPhone ? `<p>📞 ${workshopPhone}</p>` : ''}
            ${workshopAddress ? `<p>📍 ${workshopAddress}</p>` : ''}
          </div>
          ${workshopLogo ? `<img src="${workshopLogo}" class="logo" alt="logo">` : ''}
          <div class="invoice-number">
            <div class="num">فاتورة #${invoiceNumber}</div>
            <div class="date">📅 ${formatDate(invoiceDate)}</div>
          </div>
        </div>

        <div class="customer-section">
          <h3>👤 بيانات العميل</h3>
          <p><strong>الاسم:</strong> ${custName}</p>
          <p><strong>الهاتف:</strong> ${custPhone}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>الوصف</th>
              <th style="text-align: center;">الكمية</th>
              <th style="text-align: center;">السعر</th>
              <th style="text-align: center;">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRowsHtml}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row">
            <span class="label">المجموع الفرعي:</span>
            <span class="value">${money(subtotal)} جنيه</span>
          </div>
          ${hasDiscount ? `
            <div class="total-row discount">
              <span class="label">الخصم${order.discountType === 'percent' ? ` (${order.discountValue}%)` : ''}:</span>
              <span class="value">- ${money(discountAmount)} جنيه</span>
            </div>
          ` : ''}
          <div class="total-row final">
            <span class="label">الإجمالي النهائي:</span>
            <span class="value">${money(order.totalPrice || 0)} جنيه</span>
          </div>
          <div class="total-row">
            <span class="label">المدفوع (المقدم):</span>
            <span class="value">${money(order.deposit || 0)} جنيه</span>
          </div>
          <div class="total-row remaining ${remaining === 0 ? 'paid' : ''}">
            <span class="label">المتبقي:</span>
            <span class="value">${money(remaining)} جنيه</span>
          </div>
        </div>

        ${order.referenceImage ? `
          <div class="reference-image">
            <p>📷 صورة مرجعية للطلب:</p>
            <img src="${order.referenceImage}" alt="صورة مرجعية">
          </div>
        ` : ''}

        ${payments.length > 0 ? `
          <h3 style="color: #1F6D57; margin-bottom: 10px; font-size: 15px;">💵 سجل الدفعات الإضافية</h3>
          <table>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>المبلغ</th>
                <th>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              ${payments.map(p => `
                <tr>
                  <td>${formatDate(p.date)}</td>
                  <td>${money(p.amount)} جنيه</td>
                  <td>${p.note || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        <div class="footer">
          <p>شكراً لتعاملكم معنا 🌹</p>
          <p>${workshopName} - تم إنشاء الفاتورة إلكترونياً</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/* ============================================================
   طباعة الفاتورة
   ============================================================ */
export function printInvoice(order) {
  const html = generateInvoiceHTML(order);
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('الرجاء السماح بالنوافذ المنبثقة لطباعة الفاتورة');
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 600);
}

/* ============================================================
   مشاركة الفاتورة عبر واتساب (نص منسق)
   ============================================================ */
export function shareInvoiceWhatsApp(order) {
  const customer = db.getCustomer(order.customerId);
  const settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  const workshopName = settings.workshopName || DEFAULT_SETTINGS.workshopName;

  const custName = customer ? customer.name : 'عميل';
  const custPhone = customer && customer.phone ? customer.phone.replace(/\D/g, '') : '';
  const remaining = (order.totalPrice || 0) - (order.deposit || 0);

  const items = getOrderItems(order);
  const subtotal = order.subtotal || items.reduce((s, it) => s + (it.price * it.quantity), 0);
  const discountAmount = order.discountAmount || 0;
  const hasDiscount = discountAmount > 0;

  // بناء قائمة العناصر
  const itemsText = items.map(it => 
    `  • ${it.name} × ${it.quantity} = ${money(it.price * it.quantity)} ج`
  ).join('\n');

  let text = `السلام عليكم ${custName} 🌹\n\n`;
  text += `فاتورة من *${workshopName}*\n`;
  text += `━━━━━━━━━━━━━━━\n`;
  text += `🧵 *تفاصيل الطلب:*\n${itemsText}\n`;
  text += `━━━━━━━━━━━━━━━\n`;
  text += `💰 المجموع الفرعي: ${money(subtotal)} ج\n`;

  if (hasDiscount) {
    text += `💸 الخصم${order.discountType === 'percent' ? ` (${order.discountValue}%)` : ''}: - ${money(discountAmount)} ج\n`;
  }

  text += `✅ *الإجمالي النهائي:* ${money(order.totalPrice)} ج\n`;
  text += `💵 المدفوع: ${money(order.deposit || 0)} ج\n`;
  
  if (remaining === 0) {
    text += `🎉 *تم السداد بالكامل* ✓\n`;
  } else {
    text += `⏳ *المتبقي:* ${money(remaining)} ج\n`;
  }

  if (order.dueDate) {
    text += `\n📅 تاريخ التسليم: ${formatDate(order.dueDate)}\n`;
  }

  text += `\n━━━━━━━━━━━━━━━\n`;
  text += `شكراً لتعاملكم معنا 🌟`;

  let fullPhone = custPhone;
  if (custPhone.startsWith('0')) {
    fullPhone = '2' + custPhone;
  }

  const url = fullPhone
    ? `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;

  window.open(url, '_blank');
}
