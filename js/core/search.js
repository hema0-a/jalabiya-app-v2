/* ============================================================
   search.js - محرك البحث الشامل (V2)
   (يبحث في العملاء + الطلبات + الدفعات + المخزون + العمال)
   ============================================================ */

import * as db from './db.js';

export function searchAll(query) {
  const q = (query || '').toLowerCase().trim();
  const empty = {
    customers: [], orders: [], payments: [], expenses: [],
    inventory: [], workers: [], garmentTypes: [], totalCount: 0
  };
  if (q.length < 1) return empty;

  const results = { ...empty };
  const customers = db.getCustomers();

  // 1. العملاء
  customers.forEach(c => {
    if ((c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q)) {
      results.customers.push({
        id: c.id, title: c.name,
        subtitle: c.phone || 'بدون هاتف',
        icon: '👤', isVip: c.isVip, type: 'customer'
      });
    }
  });

  // 2. الطلبات
  db.getOrders().forEach(o => {
    const customer = customers.find(c => c.id === o.customerId);
    const custName = customer ? customer.name : '';
    const itemsText = o.items && Array.isArray(o.items)
      ? o.items.map(i => i.name).join(' + ')
      : (o.garmentType || '');
    if (custName.toLowerCase().includes(q) || itemsText.toLowerCase().includes(q)) {
      results.orders.push({
        id: o.id, title: custName || 'عميل محذوف',
        subtitle: `${itemsText} — ${o.totalPrice || 0} ج`,
        icon: '📋', status: getOrderStatusInfo(o.status), type: 'order'
      });
    }
  });

  // 3. الدفعات
  db.getPayments().forEach(p => {
    const order = db.getOrder(p.orderId);
    const customer = order ? customers.find(c => c.id === order.customerId) : null;
    const custName = customer ? customer.name : '';
    if (custName.toLowerCase().includes(q) || String(p.amount || '').includes(q) || (p.note || '').toLowerCase().includes(q)) {
      results.payments.push({
        id: p.id, title: `${custName || 'دفعة'} — ${p.amount || 0} ج`,
        subtitle: p.note || 'دفعة', icon: '💰', type: 'payment'
      });
    }
  });

  // 4. المخزون
  db.getInventory().forEach(i => {
    if ((i.name || '').toLowerCase().includes(q)) {
      results.inventory.push({
        id: i.id, title: i.name,
        subtitle: `الكمية: ${i.quantity || 0}`,
        icon: '📦', type: 'inventory'
      });
    }
  });

  // 5. العمال
  db.getWorkers().forEach(w => {
    if ((w.name || '').toLowerCase().includes(q) || (w.phone || '').includes(q)) {
      results.workers.push({
        id: w.id, title: w.name,
        subtitle: w.phone || 'عامل',
        icon: '👷', type: 'worker'
      });
    }
  });

  // 6. أنواع الجلابيات
  db.getGarmentTypes().forEach(g => {
    if ((g.name || '').toLowerCase().includes(q)) {
      results.garmentTypes.push({
        id: g.id, title: g.name,
        subtitle: `${g.price || 0} ج`,
        icon: '🧵', type: 'garmentType'
      });
    }
  });

  // 7. المصروفات
  db.getExpenses().forEach(e => {
    if ((e.note || '').toLowerCase().includes(q)) {
      results.expenses.push({
        id: e.id, title: `${e.amount || 0} ج`,
        subtitle: e.note || 'مصروف', icon: '💸', type: 'expense'
      });
    }
  });

  results.totalCount =
    results.customers.length + results.orders.length + results.payments.length +
    results.expenses.length + results.inventory.length + results.workers.length +
    results.garmentTypes.length;

  return results;
}

function getOrderStatusInfo(status) {
  const map = {
    pending: { label: 'انتظار', color: '#FFA726' },
    in_progress: { label: 'تنفيذ', color: '#29B6F6' },
    ready: { label: 'جاهز', color: '#AB47BC' },
    delivered: { label: 'مُسلَّم', color: '#66BB6A' }
  };
  return map[status || 'pending'] || map.pending;
}
