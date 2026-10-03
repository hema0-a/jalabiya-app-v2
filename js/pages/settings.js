/* ============================================================
   settings.js - صفحة الإعدادات الشاملة الكاملة (V2)
   (جميع الأقسام: معلومات + حقول المقاسات + أنواع الجلابيات
    + المواسم + الرسائل + النسخ + ضغط الصور + الألوان + الثيمات
    + الخلفيات + الأيقونات + الخطوط + الأوضاع + الأمان + الخطر)
   ============================================================ */

import * as db from '../core/db.js';
import { toast } from '../ui/toast.js';
import {
  saveTheme, setDisplayMode, applyThemePreset,
  saveFontSettings, resetFontSettings, saveBackground, saveIconStyle,
  THEME_PRESETS, BACKGROUNDS, ICON_STYLES, FONT_FAMILIES, FONT_SIZES
} from '../core/theme.js';
import { changePin } from '../core/auth.js';
import { verifyPinAgainstStored } from '../core/pin-crypto.js';
import { APP_CONFIG, DEFAULT_SETTINGS } from '../core/config.js';
import * as storage from '../core/storage.js';
import { escapeHtml, formatDate } from '../core/utils.js';
import { getOccasionsStats, getOccasionIcon, getTimeUntilOccasion } from '../core/occasions.js';
import { getBackupsStats } from '../core/auto-backup.js';
import { getCompressionSettings, saveCompressionSettings } from '../core/image-compressor.js';
import {
  renderMeasurementFieldsSection,
  initMeasurementFieldsSection,
  renderGarmentTypesSection,
  initGarmentTypesSection
} from '../ui/customization-manager.js';

export function renderSettingsPage(container) {
  const settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  const currentTheme = settings.theme || DEFAULT_SETTINGS.theme;
  const currentLogo = settings.workshopLogo || null;
  const currentName = settings.workshopName || DEFAULT_SETTINGS.workshopName;
  const dailyLimit = settings.dailyOrderLimit || 700;
  const groupingEnabled = settings.enableMeasurementGrouping === true;
  const groupingTolerance = settings.measurementTolerance || 2;
  const groupByGarmentType = settings.groupByGarmentType !== false;
  const lockBg = settings.lockScreenBackground || null;
  const lockMsg = settings.lockScreenMessage || 'أدخل الرقم السري للدخول';
  const lockShowLogo = settings.lockScreenShowLogo !== false;
  const currentBackground = settings.background || 'none';
  const currentIconStyle = settings.iconStyle || 'default';
  const fabricPickupAlertDays = settings.fabricPickupAlertDays || 2;
  const occasionsAlertEnabled = settings.occasionsAlertEnabled !== false;
  const occasionsStats = getOccasionsStats();
  const backupsStats = getBackupsStats();
  const autoBackupEnabled = settings.autoBackupEnabled !== false;
  const compressionSettings = getCompressionSettings();

  container.innerHTML = `
    <div class="card">
      <h2 class="card-title">⚙️ الإعدادات</h2>

      <!-- ========== معلومات الورشة ========== -->
      <div class="card" style="background: var(--bg-color); border: none; margin-bottom: 16px;">
        <h3 style="font-size: 16px; margin-bottom: 12px;">🏢 معلومات الورشة</h3>
        <div class="form-group">
          <label>اسم الورشة</label>
          <input type="text" id="workshop-name" class="form-control" value="${escapeHtml(currentName)}">
        </div>
        <div class="form-group">
          <label>شعار الورشة (اللوجو)</label>
          <div style="text-align: center; margin-bottom: 10px;">
            <img id="logo-preview" src="${currentLogo || ''}" alt="الشعار" style="max-width: 100px; max-height: 100px; border-radius: 50%; border: 2px solid var(--border-color); ${currentLogo ? '' : 'display:none;'}">
            <div id="logo-placeholder" style="width: 100px; height: 100px; border-radius: 50%; background: var(--border-color); display: ${currentLogo ? 'none' : 'flex'}; align-items: center; justify-content: center; margin: 0 auto; font-size: 30px; color: var(--text-muted);">🏢</div>
          </div>
          <label for="logo-file" class="btn btn-outline btn-full" style="cursor: pointer; text-align: center; display: block;">📷 اختر صورة الشعار</label>
          <input type="file" id="logo-file" accept="image/*" style="display: none;">
          ${currentLogo ? `<button class="btn btn-danger btn-full mt-2" id="remove-logo-btn">🗑️ حذف الشعار</button>` : ''}
        </div>
        <button class="btn btn-primary btn-full" id="save-info-btn">حفظ المعلومات</button>
      </div>

      <!-- ========== حقول المقاسات (جديد) ========== -->
      ${renderMeasurementFieldsSection()}

      <!-- ========== أنواع الجلابيات (جديد) ========== -->
      ${renderGarmentTypesSection()}

      <!-- ========== المواسم والأعياد ========== -->
      <div class="card" style="background: linear-gradient(135deg, #FFF8E1, #FFECB3); border: none; margin-bottom: 16px;">
        <div class="flex-between" style="margin-bottom: 12px;">
          <h3 style="font-size: 16px; margin: 0;">🎉 المواسم والأعياد</h3>
          <span class="badge" style="background: var(--accent-color); color: white;">${occasionsStats.enabled} مفعّلة</span>
        </div>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">تسجيل المواسم لتنبيهك قبلها استعداداً للطلبات.</p>
        ${occasionsStats.next ? `
          <div style="background: white; padding: 10px 12px; border-radius: var(--radius-md); margin-bottom: 12px;">
            <div class="flex-between">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="font-size: 22px;">${getOccasionIcon(occasionsStats.next)}</div>
                <div>
                  <div style="font-size: 11px; color: var(--text-muted);">🎯 القادمة</div>
                  <div style="font-weight: 800; font-size: 14px;">${escapeHtml(occasionsStats.next.name)}</div>
                </div>
              </div>
              <div style="text-align: left; font-size: 11px;">
                <div style="color: var(--accent-color); font-weight: 700;">${getTimeUntilOccasion(occasionsStats.next)}</div>
                <div style="color: var(--text-muted); margin-top: 2px;">${formatDate(occasionsStats.next.nextDate)}</div>
              </div>
            </div>
          </div>
        ` : ''}
        <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px; background: white; border-radius: var(--radius-md); cursor: pointer; margin-bottom: 12px;">
          <span><strong>🔔 تفعيل التنبيهات</strong><div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">عرض التنبيهات في الرئيسية</div></span>
          <input type="checkbox" id="occasions-alert-enabled" ${occasionsAlertEnabled ? 'checked' : ''} style="width: 22px; height: 22px; cursor: pointer;">
        </label>
        <a href="#/occasions" class="btn btn-primary btn-full" style="text-decoration: none; display: block; text-align: center;">🎉 إدارة المواسم</a>
      </div>

      <!-- ========== الرسائل التلقائية ========== -->
      <div class="card" style="background: linear-gradient(135deg, #E3F2FD, #BBDEFB); border: none; margin-bottom: 16px;">
        <div class="flex-between" style="margin-bottom: 12px;">
          <h3 style="font-size: 16px; margin: 0;">💬 الرسائل التلقائية</h3>
          <span class="badge" style="background: #1565C0; color: white;">واتساب</span>
        </div>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">رسائل جاهزة للعملاء عبر واتساب عند تغيير حالة الطلب.</p>
        <a href="#/auto-messages-settings" class="btn btn-primary btn-full" style="text-decoration: none; display: block; text-align: center; background: linear-gradient(135deg, #1565C0, #0D47A1);">💬 إدارة الرسائل</a>
      </div>

      <!-- ========== النسخ الاحتياطية ========== -->
      <div class="card" style="background: linear-gradient(135deg, #E0F2F1, #B2DFDB); border: none; margin-bottom: 16px;">
        <div class="flex-between" style="margin-bottom: 12px;">
          <h3 style="font-size: 16px; margin: 0;">💾 النسخ الاحتياطية</h3>
          <span class="badge" style="background: ${autoBackupEnabled ? '#2E7D32' : '#999'}; color: white;">${autoBackupEnabled ? '✓ تلقائي' : '✗ معطّل'}</span>
        </div>
        <div style="background: white; padding: 10px 12px; border-radius: var(--radius-md); margin-bottom: 12px; font-size: 12px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div><div style="color: var(--text-muted);">📦 عدد النسخ:</div><div style="font-weight: 800; color: var(--primary-color); font-size: 16px;">${backupsStats.count} / ${backupsStats.maxBackups}</div></div>
            <div><div style="color: var(--text-muted);">💾 الحجم:</div><div style="font-weight: 800; color: #00695C; font-size: 16px;">${backupsStats.totalSizeMB} MB</div></div>
          </div>
        </div>
        <a href="#/backups" class="btn btn-primary btn-full" style="text-decoration: none; display: block; text-align: center; background: linear-gradient(135deg, #00695C, #004D40);">💾 إدارة النسخ</a>
      </div>

      <!-- ========== ضغط الصور ========== -->
      <div class="card" style="background: linear-gradient(135deg, #F3E5F5, #E1BEE7); border: none; margin-bottom: 16px;">
        <div class="flex-between" style="margin-bottom: 12px;">
          <h3 style="font-size: 16px; margin: 0;">🗜️ ضغط الصور</h3>
          <span class="badge" style="background: #6A1B9A; color: white;">توفير المساحة</span>
        </div>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">يتم ضغط كل صورة ترفعها تلقائياً.</p>
        <div style="background: white; padding: 10px 12px; border-radius: var(--radius-md); margin-bottom: 12px; font-size: 12px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div><div style="color: var(--text-muted);">📐 العرض الأقصى:</div><div style="font-weight: 800; color: #6A1B9A;">${compressionSettings.maxWidth}px</div></div>
            <div><div style="color: var(--text-muted);">🎨 الجودة:</div><div style="font-weight: 800; color: #6A1B9A;">${Math.round(compressionSettings.quality * 100)}%</div></div>
          </div>
        </div>
        <div class="form-group">
          <label>جودة الصورة</label>
          <select id="compression-quality" class="form-control">
            <option value="0.6" ${compressionSettings.quality === 0.6 ? 'selected' : ''}>منخفضة (60%) — توفير أقصى</option>
            <option value="0.75" ${compressionSettings.quality === 0.75 ? 'selected' : ''}>متوسطة (75%) — متوازن ⭐</option>
            <option value="0.85" ${compressionSettings.quality === 0.85 ? 'selected' : ''}>عالية (85%) — جودة عالية</option>
            <option value="0.95" ${compressionSettings.quality === 0.95 ? 'selected' : ''}>ممتازة (95%) — أعلى جودة</option>
          </select>
        </div>
        <div class="form-group">
          <label>الحجم الأقصى للصورة</label>
          <select id="compression-maxsize" class="form-control">
            <option value="200" ${compressionSettings.maxSizeKB === 200 ? 'selected' : ''}>200 KB</option>
            <option value="500" ${compressionSettings.maxSizeKB === 500 ? 'selected' : ''}>500 KB ⭐</option>
            <option value="800" ${compressionSettings.maxSizeKB === 800 ? 'selected' : ''}>800 KB</option>
            <option value="1500" ${compressionSettings.maxSizeKB === 1500 ? 'selected' : ''}>1.5 MB</option>
          </select>
        </div>
        <div class="form-group">
          <label>الأبعاد القصوى</label>
          <select id="compression-dimensions" class="form-control">
            <option value="800" ${compressionSettings.maxWidth === 800 ? 'selected' : ''}>صغير (800×800)</option>
            <option value="1200" ${compressionSettings.maxWidth === 1200 ? 'selected' : ''}>متوسط (1200×1200) ⭐</option>
            <option value="1600" ${compressionSettings.maxWidth === 1600 ? 'selected' : ''}>كبير (1600×1600)</option>
            <option value="2000" ${compressionSettings.maxWidth === 2000 ? 'selected' : ''}>كبير جداً (2000×2000)</option>
          </select>
        </div>
        <button class="btn btn-primary btn-full" id="save-compression-btn" style="background: linear-gradient(135deg, #6A1B9A, #4A148C);">💾 حفظ إعدادات الضغط</button>
      </div>

      <!-- ========== الألوان ========== -->
      <div class="card" style="background: var(--bg-color); border: none; margin-bottom: 16px;">
        <h3 style="font-size: 16px; margin-bottom: 12px;">🎨 تخصيص الألوان</h3>
        <div class="form-group"><label>اللون الأساسي</label><input type="color" id="color-primary" class="form-control" value="${currentTheme.primary || '#1F6D57'}" style="height: 50px; padding: 4px;"></div>
        <div class="form-group"><label>اللون الثانوي</label><input type="color" id="color-accent" class="form-control" value="${currentTheme.accent || '#B8863B'}" style="height: 50px; padding: 4px;"></div>
        <div class="form-group"><label>لون الخلفية</label><input type="color" id="color-bg" class="form-control" value="${currentTheme.bg || '#F6F1E6'}" style="height: 50px; padding: 4px;"></div>
        <button class="btn btn-primary btn-full" id="save-theme-btn">حفظ الألوان</button>
        <button class="btn btn-outline btn-full mt-2" id="reset-theme-btn">استعادة الافتراضية</button>
      </div>

      <!-- ========== الثيمات الجاهزة ========== -->
      <div class="card" style="background: var(--bg-color); border: none; margin-bottom: 16px;">
        <h3 style="font-size: 16px; margin-bottom: 12px;">🎨 الثيمات الجاهزة</h3>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
          ${Object.keys(THEME_PRESETS).map(key => {
            const t = THEME_PRESETS[key];
            return `
              <button type="button" class="theme-preset-btn" data-preset="${key}" style="padding: 12px; background: var(--surface-color); border: 2px solid var(--border-color); border-radius: var(--radius-md); cursor: pointer; text-align: center;">
                <div style="display: flex; justify-content: center; gap: 4px; margin-bottom: 6px;">
                  <div style="width: 18px; height: 18px; border-radius: 50%; background: ${t.colors.primary};"></div>
                  <div style="width: 18px; height: 18px; border-radius: 50%; background: ${t.colors.accent};"></div>
                  <div style="width: 18px; height: 18px; border-radius: 50%; background: ${t.colors.bg}; border: 1px solid var(--border-color);"></div>
                </div>
                <div style="font-size: 12px; font-weight: 700;">${t.icon} ${t.name}</div>
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <!-- ========== الخلفيات الإبداعية ========== -->
      <div class="card" style="background: var(--bg-color); border: none; margin-bottom: 16px;">
        <h3 style="font-size: 16px; margin-bottom: 12px;">🖼️ الخلفيات الإبداعية</h3>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
          ${Object.keys(BACKGROUNDS).map(key => {
            const bg = BACKGROUNDS[key];
            const isActive = currentBackground === key;
            return `
              <button type="button" class="bg-select-btn" data-bg="${key}" style="padding: 12px 6px; background: ${isActive ? 'var(--primary-color)' : 'var(--surface-color)'}; color: ${isActive ? 'white' : 'var(--text-main)'}; border: 2px solid ${isActive ? 'var(--primary-color)' : 'var(--border-color)'}; border-radius: var(--radius-md); cursor: pointer; text-align: center;">
                <div style="font-size: 24px; margin-bottom: 4px;">${bg.icon}</div>
                <div style="font-size: 11px; font-weight: 700;">${bg.name}</div>
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <!-- ========== أنماط الأيقونات ========== -->
      <div class="card" style="background: var(--bg-color); border: none; margin-bottom: 16px;">
        <h3 style="font-size: 16px; margin-bottom: 12px;">🎯 أنماط الأيقونات</h3>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
          ${Object.keys(ICON_STYLES).map(key => {
            const style = ICON_STYLES[key];
            const isActive = currentIconStyle === key;
            return `
              <button type="button" class="icon-style-btn" data-style="${key}" style="padding: 12px 6px; background: ${isActive ? 'var(--primary-color)' : 'var(--surface-color)'}; color: ${isActive ? 'white' : 'var(--text-main)'}; border: 2px solid ${isActive ? 'var(--primary-color)' : 'var(--border-color)'}; border-radius: var(--radius-md); cursor: pointer; text-align: center;">
                <div style="font-size: 22px; margin-bottom: 4px;">${style.icon}</div>
                <div style="font-size: 11px; font-weight: 700;">${style.name}</div>
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <!-- ========== الخطوط ========== -->
      <div class="card" style="background: var(--bg-color); border: none; margin-bottom: 16px;">
        <h3 style="font-size: 16px; margin-bottom: 12px;">🔤 تخصيص الخطوط</h3>
        <div class="form-group">
          <label>نوع الخط</label>
          <select id="font-family-select" class="form-control">
            ${Object.keys(FONT_FAMILIES).map(key => {
              const f = FONT_FAMILIES[key];
              const selected = settings.fontFamily === key ? 'selected' : '';
              return `<option value="${key}" ${selected}>${f.name}</option>`;
            }).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>حجم الخط</label>
          <select id="font-size-select" class="form-control">
            ${Object.keys(FONT_SIZES).map(key => {
              const s = FONT_SIZES[key];
              const selected = settings.fontSize === key ? 'selected' : '';
              return `<option value="${key}" ${selected}>${s.name}</option>`;
            }).join('')}
          </select>
        </div>
        <button class="btn btn-primary btn-full" id="save-font-btn">حفظ الخط</button>
        <button class="btn btn-outline btn-full mt-2" id="reset-font-btn">استعادة الافتراضي</button>
      </div>

      <!-- ========== أوضاع العرض ========== -->
      <div class="card" style="background: var(--bg-color); border: none; margin-bottom: 16px;">
        <h3 style="font-size: 16px; margin-bottom: 12px;">👁️ أوضاع العرض</h3>
        <div class="form-group">
          <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; padding: 10px; background: var(--surface-color); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <span><strong>🌙 الوضع الليلي</strong><div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">ألوان داكنة</div></span>
            <input type="checkbox" id="toggle-dark" ${settings.darkMode ? 'checked' : ''} style="width: 22px; height: 22px; cursor: pointer;">
          </label>
        </div>
        <div class="form-group">
          <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; padding: 10px; background: var(--surface-color); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <span><strong>🔲 التباين العالي</strong><div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">حدود أوضح</div></span>
            <input type="checkbox" id="toggle-contrast" ${settings.highContrast ? 'checked' : ''} style="width: 22px; height: 22px; cursor: pointer;">
          </label>
        </div>
        <div class="form-group">
          <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; padding: 10px; background: var(--surface-color); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <span><strong>📏 الوضع المضغوط</strong><div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">مساحات أصغر</div></span>
            <input type="checkbox" id="toggle-compact" ${settings.compactMode ? 'checked' : ''} style="width: 22px; height: 22px; cursor: pointer;">
          </label>
        </div>
        <div class="form-group">
          <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; padding: 10px; background: var(--surface-color); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <span><strong>👁️ وضع العميل</strong><div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">إخفاء الأرقام</div></span>
            <input type="checkbox" id="toggle-client" ${settings.clientMode ? 'checked' : ''} style="width: 22px; height: 22px; cursor: pointer;">
          </label>
        </div>
      </div>

      <!-- ========== الحد اليومي ========== -->
      <div class="card" style="background: var(--bg-color); border: none; margin-bottom: 16px;">
        <h3 style="font-size: 16px; margin-bottom: 12px;">📊 الحد اليومي والتنبيهات</h3>
        <div class="form-group">
          <label>الحد اليومي للطلبات (بالجنيه)</label>
          <input type="number" id="daily-limit" class="form-control" value="${dailyLimit}" min="0" step="50">
        </div>
        <div class="form-group">
          <label>تنبيه استلام القماش (قبل كم يوم؟)</label>
          <input type="number" id="fabric-pickup-days" class="form-control" value="${fabricPickupAlertDays}" min="1" max="14">
        </div>
        <button class="btn btn-primary btn-full" id="save-daily-limit-btn">حفظ الإعدادات</button>
      </div>

      <!-- ========== تجميع القياسات ========== -->
      <div class="card" style="background: var(--bg-color); border: none; margin-bottom: 16px;">
        <h3 style="font-size: 16px; margin-bottom: 12px;">🧵 تجميع الطلبات المتشابهة</h3>
        <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; padding: 10px; background: var(--surface-color); border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 12px;">
          <span><strong>تفعيل التجميع</strong><div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">زر تجميع في الطلبات</div></span>
          <input type="checkbox" id="grouping-enabled" ${groupingEnabled ? 'checked' : ''} style="width: 22px; height: 22px; cursor: pointer;">
        </label>
        <div id="grouping-options" style="display: ${groupingEnabled ? 'block' : 'none'};">
          <div class="form-group">
            <label>نسبة التقارب (سم)</label>
            <input type="number" id="grouping-tolerance" class="form-control" value="${groupingTolerance}" min="1" max="20" step="0.5">
          </div>
          <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; padding: 10px; background: var(--surface-color); border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 12px;">
            <span><strong>نفس النوع فقط</strong><div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">تجميع حسب النوع</div></span>
            <input type="checkbox" id="grouping-by-type" ${groupByGarmentType ? 'checked' : ''} style="width: 22px; height: 22px; cursor: pointer;">
          </label>
        </div>
        <button class="btn btn-primary btn-full" id="save-grouping-btn">حفظ الإعدادات</button>
      </div>

      <!-- ========== شاشة القفل ========== -->
      <div class="card" style="background: var(--bg-color); border: none; margin-bottom: 16px;">
        <h3 style="font-size: 16px; margin-bottom: 12px;">🔒 تخصيص شاشة القفل</h3>
        <div class="form-group">
          <label>صورة الخلفية (اختياري)</label>
          <div style="text-align: center; margin-bottom: 10px;">
            <div id="lock-bg-preview" style="width: 100%; height: 120px; border-radius: var(--radius-md); border: 2px dashed var(--border-color); background: linear-gradient(135deg, #1F6D57, #123C2F) center/cover no-repeat; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px;">${lockBg ? '' : 'لا توجد صورة'}</div>
            ${lockBg ? `<button type="button" class="btn btn-danger btn-full mt-2" id="remove-lock-bg-btn">🗑️ حذف الصورة</button>` : ''}
          </div>
          <label for="lock-bg-file" class="btn btn-outline btn-full" style="cursor: pointer; text-align: center; display: block;">🖼️ اختر صورة</label>
          <input type="file" id="lock-bg-file" accept="image/*" style="display: none;">
        </div>
        <div class="form-group">
          <label>الرسالة الترحيبية</label>
          <input type="text" id="lock-message" class="form-control" value="${escapeHtml(lockMsg)}">
        </div>
        <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px; background: var(--surface-color); border-radius: var(--radius-md); border: 1px solid var(--border-color); cursor: pointer; margin-bottom: 12px;">
          <span><strong>إظهار الشعار</strong><div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">عرض الشعار في شاشة القفل</div></span>
          <input type="checkbox" id="lock-show-logo" ${lockShowLogo ? 'checked' : ''} style="width: 22px; height: 22px; cursor: pointer;">
        </label>
        <button class="btn btn-primary btn-full" id="save-lock-screen-btn">حفظ الإعدادات</button>
      </div>

      <!-- ========== الأمان ========== -->
      <div class="card" style="background: var(--bg-color); border: none; margin-bottom: 16px;">
        <h3 style="font-size: 16px; margin-bottom: 12px;">🔒 الأمان</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">تغيير الرقم السري (PIN) لحماية التطبيق.</p>
        <button class="btn btn-primary btn-full" id="change-pin-btn">🔑 تغيير الرقم السري</button>
      </div>

      <!-- ========== تصدير/استيراد JSON ========== -->
      <div class="card" style="background: var(--bg-color); border: none; margin-bottom: 16px;">
        <h3 style="font-size: 16px; margin-bottom: 12px;">💾 تصدير/استيراد JSON</h3>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button class="btn btn-primary" id="export-btn">📤 تصدير البيانات</button>
          <label for="import-file" class="btn btn-outline" style="cursor: pointer; text-align: center; display: block;">📥 استيراد البيانات</label>
          <input type="file" id="import-file" accept=".json" style="display: none;">
        </div>
      </div>

      <!-- ========== منطقة الخطر ========== -->
      <div class="card" style="background: #fff5f5; border: 1px solid #f5c6cb; border-radius: var(--radius-lg);">
        <h3 style="font-size: 16px; color: #dc3545; margin-bottom: 12px;">⚠️ منطقة الخطر</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">حذف جميع البيانات نهائياً.</p>
        <button class="btn btn-danger" id="reset-btn">🗑️ حذف جميع البيانات</button>
      </div>
    </div>
  `;

  /* ============================================================
     حقول المقاسات + أنواع الجلابيات (تهيئة)
     ============================================================ */
  initMeasurementFieldsSection(container, () => renderSettingsPage(container));
  initGarmentTypesSection(container, () => renderSettingsPage(container));

  /* ============================================================
     معلومات الورشة
     ============================================================ */
  const logoInput = container.querySelector('#logo-file');
  const logoPreview = container.querySelector('#logo-preview');
  const logoPlaceholder = container.querySelector('#logo-placeholder');
  let tempLogo = currentLogo;

  logoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if ((file.size / 1024) > APP_CONFIG.maxFileSizeKB) {
      toast.error(`حجم الصورة كبير. الحد الأقصى ${APP_CONFIG.maxFileSizeKB}KB`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      tempLogo = event.target.result;
      logoPreview.src = tempLogo;
      logoPreview.style.display = 'block';
      logoPlaceholder.style.display = 'none';
    };
    reader.readAsDataURL(file);
  });

  const removeLogoBtn = container.querySelector('#remove-logo-btn');
  if (removeLogoBtn) {
    removeLogoBtn.addEventListener('click', () => {
      if (confirm('حذف الشعار؟')) {
        let s = storage.loadSettings() || { ...DEFAULT_SETTINGS };
        s.workshopLogo = null;
        storage.saveSettings(s);
        toast.success('تم حذف الشعار');
        setTimeout(() => window.location.reload(), 800);
      }
    });
  }

  container.querySelector('#save-info-btn').addEventListener('click', () => {
    const newName = document.getElementById('workshop-name').value.trim();
    if (!newName) { toast.error('أدخل اسم الورشة'); return; }
    let s = storage.loadSettings() || { ...DEFAULT_SETTINGS };
    s.workshopName = newName;
    s.workshopLogo = tempLogo;
    storage.saveSettings(s);
    toast.success('تم حفظ المعلومات');
    setTimeout(() => window.location.reload(), 800);
  });

  /* ============================================================
     المواسم
     ============================================================ */
  const occToggle = container.querySelector('#occasions-alert-enabled');
  if (occToggle) {
    occToggle.addEventListener('change', (e) => {
      let s = storage.loadSettings() || { ...DEFAULT_SETTINGS };
      s.occasionsAlertEnabled = e.target.checked;
      storage.saveSettings(s);
      toast.success(e.target.checked ? 'تم تفعيل التنبيهات' : 'تم الإلغاء');
    });
  }

  /* ============================================================
     ضغط الصور
     ============================================================ */
  const saveCompressionBtn = container.querySelector('#save-compression-btn');
  if (saveCompressionBtn) {
    saveCompressionBtn.addEventListener('click', () => {
      const quality = parseFloat(container.querySelector('#compression-quality').value);
      const maxSizeKB = parseInt(container.querySelector('#compression-maxsize').value);
      const dimensions = parseInt(container.querySelector('#compression-dimensions').value);
      saveCompressionSettings({ quality, maxSizeKB, maxWidth: dimensions, maxHeight: dimensions });
      toast.success('تم حفظ إعدادات الضغط');
      renderSettingsPage(container);
    });
  }

  /* ============================================================
     الألوان
     ============================================================ */
  container.querySelector('#save-theme-btn').addEventListener('click', () => {
    saveTheme({
      primary: document.getElementById('color-primary').value,
      accent: document.getElementById('color-accent').value,
      bg: document.getElementById('color-bg').value
    });
    toast.success('تم حفظ الألوان');
  });

  container.querySelector('#reset-theme-btn').addEventListener('click', () => {
    if (confirm('استعادة الألوان الافتراضية؟')) {
      saveTheme(DEFAULT_SETTINGS.theme);
      renderSettingsPage(container);
      toast.success('تم الاستعادة');
    }
  });

  /* ============================================================
     الثيمات
     ============================================================ */
  container.querySelectorAll('.theme-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset;
      const info = THEME_PRESETS[preset];
      if (confirm(`تطبيق ثيم "${info.name}"؟`)) {
        if (applyThemePreset(preset)) {
          toast.success(`تم تطبيق ${info.name}`);
          renderSettingsPage(container);
        }
      }
    });
  });

  /* ============================================================
     الخلفيات
     ============================================================ */
  container.querySelectorAll('.bg-select-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const bgId = btn.dataset.bg;
      saveBackground(bgId);
      toast.success(`تم تطبيق ${BACKGROUNDS[bgId].name}`);
      renderSettingsPage(container);
    });
  });

  /* ============================================================
     الأيقونات
     ============================================================ */
  container.querySelectorAll('.icon-style-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const styleId = btn.dataset.style;
      saveIconStyle(styleId);
      toast.success(`تم تطبيق ${ICON_STYLES[styleId].name}`);
      renderSettingsPage(container);
    });
  });

  /* ============================================================
     الخطوط
     ============================================================ */
  const saveFontBtn = container.querySelector('#save-font-btn');
  if (saveFontBtn) {
    saveFontBtn.addEventListener('click', () => {
      saveFontSettings(
        container.querySelector('#font-family-select').value,
        container.querySelector('#font-size-select').value
      );
      toast.success('تم حفظ الخط');
    });
  }

  const resetFontBtn = container.querySelector('#reset-font-btn');
  if (resetFontBtn) {
    resetFontBtn.addEventListener('click', () => {
      if (confirm('استعادة الخط الافتراضي؟')) {
        resetFontSettings();
        toast.success('تم الاستعادة');
        renderSettingsPage(container);
      }
    });
  }

  /* ============================================================
     أوضاع العرض
     ============================================================ */
  container.querySelector('#toggle-dark').addEventListener('change', (e) => {
    setDisplayMode('darkMode', e.target.checked);
    const btn = document.getElementById('dark-mode-toggle');
    if (btn) btn.textContent = e.target.checked ? '☀️' : '🌙';
    toast.success(e.target.checked ? 'تم تفعيل الوضع الليلي' : 'تم الإلغاء');
  });
  container.querySelector('#toggle-contrast').addEventListener('change', (e) => setDisplayMode('highContrast', e.target.checked));
  container.querySelector('#toggle-compact').addEventListener('change', (e) => setDisplayMode('compactMode', e.target.checked));
  container.querySelector('#toggle-client').addEventListener('change', (e) => {
    setDisplayMode('clientMode', e.target.checked);
    toast.info(e.target.checked ? 'وضع العميل مفعّل' : 'وضع العميل ملغي');
  });

  /* ============================================================
     الحد اليومي
     ============================================================ */
  const saveDailyBtn = container.querySelector('#save-daily-limit-btn');
  if (saveDailyBtn) {
    saveDailyBtn.addEventListener('click', () => {
      const value = parseFloat(document.getElementById('daily-limit').value);
      const fabricDays = parseInt(document.getElementById('fabric-pickup-days').value) || 2;
      if (isNaN(value) || value < 0) { toast.error('قيمة غير صحيحة'); return; }
      let s = storage.loadSettings() || { ...DEFAULT_SETTINGS };
      s.dailyOrderLimit = value;
      s.fabricPickupAlertDays = fabricDays;
      storage.saveSettings(s);
      toast.success('تم الحفظ');
    });
  }

  /* ============================================================
     التجميع
     ============================================================ */
  const groupingChk = container.querySelector('#grouping-enabled');
  const groupingOptions = container.querySelector('#grouping-options');
  if (groupingChk) {
    groupingChk.addEventListener('change', (e) => {
      groupingOptions.style.display = e.target.checked ? 'block' : 'none';
    });
  }

  const saveGroupingBtn = container.querySelector('#save-grouping-btn');
  if (saveGroupingBtn) {
    saveGroupingBtn.addEventListener('click', () => {
      const enabled = container.querySelector('#grouping-enabled').checked;
      const tolerance = parseFloat(container.querySelector('#grouping-tolerance').value) || 2;
      const byType = container.querySelector('#grouping-by-type').checked;
      if (enabled && (tolerance < 1 || tolerance > 20)) { toast.error('التقارب بين 1 و 20 سم'); return; }
      let s = storage.loadSettings() || { ...DEFAULT_SETTINGS };
      s.enableMeasurementGrouping = enabled;
      s.measurementTolerance = tolerance;
      s.groupByGarmentType = byType;
      storage.saveSettings(s);
      toast.success('تم الحفظ');
    });
  }

  /* ============================================================
     شاشة القفل
     ============================================================ */
  let tempLockBg = lockBg;
  const lockBgFile = container.querySelector('#lock-bg-file');
  const lockBgPreview = container.querySelector('#lock-bg-preview');
  if (lockBg) lockBgPreview.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.5)), url('${lockBg}')`;

  if (lockBgFile) {
    lockBgFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if ((file.size / 1024) > 800) { toast.error('الحد الأقصى 800KB'); return; }
      const reader = new FileReader();
      reader.onload = (event) => {
        tempLockBg = event.target.result;
        lockBgPreview.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.5)), url('${tempLockBg}')`;
        lockBgPreview.textContent = '';
      };
      reader.readAsDataURL(file);
    });
  }

  const removeLockBgBtn = container.querySelector('#remove-lock-bg-btn');
  if (removeLockBgBtn) {
    removeLockBgBtn.addEventListener('click', () => {
      if (confirm('حذف الصورة؟')) {
        let s = storage.loadSettings() || { ...DEFAULT_SETTINGS };
        s.lockScreenBackground = null;
        storage.saveSettings(s);
        toast.success('تم الحذف');
        renderSettingsPage(container);
      }
    });
  }

  const saveLockBtn = container.querySelector('#save-lock-screen-btn');
  if (saveLockBtn) {
    saveLockBtn.addEventListener('click', () => {
      const msg = container.querySelector('#lock-message').value.trim() || 'أدخل الرقم السري للدخول';
      const showLogo = container.querySelector('#lock-show-logo').checked;
      let s = storage.loadSettings() || { ...DEFAULT_SETTINGS };
      s.lockScreenBackground = tempLockBg;
      s.lockScreenMessage = msg;
      s.lockScreenShowLogo = showLogo;
      storage.saveSettings(s);
      toast.success('تم الحفظ');
    });
  }

  /* ============================================================
     PIN
     ============================================================ */
  container.querySelector('#change-pin-btn').addEventListener('click', () => {
  const formHtml = `
    <h3 class="card-title no-border">🔑 تغيير الرقم السري</h3>
    <form id="pin-form">
      <div class="form-group"><label>الرقم الحالي *</label><input type="password" id="old-pin" class="form-control" maxlength="4" inputmode="numeric" required></div>
      <div class="form-group"><label>الرقم الجديد *</label><input type="password" id="new-pin" class="form-control" maxlength="4" inputmode="numeric" required></div>
      <div class="form-group"><label>تأكيد الرقم *</label><input type="password" id="confirm-pin" class="form-control" maxlength="4" inputmode="numeric" required></div>
      <div class="flex-between mt-2">
        <button type="button" class="btn btn-outline" id="cancel-pin-btn">إلغاء</button>
        <button type="submit" class="btn btn-primary">تغيير</button>
      </div>
    </form>
  `;
  import('../ui/modal.js').then(({ openModal, closeModal }) => {
    openModal(formHtml);
    document.getElementById('pin-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const oldPin = document.getElementById('old-pin').value.trim();
      const newPin = document.getElementById('new-pin').value.trim();
      const confirmPin = document.getElementById('confirm-pin').value.trim();

      const dbState = storage.loadDB();
      const storedPin = dbState ? (dbState.password || '0000') : '0000';

      const isOldValid = await verifyPinAgainstStored(oldPin, storedPin);
      if (!isOldValid) { toast.error('الرقم الحالي غير صحيح'); return; }

      if (!/^\d{4}$/.test(newPin)) { toast.error('الرقم الجديد 4 أرقام'); return; }
      if (newPin !== confirmPin) { toast.error('غير متطابقين'); return; }

      const ok = await changePin(newPin);
      if (ok) { toast.success('تم التغيير'); closeModal(); }
      else { toast.error('فشل التغيير'); }
    });
    document.getElementById('cancel-pin-btn').addEventListener('click', closeModal);
  });
});

  /* ============================================================
     Export/Import
     ============================================================ */
  container.querySelector('#export-btn').addEventListener('click', () => {
    const data = db.getStateCopy();
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jalabiya_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('تم التصدير');
  });

  container.querySelector('#import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (!importedData || typeof importedData !== 'object') { toast.error('ملف غير صالح'); return; }
        if (confirm('استيراد هذه البيانات؟ سيتم استبدال الحالية.')) {
          db.setState(importedData);
          toast.success('تم الاستيراد');
          setTimeout(() => window.location.reload(), 1000);
        }
      } catch (err) { toast.error('فشل القراءة'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  /* ============================================================
     Reset
     ============================================================ */
  container.querySelector('#reset-btn').addEventListener('click', () => {
    if (confirm('حذف كل البيانات؟ لا يمكن التراجع!')) {
      if (confirm('تأكيد أخير؟')) {
        db.reset();
        toast.success('تم الحذف');
        setTimeout(() => window.location.reload(), 1000);
      }
    }
  });
}
