/* ============================================================
   daily-briefing.js - الملخص اليومي والنصائح الذكية (V2)
   (رسائل تحفيزية + ملخص يومي + نصائح مبنية على النشاط)
   ============================================================ */

import * as db from './db.js';
import { today, daysBetween, money } from './utils.js';

/* ============================================================
   رسالة ترحيب حسب الوقت
   ============================================================ */
export function getGreeting(workshopName) {
  const hour = new Date().getHours();
  const name = workshopName || 'صديقي';

  if (hour >= 5 && hour < 12) return { text: `صباح الخير، ${name}`, icon: '☀️', mood: 'morning' };
  if (hour >= 12 && hour < 17) return { text: `مساء الخير، ${name}`, icon: '🌤️', mood: 'afternoon' };
  if (hour >= 17 && hour < 21) return { text: `مساء النور، ${name}`, icon: '🌆', mood: 'evening' };
  return { text: `ليلة سعيدة، ${name}`, icon: '🌙', mood: 'night' };
}

/* ============================================================
   الملخص اليومي
   ============================================================ */
export function getDailySummary() {
  const orders = db.getOrders();
  const payments = db.getPayments();
  const expenses = db.getExpenses();
  const inventory = db.getInventory();
  const todayStr = today();

  // الطلبات
  const ordersAddedToday = orders.filter(o => o.date === todayStr).length;
  const dueToday = orders.filter(o => o.dueDate === todayStr && o.status !== 'delivered').length;
  const overdue = orders.filter(o => {
    if (o.status === 'delivered' || !o.dueDate) return false;
    return daysBetween(o.dueDate, todayStr) < 0;
  }).length;
  const inProgress = orders.filter(o => o.status === 'in_progress').length;
  const ready = orders.filter(o => o.status === 'ready').length;

  // المالية
  const todayRevenue = payments
    .filter(p => p.date === todayStr)
    .reduce((s, p) => s + (p.amount || 0), 0);

  const todayExpenses = expenses
    .filter(e => e.date === todayStr)
    .reduce((s, e) => s + (e.amount || 0), 0);

  // المخزون
  const lowStock = inventory.filter(i =>
    (i.quantity || 0) <= (i.minQuantity || 0) && (i.minQuantity || 0) > 0
  ).length;

  return {
    ordersAddedToday,
    dueToday,
    overdue,
    inProgress,
    ready,
    todayRevenue,
    todayExpenses,
    todayNet: todayRevenue - todayExpenses,
    lowStock
  };
}

/* ============================================================
   النصائح الذكية المبنية على النشاط
   ============================================================ */
export function getActivityTips() {
  const tips = [];
  const summary = getDailySummary();
  const orders = db.getOrders();
  const customers = db.getCustomers();
  const payments = db.getPayments();

  // 1. رسالة تحفيزية صباحية
  if (summary.ordersAddedToday > 0) {
    tips.push({
      type: 'success',
      icon: '🎯',
      text: `أضفت ${summary.ordersAddedToday} طلب اليوم. استمر في هذا الأداء!`
    });
  } else {
    tips.push({
      type: 'info',
      icon: '💡',
      text: 'لم تسجل طلبات اليوم بعد. هل تريد بدء يومك بطلب جديد؟'
    });
  }

  // 2. المتابعة العاجلة
  if (summary.overdue > 0) {
    tips.push({
      type: 'danger',
      icon: '⏰',
      text: `لديك ${summary.overdue} طلب متأخر يحتاج انتباهك فوراً!`
    });
  }

  if (summary.dueToday > 0) {
    tips.push({
      type: 'warning',
      icon: '📌',
      text: `${summary.dueToday} طلب يستحق التسليم اليوم. تأكد من جاهزيتها.`
    });
  }

  // 3. المخزون
  if (summary.lowStock > 0) {
    tips.push({
      type: 'warning',
      icon: '📦',
      text: `${summary.lowStock} عنصر في المخزون على وشك النفاد.`
    });
  }

  // 4. إيرادات اليوم
  if (summary.todayRevenue > 0) {
    tips.push({
      type: 'success',
      icon: '💰',
      text: `إيرادات اليوم: ${money(summary.todayRevenue)} ج. أحسنت!`
    });
  }

  // 5. صافي اليوم
  if (summary.todayNet < 0) {
    tips.push({
      type: 'warning',
      icon: '📉',
      text: `مصروفات اليوم تتجاوز الإيرادات بـ ${money(Math.abs(summary.todayNet))} ج.`
    });
  }

  // 6. الطلبات الجاهزة
  if (summary.ready > 0) {
    tips.push({
      type: 'info',
      icon: '✅',
      text: `${summary.ready} طلب جاهز للتسليم. اتصل بالعملاء!`
    });
  }

  // 7. الأداء هذا الأسبوع
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekOrders = orders.filter(o => {
    const d = new Date(o.date || o.createdAt);
    return d >= weekAgo;
  }).length;

  if (weekOrders >= 10) {
    tips.push({
      type: 'success',
      icon: '🏆',
      text: `أسبوع مميز! ${weekOrders} طلب خلال 7 أيام.`
    });
  } else if (weekOrders >= 5) {
    tips.push({
      type: 'info',
      icon: '📈',
      text: `${weekOrders} طلب هذا الأسبوع. أنت في المسار الصحيح.`
    });
  }

  // 8. أفضل عميل
  const customerSpending = {};
  orders.forEach(o => {
    if (o.customerId) {
      customerSpending[o.customerId] = (customerSpending[o.customerId] || 0) + (o.totalPrice || 0);
    }
  });

  const topCustomerEntry = Object.entries(customerSpending).sort((a, b) => b[1] - a[1])[0];
  if (topCustomerEntry) {
    const customer = customers.find(c => c.id === topCustomerEntry[0]);
    if (customer && customer.isVip) {
      tips.push({
        type: 'success',
        icon: '👑',
        text: `عميلك المميز ${customer.name} هو الأكثر شراءً. حافظ عليه!`
      });
    }
  }

  return tips.slice(0, 5); // 5 نصائح كحد أقصى
}

/* ============================================================
   الإجراء المقترح التالي (Next Action)
   ============================================================ */
export function getNextAction() {
  const summary = getDailySummary();

  if (summary.overdue > 0) {
    return {
      title: 'ابدأ بالطلبات المتأخرة',
      subtitle: `${summary.overdue} طلب متأخر يحتاج اهتمامك`,
      icon: '⏰',
      route: '/orders',
      color: '#C62828'
    };
  }

  if (summary.dueToday > 0) {
    return {
      title: 'تسليمات اليوم',
      subtitle: `${summary.dueToday} طلب يستحق التسليم اليوم`,
      icon: '📅',
      route: '/orders',
      color: '#F57C00'
    };
  }

  if (summary.lowStock > 0) {
    return {
      title: 'مراجعة المخزون',
      subtitle: `${summary.lowStock} عنصر على وشك النفاد`,
      icon: '📦',
      route: '/inventory',
      color: '#AD1457'
    };
  }

  if (summary.ready > 0) {
    return {
      title: 'تسليم الطلبات الجاهزة',
      subtitle: `${summary.ready} طلب جاهز للتسليم`,
      icon: '✅',
      route: '/orders',
      color: '#2E7D32'
    };
  }

  return {
    title: 'كل شيء تحت السيطرة ✨',
    subtitle: 'لا توجد مهام عاجلة. عمل رائع!',
    icon: '🎉',
    route: '/dashboard',
    color: '#1F6D57'
  };
}

/* ============================================================
   مؤشر الإنتاجية (أعلى / متوسط / منخفض)
   ============================================================ */
export function getProductivityLevel() {
  const orders = db.getOrders();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const weekOrders = orders.filter(o => {
    const d = new Date(o.date || o.createdAt);
    return d >= weekAgo;
  }).length;

  if (weekOrders >= 15) return { level: 'عالي', color: '#2E7D32', icon: '🔥', percent: 100 };
  if (weekOrders >= 8) return { level: 'متوسط', color: '#F57C00', icon: '⚡', percent: 65 };
  if (weekOrders >= 3) return { level: 'عادي', color: '#1565C0', icon: '📊', percent: 40 };
  return { level: 'منخفض', color: '#C62828', icon: '💤', percent: 20 };
}
