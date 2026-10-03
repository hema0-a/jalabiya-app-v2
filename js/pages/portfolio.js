/* ============================================================
   portfolio.js - صفحة معرض الأعمال (V2)
   (النسخة الكاملة مع ضغط الصور التلقائي)
   ============================================================ */

import * as db from '../core/db.js';
import { toast } from '../ui/toast.js';
import { openModal, closeModal } from '../ui/modal.js';
import { money, formatDate, escapeHtml } from '../core/utils.js';
import { PORTFOLIO_CATEGORIES, APP_CONFIG, DEFAULT_SETTINGS } from '../core/config.js';
import * as storage from '../core/storage.js';
import { compressImage, getCompressionSettings } from '../core/image-compressor.js';

// متغيرات حالة الصفحة
let selectedCategory = 'all';
let searchQuery = '';

export function renderPortfolioPage(container) {
  const allItems = db.getPortfolio();

  // تصفية العناصر
  const items = allItems.filter(item => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const title = (item.title || '').toLowerCase();
      const note = (item.note || '').toLowerCase();
      return title.includes(q) || note.includes(q);
    }
    return true;
  }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  // إحصائيات
  const totalItems = allItems.length;
  const totalCategories = new Set(allItems.map(i => i.category)).size;

  let html = `
    <div class="card">
      <div class="flex-between mb-2">
        <h2 class="card-title no-border" style="margin:0;">📸 معرض الأعمال</h2>
        <button class="btn btn-primary" id="add-portfolio-btn">+ إضافة صورة</button>
      </div>

      <!-- إحصائيات -->
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 16px;">
        <div class="stat-card" style="padding: 10px 6px;">
          <div class="stat-value" style="font-size: 20px;">${totalItems}</div>
          <div class="stat-label">إجمالي الصور</div>
        </div>
        <div class="stat-card" style="padding: 10px 6px;">
          <div class="stat-value" style="font-size: 20px; color: var(--accent-color);">${totalCategories}</div>
          <div class="stat-label">عدد التصنيفات</div>
        </div>
      </div>

      <!-- البحث -->
      <div class="form-group" style="margin-bottom: 10px;">
        <input type="text" id="search-portfolio-input" class="form-control" placeholder="🔍 ابحث في المعرض..." value="${escapeHtml(searchQuery)}">
      </div>

      <!-- فلترة التصنيف -->
      <div style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 12px;">
        <button class="btn ${selectedCategory === 'all' ? 'btn-primary' : 'btn-outline'} cat-filter-btn" data-cat="all" style="font-size: 12px; padding: 6px 12px; white-space: nowrap; min-height: 32px;">
          الكل (${totalItems})
        </button>
        ${PORTFOLIO_CATEGORIES.map(cat => {
          const count = allItems.filter(i => i.category === cat.id).length;
          return `
            <button class="btn ${selectedCategory === cat.id ? 'btn-primary' : 'btn-outline'} cat-filter-btn" data-cat="${cat.id}" style="font-size: 12px; padding: 6px 12px; white-space: nowrap; min-height: 32px;">
              ${cat.icon} ${cat.label} ${count > 0 ? '(' + count + ')' : ''}
            </button>
          `;
        }).join('')}
      </div>
  `;

  // عرض العناصر
  if (items.length === 0) {
    html += `
      <div class="empty-state">
        <div class="empty-state-icon">📸</div>
        <p>${searchQuery || selectedCategory !== 'all' ? 'لا توجد نتائج مطابقة.' : 'لا توجد صور في المعرض حتى الآن.'}</p>
        ${allItems.length === 0 ? `<button class="btn btn-primary mt-3" id="add-first-portfolio-btn">+ أضف أول صورة</button>` : ''}
      </div>
    `;
  } else {
    html += `<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">`;
    items.forEach(item => {
      const cat = PORTFOLIO_CATEGORIES.find(c => c.id === item.category) || PORTFOLIO_CATEGORIES[7];
      html += `
        <div class="portfolio-card" data-id="${item.id}" style="border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden; background: var(--bg-color); cursor: pointer; transition: transform 0.2s;">
          <div style="width: 100%; height: 140px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; overflow: hidden;">
            <img src="${item.image}" alt="${escapeHtml(item.title)}" style="width: 100%; height: 100%; object-fit: cover;">
          </div>
          <div style="padding: 8px;">
            <div style="font-size: 12px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px;">${escapeHtml(item.title || 'بدون عنوان')}</div>
            <div style="font-size: 10px; color: ${cat.id === 'other' ? 'var(--text-muted)' : 'var(--primary-color)'}; font-weight: 600;">${cat.icon} ${cat.label}</div>
            ${item.price ? `<div style="font-size: 11px; font-weight: 800; color: var(--accent-color); margin-top: 4px;">${money(item.price)} جنيه</div>` : ''}
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }

  html += `</div>`;
  container.innerHTML = html;

  /* ============================================================
     نموذج إضافة صورة
     ============================================================ */
  function openPortfolioModal() {
    const categoryOptions = PORTFOLIO_CATEGORIES.map(c =>
      `<option value="${c.id}">${c.icon} ${c.label}</option>`
    ).join('');

    const compressionSettings = getCompressionSettings();

    const formHtml = `
      <h3 class="card-title no-border">📸 إضافة صورة للمعرض</h3>
      <form id="portfolio-form">

        <!-- حقل الصورة -->
        <div class="form-group">
          <label>الصورة *</label>
          <div id="portfolio-preview" style="width: 100%; height: 200px; background: var(--bg-color); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; border: 2px dashed var(--border-color); margin-bottom: 8px; overflow: hidden;">
            <div style="text-align: center; color: var(--text-muted);">
              <div style="font-size: 40px;">🖼️</div>
              <div style="font-size: 12px; margin-top: 4px;">اختر صورة</div>
            </div>
          </div>
          <label for="portfolio-file" class="btn btn-outline btn-full" style="cursor: pointer; text-align: center; display: block;">
            📷 اختر صورة
          </label>
          <input type="file" id="portfolio-file" accept="image/*" style="display: none;">
          <div id="compression-info" style="font-size: 11px; color: var(--text-muted); margin-top: 8px; text-align: center; display: none;">
            🗜️ سيتم ضغط الصورة تلقائياً عند الحفظ (جودة ${Math.round(compressionSettings.quality * 100)}%)
          </div>
        </div>

        <!-- العنوان -->
        <div class="form-group">
          <label>عنوان الصورة *</label>
          <input type="text" id="portfolio-title" class="form-control" placeholder="مثال: جلابية سادة رجالي" required>
        </div>

        <!-- التصنيف -->
        <div class="form-group">
          <label>التصنيف *</label>
          <select id="portfolio-category" class="form-control" required>
            ${categoryOptions}
          </select>
        </div>

        <!-- السعر المرجعي -->
        <div class="form-group">
          <label>السعر المرجعي (اختياري)</label>
          <input type="number" id="portfolio-price" class="form-control" placeholder="0" min="0">
        </div>

        <!-- ملاحظات -->
        <div class="form-group">
          <label>ملاحظات</label>
          <input type="text" id="portfolio-note" class="form-control" placeholder="اختياري">
        </div>

        <div class="flex-between mt-2">
          <button type="button" class="btn btn-outline" id="cancel-portfolio-btn">إلغاء</button>
          <button type="submit" class="btn btn-primary" id="submit-portfolio-btn">حفظ</button>
        </div>
      </form>
    `;

    openModal(formHtml);

    /* ===== الصورة ===== */
    let tempImage = null; // سيتم حفظ الصورة المضغوطة هنا
    const previewDiv = document.getElementById('portfolio-preview');
    const fileInput = document.getElementById('portfolio-file');
    const compressionInfo = document.getElementById('compression-info');

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // التحقق من أنه صورة
      if (!file.type.startsWith('image/')) {
        toast.error('الرجاء اختيار صورة صالحة');
        return;
      }

      // عرض معاينة سريعة (قبل الضغط)
      const reader = new FileReader();
      reader.onload = (event) => {
        previewDiv.innerHTML = `<img src="${event.target.result}" style="width: 100%; height: 100%; object-fit: cover; border-radius: var(--radius-md); opacity: 0.7;">`;
      };
      reader.readAsDataURL(file);

      // عرض معلومات الضغط
      compressionInfo.style.display = 'block';
      compressionInfo.innerHTML = `⏳ جاري ضغط الصورة...`;
      compressionInfo.style.color = 'var(--primary-color)';

      try {
        // ضغط الصورة تلقائياً
        const result = await compressImage(file, {
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 0.75,
          maxSizeKB: 500
        });

        tempImage = result.dataUrl;

        // عرض الصورة المضغوطة
        previewDiv.innerHTML = `<img src="${tempImage}" style="width: 100%; height: 100%; object-fit: cover; border-radius: var(--radius-md);">`;

        // عرض نتيجة الضغط
        const ratioColor = result.ratio >= 50 ? '#2E7D32' : result.ratio >= 20 ? '#F57C00' : 'var(--text-muted)';
        compressionInfo.innerHTML = `
          ✅ تم الضغط: <strong style="color: ${ratioColor};">${result.ratio}%</strong> توفير
          <br>
          <span style="font-size: 10px;">${result.originalSizeKB}KB ← ${result.sizeKB}KB (${result.width}×${result.height})</span>
        `;
        compressionInfo.style.color = 'var(--text-muted)';

      } catch (error) {
        console.error('فشل ضغط الصورة:', error);
        toast.error('فشل ضغط الصورة، سيتم استخدام الصورة الأصلية');
        // في حالة الفشل، نستخدم الصورة الأصلية
        tempImage = reader.result;
      }
    });

    /* ===== حفظ النموذج ===== */
    document.getElementById('portfolio-form').addEventListener('submit', (e) => {
      e.preventDefault();

      if (!tempImage) {
        toast.error('الرجاء اختيار صورة أولاً');
        return;
      }

      const title = document.getElementById('portfolio-title').value.trim();
      const category = document.getElementById('portfolio-category').value;
      const price = parseFloat(document.getElementById('portfolio-price').value) || 0;
      const note = document.getElementById('portfolio-note').value.trim();

      if (!title) {
        toast.error('الرجاء إدخال عنوان الصورة');
        return;
      }

      db.addPortfolioItem({ image: tempImage, title, category, price, note });
      toast.success('تم إضافة الصورة للمعرض');
      closeModal();
      renderPortfolioPage(container);
    });

    document.getElementById('cancel-portfolio-btn').addEventListener('click', closeModal);
  }

  /* ============================================================
     نافذة عرض الصورة
     ============================================================ */
  function openPortfolioItemDetails(item) {
    const cat = PORTFOLIO_CATEGORIES.find(c => c.id === item.category) || PORTFOLIO_CATEGORIES[7];
    const detailsHtml = `
      <div style="text-align: center;">
        <img src="${item.image}" style="width: 100%; max-height: 60vh; object-fit: contain; border-radius: var(--radius-md); background: #f0f0f0;">
      </div>
      <h3 class="card-title no-border" style="margin-top: 12px; text-align: center;">${escapeHtml(item.title)}</h3>
      <div style="text-align: center; margin-bottom: 12px;">
        <span class="badge" style="background: var(--bg-color); color: var(--primary-color);">${cat.icon} ${cat.label}</span>
        ${item.price ? `<span class="badge" style="background: #FFF8E1; color: #F57F17; margin-right: 6px;">💰 ${money(item.price)} جنيه</span>` : ''}
      </div>
      ${item.note ? `<p style="font-size: 13px; color: var(--text-muted); text-align: center; margin-bottom: 12px;">📝 ${escapeHtml(item.note)}</p>` : ''}

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
        <button class="btn btn-primary" id="share-portfolio-btn" style="background: #25D366;">📱 مشاركة واتساب</button>
        <button class="btn btn-outline" id="download-portfolio-btn">⬇️ حفظ الصورة</button>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <button class="btn btn-danger" id="delete-portfolio-btn">🗑️ حذف</button>
        <button class="btn btn-outline" id="close-portfolio-details">إغلاق</button>
      </div>
    `;

    openModal(detailsHtml);

    // مشاركة واتساب
    document.getElementById('share-portfolio-btn').addEventListener('click', () => {
      const text = `🌟 من ورشة تفصيل الجلابيب\n\n${item.title}\n${cat.label}${item.price ? '\n💰 السعر: ' + money(item.price) + ' جنيه' : ''}${item.note ? '\n📝 ' + item.note : ''}\n\nللتواصل والطلب يرجى مراسلتنا 🌹`;
      const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    });

    // حفظ الصورة
    document.getElementById('download-portfolio-btn').addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = item.image;
      a.download = `${item.title || 'portfolio'}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('تم تحميل الصورة');
    });

    // حذف
    document.getElementById('delete-portfolio-btn').addEventListener('click', () => {
      if (confirm('هل أنت متأكد من حذف هذه الصورة؟')) {
        db.deletePortfolioItem(item.id);
        toast.success('تم حذف الصورة');
        closeModal();
        renderPortfolioPage(container);
      }
    });

    document.getElementById('close-portfolio-details').addEventListener('click', closeModal);
  }

  /* ============================================================
     ربط الأحداث
     ============================================================ */

  const addBtn = container.querySelector('#add-portfolio-btn');
  if (addBtn) {
    addBtn.addEventListener('click', openPortfolioModal);
  }

  const addFirstBtn = container.querySelector('#add-first-portfolio-btn');
  if (addFirstBtn) {
    addFirstBtn.addEventListener('click', openPortfolioModal);
  }

  // البحث
  const searchInput = container.querySelector('#search-portfolio-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      const pos = e.target.selectionStart;
      renderPortfolioPage(container);
      const newInput = container.querySelector('#search-portfolio-input');
      if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(pos, pos);
      }
    });
  }

  // فلترة التصنيف
  container.querySelectorAll('.cat-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedCategory = btn.dataset.cat;
      renderPortfolioPage(container);
    });
  });

  // النقر على صورة → عرض التفاصيل
  container.querySelectorAll('.portfolio-card').forEach(card => {
    card.addEventListener('click', () => {
      const item = db.getPortfolioItem(card.dataset.id);
      if (item) openPortfolioItemDetails(item);
    });
  });
}
