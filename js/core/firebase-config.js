/* ============================================================
   firebase-config.js - إعدادات Firebase (V2)
   (مُحدَّث: تحقق من التهيئة + إعدادات محسّنة)
   ============================================================ */

/* ============================================================
   إعدادات Firebase
   ⚠️ ملاحظة أمنية:
   - هذه المفاتيح "عامة" بطبيعتها (Firebase API Key ليس سرّاً).
   - الأمان الحقيقي يأتي من:
     1. Firestore Security Rules (مقيّدة بـ request.auth.uid).
     2. Authentication (Email/Password).
   - لا تضع كلمات مرور أو Tokens هنا أبداً.
   ============================================================ */
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCQ4Zy8je87efQKH5uA0ql3rZbtf6CkeSw",
  authDomain: "jalabiya-workshop-v2.firebaseapp.com",
  projectId: "jalabiya-workshop-v2",
  storageBucket: "jalabiya-workshop-v2.firebasestorage.app",
  messagingSenderId: "262053250849",
  appId: "1:262053250849:web:a6b7fc592efd47ca5a6060"
};

/* ============================================================
   التحقق من صحة التهيئة عند الاستيراد
   ============================================================ */
const REQUIRED_KEYS = ['apiKey', 'authDomain', 'projectId', 'appId', 'storageBucket', 'messagingSenderId'];

(function validateConfig() {
  const missing = REQUIRED_KEYS.filter(key => !FIREBASE_CONFIG[key]);
  if (missing.length > 0) {
    console.error('❌ [Firebase] مفاتيح مفقودة:', missing);
  } else {
    console.log('✅ [Firebase] الإعدادات جاهزة:', FIREBASE_CONFIG.projectId);
  }
})();

/* ============================================================
   مسارات Firebase (للتنظيم)
   ============================================================ */
export const FIREBASE_PATHS = {
  // مسار بيانات المستخدم: /users/{userId}/data/main
  USER_DATA: (userId) => {
    if (!userId) throw new Error('[Firebase] userId مطلوب لمسار USER_DATA');
    return `users/${userId}/data/main`;
  },

  // مسار معلومات الجهاز: /users/{userId}/devices/{deviceId}
  USER_DEVICE: (userId, deviceId) => {
    if (!userId || !deviceId) throw new Error('[Firebase] userId و deviceId مطلوبان');
    return `users/${userId}/devices/${deviceId}`;
  }
};

/* ============================================================
   ثوابت المزامنة
   ============================================================ */
export const SYNC_CONFIG = {
  // المدة بين كل عملية رفع (debounce)
  DEBOUNCE_MS: 3000,

  // إعادة المحاولة عند الفشل
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 2000,

  // مدة الانتظار عند فقدان الاتصال
  OFFLINE_CHECK_INTERVAL_MS: 30000,

  // مفتاح التخزين المحلي لمعرف الجهاز
  DEVICE_ID_KEY: 'jalabiya_v2_device_id',

  // مفتاح التخزين المحلي لآخر وقت مزامنة
  LAST_SYNC_KEY: 'jalabiya_v2_last_sync',

  // مهلة الجلسة (24 ساعة)
  SESSION_TIMEOUT_MS: 24 * 60 * 60 * 1000,

  // فترة الاحتفاظ بالنسخ الاحتياطية (7 أيام)
  BACKUP_RETENTION_DAYS: 7
};

/* ============================================================
   معلومات الإصدار
   ============================================================ */
export const SYNC_VERSION = '1.1.0';

/* ============================================================
   معلومات الاتصال
   ============================================================ */
export const FIREBASE_SDK_VERSION = '10.12.0';

export const FIREBASE_CDN_URLS = {
  APP: `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`,
  AUTH: `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`,
  FIRESTORE: `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`
};
