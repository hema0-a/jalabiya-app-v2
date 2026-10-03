/* ============================================================
   dashboard.js - لوحة التحكم الاحترافية (V2)
   (إجراءات سريعة + تنبيهات + مواعيد + إحصائيات شاملة)
   ============================================================ */

import * as db from '../core/db.js';
import { money, today, formatDate, daysBetween } from '../core/utils.js';
import { DEFAULT_SETTINGS } from '../core/config.js';
import * as storage from '../core/storage.js';

export function renderDashboardPage(container) {
  const orders = db.getOrders();
  const customers = db.getCustomers();
  const payments = db.getPayments();
  const expenses = db.getExpenses();
  const inventory = db.getInventory();
  const settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };

  // ============================================================
  // الإحصائيات العامة
  // ============================================================
  const totalCustomers = customers.length;
  const totalOrders = orders.length;
  const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const totalRemaining = orders.reduce((sum, o) => sum + Math.max(0, (o.totalPrice || 0) - (o.deposit || 0)), 0);

  // ============================================================
  // إحصائيات الشهر الحالي
  // ============================================================
  const todayDate = new Date();
  const currentMonth = todayDate.getMonth();
  const currentYear = todayDate.getFullYear();

  const monthlyOrders = orders.filter(o => {
    const d = new Date(o.date || o.createdAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const monthlyRevenue = payments.filter(p => {
    const d = new Date(p.date || p.createdAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).reduce((sum, p) => sum + (p.amount || 0), 0);

  // ============================================================
  // مواعيد اليوم والمتأخرة
  // ============================================================
  const todayStr = today();
  const todayDueOrders = orders.filter(o => o.dueDate === todayStr && o.status !== 'delivered');
  const overdueOrders = orders.filter(o => {
    if (o.status === 'delivered' || !o.dueDate) return false;
    return daysBetween(o.dueDate, today()) < 0;
  });
  const tomorrowDueOrders = orders.filter(o => {
    if (o.status === 'delivered' || !o.dueDate) return false;
    return daysBetween(o.dueDate, today()) === 1;
  });

  // ============================================================
  // تنبيهات المخزون
  // ============================================================
  const lowStockItems = inventory.filter(i =>
    (i.quantity || 0) <= (i.minQuantity || 0) && (i.minQuantity || 0) > 0
  );

  // ============================================================
  // إحصائيات الطلبات حسب الحالة
  // ============================================================
  const ordersByStatus = {
    pending: orders.filter(o => (o.status || 'pending') === 'pending').length,
    in_progress: orders.filter(o => o.status === 'in_progress').length,
    ready: orders.filter(o => o.status === 'ready').length,
    delivered: orders.filter(o => o.status === 'delivered').length
  };

  // ============================================================
  // بناء الواجهة
  // ============================================================
  let html = `
    <!-- ============================================================
         البطاقة الترحيبية
         ============================================================ -->
    <div class="card" style="background: linear-gradient(135deg, var(--primary-color), var(--primary-dark)); color: white; border: none;">
      <h2 style="color: white; margin-bottom: 4px;">أهلاً بك 👋</h2>
      <p style="color: rgba(255,255,255,0.8); margin: 0 0 16px 0; font-size: 13px;">
        ${greetingText()} — نظرة سريعة على ورشتك اليوم
      </p>

      <!-- إجراءات سريعة -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
        <a href="#/orders" class="quick-action" style="background: rgba(255,255,255,0.2); border-radius: var(--radius-md); padding: 10px 6px; text-align: center; color: white; text-decoration: none; display: block; transition: all 0.2s;">
          <div style="font-size: 22px;">📋</div>
          <div style="font-size: 10px; margin-top: 4px; font-weight: 600;">طلب جديد</div>
        </a>
        <a href="#/customers" class="quick-action" style="background: rgba(255,255,255,0.2); border-radius: var(--radius-md); padding: 10px 6px; text-align: center; color: white; text-decoration: none; display: block; transition: all 0.2s;">
          <div style="font-size: 22px;">👤</div>
          <div style="font-size: 10px; margin-top: 4px; font-weight: 600;">عميل جديد</div>
        </a>
        <a href="#/payments" class="quick-action" style="background: rgba(255,255,255,0.2); border-radius: var(--radius-md); padding: 10px 6px; text-align: center; color: white; text-decoration: none; display: block; transition: all 0.2s;">
          <div style="font-size: 22px;">💰</div>
          <div style="font-size: 10px; margin-top: 4px; font-weight: 600;">دفعة جديدة</div>
        </a>
        <a href="#/expenses" class="quick-action" style="background: rgba(255,255,255,0.2); border-radius: var(--radius-md); padding: 10px 6px; text-align: center; color: white; text-decoration: none; display: block; transition: all 0.2s;">
          <div style="font-size: 22px;">💸</div>
          <div style="font-size: 10px; margin-top: 4px; font-weight: 600;">مصروف</div>
        </a>
      </div>
    </div>
  `;

  // ============================================================
  // تنبيهات عاجلة (Overdue + Today + Low Stock)
  // ============================================================
  if (overdueOrders.length > 0) {
    html += `
      <div class="card" style="background: linear-gradient(135deg, #FFEBEE, #FFCDD2); border: none; margin-bottom: 12px; cursor: pointer;" id="alert-overdue">
        <div class="flex-between" style="align-items: flex-start;">
          <div style="flex: 1;">
            <div style="font-size: 14px; font-weight: 800; color: #B71C1C; margin-bottom: 4px;">
              🚨 ${overdueOrders.length} ${overdueOrders.length === 1 ? 'طلب متأخر' : 'طلبات متأخرة'}
            </div>
            <div style="font-size: 12px; color: #C62828;">
              بحاجة إلى انتباه فوري — اضغط للعرض
            </div>
          </div>
          <div style="background: #C62828; color: white; padding: 4px 10px; border-radius: var(--radius-full); font-weight: 700; font-size: 12px;">
            ${overdueOrders.length}
          </div>
        </div>
      </div>
    `;
  }

  if (todayDueOrders.length > 0) {
    html += `
      <div class="card" style="background: linear-gradient(135deg, #FFF3E0, #FFE0B2); border: none; margin-bottom: 12px; cursor: pointer;" id="alert-today">
        <div class="flex-between" style="align-items: flex-start;">
          <div style="flex: 1;">
            <div style="font-size: 14px; font-weight: 800; color: #E65100; margin-bottom: 4px;">
              ⏰ ${todayDueOrders.length} ${todayDueOrders.length === 1 ? 'طلب للتسليم اليوم' : 'طلبات للتسليم اليوم'}
            </div>
            <div style="font-size: 12px; color: #EF6C00;">
              تأكد من جاهزيتها قبل التسليم
            </div>
          </div>
          <div style="background: #E65100; color: white; padding: 4px 10px; border-radius: var(--radius-full); font-weight: 700; font-size: 12px;">
            ${todayDueOrders.length}
          </div>
        </div>
      </div>
    `;
  }

  if (lowStockItems.length > 0) {
    html += `
      <div class="card" style="background: linear-gradient(135deg, #FCE4EC, #F8BBD0); border: none; margin-bottom: 12px; cursor: pointer;" id="alert-lowstock">
        <div class="flex-between" style="align-items: flex-start;">
          <div style="flex: 1;">
            <div style="font-size: 14px; font-weight: 800; color: #AD1457; margin-bottom: 4px;">
              📦 ${lowStockItems.length} ${lowStockItems.length === 1 ? 'عنصر ناقص' : 'عناصر ناقصة'} في المخزون
            </div>
            <div style="font-size: 12px; color: #C2185B;">
              ${lowStockItems.slice(0, 3).map(i => i.name).join(' • ')}${lowStockItems.length > 3 ? ' ...' : ''}
            </div>
          </div>
          <div style="background: #AD1457; color: white; padding: 4px 10px; border-radius: var(--radius-full); font-weight: 700; font-size: 12px;">
            ${lowStockItems.length}
          </div>
        </div>
      </div>
    `;
  }

  // ============================================================
  // البطاقات الإحصائية العامة
  // ============================================================
  html += `
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 16px;">
      <div class="stat-card">
        <div class="stat-value" style="color: var(--primary-color);">${totalCustomers}</div>
        <div class="stat-label">👥 عميل</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: var(--primary-color);">${totalOrders}</div>
        <div class="stat-label">📋 طلب</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: var(--accent-color); font-size: 20px;">${money(totalRevenue)}</div>
        <div class="stat-label">💰 الإيرادات</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: ${netProfit >= 0 ? 'var(--primary-color)' : '#dc3545'}; font-size: 20px;">
          ${money(netProfit)}
        </div>
        <div class="stat-label">${netProfit >= 0 ? '✨ صافي الربح' : '⚠️ الخسارة'}</div>
      </div>
    </div>

    ${totalRemaining > 0 ? `
      <div class="card" style="background: linear-gradient(135deg, #FFF8E1, #FFECB3); border: none; margin-bottom: 16px; padding: 12px;">
        <div class="flex-between">
          <div>
            <div style="font-size: 12px; color: #F57F17; font-weight: 700; margin-bottom: 2px;">💸 إجمالي المتبقي على العملاء</div>
            <div style="font-size: 18px; font-weight: 800; color: #E65100;">${money(totalRemaining)} جنيه</div>
          </div>
          <a href="#/orders" style="background: #F57F17; color: white; padding: 8px 12px; border-radius: var(--radius-md); text-decoration: none; font-size: 12px; font-weight: 700;">
            عرض →
          </a>
        </div>
      </div>
    ` : ''}
  `;

  // ============================================================
  // إحصائيات الطلبات حسب الحالة
  // ============================================================
  html += `
    <div class="card">
      <h3 class="card-title" style="font-size: 15px;">📊 حالة الطلبات</h3>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
        <div style="text-align: center; padding: 10px 4px; background: #FFF3E0; border-radius: var(--radius-md);">
          <div style="font-size: 20px; font-weight: 800; color: #E65100;">${ordersByStatus.pending}</div>
          <div style="font-size: 10px; color: #E65100; margin-top: 2px;">⏳ انتظار</div>
        </div>
        <div style="text-align: center; padding: 10px 4px; background: #E1F5FE; border-radius: var(--radius-md);">
          <div style="font-size: 20px; font-weight: 800; color: #0277BD;">${ordersByStatus.in_progress}</div>
          <div style="font-size: 10px; color: #0277BD; margin-top: 2px;">🧵 تنفيذ</div>
        </div>
        <div style="text-align: center; padding: 10px 4px; background: #F3E5F5; border-radius: var(--radius-md);">
          <div style="font-size: 20px; font-weight: 800; color: #6A1B9A;">${ordersByStatus.ready}</div>
          <div style="font-size: 10px; color: #6A1B9A; margin-top: 2px;">✅ جاهز</div>
        </div>
        <div style="text-align: center; padding: 10px 4px; background: #E8F5E9; border-radius: var(--radius-md);">
          <div style="font-size: 20px; font-weight: 800; color: #2E7D32;">${ordersByStatus.delivered}</div>
          <div style="font-size: 10px; color: #2E7D32; margin-top: 2px;">📦 مُسلَّم</div>
        </div>
      </div>
    </div>
  `;

  // ============================================================
  // مواعيد قادمة (غداً)
  // ============================================================
  if (tomorrowDueOrders.length > 0) {
    html += `
      <div class="card">
        <h3 class="card-title" style="font-size: 15px;">📅 تسليمات الغد</h3>
        ${tomorrowDueOrders.slice(0, 3).map(o => {
          const customer = customers.find(c => c.id === o.customerId);
          const custName = customer ? customer.name : 'عميل محذوف';
          return `
            <div style="padding: 8px 0; border-bottom: 1px solid var(--border-color); font-size: 13px;">
              <div class="flex-between">
                <span style="font-weight: 600;">👤 ${custName}</span>
                <span style="font-size: 11px; color: #F57F17; font-weight: 700;">غداً</span>
              </div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">🧵 ${o.garmentType || 'طلب'}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // ============================================================
  // إحصائيات الشهر
  // ============================================================
  html += `
    <div class="card">
      <h3 class="card-title" style="font-size: 15px;">📅 إحصائيات الشهر</h3>
      <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color); font-size: 13px;">
        <span style="color: var(--text-muted);">📋 طلبات الشهر:</span>
        <strong>${monthlyOrders.length}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px;">
        <span style="color: var(--text-muted);">💰 إيرادات الشهر:</span>
        <strong style="color: var(--primary-color);">${money(monthlyRevenue)} جنيه</strong>
      </div>
    </div>
  `;

  // ============================================================
  // آخر الطلبات
  // ============================================================
  if (orders.length > 0) {
    html += `
      <div class="card">
        <div class="flex-between" style="margin-bottom: 12px;">
          <h3 class="card-title no-border" style="font-size: 15px; margin: 0;">🕒 آخر الطلبات</h3>
          <a href="#/orders" style="font-size: 12px; color: var(--primary-color); text-decoration: none;">عرض الكل →</a>
        </div>
        ${orders.slice(-5).reverse().map(o => {
          const customer = customers.find(c => c.id === o.customerId);
          const name = customer ? customer.name : 'عميل محذوف';
          const statusColors = { pending: '#FFA726', in_progress: '#29B6F6', ready: '#AB47BC', delivered: '#66BB6A' };
          const status = o.status || 'pending';
          return `
            <div style="padding: 8px 0; border-bottom: 1px solid var(--border-color); border-right: 3px solid ${statusColors[status]}; padding-right: 8px; font-size: 13px; margin-bottom: 6px;">
              <div class="flex-between">
                <span style="font-weight: 600;">👤 ${name}</span>
                <span style="font-weight: 700; color: var(--primary-color);">${money(o.totalPrice)} ج</span>
              </div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                🧵 ${o.garmentType || 'طلب'} — ${formatDate(o.date)}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // ============================================================
  // حالة فارغة
  // ============================================================
  if (orders.length === 0 && customers.length === 0) {
    html += `
      <div class="card" style="text-align: center; padding: 40px 20px;">
        <div style="font-size: 60px; margin-bottom: 12px;">🧵</div>
        <h3 style="font-size: 18px; margin-bottom: 8px;">مرحباً بك في تطبيقك!</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
          ابدأ بإضافة أول عميل لك، ثم أضف طلباً.
        </p>
        <a href="#/customers" class="btn btn-primary" style="text-decoration: none;">+ إضافة أول عميل</a>
      </div>
    `;
  }

  container.innerHTML = html;

  // ============================================================
  // ربط التنبيهات
  // ============================================================
  const overdueAlert = container.querySelector('#alert-overdue');
  if (overdueAlert) {
    overdueAlert.addEventListener('click', () => {
      window.location.hash = '/orders';
    });
  }

  const todayAlert = container.querySelector('#alert-today');
  if (todayAlert) {
    todayAlert.addEventListener('click', () => {
      window.location.hash = '/orders';
    });
  }

  const lowStockAlert = container.querySelector('#alert-lowstock');
  if (lowStockAlert) {
    lowStockAlert.addEventListener('click', () => {
      window.location.hash = '/inventory';
    });
  }

  // تأثير عند التمرير على الإجراءات السريعة
  container.querySelectorAll('.quick-action').forEach(el => {
    el.addEventListener('touchstart', () => { el.style.transform = 'scale(0.95)'; });
    el.addEventListener('touchend', () => { el.style.transform = 'scale(1)'; });
  });
}

/* رسالة ترحيب حسب الوقت */
function greetingText() {
  const hour = new Date().getHours();
  if (hour < 12) return 'صباح الخير ☀️';
  if (hour < 17) return 'مساء الخير 🌤️';
  return 'مساء الخير 🌙';
}
