/* ============================================================
   fabric-pickup.js - محرك مواعيد استلام القماش (V2)
   (تنبيهات + إحصائيات + تتبع حالة الاستلام)
   ============================================================ */

import * as db from './db.js';
import { today, daysBetween } from './utils.js';
import { DEFAULT_SETTINGS } from './config.js';
import * as storage from './storage.js';

/* ============================================================
   الحصول على طلبات استلام القماش
   ============================================================ */
export function getFabricPickupOrders() {
  const orders = db.getOrders();
  const customers = db.getCustomers();
  const settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  const alertDays = settings.fabricPickupAlertDays || 2;
  const todayStr = today();

  const pending = [];      // قماش متوقع استلامه
  const overdue = [];      // تجاوز موعد الاستلام
  const soon = [];         // يقترب موعد الاستلام
  const collected = [];    // تم استلام القماش

  orders.forEach(order => {
    // تجاهل الطلبات المسلَّمة
    if (order.status === 'delivered') return;

    const customer = customers.find(c => c.id === order.customerId);
    const custName = customer ? customer.name : 'عميل محذوف';
    const customerPhone = customer ? customer.phone : null;

    const info = {
      order,
      customer,
      customerName: custName,
      customerPhone,
      receivedDate: order.receivedDate || null
    };

    // إذا لم يكن هناك تاريخ استلام
    if (!order.receivedDate) {
      pending.push(info);
      return;
    }

    // حساب الفارق
    const daysLeft = daysBetween(order.receivedDate, todayStr);

    if (daysLeft < 0) {
      // تجاوز الموعد
      overdue.push({ ...info, daysLeft });
    } else if (daysLeft <= alertDays) {
      // يقترب الموعد
      soon.push({ ...info, daysLeft });
    } else {
      // لم يحن موعده بعد
      pending.push({ ...info, daysLeft });
    }
  });

  // ترتيب
  overdue.sort((a, b) => a.daysLeft - b.daysLeft);
  soon.sort((a, b) => a.daysLeft - b.daysLeft);
  pending.sort((a, b) => {
    if (!a.receivedDate) return 1;
    if (!b.receivedDate) return -1;
    return (a.receivedDate || '').localeCompare(b.receivedDate || '');
  });

  return { overdue, soon, pending, collected };
}

/* ============================================================
   التنبيهات الحرجة
   ============================================================ */
export function getFabricPickupAlerts() {
  const { overdue, soon } = getFabricPickupOrders();

  const alerts = [];

  // الطلبات المتأخرة
  overdue.forEach(item => {
    alerts.push({
      ...item,
      priority: 'critical',
      color: '#C62828',
      bg: '#FFEBEE',
      icon: '🚨',
      message: `تأخر استلام القماش ${Math.abs(item.daysLeft)} ${Math.abs(item.daysLeft) === 1 ? 'يوم' : 'أيام'}`,
      actionText: 'اتصل بالعميل فوراً'
    });
  });

  // الطلبات القريبة
  soon.forEach(item => {
    alerts.push({
      ...item,
      priority: 'high',
      color: '#F57C00',
      bg: '#FFF3E0',
      icon: '⏰',
      message: item.daysLeft === 0
        ? 'استلام القماش اليوم'
        : `استلام القماش بعد ${item.daysLeft} ${item.daysLeft === 1 ? 'يوم' : 'أيام'}`,
      actionText: 'تذكير العميل'
    });
  });

  return alerts;
}

/* ============================================================
   إحصائيات مواعيد الاستلام
   ============================================================ */
export function getFabricPickupStats() {
  const { overdue, soon, pending } = getFabricPickupOrders();

  return {
    totalPending: overdue.length + soon.length + pending.length,
    overdueCount: overdue.length,
    soonCount: soon.length,
    pendingCount: pending.length,
    needsAttention: overdue.length + soon.length
  };
}

/* ============================================================
   توليد رسالة تذكير للعميل
   ============================================================ */
export function generatePickupReminderMessage(item) {
  const { customerName, order, daysLeft } = item;
  const settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  const workshopName = settings.workshopName || 'ورشة تفصيل الجلابيب';

  let timingText;
  if (daysLeft < 0) {
    timingText = `تأخر موعد استلام القماش بـ ${Math.abs(daysLeft)} ${Math.abs(daysLeft) === 1 ? 'يوم' : 'أيام'}`;
  } else if (daysLeft === 0) {
    timingText = 'موعد استلام القماش اليوم';
  } else if (daysLeft === 1) {
    timingText = 'موعد استلام القماش غداً';
  } else {
    timingText = `موعد استلام القماش بعد ${daysLeft} أيام`;
  }

  return `السلام عليكم ${customerName} 🌹

تذكير ودّي من ${workshopName}

${timingText}
📅 التاريخ المتوقع: ${order.receivedDate}

🧵 نوع الطلب: ${order.garmentType || 'طلب'}

في انتظار استلام القماش لنبدأ التنفيذ.

شكراً لتعاملك معنا 🌟`;
}

/* ============================================================
   توليد رسالة تقدير للعميل الذي سلّم القماش
   ============================================================ */
export function generatePickupThankYouMessage(order, customer) {
  const settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  const workshopName = settings.workshopName || 'ورشة تفصيل الجلابيب';
  const customerName = customer ? customer.name : 'عميلنا العزيز';

  return `السلام عليكم ${customerName} 🌹

شكراً لك على استلام القماش وتسليمه في الموعد.

🧵 طلبك: ${order.garmentType || 'طلب'}
📅 تاريخ الاستلام: ${order.receivedDate}

سنبدأ في التنفيذ فوراً وسنخبرك عند الانتهاء.

من ${workshopName} 🌟`;
}

/* ============================================================
   حساب الأداء العام
   ============================================================ */
export function getPickupPerformance() {
  const orders = db.getOrders();
  const relevantOrders = orders.filter(o => o.receivedDate);

  if (relevantOrders.length === 0) {
    return { onTimePercent: 0, avgDelayDays: 0, total: 0 };
  }

  // المبالغ المستلمة في الموعد
  let onTimeCount = 0;
  let totalDelay = 0;
  let delayedCount = 0;

  relevantOrders.forEach(o => {
    const todayStr = today();
    const pickupDate = o.receivedDate;
    const dueDate = o.dueDate || pickupDate;

    if (pickupDate <= dueDate) {
      onTimeCount++;
    } else {
      delayedCount++;
      totalDelay += daysBetween(pickupDate, dueDate);
    }
  });

  const onTimePercent = relevantOrders.length > 0
    ? Math.round((onTimeCount / relevantOrders.length) * 100)
    : 0;

  const avgDelayDays = delayedCount > 0
    ? Math.round((totalDelay / delayedCount) * 10) / 10
    : 0;

  return {
    onTimePercent,
    avgDelayDays,
    total: relevantOrders.length
  };
}
