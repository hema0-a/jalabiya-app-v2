/* ============================================================
   list-renderer.js - العرض التدريجي للقوائم الطويلة (V2)
   (يعرض 20 عنصر أولاً + يحمّل المزيد عند التمرير)
   ============================================================ */

/* ============================================================
   الإعدادات الافتراضية
   ============================================================ */
const DEFAULT_BATCH_SIZE = 20;

/* ============================================================
   الحالة الداخلية لكل قائمة
   ============================================================ */
const listStates = new Map();

/* ============================================================
   تهيئة قائمة تدريجية
   الإدخال:
   - containerId: معرّف الحاوية (string)
   - items: المصفوفة الكاملة للعناصر
   - renderItem: دالة تُعيد HTML لعنصر واحد
   - options: { batchSize, emptyMessage, onRendered }
   ============================================================ */
export function initProgressiveList(containerId, items, renderItem, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`⚠️ لم يتم العثور على الحاوية: ${containerId}`);
    return;
  }

  const batchSize = options.batchSize || DEFAULT_BATCH_SIZE;
  const emptyMessage = options.emptyMessage || 'لا توجد عناصر';

  // حالة هذه القائمة
  const state = {
    containerId,
    items,
    renderItem,
    batchSize,
    renderedCount: 0,
    options,
    observer: null,
    allRendered: false
  };

  listStates.set(containerId, state);

  // إذا كانت القائمة فارغة
  if (items.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <p>${emptyMessage}</p>
      </div>
    `;
    if (options.onRendered) options.onRendered(0, 0);
    return;
  }

  // بناء الحاوية الرئيسية
  container.innerHTML = `
    <div id="${containerId}-items"></div>
    <div id="${containerId}-sentinel" style="
      text-align: center;
      padding: 20px;
      display: none;
    ">
      <div class="loading-spinner" style="
        display: inline-block;
        width: 24px;
        height: 24px;
        border: 3px solid var(--border-color);
        border-top-color: var(--primary-color);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      "></div>
      <div style="font-size: 12px; color: var(--text-muted); margin-top: 8px;">جاري تحميل المزيد...</div>
    </div>
    <div id="${containerId}-end" style="
      text-align: center;
      padding: 12px;
      display: none;
      font-size: 12px;
      color: var(--text-muted);
    ">— نهاية القائمة —</div>
  `;

  // إضافة CSS للـ spinner (مرة واحدة)
  if (!document.getElementById('progressive-list-styles')) {
    const style = document.createElement('style');
    style.id = 'progressive-list-styles';
    style.textContent = `
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  // بدء العرض الأول
  renderNextBatch(state);

  // إعداد Intersection Observer للمزيد
  setupScrollObserver(state);

  return state;
}

/* ============================================================
   عرض الدفعة التالية
   ============================================================ */
function renderNextBatch(state) {
  const { containerId, items, renderItem, batchSize, renderedCount } = state;
  const itemsContainer = document.getElementById(`${containerId}-items`);
  const sentinel = document.getElementById(`${containerId}-sentinel`);
  const endIndicator = document.getElementById(`${containerId}-end`);

  if (!itemsContainer) return;

  const nextBatch = items.slice(renderedCount, renderedCount + batchSize);

  // إضافة العناصر الجديدة
  nextBatch.forEach(item => {
    const html = renderItem(item);
    const temp = document.createElement('div');
    temp.innerHTML = html.trim();
    // أضف أول عنصر في الـ temp
    if (temp.firstChild) {
      itemsContainer.appendChild(temp.firstChild);
    }
  });

  state.renderedCount += nextBatch.length;

  // إذا انتهت العناصر
  if (state.renderedCount >= items.length) {
    state.allRendered = true;
    if (sentinel) sentinel.style.display = 'none';
    if (endIndicator && items.length > batchSize) {
      endIndicator.style.display = 'block';
    }
    // إلغاء المراقبة
    if (state.observer) {
      state.observer.disconnect();
      state.observer = null;
    }
  } else {
    if (sentinel) sentinel.style.display = 'block';
    if (endIndicator) endIndicator.style.display = 'none';
  }

  // تنفيذ رد الاتصال
  if (state.options.onRendered) {
    state.options.onRendered(state.renderedCount, items.length);
  }
}

/* ============================================================
   إعداد مراقب التمرير
   ============================================================ */
function setupScrollObserver(state) {
  const { containerId } = state;
  const sentinel = document.getElementById(`${containerId}-sentinel`);

  if (!sentinel || state.allRendered) return;

  // استخدم IntersectionObserver إن كان متاحاً
  if (typeof IntersectionObserver !== 'undefined') {
    if (state.observer) state.observer.disconnect();

    state.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !state.allRendered) {
          // إظهار مؤشر التحميل لفترة قصيرة (تجربة أفضل)
          setTimeout(() => {
            renderNextBatch(state);
          }, 100);
        }
      });
    }, {
      root: null,
      rootMargin: '200px', // حمّل قبل الوصول بـ 200px
      threshold: 0
    });

    state.observer.observe(sentinel);
  } else {
    // Fallback: استخدم scroll event
    const handleScroll = () => {
      if (state.allRendered) {
        window.removeEventListener('scroll', handleScroll);
        return;
      }

      const rect = sentinel.getBoundingClientRect();
      if (rect.top < window.innerHeight + 200) {
        renderNextBatch(state);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    state.scrollFallback = handleScroll;
  }
}

/* ============================================================
   إعادة تعيين القائمة (عند تغيير الفلتر/البحث)
   ============================================================ */
export function resetProgressiveList(containerId, newItems = null) {
  const state = listStates.get(containerId);
  if (!state) return;

  // إلغاء المراقب القديم
  if (state.observer) {
    state.observer.disconnect();
    state.observer = null;
  }

  if (state.scrollFallback) {
    window.removeEventListener('scroll', state.scrollFallback);
    state.scrollFallback = null;
  }

  // تحديث العناصر إذا أعطيت
  if (newItems !== null) {
    state.items = newItems;
  }

  state.renderedCount = 0;
  state.allRendered = false;

  // إعادة العرض
  if (state.items.length === 0) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <p>${state.options.emptyMessage || 'لا توجد عناصر'}</p>
        </div>
      `;
    }
    listStates.delete(containerId);
    return;
  }

  // إعادة التهيئة بالعناصر الجديدة
  listStates.delete(containerId);
  initProgressiveList(containerId, state.items, state.renderItem, state.options);
}

/* ============================================================
   تنظيف كل القوائم
   ============================================================ */
export function clearAllLists() {
  listStates.forEach((state) => {
    if (state.observer) state.observer.disconnect();
    if (state.scrollFallback) window.removeEventListener('scroll', state.scrollFallback);
  });
  listStates.clear();
}

/* ============================================================
   الحصول على عدد العناصر المعروضة
   ============================================================ */
export function getRenderedCount(containerId) {
  const state = listStates.get(containerId);
  return state ? state.renderedCount : 0;
}

/* ============================================================
   إجبار عرض كل العناصر (زر "عرض الكل")
   ============================================================ */
export function forceRenderAll(containerId) {
  const state = listStates.get(containerId);
  if (!state) return;

  const { items, renderItem } = state;
  const itemsContainer = document.getElementById(`${containerId}-items`);
  const sentinel = document.getElementById(`${containerId}-sentinel`);
  const endIndicator = document.getElementById(`${containerId}-end`);

  if (!itemsContainer) return;

  // امسح المحتوى الحالي
  itemsContainer.innerHTML = '';

  // اعرض كل العناصر
  items.forEach(item => {
    const html = renderItem(item);
    const temp = document.createElement('div');
    temp.innerHTML = html.trim();
    if (temp.firstChild) {
      itemsContainer.appendChild(temp.firstChild);
    }
  });

  state.renderedCount = items.length;
  state.allRendered = true;

  if (sentinel) sentinel.style.display = 'none';
  if (endIndicator) endIndicator.style.display = 'block';

  if (state.observer) {
    state.observer.disconnect();
    state.observer = null;
  }
}
