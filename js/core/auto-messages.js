/* ============================================================
   auto-messages.js - محرك الإرسال التلقائي للعملاء (V2)
   (قوالب رسائل + إرسال عند تغيير الحالة)
   ============================================================ */

import * as db from './db.js';
import { toast } from '../ui/toast.js';
import { today, money, formatDate } from './utils.js';
import { DEFAULT_SETTINGS } from './config.js';
import * as storage from './storage.js';

/* ============================================================
   القوالب الافتراضية للرسائل
   ============================================================ */
export const DEFAULT_MESSAGE_TEMPLATES = {
  orderCreated: {
    label: 'طلب جديد',
    icon: '📋',
    enabled: true,
    text: `السلام عليكم {customer_name} 🌹

شكراً لتعاملك معنا.
تم تسجيل طلبك بنجاح:

🧵 الطلب: {garment_type}
💰 الإجمالي: {total_price} جنيه
📅 التسليم: {due_date}

سنخبرك عند بدء التنفيذ إن شاء الله.

من {workshop_name} 🌟`
  },
  orderInProgress: {
    label: 'بدء التنفيذ',
    icon: '🧵',
    enabled: true,
    text: `السلام عليكم {customer_name} 🌹

خبر سعيد! 🎉
بدأنا العمل على طلبك:

🧵 {garment_type}

سنخبرك عند الانتهاء.

من {workshop_name} 🌟`
  },
  orderReady: {
    label: 'جاهز للتسليم',
    icon: '✅',
    enabled: true,
    text: `السلام عليكم {customer_name} 🌹

طلبك جاهز! ✅

🧵 الطلب: {garment_type}
💰 المتبقي: {remaining} جنيه

في انتظار زيارتك لاستلامه.

من {workshop_name} 🌟`
  },
  orderDelivered: {
    label: 'شكر بعد التسليم',
    icon: '🙏',
    enabled: true,
    text: `السلام عليكم {customer_name} 🌹

شكراً جزيلاً على ثقتك بنا.
نتمنى أن تكون راضياً عن جودة عملنا.

لو أعجبك، لا تنسى أن ترشحنا لأصدقائك 🌟

من {workshop_name} 🌟`
  },
  paymentReminder: {
    label: 'تذكير بالدفع',
    icon: '💰',
    enabled: true,
    text: `السلام عليكم {customer_name} 🌹

تذكير ودّي بوجود مبلغ متبقي:

🧵 الطلب: {garment_type}
💰 المتبقي: {remaining} جنيه

نشكرك على تعاملك معنا 🌟`
  },
  occasionGreeting: {
    label: 'تهنئة مناسبة',
    icon: '🎉',
    enabled: true,
    text: `السلام عليكم {customer_name} 🌹

بمناسبة {occasion_name}، نتمنى لك ولعائلتك كل الخير والبركة.

من {workshop_name} 🌟`
  }
};

/* ============================================================
   الحصول على قوالب الرسائل المحفوظة
   ============================================================ */
export function getMessageTemplates() {
  const settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  const saved = settings.messageTemplates || {};

  // دمج القوالب المحفوظة مع الافتراضية
  const merged = {};
  Object.keys(DEFAULT_MESSAGE_TEMPLATES).forEach(key => {
    merged[key] = {
      ...DEFAULT_MESSAGE_TEMPLATES[key],
      ...(saved[key] || {})
    };
  });

  return merged;
}

/* ============================================================
   حفظ قالب رسالة
   ============================================================ */
export function saveMessageTemplate(templateKey, updates) {
  let settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  if (!settings.messageTemplates) settings.messageTemplates = {};
  if (!settings.messageTemplates[templateKey]) {
    settings.messageTemplates[templateKey] = {};
  }
  Object.assign(settings.messageTemplates[templateKey], updates);
  storage.saveSettings(settings);
  return true;
}

/* ============================================================
   إعادة تعيين قالب رسالة للافتراضي
   ============================================================ */
export function resetMessageTemplate(templateKey) {
  let settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  if (settings.messageTemplates && settings.messageTemplates[templateKey]) {
    delete settings.messageTemplates[templateKey];
    storage.saveSettings(settings);
  }
  return true;
}

/* ============================================================
   بناء رسالة من قالب مع استبدال المتغيرات
   ============================================================ */
export function buildMessage(templateKey, order) {
  const templates = getMessageTemplates();
  const template = templates[templateKey];
  if (!template || !template.enabled) return null;

  const customer = order ? db.getCustomer(order.customerId) : null;
  const settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  const workshopName = settings.workshopName || 'ورشة تفصيل الجلابيب';

  const customerName = customer ? customer.name : 'عميلنا العزيز';
  const remaining = order ? Math.max(0, (order.totalPrice || 0) - (order.deposit || 0)) : 0;

  let text = template.text;

  // المتغيرات المشتركة
  const variables = {
    '{customer_name}': customerName,
    '{workshop_name}': workshopName,
    '{garment_type}': order ? (order.garmentType || 'طلب') : 'طلب',
    '{total_price}': order ? money(order.totalPrice) : '0',
    '{remaining}': money(remaining),
    '{deposit}': order ? money(order.deposit || 0) : '0',
    '{due_date}': order && order.dueDate ? formatDate(order.dueDate) : 'قريباً',
    '{received_date}': order && order.receivedDate ? formatDate(order.receivedDate) : '-',
    '{today}': formatDate(today())
  };

  // استبدال المتغيرات
  Object.entries(variables).forEach(([placeholder, value]) => {
    text = text.split(placeholder).join(value);
  });

  return text;
}

/* ============================================================
   إرسال رسالة واتساب مباشرة
   ============================================================ */
export function sendWhatsAppMessage(orderId, messageType) {
  const order = db.getOrder(orderId);
  if (!order) {
    toast.error('الطلب غير موجود');
    return false;
  }

  const customer = db.getCustomer(order.customerId);
  if (!customer || !customer.phone) {
    toast.error('لا يوجد رقم هاتف للعميل');
    return false;
  }

  const message = buildMessage(messageType, order);
  if (!message) {
    toast.error('القالب معطّل');
    return false;
  }

  // فتح واتساب
  let cleanPhone = String(customer.phone).replace(/\D/g, '');
  if (cleanPhone.startsWith('0')) cleanPhone = '2' + cleanPhone;

  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');

  // تسجيل الإرسال
  logMessageSent(orderId, messageType);

  return true;
}

/* ============================================================
   تسجيل الإرسال في سجل النشاط
   ============================================================ */
function logMessageSent(orderId, messageType) {
  try {
    const order = db.getOrder(orderId);
    if (!order) return;

    const key = `jalabiya_v2_message_log_${orderId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.push({
      type: messageType,
      sentAt: Date.now()
    });
    // الاحتفاظ بآخر 20 رسالة
    if (existing.length > 20) existing.shift();
    localStorage.setItem(key, JSON.stringify(existing));
  } catch (e) {
    console.warn('فشل تسجيل الرسالة:', e);
  }
}

/* ============================================================
   الحصول على سجل الرسائل لطلب
   ============================================================ */
export function getMessageLog(orderId) {
  try {
    const key = `jalabiya_v2_message_log_${orderId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch (e) {
    return [];
  }
}

/* ============================================================
   التحقق من إمكانية الإرسال التلقائي
   ============================================================ */
export function canAutoSend() {
  const settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  return settings.autoMessagesEnabled !== false;
}

/* ============================================================
   تفعيل/تعطيل الإرسال التلقائي
   ============================================================ */
export function setAutoSendEnabled(enabled) {
  let settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  settings.autoMessagesEnabled = enabled;
  storage.saveSettings(settings);
  return enabled;
}

/* ============================================================
   الحصول على قائمة المتغيرات المتاحة
   ============================================================ */
export function getAvailableVariables() {
  return [
    { var: '{customer_name}', desc: 'اسم العميل' },
    { var: '{workshop_name}', desc: 'اسم الورشة' },
    { var: '{garment_type}', desc: 'نوع الجلابية' },
    { var: '{total_price}', desc: 'السعر الإجمالي' },
    { var: '{deposit}', desc: 'المدفوع' },
    { var: '{remaining}', desc: 'المتبقي' },
    { var: '{due_date}', desc: 'تاريخ التسليم' },
    { var: '{received_date}', desc: 'تاريخ الاستلام' },
    { var: '{today}', desc: 'تاريخ اليوم' }
  ];
}

/* ============================================================
   معاينة القالب
   ============================================================ */
export function previewTemplate(templateKey) {
  const templates = getMessageTemplates();
  const template = templates[templateKey];
  if (!template) return '';

  // نص نموذج للعرض
  const sample = {
    '{customer_name}': 'أحمد محمد',
    '{workshop_name}': 'ورشة تفصيل الجلابيب',
    '{garment_type}': 'جلابية سادة',
    '{total_price}': '500',
    '{deposit}': '200',
    '{remaining}': '300',
    '{due_date}': formatDate(today()),
    '{received_date}': formatDate(today()),
    '{today}': formatDate(today())
  };

  let text = template.text;
  Object.entries(sample).forEach(([placeholder, value]) => {
    text = text.split(placeholder).join(value);
  });

  return text;
}
