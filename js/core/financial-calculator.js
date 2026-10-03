/* ============================================================
   financial-calculator.js - الحاسبة المالية المتقدمة (V2)
   (تحليلات + مؤشرات + نصائح + تنبؤات)
   ============================================================ */

import * as db from './db.js';
import { today, daysBetween } from './utils.js';
import { DEFAULT_SETTINGS } from './config.js';
import * as storage from './storage.js';

/* ============================================================
   الحسابات الأساسية
   ============================================================ */
export function getFinancialSummary() {
  const payments = db.getPayments();
  const expenses = db.getExpenses();
  const orders = db.getOrders();
  
  const totalRevenue = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  
  const pendingPayments = orders.reduce((s, o) => {
    return s + Math.max(0, (o.totalPrice || 0) - (o.deposit || 0));
  }, 0);

  return {
    totalRevenue,
    totalExpenses,
    netProfit,
    profitMargin: Math.round(profitMargin * 10) / 10,
    pendingPayments,
    isProfitable: netProfit > 0
  };
}

/* ============================================================
   التحليل الشهري
   ============================================================ */
export function getMonthlyComparison() {
  const payments = db.getPayments();
  const expenses = db.getExpenses();
  const orders = db.getOrders();
  
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const inMonth = (dateStr, month, year) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d.getMonth() === month && d.getFullYear() === year;
  };

  const currentRevenue = payments
    .filter(p => inMonth(p.date, currentMonth, currentYear))
    .reduce((s, p) => s + (p.amount || 0), 0);
  
  const currentExpenses = expenses
    .filter(e => inMonth(e.date, currentMonth, currentYear))
    .reduce((s, e) => s + (e.amount || 0), 0);

  const currentOrders = orders.filter(o => inMonth(o.date, currentMonth, currentYear)).length;

  const lastRevenue = payments
    .filter(p => inMonth(p.date, lastMonth, lastMonthYear))
    .reduce((s, p) => s + (p.amount || 0), 0);
  
  const lastExpenses = expenses
    .filter(e => inMonth(e.date, lastMonth, lastMonthYear))
    .reduce((s, e) => s + (e.amount || 0), 0);

  const lastOrders = orders.filter(o => inMonth(o.date, lastMonth, lastMonthYear)).length;

  const revenueChange = lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 : 0;
  const expensesChange = lastExpenses > 0 ? ((currentExpenses - lastExpenses) / lastExpenses) * 100 : 0;
  const ordersChange = lastOrders > 0 ? ((currentOrders - lastOrders) / lastOrders) * 100 : 0;

  return {
    current: { revenue: currentRevenue, expenses: currentExpenses, profit: currentRevenue - currentExpenses, orders: currentOrders },
    last: { revenue: lastRevenue, expenses: lastExpenses, profit: lastRevenue - lastExpenses, orders: lastOrders },
    changes: {
      revenue: Math.round(revenueChange * 10) / 10,
      expenses: Math.round(expensesChange * 10) / 10,
      orders: Math.round(ordersChange * 10) / 10
    }
  };
}

/* ============================================================
   تحليل المصادر
   ============================================================ */
export function getIncomeBreakdown() {
  const payments = db.getPayments();
  
  // توزيع الإيرادات حسب الشهر (آخر 6 أشهر)
  const monthlyData = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = d.getMonth();
    const year = d.getFullYear();
    
    const monthRevenue = payments
      .filter(p => {
        const pd = new Date(p.date);
        return pd.getMonth() === month && pd.getFullYear() === year;
      })
      .reduce((s, p) => s + (p.amount || 0), 0);
    
    monthlyData.push({
      month: month + 1,
      year,
      revenue: monthRevenue
    });
  }
  
  return monthlyData;
}

/* ============================================================
   نقطة التعادل
   ============================================================ */
export function getBreakEvenAnalysis() {
  const orders = db.getOrders();
  const expenses = db.getExpenses();
  
  // متوسط الإيراد لكل طلب
  const deliveredOrders = orders.filter(o => o.status === 'delivered');
  const totalDeliveredRevenue = deliveredOrders.reduce((s, o) => s + (o.totalPrice || 0), 0);
  const avgOrderValue = deliveredOrders.length > 0 ? totalDeliveredRevenue / deliveredOrders.length : 0;
  
  // متوسط المصروف الشهري
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  
  const recentExpenses = expenses.filter(e => new Date(e.date) >= threeMonthsAgo);
  const monthlyExpenses = recentExpenses.reduce((s, e) => s + (e.amount || 0), 0) / 3;
  
  // عدد الطلبات المطلوبة شهرياً لتغطية المصاريف
  const ordersNeeded = avgOrderValue > 0 ? Math.ceil(monthlyExpenses / avgOrderValue) : 0;
  
  return {
    avgOrderValue,
    monthlyExpenses: Math.round(monthlyExpenses),
    ordersNeededMonthly: ordersNeeded,
    isAchievable: ordersNeeded > 0 && ordersNeeded <= 50 // تقديري
  };
}

/* ============================================================
   النصائح المالية الذكية
   ============================================================ */
export function getSmartTips() {
  const tips = [];
  const summary = getFinancialSummary();
  const comparison = getMonthlyComparison();
  const orders = db.getOrders();
  const customers = db.getCustomers();
  const expenses = db.getExpenses();
  const settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  
  // 1. الربحية
  if (summary.totalRevenue === 0) {
    tips.push({ type: 'info', icon: '📊', text: 'ابدأ بإضافة دفعات لرؤية تحليلات الربح.' });
  } else if (summary.netProfit < 0) {
    tips.push({ type: 'danger', icon: '⚠️', text: `خسارة! مصروفاتك تتجاوز إيراداتك بـ ${Math.abs(Math.round(summary.netProfit))} ج.` });
  } else if (summary.profitMargin < 10) {
    tips.push({ type: 'warning', icon: '📉', text: `هامش الربح منخفض (${summary.profitMargin}%). حاول تقليل المصروفات أو زيادة الأسعار.` });
  } else if (summary.profitMargin >= 30) {
    tips.push({ type: 'success', icon: '🎉', text: `هامش ربح ممتاز (${summary.profitMargin}%)! استمر في هذا الأداء.` });
  }
  
  // 2. المديونيات
  if (summary.pendingPayments > 5000) {
    tips.push({ type: 'warning', icon: '💸', text: `لديك ${Math.round(summary.pendingPayments)} ج متبقية على العملاء. تابع تحصيلها.` });
  } else if (summary.pendingPayments > 0 && summary.pendingPayments < 1000) {
    tips.push({ type: 'success', icon: '✅', text: 'المديونيات تحت السيطرة، أحسنت!' });
  }
  
  // 3. مقارنة الشهور
  if (comparison.last.revenue > 0) {
    if (comparison.changes.revenue > 20) {
      tips.push({ type: 'success', icon: '📈', text: `إيراداتك زادت ${comparison.changes.revenue}% عن الشهر الماضي!` });
    } else if (comparison.changes.revenue < -20) {
      tips.push({ type: 'warning', icon: '📉', text: `إيراداتك انخفضت ${Math.abs(comparison.changes.revenue)}% عن الشهر الماضي.` });
    }
  }
  
  if (comparison.last.expenses > 0 && comparison.changes.expenses > 25) {
    tips.push({ type: 'danger', icon: '🚨', text: `مصروفاتك زادت ${comparison.changes.expenses}% عن الشهر الماضي! راجعها.` });
  }
  
  // 4. أفضل العملاء
  const customerSpending = {};
  orders.forEach(o => {
    if (o.customerId) {
      customerSpending[o.customerId] = (customerSpending[o.customerId] || 0) + (o.totalPrice || 0);
    }
  });
  const topCustomers = Object.entries(customerSpending)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  
  if (topCustomers.length > 0 && summary.totalRevenue > 0) {
    const topTotal = topCustomers.reduce((s, [, v]) => s + v, 0);
    const topPercent = Math.round((topTotal / summary.totalRevenue) * 100);
    if (topPercent > 50) {
      const names = topCustomers.map(([id]) => {
        const c = customers.find(x => x.id === id);
        return c ? c.name : '';
      }).filter(Boolean).join('، ');
      tips.push({ type: 'info', icon: '👑', text: `أفضل 3 عملاء (${names}) يمثلون ${topPercent}% من إيراداتك. حافظ عليهم!` });
    }
  }
  
  // 5. النمو
  if (comparison.current.orders > comparison.last.orders && comparison.last.orders > 0) {
    const growth = comparison.current.orders - comparison.last.orders;
    tips.push({ type: 'success', icon: '🚀', text: `طلباتك زادت بـ ${growth} طلب هذا الشهر!` });
  }
  
  // 6. المصروفات الكبرى
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthExpenses = expenses.filter(e => (e.date || '').startsWith(monthPrefix));
  const biggestExpense = monthExpenses.sort((a, b) => (b.amount || 0) - (a.amount || 0))[0];
  
  if (biggestExpense && biggestExpense.amount > 1000) {
    tips.push({ type: 'info', icon: '💰', text: `أكبر مصروف هذا الشهر: ${Math.round(biggestExpense.amount)} ج${biggestExpense.note ? ' (' + biggestExpense.note + ')' : ''}.` });
  }
  
  // 7. المخزون
  const inventory = db.getInventory();
  const lowStock = inventory.filter(i => (i.quantity || 0) <= (i.minQuantity || 0) && (i.minQuantity || 0) > 0);
  if (lowStock.length > 0) {
    tips.push({ type: 'warning', icon: '📦', text: `${lowStock.length} عنصر في المخزون على وشك النفاد. راجع المخزون.` });
  }
  
  // 8. العملاء النشطون
  if (customers.length > 0) {
    const activeCustomers = new Set(orders.map(o => o.customerId).filter(Boolean)).size;
    const activePercent = Math.round((activeCustomers / customers.length) * 100);
    if (activePercent < 30 && customers.length > 5) {
      tips.push({ type: 'info', icon: '👥', text: `${100 - activePercent}% من عملائك غير نشطين. تواصل معهم بعرض خاص.` });
    }
  }
  
  // 9. الطلبات المتأخرة
  const lateOrders = orders.filter(o => {
    if (o.status === 'delivered' || !o.dueDate) return false;
    return daysBetween(o.dueDate, today()) < 0;
  });
  if (lateOrders.length > 0) {
    tips.push({ type: 'danger', icon: '⏰', text: `لديك ${lateOrders.length} طلب متأخر! قد يؤثر على سمعتك.` });
  }
  
  // 10. الاستمرارية
  const checkinDays = new Set(orders.map(o => (o.date || '').slice(0, 10)));
  if (checkinDays.size < 10 && checkinDays.size > 0) {
    tips.push({ type: 'info', icon: '📅', text: `سجّلت طلبات في ${checkinDays.size} يوم فقط. الاستمرارية تسرّع نمو ورشتك.` });
  }
  
  // 11. توزيع المصروفات
  const categoryTotals = {};
  expenses.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + (e.amount || 0);
  });
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
  if (topCategory && summary.totalExpenses > 0) {
    const percent = Math.round((topCategory[1] / summary.totalExpenses) * 100);
    if (percent > 50) {
      tips.push({ type: 'info', icon: '📊', text: `${percent}% من مصروفاتك في "${topCategory[0]}". راجع إذا كان هناك بدائل أوفر.` });
    }
  }
  
  // 12. مكافأة الأداء
  if (summary.netProfit > 5000 && summary.profitMargin > 25) {
    tips.push({ type: 'success', icon: '🏆', text: 'أداء مميز! فكر في استثمار جزء من الأرباح في تطوير الورشة.' });
  }
  
  return tips;
}

/* ============================================================
   التنبؤ المالي (3 شهور قادمة)
   ============================================================ */
export function getForecast() {
  const monthlyData = getIncomeBreakdown();
  const validMonths = monthlyData.filter(m => m.revenue > 0);
  
  if (validMonths.length < 2) return null;
  
  // متوسط الإيراد الشهري
  const avgRevenue = validMonths.reduce((s, m) => s + m.revenue, 0) / validMonths.length;
  
  // اتجاه النمو
  let trend = 0;
  if (validMonths.length >= 2) {
    const first = validMonths[0].revenue;
    const last = validMonths[validMonths.length - 1].revenue;
    if (first > 0) trend = (last - first) / first;
  }
  
  const forecast = [];
  const now = new Date();
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const predicted = Math.max(0, avgRevenue * (1 + (trend / validMonths.length) * i));
    forecast.push({
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      predicted: Math.round(predicted)
    });
  }
  
  return {
    avgMonthly: Math.round(avgRevenue),
    trend: Math.round(trend * 100),
    forecast
  };
}
