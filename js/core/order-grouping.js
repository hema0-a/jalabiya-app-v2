/* ============================================================
   order-grouping.js - محرك تجميع الطلبات المتشابهة (V2)
   (يجمع الطلبات حسب النوع + القياسات المتقاربة)
   ============================================================ */

import * as db from './db.js';
import { DEFAULT_SETTINGS, DEFAULT_MEASUREMENT_FIELDS } from './config.js';
import * as storage from './storage.js';

/* ============================================================
   الحصول على إعدادات التجميع
   ============================================================ */
export function getGroupingSettings() {
  const settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  return {
    enabled: settings.enableMeasurementGrouping === true,
    tolerance: Number(settings.measurementTolerance) || 2,
    groupByGarmentType: settings.groupByGarmentType !== false
  };
}

/* ============================================================
   التحقق من إمكانية التجميع
   ============================================================ */
export function canGroup() {
  const settings = getGroupingSettings();
  return settings.enabled;
}

/* ============================================================
   استخراج اسم النوع الرئيسي من الطلب
   ============================================================ */
function getMainGarmentType(order) {
  if (order.items && Array.isArray(order.items) && order.items.length > 0) {
    // نأخذ النوع الأول
    return (order.items[0].name || '').trim().toLowerCase();
  }
  return (order.garmentType || '').trim().toLowerCase();
}

/* ============================================================
   استخراج القياسات من الطلب (من العميل)
   ============================================================ */
function getOrderMeasurements(order, customers) {
  if (!order.customerId) return null;
  const customer = customers.find(c => c.id === order.customerId);
  if (!customer || !customer.measurements) return null;
  
  // التحقق من وجود قياسات فعلية
  const meas = customer.measurements;
  const hasMeasurements = Object.values(meas).some(v => v && Number(v) > 0);
  if (!hasMeasurements) return null;
  
  return meas;
}

/* ============================================================
   مقارنة قياسين (مع تسامح محدد)
   ============================================================ */
function areMeasurementsSimilar(meas1, meas2, tolerance) {
  if (!meas1 || !meas2) return false;
  
  // نحصل على الحقول المفعّلة فقط
  const settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  const activeFields = (settings.customMeasurementFields || DEFAULT_MEASUREMENT_FIELDS)
    .filter(f => f.enabled !== false);
  
  // نجمع الفروق
  const diffs = [];
  let matchedFields = 0;
  
  for (const field of activeFields) {
    const v1 = Number(meas1[field.id]);
    const v2 = Number(meas2[field.id]);
    
    // نتجاهل الحقول التي لا يحتوي عليها الاثنان
    if (!v1 && !v2) continue;
    if (!v1 || !v2) {
      // أحد الطرفين فقط لديه قيمة → نعتبره غير متطابق في هذا الحقل
      return false;
    }
    
    matchedFields++;
    const diff = Math.abs(v1 - v2);
    diffs.push(diff);
    
    // إذا تجاوز أي فرق التسامح → غير متشابهين
    if (diff > tolerance) return false;
  }
  
  // يجب أن يكون هناك حقلان على الأقل متطابقان (لتفادي التشابه المصادف)
  return matchedFields >= 2;
}

/* ============================================================
   تجميع الطلبات
   ============================================================ */
export function groupOrders(options = {}) {
  const settings = getGroupingSettings();
  
  // إذا كان التجميع معطّلاً، نُرجع كل طلب في مجموعة منفصلة
  if (!settings.enabled) {
    return {
      enabled: false,
      groups: [],
      ungrouped: db.getOrders().map(o => ({ order: o, customer: db.getCustomer(o.customerId) })),
      totalGroups: 0
    };
  }

  const customers = db.getCustomers();
  const orders = db.getOrders();
  
  // نفلتر الطلبات النشطة فقط (ليست مسلّمة)
  const activeOrders = orders.filter(o => o.status !== 'delivered');
  
  // نستبعد الطلبات بدون قياسات
  const ordersWithMeas = [];
  const ordersWithoutMeas = [];
  
  activeOrders.forEach(order => {
    const measurements = getOrderMeasurements(order, customers);
    const garmentType = getMainGarmentType(order);
    const customer = customers.find(c => c.id === order.customerId);
    
    if (measurements && garmentType) {
      ordersWithMeas.push({ order, customer, measurements, garmentType });
    } else {
      ordersWithoutMeas.push({ order, customer });
    }
  });

  // الترتيب حسب النوع أولاً
  ordersWithMeas.sort((a, b) => {
    const cmp = a.garmentType.localeCompare(b.garmentType);
    if (cmp !== 0) return cmp;
    return (b.order.createdAt || 0) - (a.order.createdAt || 0);
  });

  // التجميع
  const groups = [];
  const used = new Set();
  
  ordersWithMeas.forEach((item, idx) => {
    if (used.has(idx)) return;
    
    const group = {
      id: 'group_' + idx,
      garmentType: item.garmentType,
      tolerance: settings.tolerance,
      items: [item]
    };
    used.add(idx);
    
    // ابحث عن العناصر المشابهة
    for (let j = idx + 1; j < ordersWithMeas.length; j++) {
      if (used.has(j)) continue;
      
      const other = ordersWithMeas[j];
      
      // يجب أن يكون نفس النوع
      if (settings.groupByGarmentType && other.garmentType !== item.garmentType) continue;
      
      // يجب أن تكون القياسات متقاربة
      if (areMeasurementsSimilar(item.measurements, other.measurements, settings.tolerance)) {
        group.items.push(other);
        used.add(j);
      }
    }
    
    // أضف المجموعة فقط إذا كان بها عنصران أو أكثر
    if (group.items.length >= 2) {
      groups.push(group);
    }
  });

  // الترتيب: الأكبر عدداً أولاً
  groups.sort((a, b) => b.items.length - a.items.length);

  return {
    enabled: true,
    groups: groups,
    ungrouped: ordersWithoutMeas,
    totalGroups: groups.length,
    totalGroupedOrders: groups.reduce((s, g) => s + g.items.length, 0)
  };
}

/* ============================================================
   حساب عدد الطلبات القابلة للتجميع
   ============================================================ */
export function getGroupableCount() {
  const result = groupOrders();
  return result.totalGroupedOrders || 0;
}

/* ============================================================
   الحصول على ملخص القياسات لمجموعة (للعرض)
   ============================================================ */
export function getGroupMeasurementsSummary(group) {
  if (!group.items || group.items.length === 0) return {};
  
  const settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  const activeFields = (settings.customMeasurementFields || DEFAULT_MEASUREMENT_FIELDS)
    .filter(f => f.enabled !== false);
  
  const summary = {};
  
  activeFields.forEach(field => {
    const values = group.items
      .map(item => Number(item.measurements[field.id]))
      .filter(v => v && v > 0);
    
    if (values.length === 0) return;
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10;
    
    summary[field.id] = {
      label: field.label,
      min,
      max,
      avg,
      range: max - min
    };
  });
  
  return summary;
}

/* ============================================================
   حساب إجمالي الحاجة للقماش (اختياري لميزة مستقبلية)
   ============================================================ */
export function getGroupStats(group) {
  const totalQuantity = group.items.reduce((s, item) => {
    const qty = item.order.quantity || (item.order.items ? item.order.items.reduce((ss, i) => ss + (i.quantity || 0), 0) : 1);
    return s + qty;
  }, 0);
  
  const totalValue = group.items.reduce((s, item) => s + (item.order.totalPrice || 0), 0);
  
  return {
    ordersCount: group.items.length,
    totalQuantity,
    totalValue
  };
}
