/* ============================================================
   firebase-config.js - إعدادات Firebase (V2)
   ============================================================ */

// ============================================================
// إعدادات Firebase
// (من Firebase Console → Project Settings → Web App)
// ============================================================
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCQ4Zy8je87efQKH5uA0ql3rZbtf6CkeSw",
  authDomain: "jalabiya-workshop-v2.firebaseapp.com",
  projectId: "jalabiya-workshop-v2",
  storageBucket: "jalabiya-workshop-v2.firebasestorage.app",
  messagingSenderId: "262053250849",
  appId: "1:262053250849:web:a6b7fc592efd47ca5a6060"
};

// ============================================================
// مسارات Firebase (للتنظيم)
// ============================================================
export const FIREBASE_PATHS = {
  // مسار بيانات المستخدم: /users/{userId}/data/main
  USER_DATA: (userId) => `users/${userId}/data/main`,
  
  // مسار معلومات الجهاز: /users/{userId}/devices/{deviceId}
  USER_DEVICE: (userId, deviceId) => `users/${userId}/devices/${deviceId}`,
};

// ============================================================
// ثوابت المزامنة
// ============================================================
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
};

// ============================================================
// معلومات الإصدار
// ============================================================
export const SYNC_VERSION = '1.0.0';
