/* ============================================================
   occasions.js - محرك التنبيهات للمواسم (V2)
   (تنبيهات ذكية + إحصائيات + اقتراحات)
   ============================================================ */

import * as db from './db.js';
import { today } from './utils.js';

/* ============================================================
   الحصول على التنبيهات الحرجة
   ============================================================ */
export function getCriticalOccasionAlerts() {
  const alerts = db.getOccasionsNeedingAlert();

  return alerts.map(occ => {
    let priority = 'low';
    let message = '';
    let color = '#1565C0';
    let bg = '#E3F2FD';

    if (occ.daysLeft <= 3) {
      priority = 'critical';
      message = `${occ.name} بعد ${occ.daysLeft} ${occ.daysLeft === 1 ? 'يوم' : 'أيام'}!`;
      color = '#C62828';
      bg = '#FFEBEE';
    } else if (occ.daysLeft <= 7) {
      priority = 'high';
      message = `${occ.name} بعد ${occ.daysLeft} أيام`;
      color = '#E65100';
      bg = '#FFF3E0';
    } else if (occ.daysLeft <= 14) {
      priority = 'medium';
      message = `${occ.name} بعد ${occ.daysLeft} يوم`;
      color = '#F57F17';
      bg = '#FFF8E1';
    } else {
      priority = 'low';
      message = `${occ.name} بعد ${occ.daysLeft} يوم`;
      color = '#1565C0';
      bg = '#E3F2FD';
    }

    return {
      ...occ,
      priority,
      message,
      color,
      bg
    };
  });
}

/* ============================================================
   توليد رسالة استعداد للعميل
   ============================================================ */
export function generateOccasionCustomerMessage(occasion, customerName = '') {
  const greetings = {
    'رمضان': `رمضان كريم ${customerName} 🌙\n\nنتمنى لكم شهراً مباركاً ملؤه الخير والبركة.\n\nمن ورشة تفصيل الجلابيب — نتشرف بخدمتكم.`,
    'عيد الفطر': `عيد فطر مبارك ${customerName} 🎉\n\nكل عام وأنتم بخير.\n\nنتمنى لكم عيداً سعيداً مليئاً بالفرح.\n\nمن ورشة تفصيل الجلابيب.`,
    'عيد الأضحى': `عيد أضحى مبارك ${customerName} 🐑\n\nكل عام وأنتم بخير.\n\nنتمنى لكم عيداً سعيداً مع العائلة.\n\nمن ورشة تفصيل الجلابيب.`,
    'المولد النبوي': `ذكرى المولد النبوي الشريف ${customerName} 🕌\n\nكل عام وأنتم بخير.\n\nمن ورشة تفصيل الجلابيب.`,
    'رأس السنة': `سنة جديدة سعيدة ${customerName} 🎊\n\nكل عام وأنتم بخير.\n\nمن ورشة تفصيل الجلابيب.`,
    'عيد الأم': `كل عام وأنتِ بخير يا أغلى الأمهات 💐\n\nمن ورشة تفصيل الجلابيب.`,
    'بداية العام الدراسي': `بالتوفيق في العام الدراسي الجديد ${customerName} 🎓\n\nنتمنى لأبنائكم عاماً مليئاً بالنجاح.\n\nمن ورشة تفصيل الجلابيب.`
  };

  // البحث عن رسالة مطابقة
  for (const [key, msg] of Object.entries(greetings)) {
    if (occasion.name.includes(key)) {
      return msg;
    }
  }

  // رسالة عامة
  return `تحية طيبة ${customerName} 🌹\n\nبمناسبة اقتراب ${occasion.name}، نتشرف بخدمتكم.\n\nمن ورشة تفصيل الجلابيب.`;
}

/* ============================================================
   توليد عرض ترويجي للمناسبة
   ============================================================ */
export function generateOccasionOffer(occasion) {
  const offers = {
    'رمضان': {
      title: 'عرض رمضان',
      description: 'خصم خاص على الجلابيات الرمضانية',
      discount: '10%',
      validUntil: occasion.nextDate
    },
    'عيد الفطر': {
      title: 'عرض عيد الفطر',
      description: 'تجهيز جلابيات العيد بأفضل الأسعار',
      discount: '15%',
      validUntil: occasion.nextDate
    },
    'عيد الأضحى': {
      title: 'عرض عيد الأضحى',
      description: 'استعداد للعيد مع خصم مميز',
      discount: '15%',
      validUntil: occasion.nextDate
    },
    'المولد النبوي': {
      title: 'عرض المولد',
      description: 'احتفال بالمولد بأسعار خاصة',
      discount: '10%',
      validUntil: occasion.nextDate
    },
    'رأس السنة': {
      title: 'عرض رأس السنة',
      description: 'استقبال العام الجديد بأناقة',
      discount: '12%',
      validUntil: occasion.nextDate
    },
    'عيد الأم': {
      title: 'عرض عيد الأم',
      description: 'هدية مميزة لأغلى الأمهات',
      discount: '10%',
      validUntil: occasion.nextDate
    }
  };

  for (const [key, offer] of Object.entries(offers)) {
    if (occasion.name.includes(key)) {
      return offer;
    }
  }

  return {
    title: `عرض ${occasion.name}`,
    description: 'خصم خاص بمناسبة ' + occasion.name,
    discount: '10%',
    validUntil: occasion.nextDate
  };
}

/* ============================================================
   توليد خطة استعداد (نصائح للورشة)
   ============================================================ */
export function generatePreparationPlan(occasion) {
  const basePlan = [
    'مراجعة الطاقة الإنتاجية اليومية',
    'التأكد من توفر المواد الخام',
    'تجهيز العمال للفترة المزدحمة',
    'الاتصال بالعملاء القدامى'
  ];

  const specificPlans = {
    'رمضان': [
      'التخطيط لزيادة إنتاج الجلابيات الرمضانية',
      'توفير الأقمشة الفاخرة للمناسبة',
      'تجهيز عروض خاصة للعملاء الدائمين'
    ],
    'عيد الفطر': [
      'تجهيز جلابيات العيد للرجال والنساء',
      'تأكيد توفر الألوان المطلوبة',
      'مراجعة الطلبات المتأخرة'
    ],
    'عيد الأضحى': [
      'التركيز على الجلابيات اليومية المريحة',
      'توفير الأقمشة القطنية بكميات كافية',
      'تجهيز عروض للعائلات'
    ],
    'المولد النبوي': [
      'تجهيز جلابيات مناسبة للمناسبة',
      'تنويع الألوان والتطريزات',
      'عروض خاصة للمساجد'
    ],
    'بداية العام الدراسي': [
      'تجهيز ملابس مدرسية إن كانت ضمن خدماتك',
      'توفير الجلابيات المريحة للأطفال',
      'عروض للعائلات'
    ]
  };

  for (const [key, plans] of Object.entries(specificPlans)) {
    if (occasion.name.includes(key)) {
      return [...specificPlans[key], ...basePlan];
    }
  }

  return basePlan;
}

/* ============================================================
   حساب الوقت المتبقي (نص مقروء)
   ============================================================ */
export function getTimeUntilOccasion(occasion) {
  const days = occasion.daysLeft;

  if (days === 0) return 'اليوم!';
  if (days === 1) return 'غداً';
  if (days === 2) return 'بعد يومين';
  if (days <= 7) return `بعد ${days} أيام`;
  if (days <= 14) return `بعد أسبوع${days > 7 ? 'ين' : ''}`;
  if (days <= 30) return `بعد ${Math.round(days / 7)} أسابيع`;
  return `بعد ${Math.round(days / 30)} شهر`;
}

/* ============================================================
   إحصائيات المواسم
   ============================================================ */
export function getOccasionsStats() {
  const allOccasions = db.getOccasions();
  const enabled = allOccasions.filter(o => o.enabled !== false);
  const upcoming = db.getUpcomingOccasions(365);
  const needingAlert = db.getOccasionsNeedingAlert();

  return {
    total: allOccasions.length,
    enabled: enabled.length,
    disabled: allOccasions.length - enabled.length,
    upcomingCount: upcoming.length,
    alertCount: needingAlert.length,
    next: upcoming[0] || null
  };
}

/* ============================================================
   اقتراح أسعار للمناسبة
   ============================================================ */
export function suggestOccasionPricing(occasion) {
  const orders = db.getOrders();
  const todayDate = today();

  // حساب متوسط الأسعار في فترة المناسبة سابقاً (تقريبي)
  const monthStr = `${new Date().getFullYear()}-${String(occasion.month).padStart(2, '0')}`;
  const monthOrders = orders.filter(o => (o.date || '').startsWith(monthStr));

  const avgPrice = monthOrders.length > 0
    ? monthOrders.reduce((s, o) => s + (o.totalPrice || 0), 0) / monthOrders.length
    : 0;

  const suggestions = [];

  if (occasion.daysLeft <= 7) {
    suggestions.push({
      icon: '⚡',
      text: 'أضف رسوم استعجال 15-20% للطلبات القريبة'
    });
  }

  if (occasion.daysLeft <= 14) {
    suggestions.push({
      icon: '🎁',
      text: 'قدّم خصم 5-10% للعملاء القدامى'
    });
  }

  if (avgPrice > 0) {
    suggestions.push({
      icon: '💰',
      text: `متوسط سعر طلباتك في هذا الشهر: ${Math.round(avgPrice)} ج`
    });
  }

  suggestions.push({
    icon: '📈',
    text: 'توقع زيادة الطلبات بنسبة 30-50% قبل المناسبة'
  });

  return suggestions;
}

/* ============================================================
   الحصول على أيقونة المناسبة
   ============================================================ */
export function getOccasionIcon(occasion) {
  if (occasion.icon) return occasion.icon;

  const iconMap = {
    'رمضان': '🌙',
    'عيد الفطر': '🎉',
    'عيد الأضحى': '🐑',
    'المولد': '🕌',
    'رأس السنة': '🎊',
    'عيد الأم': '💐',
    'المدارس': '🎓',
    'الحج': '🕋'
  };

  for (const [key, icon] of Object.entries(iconMap)) {
    if (occasion.name.includes(key)) return icon;
  }

  return '🎉';
}
