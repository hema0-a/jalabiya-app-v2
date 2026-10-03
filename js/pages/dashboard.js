/* ============================================================
   dashboard.js - لوحة التحكم الديناميكية (V2)
   (النسخة الكاملة الشاملة)
   ============================================================ */

import * as db from '../core/db.js';
import { money, today, formatDate, daysBetween } from '../core/utils.js';
import { DEFAULT_SETTINGS } from '../core/config.js';
import * as storage from '../core/storage.js';
import {
  getGreeting,
  getDailySummary,
  getActivityTips,
  getNextAction,
  getProductivityLevel
} from '../core/daily-briefing.js';

export function renderDashboardPage(container) {
  const orders = db.getOrders();
  const customers = db.getCustomers();
  const payments = db.getPayments();
  const expenses = db.getExpenses();
  const inventory = db.getInventory();
  const settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };

  // ============================================================
  // البيانات الديناميكية
  // ============================================================
  const greeting = getGreeting(settings.ownerName || settings.workshopName);
  const summary = getDailySummary();
  const tips = getActivityTips();
  const nextAction = getNextAction();
  const productivity = getProductivityLevel();

  // إحصائيات عامة
  const totalCustomers = customers.length;
  const totalOrders = orders.length;
  const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const totalRemaining = orders.reduce((sum, o) => sum + Math.max(0, (o.totalPrice || 0) - (o.deposit || 0)), 0);

  // إحصائيات الطلبات
  const ordersByStatus = {
    pending: orders.filter(o => (o.status || 'pending') === 'pending').length,
    in_progress: orders.filter(o => o.status === 'in_progress').length,
    ready: orders.filter(o => o.status === 'ready').length,
    delivered: orders.filter(o => o.status === 'delivered').length
  };

  // المواعيد القادمة
  const todayStr = today();
  const tomorrowStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  })();

  const dueToday = orders.filter(o => o.dueDate === todayStr && o.status !== 'delivered');
  const dueTomorrow = orders.filter(o => o.dueDate === tomorrowStr && o.status !== 'delivered');
  const overdueOrders = orders.filter(o => {
    if (o.status === 'delivered' || !o.dueDate) return false;
    return daysBetween(o.dueDate, todayStr) < 0;
  });

  const lowStockItems = inventory.filter(i =>
    (i.quantity || 0) <= (i.minQuantity || 0) && (i.minQuantity || 0) > 0
  );

  // ============================================================
  // بناء الواجهة
  // ============================================================
  let html = `
    <!-- ============================================================
         البطاقة الترحيبية الديناميكية
         ============================================================ -->
    <div class="card" style="background: linear-gradient(135deg, var(--primary-color), var(--primary-dark)); color: white; border: none;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
        <div style="flex: 1;">
          <h2 style="color: white; margin-bottom: 4px; font-size: 20px;">
            ${greeting.icon} ${greeting.text}
          </h2>
          <p style="color: rgba(255,255,255,0.85); margin: 0; font-size: 13px;">
            ${getMotivationalMessage(greeting.mood)}
          </p>
        </div>
        <div style="text-align: center; padding: 8px 12px; background: rgba(255,255,255,0.15); border-radius: var(--radius-md);">
          <div style="font-size: 24px;">${productivity.icon}</div>
          <div style="font-size: 10px; font-weight: 700; margin-top: 2px;">${productivity.level}</div>
        </div>
      </div>

      <!-- الإجراء المقترح التالي -->
      <a href="#${nextAction.route}" style="display: block; text-decoration: none; background: rgba(255,255,255,0.2); border-radius: var(--radius-md); padding: 12px; margin-top: 8px; backdrop-filter: blur(10px);">
        <div class="flex-between">
          <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
            <div style="font-size: 24px;">${nextAction.icon}</div>
            <div style="flex: 1;">
              <div style="color: white; font-weight: 800; font-size: 14px; margin-bottom: 2px;">${nextAction.title}</div>
              <div style="color: rgba(255,255,255,0.8); font-size: 11px;">${nextAction.subtitle}</div>
            </div>
          </div>
          <div style="color: rgba(255,255,255,0.9); font-size: 18px;">←</div>
        </div>
      </a>
    </div>

    <!-- ============================================================
         ملخص اليوم (بطاقات سريعة)
         ============================================================ -->
    <div class="card" style="background: linear-gradient(135deg, #F5F5F5, #E8E8E8); border: none;">
      <h3 style="font-size: 14px; margin-bottom: 12px; color: var(--primary-dark);">📊 ملخص اليوم</h3>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
        <div style="text-align: center; padding: 10px 4px; background: white; border-radius: var(--radius-md);">
          <div style="font-size: 18px; font-weight: 800; color: var(--primary-color);">${summary.ordersAddedToday}</div>
          <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">طلبات جديدة</div>
        </div>
        <div style="text-align: center; padding: 10px 4px; background: white; border-radius: var(--radius-md);">
          <div style="font-size: 18px; font-weight: 800; color: #F57C00;">${summary.dueToday}</div>
          <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">للتسليم</div>
        </div>
        <div style="text-align: center; padding: 10px 4px; background: white; border-radius: var(--radius-md);">
          <div style="font-size: 18px; font-weight: 800; color: #2E7D32;">${money(summary.todayRevenue)}</div>
          <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">إيرادات</div>
        </div>
        <div style="text-align: center; padding: 10px 4px; background: white; border-radius: var(--radius-md);">
          <div style="font-size: 18px; font-weight: 800; color: #dc3545;">${money(summary.todayExpenses)}</div>
          <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">مصروفات</div>
        </div>
      </div>
    </div>
  `;

  // ============================================================
  // تنبيهات عاجلة
  // ============================================================
  if (overdueOrders.length > 0) {
    html += `
      <div class="card" style="background: linear-gradient(135deg, #FFEBEE, #FFCDD2); border: none; cursor: pointer;" onclick="location.hash='/orders'">
        <div class="flex-between">
          <div>
            <div style="font-size: 14px; font-weight: 800; color: #B71C1C; margin-bottom: 4px;">
              🚨 ${overdueOrders.length} ${overdueOrders.length === 1 ? 'طلب متأخر' : 'طلبات متأخرة'}
            </div>
            <div style="font-size: 12px; color: #C62828;">اضغط للعرض الفوري</div>
          </div>
          <div style="background: #C62828; color: white; padding: 6px 12px; border-radius: var(--radius-full); font-weight: 800; font-size: 14px;">
            ${overdueOrders.length}
          </div>
        </div>
      </div>
    `;
  }

  if (dueToday.length > 0) {
    html += `
      <div class="card" style="background: linear-gradient(135deg, #FFF3E0, #FFE0B2); border: none; cursor: pointer;" onclick="location.hash='/orders'">
        <div class="flex-between">
          <div>
            <div style="font-size: 14px; font-weight: 800; color: #E65100; margin-bottom: 4px;">
              ⏰ ${dueToday.length} ${dueToday.length === 1 ? 'طلب للتسليم اليوم' : 'طلبات للتسليم اليوم'}
            </div>
            <div style="font-size: 12px; color: #EF6C00;">تأكد من جاهزيتها</div>
          </div>
          <div style="background: #E65100; color: white; padding: 6px 12px; border-radius: var(--radius-full); font-weight: 800; font-size: 14px;">
            ${dueToday.length}
          </div>
        </div>
      </div>
    `;
  }

  if (lowStockItems.length > 0) {
    html += `
      <div class="card" style="background: linear-gradient(135deg, #FCE4EC, #F8BBD0); border: none; cursor: pointer;" onclick="location.hash='/inventory'">
        <div class="flex-between">
          <div style="flex: 1;">
            <div style="font-size: 14px; font-weight: 800; color: #AD1457; margin-bottom: 4px;">
              📦 ${lowStockItems.length} ${lowStockItems.length === 1 ? 'عنصر ناقص' : 'عناصر ناقصة'}
            </div>
            <div style="font-size: 11px; color: #C2185B;">
              ${lowStockItems.slice(0, 3).map(i => i.name).join(' • ')}${lowStockItems.length > 3 ? ' ...' : ''}
            </div>
          </div>
          <div style="background: #AD1457; color: white; padding: 6px 12px; border-radius: var(--radius-full); font-weight: 800; font-size: 14px;">
            ${lowStockItems.length}
          </div>
        </div>
      </div>
    `;
  }

  // ============================================================
  // النصائح الذكية
  // ============================================================
  if (tips.length > 0) {
    html += `
      <div class="card">
        <h3 class="card-title" style="font-size: 15px;">💡 نصائح ذكية لك</h3>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${tips.map(tip => {
            const colors = {
              danger: { bg: '#FFEBEE', border: '#C62828', text: '#B71C1C' },
              warning: { bg: '#FFF3E0', border: '#F57C00', text: '#E65100' },
              success: { bg: '#E8F5E9', border: '#2E7D32', text: '#1B5E20' },
              info: { bg: '#E3F2FD', border: '#1565C0', text: '#0D47A1' }
            };
            const c = colors[tip.type] || colors.info;
            return `
              <div style="background: ${c.bg}; border-right: 4px solid ${c.border}; padding: 10px 12px; border-radius: var(--radius-md); display: flex; gap: 10px; align-items: flex-start;">
                <div style="font-size: 18px; flex-shrink: 0;">${tip.icon}</div>
                <div style="flex: 1; font-size: 13px; color: ${c.text}; line-height: 1.5;">${tip.text}</div>
              </div>
            `;
          }).join('')}
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
        <div class="stat-value" style="color: var(--accent-color); font-size: 18px;">${money(totalRevenue)}</div>
        <div class="stat-label">💰 الإيرادات</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: ${netProfit >= 0 ? 'var(--primary-color)' : '#dc3545'}; font-size: 18px;">
          ${money(netProfit)}
        </div>
        <div class="stat-label">${netProfit >= 0 ? '✨ صافي الربح' : '⚠️ الخسارة'}</div>
      </div>
    </div>

    ${totalRemaining > 0 ? `
      <div class="card" style="background: linear-gradient(135deg, #FFF8E1, #FFECB3); border: none; padding: 12px;">
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
  // حالة الطلبات
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
  // تسليمات الغد
  // ============================================================
  if (dueTomorrow.length > 0) {
    html += `
      <div class="card">
        <h3 class="card-title" style="font-size: 15px;">📅 تسليمات الغد</h3>
        ${dueTomorrow.slice(0, 3).map(o => {
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
  // مؤشر الإنتاجية الأسبوعي
  // ============================================================
  html += `
    <div class="card">
      <h3 class="card-title" style="font-size: 15px;">📈 إنتاجية الأسبوع</h3>
      <div style="margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px;">
          <span style="color: var(--text-muted);">${productivity.icon} ${productivity.level}</span>
          <strong style="color: ${productivity.color};">${productivity.percent}%</strong>
        </div>
        <div style="background: var(--border-color); height: 10px; border-radius: var(--radius-full); overflow: hidden;">
          <div style="width: ${productivity.percent}%; height: 100%; background: linear-gradient(90deg, ${productivity.color}, ${productivity.color}cc); border-radius: var(--radius-full); transition: width 0.6s;"></div>
        </div>
      </div>
      <div style="font-size: 11px; color: var(--text-muted); text-align: center; margin-top: 8px;">
        ${getProductivityMessage(productivity.level)}
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
        <a href="#/customers" class="btn btn-primary" style="text-decoration: none; display: inline-block;">+ إضافة أول عميل</a>
      </div>
    `;
  }

  container.innerHTML = html;
}

/* ============================================================
   دوال مساعدة
   ============================================================ */

function getMotivationalMessage(mood) {
  const messages = {
    morning: 'ابدأ يومك بطلب جديد 🌟',
    afternoon: 'واصل الإنجاز، أنت في منتصف اليوم 💪',
    evening: 'وقت مراجعة ما تم إنجازه اليوم 📋',
    night: 'ارتاح، وغداً يوم جديد ✨'
  };
  return messages[mood] || 'أهلاً بك في لوحة التحكم';
}

function getProductivityMessage(level) {
  const messages = {
    'عالي': '🔥 أداء استثنائي! استمر في هذا المستوى.',
    'متوسط': '⚡ أداء جيد، يمكنك تحقيق أفضل.',
    'عادي': '📊 ابدأ بتسريع وتيرة العمل.',
    'منخفض': '💡 حاول إضافة المزيد من الطلبات هذا الأسبوع.'
  };
  return messages[level] || 'استمر في العمل الجيد';
}
