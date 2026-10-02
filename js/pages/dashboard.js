/* ============================================================
   dashboard.js - لوحة التحكم الرئيسية (V2)
   ============================================================ */

import * as db from '../core/db.js';
import { money } from '../core/utils.js';

export function renderDashboardPage(container) {
  const customers = db.getCustomers();
  const orders = db.getOrders();
  const payments = db.getPayments();

  // 1. حساب الإحصائيات العامة
  const totalCustomers = customers.length;
  const totalOrders = orders.length;
  
  // إجمالي الإيرادات = مجموع المبالغ المدفوعة
  const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  
  // إجمالي المتبقي = مجموع (سعر الطلب - المدفوع للطلب)
  const totalRemaining = orders.reduce((sum, o) => {
    return sum + ((o.totalPrice || 0) - (o.deposit || 0));
  }, 0);

  // 2. حساب إحصائيات الشهر الحالي
  const todayDate = new Date();
  const currentMonth = todayDate.getMonth();
  const currentYear = todayDate.getFullYear();

  const monthlyOrders = orders.filter(o => {
    const orderDate = new Date(o.date || o.createdAt);
    return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
  });

  const monthlyRevenue = payments.filter(p => {
    const payDate = new Date(p.date || p.createdAt);
    return payDate.getMonth() === currentMonth && payDate.getFullYear() === currentYear;
  }).reduce((sum, p) => sum + (p.amount || 0), 0);

  // 3. بناء الواجهة
  container.innerHTML = `
    <!-- الترحيب -->
    <div class="card" style="background: linear-gradient(135deg, var(--primary-color), var(--primary-dark)); color: white; border: none;">
      <h2 style="color: white; margin-bottom: 4px;">مرحباً بك 👋</h2>
      <p style="color: rgba(255,255,255,0.8); margin: 0;">نظرة سريعة على حالة الورشة اليوم</p>
    </div>

    <!-- البطاقات الإحصائية العامة -->
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 16px;">
      <div class="card" style="text-align: center; margin-bottom: 0;">
        <div style="font-size: 24px; font-weight: 800; color: var(--primary-color);">${totalCustomers}</div>
        <div style="font-size: 12px; color: var(--text-muted);">إجمالي العملاء</div>
      </div>
      <div class="card" style="text-align: center; margin-bottom: 0;">
        <div style="font-size: 24px; font-weight: 800; color: var(--primary-color);">${totalOrders}</div>
        <div style="font-size: 12px; color: var(--text-muted);">إجمالي الطلبات</div>
      </div>
      <div class="card" style="text-align: center; margin-bottom: 0;">
        <div style="font-size: 24px; font-weight: 800; color: var(--accent-color);">${money(totalRevenue)}</div>
        <div style="font-size: 12px; color: var(--text-muted);">إجمالي الإيرادات</div>
      </div>
      <div class="card" style="text-align: center; margin-bottom: 0;">
        <div style="font-size: 24px; font-weight: 800; color: #dc3545;">${money(totalRemaining)}</div>
        <div style="font-size: 12px; color: var(--text-muted);">إجمالي المتبقي</div>
      </div>
    </div>

    <!-- بطاقة إحصائيات الشهر -->
    <div class="card">
      <h3 class="card-title">📅 إحصائيات الشهر الحالي</h3>
      <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
        <span style="color: var(--text-muted);">عدد الطلبات الجديدة:</span>
        <span style="font-weight: bold;">${monthlyOrders.length}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 8px 0;">
        <span style="color: var(--text-muted);">إيرادات الشهر:</span>
        <span style="font-weight: bold; color: var(--primary-color);">${money(monthlyRevenue)}</span>
      </div>
    </div>

    <!-- آخر الطلبات -->
    <div class="card">
      <h3 class="card-title">🕒 آخر الطلبات المضافة</h3>
      ${
        orders.length === 0 
          ? `<p style="text-align:center; color: var(--text-muted); padding: 20px;">لا توجد طلبات حتى الآن.</p>`
          : orders.slice(-3).reverse().map(o => {
              const customer = customers.find(c => c.id === o.customerId);
              const name = customer ? customer.name : 'عميل محذوف';
              return `
                <div style="padding: 8px 0; border-bottom: 1px solid var(--border-color); font-size: 14px;">
                  <span style="font-weight: bold;">${name}</span> - 
                  <span style="color: var(--text-muted);">${o.garmentType}</span>
                  <span style="float: left; font-weight: bold; color: var(--primary-color);">${money(o.totalPrice)}</span>
                </div>
              `;
            }).join('')
      }
    </div>
  `;
}
