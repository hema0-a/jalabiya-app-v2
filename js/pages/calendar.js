/* ============================================================
   calendar.js - تقويم المواعيد الشهري (V2)
   (عرض شهري + تصنيف بالألوان + عرض تفاصيل اليوم)
   ============================================================ */

import * as db from '../core/db.js';
import { toast } from '../ui/toast.js';
import { openModal, closeModal } from '../ui/modal.js';
import { today, money, formatDate, daysBetween } from '../core/utils.js';

// حالة التقويم
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

const MONTH_NAMES = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                     'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const DAY_NAMES_SHORT = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

/* ============================================================
   الصفحة الرئيسية
   ============================================================ */
export function renderCalendarPage(container) {
  const orders = db.getOrders().filter(o => o.dueDate);

  // حساب الإحصائيات
  const todayStr = today();
  const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  
  const monthOrders = orders.filter(o => o.dueDate.startsWith(monthPrefix));
  const totalThisMonth = monthOrders.length;
  
  const overdueCount = orders.filter(o => {
    if (o.status === 'delivered') return false;
    return daysBetween(o.dueDate, todayStr) < 0;
  }).length;
  
  const todayCount = orders.filter(o => 
    o.dueDate === todayStr && o.status !== 'delivered'
  ).length;

  // بناء الأيام
  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startWeekday = firstDay.getDay(); // 0 = الأحد

  // بناء الشبكة
  let gridHtml = '';

  // الفراغات قبل بداية الشهر
  for (let i = 0; i < startWeekday; i++) {
    gridHtml += `<div style="aspect-ratio: 1; border-radius: 8px; background: transparent;"></div>`;
  }

  // أيام الشهر
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayOrders = orders.filter(o => o.dueDate === dateStr);
    const pendingOrders = dayOrders.filter(o => o.status !== 'delivered');
    const deliveredOrders = dayOrders.filter(o => o.status === 'delivered');
    
    const isToday = dateStr === todayStr;
    const isPast = dateStr < todayStr;
    
    // تحديد اللون
    let bgColor = 'var(--surface-color)';
    let borderColor = 'var(--border-color)';
    let textColor = 'var(--text-main)';
    let dotHtml = '';
    
    if (pendingOrders.length > 0) {
      const hasOverdue = isPast;
      const hasNear = !isPast && daysBetween(dateStr, todayStr) <= 3;
      
      if (hasOverdue) {
        bgColor = '#FFEBEE';
        borderColor = '#C62828';
        textColor = '#B71C1C';
        dotHtml = `<div style="width: 8px; height: 8px; border-radius: 50%; background: #C62828;"></div>`;
      } else if (hasNear) {
        bgColor = '#FFF3E0';
        borderColor = '#F57C00';
        textColor = '#E65100';
        dotHtml = `<div style="width: 8px; height: 8px; border-radius: 50%; background: #F57C00;"></div>`;
      } else {
        bgColor = '#E8F5E9';
        borderColor = '#66BB6A';
        textColor = '#2E7D32';
        dotHtml = `<div style="width: 8px; height: 8px; border-radius: 50%; background: #66BB6A;"></div>`;
      }
    } else if (deliveredOrders.length > 0) {
      bgColor = 'var(--surface-color)';
      borderColor = 'var(--border-color)';
      textColor = 'var(--text-muted)';
    }

    if (isToday) {
      borderColor = 'var(--primary-color)';
    }

    gridHtml += `
      <div class="calendar-day" data-date="${dateStr}" style="
        aspect-ratio: 1;
        border-radius: 8px;
        background: ${bgColor};
        border: 2px solid ${borderColor};
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: ${dayOrders.length > 0 ? 'pointer' : 'default'};
        position: relative;
        padding: 4px;
        ${isToday ? 'box-shadow: 0 0 0 3px rgba(31,109,87,0.2);' : ''}
      ">
        <div style="font-size: 14px; font-weight: ${isToday ? '800' : '600'}; color: ${textColor};">${day}</div>
        ${pendingOrders.length > 0 ? `
          <div style="display: flex; gap: 2px; align-items: center; margin-top: 2px;">
            ${dotHtml}
            <span style="font-size: 9px; font-weight: 700; color: ${textColor};">${pendingOrders.length}</span>
          </div>
        ` : (deliveredOrders.length > 0 ? `
          <div style="font-size: 9px; color: var(--text-muted); margin-top: 2px;">✓</div>
        ` : '')}
      </div>
    `;
  }

  // بناء الصفحة
  container.innerHTML = `
    <div class="card">
      <div class="flex-between mb-2">
        <h2 class="card-title no-border" style="margin: 0;">📅 تقويم المواعيد</h2>
        <button class="btn btn-primary" id="goto-today-btn" style="font-size: 12px; padding: 6px 12px; min-height: 32px;">📌 اليوم</button>
      </div>

      <!-- إحصائيات الشهر -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px;">
        <div class="stat-card" style="padding: 10px 6px;">
          <div class="stat-value" style="font-size: 20px; color: var(--primary-color);">${totalThisMonth}</div>
          <div class="stat-label">هذا الشهر</div>
        </div>
        <div class="stat-card" style="padding: 10px 6px;">
          <div class="stat-value" style="font-size: 20px; color: #F57C00;">${todayCount}</div>
          <div class="stat-label">اليوم</div>
        </div>
        <div class="stat-card" style="padding: 10px 6px;">
          <div class="stat-value" style="font-size: 20px; color: ${overdueCount > 0 ? '#C62828' : 'var(--primary-color)'};">${overdueCount}</div>
          <div class="stat-label">متأخرة</div>
        </div>
      </div>

      <!-- أزرار التنقل بين الأشهر -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
        <button class="btn btn-outline" id="prev-month-btn" style="padding: 6px 14px; min-height: 36px; font-size: 18px;">‹</button>
        <div style="text-align: center;">
          <div style="font-size: 16px; font-weight: 800; color: var(--primary-dark);">${MONTH_NAMES[currentMonth]} ${currentYear}</div>
        </div>
        <button class="btn btn-outline" id="next-month-btn" style="padding: 6px 14px; min-height: 36px; font-size: 18px;">›</button>
      </div>

      <!-- أسماء الأيام -->
      <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-bottom: 6px;">
        ${DAY_NAMES_SHORT.map(d => `
          <div style="text-align: center; font-size: 10px; font-weight: 700; color: var(--text-muted); padding: 4px 0;">${d}</div>
        `).join('')}
      </div>

      <!-- شبكة التقويم -->
      <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;">
        ${gridHtml}
      </div>

      <!-- المفتاح الدلالي -->
      <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border-color);">
        <div style="display: flex; align-items: center; gap: 4px; font-size: 11px;">
          <span style="width: 10px; height: 10px; border-radius: 3px; background: #E8F5E9; border: 1px solid #66BB6A;"></span>
          <span style="color: var(--text-muted);">قريب</span>
        </div>
        <div style="display: flex; align-items: center; gap: 4px; font-size: 11px;">
          <span style="width: 10px; height: 10px; border-radius: 3px; background: #FFF3E0; border: 1px solid #F57C00;"></span>
          <span style="color: var(--text-muted);">خلال 3 أيام</span>
        </div>
        <div style="display: flex; align-items: center; gap: 4px; font-size: 11px;">
          <span style="width: 10px; height: 10px; border-radius: 3px; background: #FFEBEE; border: 1px solid #C62828;"></span>
          <span style="color: var(--text-muted);">متأخر</span>
        </div>
      </div>
    </div>

    <!-- قائمة المواعيد القادمة -->
    <div class="card">
      <h3 class="card-title" style="font-size: 15px;">📌 المواعيد القادمة</h3>
      <div id="upcoming-dates-list"></div>
    </div>
  `;

  // ربط الأحداث
  container.querySelector('#prev-month-btn').addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendarPage(container);
  });

  container.querySelector('#next-month-btn').addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendarPage(container);
  });

  container.querySelector('#goto-today-btn').addEventListener('click', () => {
    const now = new Date();
    currentMonth = now.getMonth();
    currentYear = now.getFullYear();
    renderCalendarPage(container);
  });

  // النقر على يوم
  container.querySelectorAll('.calendar-day').forEach(dayEl => {
    dayEl.addEventListener('click', () => {
      const dateStr = dayEl.dataset.date;
      const dayOrders = orders.filter(o => o.dueDate === dateStr);
      if (dayOrders.length > 0) {
        openDayDetailsModal(dateStr, dayOrders);
      }
    });
  });

  // المواعيد القادمة
  renderUpcomingDates(container);
}

/* ============================================================
   نافذة تفاصيل اليوم
   ============================================================ */
function openDayDetailsModal(dateStr, dayOrders) {
  const customers = db.getCustomers();
  const [year, month, day] = dateStr.split('-');
  const dateObj = new Date(year, month - 1, day);
  const dayName = DAY_NAMES_SHORT[dateObj.getDay()];
  
  const pending = dayOrders.filter(o => o.status !== 'delivered');
  const delivered = dayOrders.filter(o => o.status === 'delivered');

  const renderOrder = (o) => {
    const cust = customers.find(c => c.id === o.customerId);
    const custName = cust ? cust.name : 'عميل محذوف';
    const remaining = (o.totalPrice || 0) - (o.deposit || 0);
    const statusColors = { pending: '#FFA726', in_progress: '#29B6F6', ready: '#AB47BC', delivered: '#66BB6A' };
    const statusLabels = { pending: 'انتظار', in_progress: 'تنفيذ', ready: 'جاهز', delivered: 'مُسلَّم' };
    const status = o.status || 'pending';
    
    return `
      <div style="padding: 10px; background: var(--bg-color); border-radius: var(--radius-md); margin-bottom: 6px; border-right: 3px solid ${statusColors[status]};">
        <div class="flex-between" style="margin-bottom: 4px;">
          <div style="font-weight: 700; font-size: 13px;">👤 ${custName}</div>
          <span style="font-size: 10px; color: ${statusColors[status]}; font-weight: 700;">${statusLabels[status]}</span>
        </div>
        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">🧵 ${o.garmentType || 'طلب'} × ${o.quantity || 1}</div>
        <div style="font-size: 11px; color: var(--text-muted); display: flex; justify-content: space-between;">
          <span>💰 ${money(o.totalPrice)} ج</span>
          ${remaining > 0 ? `<span style="color: #dc3545;">متبقي: ${money(remaining)} ج</span>` : '<span style="color: #2E7D32;">✓ مسدد</span>'}
        </div>
      </div>
    `;
  };

  const html = `
    <h3 class="card-title no-border" style="text-align: center;">
      📅 ${day} ${MONTH_NAMES[month - 1]} ${year}
    </h3>
    <p style="text-align: center; font-size: 12px; color: var(--text-muted); margin: 0 0 12px 0;">
      ${dayName} — ${dayOrders.length} طلب
    </p>

    ${pending.length > 0 ? `
      <h4 style="font-size: 13px; color: var(--primary-dark); margin-bottom: 8px;">⏳ قيد التسليم (${pending.length}):</h4>
      ${pending.map(renderOrder).join('')}
    ` : ''}

    ${delivered.length > 0 ? `
      <h4 style="font-size: 13px; color: var(--text-muted); margin: 12px 0 8px 0;">✅ تم التسليم (${delivered.length}):</h4>
      ${delivered.map(renderOrder).join('')}
    ` : ''}

    <button class="btn btn-outline btn-full mt-3" id="close-day-modal">إغلاق</button>
  `;

  openModal(html);
  document.getElementById('close-day-modal').addEventListener('click', closeModal);
}

/* ============================================================
   المواعيد القادمة
   ============================================================ */
function renderUpcomingDates(container) {
  const listDiv = container.querySelector('#upcoming-dates-list');
  const customers = db.getCustomers();
  const orders = db.getOrders().filter(o => o.dueDate && o.status !== 'delivered');
  const todayStr = today();

  // ترتيب المواعيد القادمة (خلال 30 يوم)
  const upcoming = orders
    .filter(o => daysBetween(o.dueDate, todayStr) >= 0 && daysBetween(o.dueDate, todayStr) <= 30)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 10);

  if (upcoming.length === 0) {
    listDiv.innerHTML = `
      <div class="empty-state" style="padding: 20px;">
        <div style="font-size: 32px; margin-bottom: 8px;">📭</div>
        <p style="font-size: 13px;">لا توجد مواعيد قادمة خلال 30 يوماً</p>
      </div>
    `;
    return;
  }

  // تجميع حسب اليوم
  const grouped = {};
  upcoming.forEach(o => {
    if (!grouped[o.dueDate]) grouped[o.dueDate] = [];
    grouped[o.dueDate].push(o);
  });

  let html = '';
  Object.keys(grouped).forEach(dateStr => {
    const daysLeft = daysBetween(dateStr, todayStr);
    const dateObj = new Date(dateStr);
    const dayName = DAY_NAMES_SHORT[dateObj.getDay()];
    
    let deadlineLabel, deadlineColor;
    if (daysLeft === 0) { deadlineLabel = 'اليوم'; deadlineColor = '#F57C00'; }
    else if (daysLeft === 1) { deadlineLabel = 'غداً'; deadlineColor = '#F57C00'; }
    else if (daysLeft <= 3) { deadlineLabel = `بعد ${daysLeft} أيام`; deadlineColor = '#F57C00'; }
    else { deadlineLabel = `بعد ${daysLeft} يوم`; deadlineColor = '#2E7D32'; }

    html += `
      <div style="margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
          <div style="font-size: 13px; font-weight: 800; color: var(--primary-dark);">
            ${dayName} ${dateObj.getDate()}/${dateObj.getMonth() + 1}
          </div>
          <span style="font-size: 11px; color: ${deadlineColor}; font-weight: 700; background: ${deadlineColor}20; padding: 2px 8px; border-radius: 20px;">
            ${deadlineLabel}
          </span>
        </div>
        ${grouped[dateStr].map(o => {
          const cust = customers.find(c => c.id === o.customerId);
          const custName = cust ? cust.name : 'عميل محذوف';
          return `
            <div style="padding: 8px 10px; background: var(--bg-color); border-radius: var(--radius-md); margin-bottom: 4px; font-size: 12px;">
              <div class="flex-between">
                <span style="font-weight: 600;">👤 ${custName}</span>
                <span style="color: var(--primary-color); font-weight: 700;">${money(o.totalPrice)} ج</span>
              </div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">🧵 ${o.garmentType || 'طلب'}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  });

  listDiv.innerHTML = html;
}
