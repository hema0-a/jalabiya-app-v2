/* ============================================================
   cloud-auth.js - نظام المصادقة السحابية (V2)
   (تسجيل الدخول / الخروج / إدارة الجلسة + Firebase Auth)
   ============================================================ */

import { FIREBASE_CONFIG } from './firebase-config.js';
import { events, EVENTS } from './events.js';
import * as storage from './storage.js';

/* ============================================================
   الحالة الداخلية
   ============================================================ */
let firebaseApp = null;
let authInstance = null;
let currentUser = null;
let authReady = false;
let initPromise = null;

const SESSION_KEY = 'jalabiya_v2_cloud_session';

/* ============================================================
   تهيئة Firebase (تُستدعى مرة واحدة فقط)
   ============================================================ */
export async function initFirebase() {
  // إذا كانت التهيئة جارية، أرجع نفس الـ Promise
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      console.log('🔥 [CloudAuth] تهيئة Firebase...');

      // استيراد Firebase SDK ديناميكياً
      const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
      const { getAuth, onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');

      // تهيئة التطبيق
      firebaseApp = initializeApp(FIREBASE_CONFIG);
      authInstance = getAuth(firebaseApp);

      // الاستماع لحالة المصادقة
onAuthStateChanged(authInstance, (user) => {
  currentUser = user;
  authReady = true; // ✅ التصحيح: الانتظار حتى وصول حالة المستخدم الفعلية
  if (user) {
    console.log('✅ [CloudAuth] مستخدم مسجّل:', user.email);
    saveSession({ uid: user.uid, email: user.email });
    events.emit('cloud:auth:signin', { uid: user.uid, email: user.email });
  } else {
    console.log('⚠️ [CloudAuth] لا يوجد مستخدم مسجّل');
    clearSession();
    events.emit('cloud:auth:signout');
  }
});

// ✅ لا نضع authReady هنا، بل ننتظر onAuthStateChanged
console.log('⏳ [CloudAuth] في انتظار حالة المصادقة...');
return { app: firebaseApp, auth: authInstance };
    } catch (e) {
      console.error('❌ [CloudAuth] فشل تهيئة Firebase:', e);
      initPromise = null;
      throw e;
    }
  })();

  return initPromise;
}

/* ============================================================
   الانتظار حتى تصبح المصادقة جاهزة
   ============================================================ */
export function waitForAuthReady() {
  return new Promise((resolve) => {
    if (authReady) { resolve(true); return; }
    const check = setInterval(() => {
      if (authReady) {
        clearInterval(check);
        resolve(true);
      }
    }, 100);
    setTimeout(() => { clearInterval(check); resolve(authReady); }, 10000);
  });
}

/* ============================================================
   إنشاء حساب جديد
   ============================================================ */
export async function signUp(email, password) {
  if (!authInstance) await initFirebase();

  try {
    const { createUserWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
    const result = await createUserWithEmailAndPassword(authInstance, email, password);
    console.log('✅ [CloudAuth] تم إنشاء الحساب:', result.user.email);
    return { success: true, user: result.user };
  } catch (e) {
    console.error('❌ [CloudAuth] فشل إنشاء الحساب:', e);
    return { success: false, error: translateError(e.code) };
  }
}

/* ============================================================
   تسجيل الدخول
   ============================================================ */
export async function signIn(email, password) {
  if (!authInstance) await initFirebase();

  try {
    const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
    const result = await signInWithEmailAndPassword(authInstance, email, password);
    console.log('✅ [CloudAuth] تم تسجيل الدخول:', result.user.email);
    return { success: true, user: result.user };
  } catch (e) {
    console.error('❌ [CloudAuth] فشل تسجيل الدخول:', e);
    return { success: false, error: translateError(e.code) };
  }
}

/* ============================================================
   تسجيل الخروج
   ============================================================ */
export async function signOut() {
  if (!authInstance) return { success: false, error: 'لم يتم تهيئة Firebase' };

  try {
    const { signOut: fbSignOut } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
    await fbSignOut(authInstance);
    clearSession();
    console.log('✅ [CloudAuth] تم تسجيل الخروج');
    return { success: true };
  } catch (e) {
    console.error('❌ [CloudAuth] فشل تسجيل الخروج:', e);
    return { success: false, error: translateError(e.code) };
  }
}

/* ============================================================
   إرسال رابط إعادة تعيين كلمة المرور
   ============================================================ */
export async function resetPassword(email) {
  if (!authInstance) await initFirebase();

  try {
    const { sendPasswordResetEmail } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
    await sendPasswordResetEmail(authInstance, email);
    return { success: true };
  } catch (e) {
    console.error('❌ [CloudAuth] فشل إرسال رابط إعادة التعيين:', e);
    return { success: false, error: translateError(e.code) };
  }
}

/* ============================================================
   قراءة بيانات المستخدم الحالي
   ============================================================ */
export function getCurrentUser() {
  return currentUser;
}

export function isSignedIn() {
  return !!currentUser;
}

export function isAuthReady() {
  return authReady;
}

export function getUserId() {
  return currentUser ? currentUser.uid : null;
}

export function getUserEmail() {
  return currentUser ? currentUser.email : null;
}

/* ============================================================
   الجلسة المحلية (للتحقق السريع)
   ============================================================ */
function saveSession(data) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      ...data,
      savedAt: Date.now()
    }));
  } catch (e) {
    console.warn('⚠️ [CloudAuth] فشل حفظ الجلسة:', e);
  }
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (e) { /* ignore */ }
}

export function getSavedSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

/* ============================================================
   ترجمة رسائل أخطاء Firebase للعربية
   ============================================================ */
function translateError(code) {
  const errors = {
    'auth/email-already-in-use': 'هذا البريد الإلكتروني مُسجَّل مسبقاً',
    'auth/invalid-email': 'البريد الإلكتروني غير صالح',
    'auth/weak-password': 'كلمة المرور ضعيفة (6 أحرف على الأقل)',
    'auth/user-not-found': 'لا يوجد حساب بهذا البريد',
    'auth/wrong-password': 'كلمة المرور خاطئة',
    'auth/invalid-credential': 'بيانات الدخول غير صحيحة',
    'auth/too-many-requests': 'محاولات كثيرة. حاول لاحقاً',
    'auth/network-request-failed': 'فشل الاتصال بالشبكة',
    'auth/operation-not-allowed': 'طريقة الدخول هذه غير مفعّلة',
    'auth/user-disabled': 'هذا الحساب معطّل',
    'auth/requires-recent-login': 'الرجاء تسجيل الدخول مرة أخرى',
  };
  return errors[code] || `خطأ: ${code || 'غير معروف'}`;
}

/* ============================================================
   كشف حالة الاتصال بالإنترنت
   ============================================================ */
export function isOnline() {
  return navigator.onLine !== false;
}

export function setupOnlineListener(onChange) {
  window.addEventListener('online', () => {
    console.log('🌐 [CloudAuth] عاد الاتصال بالإنترنت');
    if (onChange) onChange(true);
    events.emit('cloud:online');
  });
  window.addEventListener('offline', () => {
    console.log('📴 [CloudAuth] فقد الاتصال بالإنترنت');
    if (onChange) onChange(false);
    events.emit('cloud:offline');
  });
}
