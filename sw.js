/* ============================================================
   sw.js - Service Worker للتطبيق (V2)
   (يعمل offline + يخزّن الملفات الثابتة + يحدّث تلقائياً)
   ============================================================ */

const CACHE_VERSION = 'jalabiya-v2-v1.0.0';
const CACHE_NAME = `static-${CACHE_VERSION}`;

/* الملفات التي نُخزّنها مسبقاً عند التثبيت */
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  // CSS
  './css/main.css',
  './css/themes.css',
  './css/components.css',
  './css/kanban.css',
  // Core JS
  './js/main.js',
  './js/core/config.js',
  './js/core/events.js',
  './js/core/utils.js',
  './js/core/storage.js',
  './js/core/db.js',
  './js/core/theme.js',
  './js/core/auth.js',
  './js/core/activity-log.js',
  './js/core/trash.js',
  './js/core/invoice.js',
  './js/core/notifications.js',
  './js/core/search.js',
  './js/core/order-grouping.js',
  './js/core/firebase-config.js',
  './js/core/cloud-auth.js',
  './js/core/sync.js',
  // UI
  './js/ui/router.js',
  './js/ui/modal.js',
  './js/ui/toast.js',
  './js/ui/sidebar.js',
  './js/ui/topbar.js',
  './js/ui/universal-search.js',
  './js/ui/quick-preview.js',
  './js/ui/customization-manager.js',
  // Pages
  './js/pages/dashboard.js',
  './js/pages/customers.js',
  './js/pages/orders.js',
  './js/pages/payments.js',
  './js/pages/expenses.js',
  './js/pages/inventory.js',
  './js/pages/workers.js',
  './js/pages/commitments.js',
  './js/pages/house-expenses.js',
  './js/pages/loans.js',
  './js/pages/reports.js',
  './js/pages/kpis.js',
  './js/pages/settings.js',
  './js/pages/referrals.js',
  './js/pages/activity-log.js',
  './js/pages/trash.js',
  './js/pages/portfolio.js',
  './js/pages/pricing-calculator.js',
  './js/pages/cloud-sync.js'
];

/* ============================================================
   Install: تخزين الملفات الأولية
   ============================================================ */
self.addEventListener('install', (event) => {
  console.log('🔧 [SW] Installing version:', CACHE_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 [SW] Caching initial files...');
      // نستخدم addAll مع معالجة الأخطاء لكل ملف
      return Promise.allSettled(
        PRECACHE_URLS.map(url => 
          cache.add(url).catch(err => {
            console.warn(`⚠️ [SW] Failed to cache: ${url}`, err.message);
          })
        )
      );
    }).then(() => {
      console.log('✅ [SW] Installation complete');
      return self.skipWaiting();
    })
  );
});

/* ============================================================
   Activate: تنظيف الإصدارات القديمة
   ============================================================ */
self.addEventListener('activate', (event) => {
  console.log('🚀 [SW] Activating version:', CACHE_VERSION);
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ [SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ [SW] Activation complete');
      return self.clients.claim();
    })
  );
});

/* ============================================================
   Fetch: استراتيجية الجلب
   - الملفات الثابتة: Cache First
   - طلبات الشبكة (Firebase): Network Only
   - HTML: Network First مع Cache Fallback
   ============================================================ */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // تجاهل الطلبات غير GET
  if (request.method !== 'GET') return;

  // تجاهل طلبات Firebase (يجب أن تمر إلى الشبكة دائماً)
  if (url.hostname.includes('firebase') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('gstatic.com') ||
      url.hostname.includes('firebaseio.com') ||
      url.hostname.includes('cloudfunctions.net')) {
    return;
  }

  // تجاهل طلبات مختلفة المصدر (مثل CDN)
  if (url.origin !== self.location.origin) {
    return;
  }

  // HTML: Network First
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // الملفات الثابتة (JS/CSS/JSON): Cache First
  if (url.pathname.match(/\.(js|css|json|png|jpg|jpeg|svg|woff2?|ttf)$/i)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // الافتراضي: Network First
  event.respondWith(networkFirst(request));
});

/* ============================================================
   استراتيجية Cache First
   ============================================================ */
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.warn('⚠️ [SW] Fetch failed for:', request.url);
    throw error;
  }
}

/* ============================================================
   استراتيجية Network First
   ============================================================ */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // إذا كان طلب HTML ولا يوجد cached → أرجع index.html
    if (request.headers.get('accept')?.includes('text/html')) {
      const fallback = await caches.match('./index.html');
      if (fallback) return fallback;
    }
    
    throw error;
  }
}

/* ============================================================
   دعم التحديث التلقائي عند طلب المستخدم
   ============================================================ */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});

/* ============================================================
   الإشعارات Push (استعداداً لميزة مستقبلية)
   ============================================================ */
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'لديك إشعار جديد',
      icon: data.icon || './manifest.json',
      badge: data.badge,
      vibrate: [100, 50, 100],
      data: data.data || {}
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'ورشة الجلابيب', options)
    );
  } catch (e) {
    console.error('❌ [SW] Push error:', e);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || './')
  );
});

console.log('🔧 [SW] Service Worker loaded:', CACHE_VERSION);
