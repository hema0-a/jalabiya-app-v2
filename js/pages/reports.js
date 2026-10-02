/* ============================================================
   reports.js - صفحة التقارير المالية (V2)
   ============================================================ */

import * as db from '../core/db.js';
import { money } from '../core/utils.js';

export function renderReportsPage(container) {
  const orders = db.getOrders();
  const payments = db.getPayments();
  const customers = db.getCustomers();

  // 1. تحديد الفترة الزمنية (افتراضياً: الكل)
  const periods = [
    { id: 'all', label: 'الكل' },
    { id: 'month', label: 'هذا الشهر' },
    { id: 'year', label: 'هذا العام' }
  ];

  let currentPeriod = 'all';

  // 2. دالة لحساب الإحصائيات بناءً على الفترة
  function calculateStats(period) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // تصفية الدفعات
    const filteredPayments = payments.filter(p => {
      const d = new Date(p.date || p.createdAt);
      if (period === 'month') return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      if (period === 'year') return d.getFullYear() === currentYear;
      return true;
    });

    // تصفية الطلبات
    const filteredOrders = orders.filter(o => {
      const d = new Date(o.date || o.createdAt);
      if (period === 'month') return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      if (period === 'year') return d.getFullYear() === currentYear;
      return true;
    });

    // الحسابات
    const totalRevenue = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalOrderValue = filteredOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    const totalRemaining = filteredOrders.reduce((sum, o) => sum + ((o.totalPrice || 0) - (o.deposit || 0)), 0);
    const ordersCount = filteredOrders.length;
    const paymentsCount = filteredPayments.length;

    return { totalRevenue, totalOrderValue, totalRemaining, ordersCount, paymentsCount };
  }

  // 3. بناء واجهة الصفحة
  function render() {
    const stats = calculateStats(currentPeriod);

    container.innerHTML = `
      <div class="card">
        <h2 class="card-title">📊 التقارير المالية</h2>
        
        <!-- أزرار اختيار الفترة -->
        <div style="display: flex; gap: 8px; margin-bottom: 16px;">
          ${periods.map(p => `
            <button class="btn ${p.id === currentPeriod ? 'btn-primary' : 'btn-outline'} period-btn" data-period="${p.id}" style="flex: 1; font-size: 13px;">
              ${p.label}
            </button>
          `).join('')}
        </div>

        <!-- البطاقات الإحصائية -->
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 16px;">
          <div class="card" style="text-align: center; margin-bottom: 0; background: var(--bg-color); border: none;">
            <div style="font-size: 22px; font-weight: 800; color: var(--primary-color);">${money(stats.totalRevenue)}</div>
            <div style="font-size: 12px; color: var(--text-muted);">إجمالي الإيرادات</div>
          </div>
          <div class="card" style="text-align: center; margin-bottom: 0; background: var(--bg-color); border: none;">
            <div style="font-size: 22px; font-weight: 800; color: var(--accent-color);">${money(stats.totalOrderValue)}</div>
            <div style="font-size: 12px; color: var(--text-muted);">قيمة الطلبات</div>
          </div>
          <div class="card" style="text-align: center; margin-bottom: 0; background: var(--bg-color); border: none;">
            <div style="font-size: 22px; font-weight: 800; color: #dc3545;">${money(stats.totalRemaining)}</div>
            <div style="font-size: 12px; color: var(--text-muted);">المبالغ المتبقية</div>
          </div>
          <div class="card" style="text-align: center; margin-bottom: 0; background: var(--bg-color); border: none;">
            <div style="font-size: 22px; font-weight: 800; color: var(--primary-dark);">${stats.ordersCount}</div>
            <div style="font-size: 12px; color: var(--text-muted);">عدد الطلبات</div>
          </div>
        </div>

        <!-- تقرير مفصل -->
        <div style="margin-top: 16px;">
          <h3 style="font-size: 15px; margin-bottom: 10px;">📋 تفاصيل إضافية</h3>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
            <span style="color: var(--text-muted);">عدد الدفعات المسجلة:</span>
            <span style="font-weight: bold;">${stats.paymentsCount}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
            <span style="color: var(--text-muted);">إجمالي العملاء:</span>
            <span style="font-weight: bold;">${customers.length}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0;">
            <span style="color: var(--text-muted);">متوسط قيمة الطلب:</span>
            <span style="font-weight: bold;">${stats.ordersCount > 0 ? money(stats.totalOrderValue / stats.ordersCount) : 0}</span>
          </div>
        </div>
      </div>
    `;

    // ربط أزرار الفترة
    container.querySelectorAll('.period-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentPeriod = btn.dataset.period;
        render();
      });
    });
  }

  render();
}
