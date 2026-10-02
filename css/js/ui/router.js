/* ============================================================
   router.js - نظام التنقل بين الصفحات (V2)
   ============================================================ */

import { events, EVENTS } from '../core/events.js';

class Router {
  constructor() {
    this.routes = {};       // لتخزين الصفحات المسجلة
    this.currentRoute = null;
    this.container = null;  // العنصر الذي سيتم عرض الصفحات بداخله
  }

  /* تهيئة الراوتر وتحديد مكان عرض المحتوى */
  init(containerSelector) {
    this.container = document.querySelector(containerSelector);
    if (!this.container) {
      console.error('❌ لم يتم العثور على حاوية العرض:', containerSelector);
      return;
    }
    
    // الاستماع لتغيرات الرابط (Hash) في المتصفح
    window.addEventListener('hashchange', () => this.handleRoute());
    
    // تشغيل الراوتر لأول مرة عند تحميل التطبيق
    this.handleRoute(); 
  }

  /* تسجيل صفحة جديدة (مثال: router.register('/customers', renderCustomers)) */
  register(path, handler) {
    this.routes[path] = handler;
  }

  /* الانتقال إلى صفحة معينة برمجياً */
  navigate(path) {
    window.location.hash = path;
  }

  /* معالجة الرابط الحالي وعرض الصفحة المناسبة */
  handleRoute() {
    // الحصول على الرابط الحالي، وإذا كان فارغاً نذهب للصفحة الرئيسية
    const hash = window.location.hash.slice(1) || '/dashboard';
    const route = this.routes[hash] || this.routes['/404'];

    if (route) {
      this.currentRoute = hash;
      this.container.innerHTML = ''; // مسح محتوى الصفحة السابقة
      route(this.container);         // استدعاء دالة عرض الصفحة الجديدة
      
      // إطلاق حدث ليعلم باقي التطبيق بأن الصفحة تغيرت
      events.emit(EVENTS.PAGE_CHANGED, { route: hash });
    } else {
      console.warn('⚠️ لا توجد صفحة مسجلة للمسار:', hash);
    }
  }
}

// تصدير نسخة واحدة (Singleton) ليستخدمها التطبيق بالكامل
export const router = new Router();
