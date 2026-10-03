/* ============================================================
   sync.js - محرك المزامنة الذكي (V2)
   (دمج آمن بدون فقدان بيانات + حل التعارضات + auto-sync)
   ============================================================ */

import { FIREBASE_PATHS, SYNC_CONFIG } from './firebase-config.js';
import { getUserId, isSignedIn, isOnline, initFirebase, waitForAuthReady } from './cloud-auth.js';
import * as db from './db.js';
import { events } from './events.js';
import { deepClone, uid } from './utils.js';

/* ============================================================
   الحالة الداخلية
   ============================================================ */
let firestore = null;
let docRef = null;
let unsubscribe = null;
let syncDebounceTimer = null;
let isSyncing = false;
let isReady = false;
let lastSyncTime = 0;
let deviceId = null;

const SYNC_STATUS_EVENT = 'cloud:sync:status';
const SYNC_ERROR_EVENT = 'cloud:sync:error';
const SYNC_COMPLETE_EVENT = 'cloud:sync:complete';

/* ============================================================
   الحصول على معرف الجهاز الفريد
   ============================================================ */
function getDeviceId() {
  if (deviceId) return deviceId;
  let id = localStorage.getItem(SYNC_CONFIG.DEVICE_ID_KEY);
  if (!id) {
    id = 'device_' + uid();
    localStorage.setItem(SYNC_CONFIG.DEVICE_ID_KEY, id);
  }
  deviceId = id;
  return id;
}

/* ============================================================
   تحديث حالة المزامنة وإطلاق الأحداث
   ============================================================ */
function setStatus(status, message = '') {
  events.emit(SYNC_STATUS_EVENT, {
    status, // 'idle' | 'syncing' | 'uploading' | 'downloading' | 'merging' | 'error' | 'offline'
    message,
    timestamp: Date.now()
  });
  console.log(`🔄 [Sync] ${status}: ${message}`);
}

/* ============================================================
   تهيئة محرك المزامنة
   ============================================================ */
export async function initSync() {
  if (isReady) return true;

  try {
    console.log('🔥 [Sync] تهيئة محرك المزامنة...');

    // تهيئة Firebase أولاً
    await initFirebase();
    await waitForAuthReady();

    // انتظار تسجيل الدخول
    if (!isSignedIn()) {
      console.log('⚠️ [Sync] لا يوجد مستخدم مسجّل، سيتم تفعيل المزامنة عند تسجيل الدخول');
      // الاستماع لحدث تسجيل الدخول
      events.on('cloud:auth:signin', () => {
        console.log('🔓 [Sync] تم تسجيل الدخول، تفعيل المزامنة...');
        setupSyncForUser();
      });
      return false;
    }

    setupSyncForUser();
    return true;
  } catch (e) {
    console.error('❌ [Sync] فشل التهيئة:', e);
    setStatus('error', 'فشل تهيئة المزامنة');
    return false;
  }
}

/* ============================================================
   إعداد المزامنة لمستخدم محدد
   ============================================================ */
async function setupSyncForUser() {
  const userId = getUserId();
  if (!userId) return;

  try {
    // استيراد Firestore
    const { getFirestore, doc, onSnapshot } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    firestore = getFirestore();

    // مسار المستند الرئيسي
    docRef = doc(firestore, FIREBASE_PATHS.USER_DATA(userId));

    console.log('📁 [Sync] مسار البيانات:', docRef.path);

    // إلغاء أي اشتراك سابق
    if (unsubscribe) unsubscribe();

    // الاستماع للتغييرات من السحابة (realtime)
    unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (!snapshot.exists()) {
        console.log('📭 [Sync] لا توجد بيانات سحابية بعد، رفع البيانات المحلية...');
        syncNow(true);
        return;
      }

      const cloudData = snapshot.data();
      if (!cloudData || !cloudData.payload) return;

      // تجاهل التحديثات التي أرسلناها بأنفسنا خلال آخر 5 ثوانٍ
      const timeSinceLastSync = Date.now() - lastSyncTime;
      if (timeSinceLastSync < 5000) {
        console.log('⏭️ [Sync] تجاهل تحديثنا الخاص');
        return;
      }

      console.log('📥 [Sync] تم استلام تحديث من السحابة');
      handleCloudUpdate(cloudData.payload, cloudData.deviceId);
    }, (error) => {
      console.error('❌ [Sync] خطأ في الاستماع:', error);
      setStatus('error', 'فشل الاتصال بالسحابة');
    });

    isReady = true;

    // الاستماع للتغييرات المحلية
    listenToLocalChanges();

    // محاولة المزامنة الأولى
    syncNow();

  } catch (e) {
    console.error('❌ [Sync] فشل إعداد المزامنة:', e);
    setStatus('error', e.message);
  }
}

/* ============================================================
   الاستماع للتغييرات المحلية (debounced)
   ============================================================ */
function listenToLocalChanges() {
  const handleLocalChange = () => {
    if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
    syncDebounceTimer = setTimeout(() => {
      syncNow();
    }, SYNC_CONFIG.DEBOUNCE_MS);
  };

  // الاستماع لكل الأحداث المهمة
  const eventsToWatch = [
    'customer:added', 'customer:updated', 'customer:deleted',
    'order:added', 'order:updated', 'order:deleted',
    'payment:added', 'payment:deleted',
    'expense:added', 'expense:updated', 'expense:deleted',
    'inventory:added', 'inventory:updated', 'inventory:deleted',
    'worker:added', 'worker:updated', 'worker:deleted',
    'workerPayment:added', 'workerPayment:deleted',
    'commitment:added', 'commitment:updated', 'commitment:deleted',
    'commitmentPayment:added', 'commitmentPayment:deleted',
    'houseExpense:added', 'houseExpense:updated', 'houseExpense:deleted',
    'loan:added', 'loan:updated', 'loan:deleted',
    'loanPayment:added', 'loanPayment:deleted',
    'savingsGoal:added', 'savingsGoal:updated', 'savingsGoal:deleted',
    'portfolio:added', 'portfolio:updated', 'portfolio:deleted',
    'garmentType:added', 'garmentType:updated', 'garmentType:deleted',
    'trash:restored', 'trash:permanentlyDeleted', 'trash:emptied',
  ];

  eventsToWatch.forEach(eventName => {
    events.on(eventName, handleLocalChange);
  });
}

/* ============================================================
   المزامنة الآن (يدوية أو تلقائية)
   ============================================================ */
export async function syncNow(force = false) {
  if (isSyncing) {
    console.log('⏳ [Sync] مزامنة جارية بالفعل');
    return;
  }

  if (!isReady) {
    console.log('⚠️ [Sync] المحرك غير جاهز');
    return;
  }

  if (!isOnline()) {
    setStatus('offline', 'لا يوجد اتصال بالإنترنت');
    return;
  }

  isSyncing = true;
  setStatus('syncing', 'جاري المزامنة...');

  try {
    const userId = getUserId();
    if (!userId) throw new Error('لا يوجد مستخدم');

    const { getDoc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

    // 1. قراءة البيانات السحابية الحالية
    setStatus('downloading', 'قراءة البيانات من السحابة...');
    const snapshot = await getDoc(docRef);
    const cloudData = snapshot.exists() ? snapshot.data() : null;

    // 2. دمج البيانات
    setStatus('merging', 'دمج البيانات...');
    const localData = db.getStateCopy();
    let mergedData;

    if (cloudData && cloudData.payload) {
      mergedData = mergeDatabases(localData, cloudData.payload);
    } else {
      // لا توجد بيانات سحابية → ارفع البيانات المحلية
      mergedData = localData;
    }

    // 3. تطبيق البيانات المدمجة محلياً
    db.setState(mergedData);

    // 4. رفع البيانات المدمجة إلى السحابة
    setStatus('uploading', 'رفع البيانات إلى السحابة...');
    await setDoc(docRef, {
      payload: mergedData,
      deviceId: getDeviceId(),
      updatedAt: serverTimestamp(),
      syncVersion: 1
    });

    // 5. تحديث الطابع الزمني
    lastSyncTime = Date.now();
    localStorage.setItem(SYNC_CONFIG.LAST_SYNC_KEY, String(lastSyncTime));

    setStatus('idle', 'تمت المزامنة بنجاح ✓');
    events.emit(SYNC_COMPLETE_EVENT, { timestamp: lastSyncTime });

  } catch (e) {
    console.error('❌ [Sync] فشل المزامنة:', e);
    setStatus('error', e.message);
    events.emit(SYNC_ERROR_EVENT, { error: e.message });
  } finally {
    isSyncing = false;
  }
}

/* ============================================================
   معالجة التحديثات القادمة من السحابة
   ============================================================ */
function handleCloudUpdate(cloudPayload, cloudDeviceId) {
  // إذا كان التحديث من نفس هذا الجهاز، تجاهله
  if (cloudDeviceId === getDeviceId()) {
    console.log('⏭️ [Sync] تحديث من نفس الجهاز، تجاهل');
    return;
  }

  try {
    const localData = db.getStateCopy();
    const mergedData = mergeDatabases(localData, cloudPayload);

    db.setState(mergedData);
    console.log('✅ [Sync] تم تطبيق التحديث السحابي');
    setStatus('idle', 'تم استلام تحديث من جهاز آخر');
  } catch (e) {
    console.error('❌ [Sync] فشل تطبيق التحديث السحابي:', e);
  }
}

/* ============================================================
   دالة الدمج الذكية (الأهم!)
   ============================================================ */
function mergeDatabases(local, remote) {
  const merged = deepClone(local);

  // ============================================================
  // 1. قائمة المجموعات (Collections)
  // ============================================================
  const collections = [
    'customers', 'orders', 'payments', 'expenses',
    'inventory', 'workers', 'workerPayments',
    'commitments', 'commitmentPayments', 'houseExpenses',
    'personalLoans', 'loanPayments', 'savingsGoals',
    'referrals', 'referralRewards', 'portfolio',
    'garmentTypes', 'holidays', 'occasions',
    'activityLog', 'trash'
  ];

  collections.forEach(key => {
    const localItems = Array.isArray(local[key]) ? local[key] : [];
    const remoteItems = Array.isArray(remote[key]) ? remote[key] : [];

    merged[key] = mergeArrays(localItems, remoteItems);
  });

  // ============================================================
  // 2. الحقول المفردة (Scalar fields)
  // ============================================================
  // كلمات المرور والإعدادات - الأحدث يفوز
  const scalarKeys = [
    'password', 'managerPassword', 'receptionPassword', 'financePassword',
    'schemaVersion'
  ];

  scalarKeys.forEach(key => {
    const localVal = local[key];
    const remoteVal = remote[key];
    if (localVal === undefined || localVal === null) {
      merged[key] = remoteVal;
    } else if (remoteVal === undefined || remoteVal === null) {
      merged[key] = localVal;
    } else {
      // كلاهما موجود - احتفظ بالأحدث
      merged[key] = local.updatedAt > remote.updatedAt ? localVal : remoteVal;
    }
  });

  // ============================================================
  // 3. الطابع الزمني - الأحدث
  // ============================================================
  merged.updatedAt = Math.max(local.updatedAt || 0, remote.updatedAt || 0);

  return merged;
}

/* ============================================================
   دمج مصفوفة عناصر (حسب ID مع مقارنة Timestamps)
   ============================================================ */
function mergeArrays(localArray, remoteArray) {
  const mergedMap = new Map();

  // 1. أضف كل العناصر المحلية
  localArray.forEach(item => {
    if (item && item.id) {
      mergedMap.set(item.id, item);
    }
  });

  // 2. ادمج العناصر السحابية
  remoteArray.forEach(remoteItem => {
    if (!remoteItem || !remoteItem.id) return;

    const localItem = mergedMap.get(remoteItem.id);

    if (!localItem) {
      // موجود في السحابة فقط → أضفه
      mergedMap.set(remoteItem.id, remoteItem);
      return;
    }

    // موجود في الجهازين → قارن Timestamps
    const localTime = getItemTimestamp(localItem);
    const remoteTime = getItemTimestamp(remoteItem);

    if (remoteTime > localTime) {
      // السحابي أحدث → استبدل المحلي
      mergedMap.set(remoteItem.id, remoteItem);
    } else if (remoteTime < localTime) {
      // المحلي أحدث → احتفظ به (لا تفعل شيئاً)
    } else {
      // متساويان → ادمج الحقول (الأكثر امتلاءً)
      const mergedItem = mergeItems(localItem, remoteItem);
      mergedMap.set(remoteItem.id, mergedItem);
    }
  });

  // ترتيب حسب createdAt (الأحدث أولاً)
  return Array.from(mergedMap.values()).sort((a, b) => {
    const ta = a.createdAt || 0;
    const tb = b.createdAt || 0;
    return tb - ta;
  });
}

/* ============================================================
   استخراج الطابع الزمني من عنصر
   ============================================================ */
function getItemTimestamp(item) {
  return item.updatedAt || item.createdAt || item.deletedAt ? 
    new Date(item.updatedAt || item.createdAt || item.deletedAt).getTime() : 0;
}

/* ============================================================
   دمج عنصرين (عند تعادل Timestamps)
   (نأخذ كل حقل غير فارغ من الجهازين)
   ============================================================ */
function mergeItems(localItem, remoteItem) {
  const merged = { ...localItem };

  Object.keys(remoteItem).forEach(key => {
    const localVal = merged[key];
    const remoteVal = remoteItem[key];

    // إذا كانت القيمة المحلية فارغة، خذ السحابية
    if (localVal === undefined || localVal === null || localVal === '') {
      if (remoteVal !== undefined && remoteVal !== null && remoteVal !== '') {
        merged[key] = remoteVal;
      }
    }
    // إذا كانت القيمة السحابية مصفوفة أطول، خذها
    else if (Array.isArray(localVal) && Array.isArray(remoteVal)) {
      if (remoteVal.length > localVal.length) {
        merged[key] = remoteVal;
      }
    }
    // إذا كانت القيمة السحابية نصاً أطول، خذها
    else if (typeof localVal === 'string' && typeof remoteVal === 'string') {
      if (remoteVal.length > localVal.length) {
        merged[key] = remoteVal;
      }
    }
  });

  return merged;
}

/* ============================================================
   إيقاف المزامنة
   ============================================================ */
export function stopSync() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = null;
  }
  isReady = false;
  firestore = null;
  docRef = null;
  console.log('🛑 [Sync] تم إيقاف المزامنة');
}

/* ============================================================
   قراءة حالة المزامنة
   ============================================================ */
export function getSyncState() {
  return {
    isReady,
    isSyncing,
    lastSyncTime,
    lastSyncAgo: lastSyncTime ? Math.floor((Date.now() - lastSyncTime) / 1000) : null,
    isOnline: isOnline(),
    isSignedIn: isSignedIn()
  };
}

/* ============================================================
   الاستماع لأحداث الاتصال وإعادة المحاولة
   ============================================================ */
window.addEventListener('online', () => {
  console.log('🌐 [Sync] عاد الاتصال، إعادة المحاولة...');
  setTimeout(() => syncNow(), 2000);
});

window.addEventListener('offline', () => {
  setStatus('offline', 'لا يوجد اتصال');
});
