/* ============================================================
   kpis.js - صفحة مؤشرات الأداء (V2)
   (إحصائيات متقدمة + رسوم بيانية + تحليلات)
   ============================================================ */

import * as db from '../core/db.js';
import { money, daysBetween, today, formatDate } from '../core/utils.js';
import { DEFAULT_SETTINGS } from '../core/config.js';
import * as storage from '../core/storage.js';

/* ============================================================
   استخراج عناصر الطلب (متوافق مع النظامين)
   ============================================================ */
function getOrderItems(order) {
  if (order.items && Array.isArray(order.items) && order.items.length > 0) {
    return order.items;
  }
  return [{
    name: order.garmentType || 'غير محدد',
    price: order.totalPrice || 0,
    quantity: order.quantity || 1
  }];
}

/* ============================================================
   الصفحة الرئيسية
   ============================================================ */
export function renderKpisPage(container) {
  const orders = db.getOrders();
  const payments = db.getPayments();
  const expenses = db.getExpenses();
  const customers = db.getCustomers();
  const settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  const vipThreshold = settings.vipThreshold || 3;

  // ============================================================
  // 1. الإحصائيات الأساسية
  // ============================================================
  const deliveredOrders = orders.filter(o => o.status === 'delivered');
  const totalRevenue = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const totalOrdersValue = orders.reduce((s, o) => s + (o.totalPrice || 0), 0);
  const totalRemaining = orders.reduce((s, o) => s + Math.max(0, (o.totalPrice || 0) - (o.deposit || 0)), 0);

  // ============================================================
  // 2. متوسط قيمة الطلب
  // ============================================================
  const avgOrderValue = orders.length > 0 ? totalOrdersValue / orders.length : 0;

  // ============================================================
  // 3. متوسط وقت التنفيذ (من الإنشاء حتى التسليم)
  // ============================================================
  const completionTimes = deliveredOrders
    .filter(o => o.deliveredAt && (o.createdAt || o.date))
    .map(o => {
      const start = o.createdAt || new Date(o.date).getTime();
      return (o.deliveredAt - start) / (1000 * 60 * 60 * 24); // بالأيام
    });
  const avgCompletionDays = completionTimes.length > 0
    ? completionTimes.reduce((s, t) => s + t, 0) / completionTimes.length
    : 0;

  // ============================================================
  // 4. معدل التسليم في الموعد
  // ============================================================
  const deliveredWithDeadline = deliveredOrders.filter(o => o.dueDate && o.deliveredAt);
  const onTimeDeliveries = deliveredWithDeadline.filter(o => {
    const deliveredDate = new Date(o.deliveredAt).toISOString().slice(0, 10);
    return deliveredDate <= o.dueDate;
  });
  const onTimeRate = deliveredWithDeadline.length > 0
    ? Math.round((onTimeDeliveries.length / deliveredWithDeadline.length) * 100)
    : 0;

  // ============================================================
  // 5. أفضل 5 عملاء
  // ============================================================
  const customerStats = {};
  customers.forEach(c => {
    const custOrders = orders.filter(o => o.customerId === c.id);
    const totalSpent = custOrders.reduce((s, o) => s + (o.totalPrice || 0), 0);
    customerStats[c.id] = {
      customer: c,
      ordersCount: custOrders.length,
      totalSpent
    };
  });
  const topCustomers = Object.values(customerStats)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5);

  // ============================================================
  // 6. أكثر الأنواع مبيعاً (Top 5)
  // ============================================================
  const itemStats = {};
  orders.forEach(order => {
    getOrderItems(order).forEach(item => {
      const name = item.name || 'غير محدد';
      if (!itemStats[name]) itemStats[name] = { name, quantity: 0, revenue: 0 };
      itemStats[name].quantity += item.quantity || 0;
      itemStats[name].revenue += (item.price || 0) * (item.quantity || 0);
    });
  });
  const topItems = Object.values(itemStats)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // ============================================================
  // 7. المبيعات آخر 6 شهور
  // ============================================================
  const monthlyData = [];
  const now = new Date();
  const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = d.getMonth();
    const year = d.getFullYear();
    const monthOrders = orders.filter(o => {
      const od = new Date(o.date || o.createdAt);
      return od.getMonth() === month && od.getFullYear() === year;
    });
    const monthRevenue = monthOrders.reduce((s, o) => s + (o.totalPrice || 0), 0);
    monthlyData.push({
      label: monthNames[month],
      year,
      count: monthOrders.length,
      revenue: monthRevenue
    });
  }
  const maxMonthly = Math.max(...monthlyData.map(m => m.revenue), 1);

  // ============================================================
  // 8. أفضل يوم في الأسبوع
  // ============================================================
  const dayOfWeekStats = [0, 0, 0, 0, 0, 0, 0]; // الأحد إلى السبت
  const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  orders.forEach(o => {
    const d = new Date(o.date || o.createdAt);
    const day = d.getDay();
    dayOfWeekStats[day] += o.totalPrice || 0;
  });
  const bestDayIndex = dayOfWeekStats.indexOf(Math.max(...dayOfWeekStats));
  const bestDay = dayOfWeekStats[bestDayIndex] > 0 ? dayNames[bestDayIndex] : 'لا يوجد';

  // ============================================================
  // 9. إحصائيات عامة
  // ============================================================
  const totalCustomers = customers.length;
  const totalOrdersCount = orders.length;
  const activeOrders = orders.filter(o => o.status !== 'delivered').length;
  const deliveredCount = deliveredOrders.length;
  const deliveryRate = totalOrdersCount > 0 ? Math.round((deliveredCount / totalOrdersCount) * 100) : 0;
  const avgOrderPerCustomer = totalCustomers > 0 ? (totalOrdersCount / totalCustomers).toFixed(1) : 0;

  // ============================================================
  // بناء الواجهة
  // ============================================================
  container.innerHTML = `
    <!-- البطاقات المالية الرئيسية -->
    <div class="card" style="background: linear-gradient(135deg, var(--primary-color), var(--primary-dark)); color: white; border: none;">
      <h2 style="color: white; margin-bottom: 4px;">📊 مؤشرات الأداء</h2>
      <p style="color: rgba(255,255,255,0.8); margin: 0 0 16px 0; font-size: 13px;">نظرة تحليلية شاملة على أداء الورشة</p>
      
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
        <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: var(--radius-md);">
          <div style="font-size: 11px; opacity: 0.85;">💰 الإيرادات</div>
          <div style="font-size: 20px; font-weight: 800; margin-top: 4px;">${money(totalRevenue)}</div>
          <div style="font-size: 10px; opacity: 0.7;">جنيه</div>
        </div>
        <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: var(--radius-md);">
          <div style="font-size: 11px; opacity: 0.85;">📉 المصروفات</div>
          <div style="font-size: 20px; font-weight: 800; margin-top: 4px;">${money(totalExpenses)}</div>
          <div style="font-size: 10px; opacity: 0.7;">جنيه</div>
        </div>
        <div style="background: rgba(255,255,255,0.25); padding: 12px; border-radius: var(--radius-md); grid-column: span 2;">
          <div style="font-size: 11px; opacity: 0.9;">✨ صافي الربح</div>
          <div style="font-size: 26px; font-weight: 800; margin-top: 4px; color: ${netProfit >= 0 ? '#FFD54F' : '#FF8A80'};">
            ${netProfit >= 0 ? '' : '-'}${money(Math.abs(netProfit))} <span style="font-size: 14px;">جنيه</span>
          </div>
        </div>
      </div>
    </div>

    <!-- المؤشرات السريعة -->
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 16px;">
      <div class="stat-card" style="padding: 12px 8px;">
        <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">💰 متوسط قيمة الطلب</div>
        <div class="stat-value" style="font-size: 18px;">${money(avgOrderValue)}</div>
      </div>
      <div class="stat-card" style="padding: 12px 8px;">
        <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">⏱️ متوسط التنفيذ</div>
        <div class="stat-value" style="font-size: 18px;">${avgCompletionDays.toFixed(1)} <span style="font-size: 11px;">يوم</span></div>
      </div>
      <div class="stat-card" style="padding: 12px 8px;">
        <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">✅ التسليم في الموعد</div>
        <div class="stat-value" style="font-size: 18px; color: ${onTimeRate >= 80 ? '#2E7D32' : onTimeRate >= 50 ? '#F57F17' : '#C62828'};">${onTimeRate}%</div>
      </div>
      <div class="stat-card" style="padding: 12px 8px;">
        <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">📅 أفضل يوم</div>
        <div class="stat-value" style="font-size: 16px;">${bestDay}</div>
      </div>
    </div>

    <!-- إحصائيات عامة -->
    <div class="card">
      <h3 class="card-title" style="font-size: 15px;">📈 ملخص عام</h3>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
        <div style="padding: 8px; background: var(--bg-color); border-radius: var(--radius-md); font-size: 12px;">
          <div style="color: var(--text-muted);">إجمالي العملاء</div>
          <div style="font-size: 18px; font-weight: 800; color: var(--primary-color);">${totalCustomers}</div>
        </div>
        <div style="padding: 8px; background: var(--bg-color); border-radius: var(--radius-md); font-size: 12px;">
          <div style="color: var(--text-muted);">إجمالي الطلبات</div>
          <div style="font-size: 18px; font-weight: 800; color: var(--primary-color);">${totalOrdersCount}</div>
        </div>
        <div style="padding: 8px; background: var(--bg-color); border-radius: var(--radius-md); font-size: 12px;">
          <div style="color: var(--text-muted);">طلبات نشطة</div>
          <div style="font-size: 18px; font-weight: 800; color: #F57F17;">${activeOrders}</div>
        </div>
        <div style="padding: 8px; background: var(--bg-color); border-radius: var(--radius-md); font-size: 12px;">
          <div style="color: var(--text-muted);">معدل التسليم</div>
          <div style="font-size: 18px; font-weight: 800; color: #2E7D32;">${deliveryRate}%</div>
        </div>
        <div style="padding: 8px; background: var(--bg-color); border-radius: var(--radius-md); font-size: 12px;">
          <div style="color: var(--text-muted);">طلبات/عميل</div>
          <div style="font-size: 18px; font-weight: 800; color: var(--accent-color);">${avgOrderPerCustomer}</div>
        </div>
        <div style="padding: 8px; background: var(--bg-color); border-radius: var(--radius-md); font-size: 12px;">
          <div style="color: var(--text-muted);">متأخرات</div>
          <div style="font-size: 18px; font-weight: 800; color: #C62828;">${money(totalRemaining)}</div>
        </div>
      </div>
    </div>

    <!-- رسم بياني للمبيعات الشهرية -->
    <div class="card">
      <h3 class="card-title" style="font-size: 15px;">📊 مبيعات آخر 6 شهور</h3>
      <div style="display: flex; align-items: flex-end; gap: 6px; height: 150px; padding: 10px 0; border-bottom: 2px solid var(--border-color); margin-bottom: 8px;">
        ${monthlyData.map(m => {
          const height = maxMonthly > 0 ? Math.max(5, (m.revenue / maxMonthly) * 130) : 5;
          return `
            <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%;">
              <div style="font-size: 10px; color: var(--text-muted); margin-bottom: 4px; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">${m.revenue > 0 ? money(m.revenue) : ''}</div>
              <div style="width: 100%; height: ${height}px; background: linear-gradient(180deg, var(--primary-color), var(--primary-dark)); border-radius: 4px 4px 0 0; transition: all 0.3s;"></div>
            </div>
          `;
        }).join('')}
      </div>
      <div style="display: flex; gap: 6px;">
        ${monthlyData.map(m => `
          <div style="flex: 1; text-align: center; font-size: 10px; color: var(--text-muted);">${m.label}</div>
        `).join('')}
      </div>
    </div>

    <!-- أفضل 5 عملاء -->
    <div class="card">
      <h3 class="card-title" style="font-size: 15px;">👑 أفضل 5 عملاء</h3>
      ${topCustomers.length === 0 
        ? '<p style="text-align:center; color:var(--text-muted); font-size:13px; padding:12px;">لا توجد بيانات بعد.</p>'
        : topCustomers.map((c, idx) => {
          const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32', '#95A5A6', '#95A5A6'];
          return `
            <div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: var(--bg-color); border-radius: var(--radius-md); margin-bottom: 6px; border-right: 4px solid ${rankColors[idx]};">
              <div style="width: 32px; height: 32px; border-radius: 50%; background: ${rankColors[idx]}; display: flex; align-items: center; justify-content: center; font-weight: 800; color: white; font-size: 14px;">${idx + 1}</div>
              <div style="flex: 1;">
                <div style="font-weight: 700; font-size: 13px;">${c.customer.name} ${c.customer.isVip ? '👑' : ''}</div>
                <div style="font-size: 11px; color: var(--text-muted);">${c.ordersCount} طلب</div>
              </div>
              <div style="font-weight: 800; color: var(--primary-color); font-size: 14px;">${money(c.totalSpent)}</div>
            </div>
          `;
        }).join('')
      }
    </div>

    <!-- أكثر الأنواع مبيعاً -->
    <div class="card">
      <h3 class="card-title" style="font-size: 15px;">🧵 أكثر الأنواع مبيعاً</h3>
      ${topItems.length === 0 
        ? '<p style="text-align:center; color:var(--text-muted); font-size:13px; padding:12px;">لا توجد بيانات بعد.</p>'
        : topItems.map((item, idx) => {
          const maxQty = topItems[0].quantity || 1;
          const percent = Math.round((item.quantity / maxQty) * 100);
          return `
            <div style="padding: 10px 0; border-bottom: 1px solid var(--border-color);">
              <div class="flex-between" style="margin-bottom: 6px;">
                <div style="font-weight: 700; font-size: 13px;">${idx + 1}. ${item.name}</div>
                <div style="font-size: 12px; color: var(--accent-color); font-weight: 700;">${money(item.revenue)} ج</div>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="flex: 1; height: 6px; background: var(--border-color); border-radius: var(--radius-full); overflow: hidden;">
                  <div style="width: ${percent}%; height: 100%; background: linear-gradient(90deg, var(--primary-color), var(--accent-color)); border-radius: var(--radius-full);"></div>
                </div>
                <div style="font-size: 11px; color: var(--text-muted); font-weight: 700; min-width: 60px; text-align: left;">${item.quantity} قطعة</div>
              </div>
            </div>
          `;
        }).join('')
      }
    </div>

    <!-- أيام الأسبوع -->
    <div class="card">
      <h3 class="card-title" style="font-size: 15px;">📅 أداء أيام الأسبوع</h3>
      <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;">
        ${dayOfWeekStats.map((total, idx) => {
          const maxDayTotal = Math.max(...dayOfWeekStats, 1);
          const percent = Math.round((total / maxDayTotal) * 100);
          return `
            <div style="text-align: center;">
              <div style="height: 60px; background: var(--bg-color); border-radius: var(--radius-sm); position: relative; overflow: hidden; margin-bottom: 4px;">
                <div style="position: absolute; bottom: 0; left: 0; right: 0; height: ${percent}%; background: linear-gradient(180deg, var(--primary-color), var(--primary-dark)); transition: all 0.3s;"></div>
              </div>
              <div style="font-size: 10px; color: var(--text-muted);">${dayNames[idx]}</div>
            </div>
          `;
        }).join('')}
      </div>
      <div style="font-size: 11px; color: var(--text-muted); text-align: center; margin-top: 8px;">
        💡 اليوم الأكثر نشاطاً: <strong style="color: var(--primary-color);">${bestDay}</strong>
      </div>
    </div>
  `;
}
