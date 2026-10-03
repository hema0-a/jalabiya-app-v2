/* ============================================================
   settings.js - صفحة الإعدادات الشاملة (V2)
   (النسخة الكاملة مع المواسم والأعياد)
   ============================================================ */

import * as db from '../core/db.js';
import { toast } from '../ui/toast.js';
import {
  saveTheme, setDisplayMode, applyDisplayModes, applyThemePreset,
  saveFontSettings, resetFontSettings, saveBackground, saveIconStyle,
  THEME_PRESETS, BACKGROUNDS, ICON_STYLES, FONT_FAMILIES, FONT_SIZES
} from '../core/theme.js';
import { changePin } from '../core/auth.js';
import { APP_CONFIG, DEFAULT_SETTINGS } from '../core/config.js';
import * as storage from '../core/storage.js';
import { escapeHtml, formatDate } from '../core/utils.js';
import { getOccasionsStats, getOccasionIcon, getTimeUntilOccasion } from '../core/occasions.js';

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

  container.innerHTML = `
    <div class="card">
      <h2 class="card-title">⚙️ الإعدادات</h2>

      <!-- ============================================================
           معلومات الورشة
           ============================================================ -->
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
            <div id="logo-placeholder" style="width: 100px; height: 100px; border-radius: 50%; background: var(--border-color); display: ${currentLogo ? 'none' : 'flex'}; align-items: center; justify-content: center; margin: 0 auto; font-size: 30px; color: var(--text-muted);">
              🏢
            </div>
          </div>

          <label for="logo-file" class="btn btn-outline btn-full" style="cursor: pointer; text-align: center; display: block;">
            📷 اختر صورة الشعار
          </label>
          <input type="file" id="logo-file" accept="image/*" style="display: none;">

          ${currentLogo ? `<button class="btn btn-danger btn-full mt-2" id="remove-logo-btn">🗑️ حذف الشعار</button>` : ''}
        </div>

        <button class="btn btn-primary btn-full" id="save-info-btn">حفظ المعلومات</button>
      </div>

      <!-- ============================================================
           المواسم والأعياد (جديد)
           ============================================================ -->
      <div class="card" style="background: linear-gradient(135deg, #FFF8E1, #FFECB3); border: none; margin-bottom: 16px;">
        <div class="flex-between" style="margin-bottom: 12px;">
          <h3 style="font-size: 16px; margin: 0;">🎉 المواسم والأعياد</h3>
          <span class="badge" style="background: var(--accent-color); color: white;">${occasionsStats.enabled} مفعّلة</span>
        </div>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">
          تسجيل المواسم والأعياد (رمضان، عيد الفطر، المولد...) لتنبيهك قبلها استعداداً للطلبات.
        </p>

        ${occasionsStats.next ? `
          <div style="background: white; padding: 10px 12px; border-radius: var(--radius-md); margin-bottom: 12px;">
            <div class="flex-between">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="font-size: 22px;">${getOccasionIcon(occasionsStats.next)}</div>
                <div>
                  <div style="font-size: 11px; color: var(--text-muted);">🎯 المناسبة القادمة</div>
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

        ${occasionsStats.alertCount > 0 ? `
          <div style="background: #FFEBEE; border-right: 4px solid #C62828; padding: 8px 12px; border-radius: var(--radius-md); margin-bottom: 12px; font-size: 12px; color: #B71C1C;">
            🚨 <strong>${occasionsStats.alertCount}</strong> مناسبة تحتاج انتباهك الآن!
          </div>
        ` : ''}

        <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px; background: white; border-radius: var(--radius-md); cursor: pointer; margin-bottom: 12px;">
          <span>
            <strong>🔔 تفعيل تنبيهات المواسم</strong>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">عرض التنبيهات في الصفحة الرئيسية</div>
          </span>
          <input type="checkbox" id="occasions-alert-enabled" ${occasionsAlertEnabled ? 'checked' : ''} style="width: 22px; height: 22px; cursor: pointer;">
        </label>

        <a href="#/occasions" class="btn btn-primary btn-full" style="text-decoration: none; display: block; text-align: center;">
          🎉 إدارة المواسم والأعياد
        </a>
      </div>

<!-- ============================================================
     الرسائل التلقائية للعملاء
     ============================================================ -->
<div class="card" style="background: linear-gradient(135deg, #E3F2FD, #BBDEFB); border: none; margin-bottom: 16px;">
  <div class="flex-between" style="margin-bottom: 12px;">
    <h3 style="font-size: 16px; margin: 0;">💬 الرسائل التلقائية</h3>
    <span class="badge" style="background: var(--info-color, #1565C0); color: white;">واتساب</span>
  </div>
  <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">
    أرسل رسائل جاهزة للعملاء عبر واتساب عند تغيير حالة الطلب (تأكيد الطلب، بدء التنفيذ، جاهز للتسليم، شكر بعد التسليم).
  </p>

  <div style="background: white; padding: 10px 12px; border-radius: var(--radius-md); margin-bottom: 12px;">
    <div style="font-size: 12px; font-weight: 700; color: #1565C0; margin-bottom: 6px;">📋 القوالب المتاحة:</div>
    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
      <span style="background: #E3F2FD; color: #1565C0; padding: 4px 10px; border-radius: var(--radius-full); font-size: 11px; font-weight: 700;">📋 تأكيد الطلب</span>
      <span style="background: #E3F2FD; color: #1565C0; padding: 4px 10px; border-radius: var(--radius-full); font-size: 11px; font-weight: 700;">🧵 بدء التنفيذ</span>
      <span style="background: #E3F2FD; color: #1565C0; padding: 4px 10px; border-radius: var(--radius-full); font-size: 11px; font-weight: 700;">✅ جاهز للتسليم</span>
      <span style="background: #E3F2FD; color: #1565C0; padding: 4px 10px; border-radius: var(--radius-full); font-size: 11px; font-weight: 700;">🙏 شكر</span>
      <span style="background: #E3F2FD; color: #1565C0; padding: 4px 10px; border-radius: var(--radius-full); font-size: 11px; font-weight: 700;">💰 تذكير بالدفع</span>
      <span style="background: #E3F2FD; color: #1565C0; padding: 4px 10px; border-radius: var(--radius-full); font-size: 11px; font-weight: 700;">🎉 تهنئة مناسبة</span>
    </div>
  </div>

  <a href="#/auto-messages-settings" class="btn btn-primary btn-full" style="text-decoration: none; display: block; text-align: center; background: linear-gradient(135deg, #1565C0, #0D47A1);">
    💬 إدارة الرسائل التلقائية
  </a>
</div>
      <!-- ============================================================
           تخصيص الألوان
           ============================================================ -->
      <div class="card" style="background: var(--bg-color); border: none; margin-bottom: 16px;">
        <h3 style="font-size: 16px; margin-bottom: 12px;">🎨 تخصيص الألوان</h3>

        <div class="form-group">
          <label>اللون الأساسي</label>
          <input type="color" id="color-primary" class="form-control" value="${currentTheme.primary || '#1F6D57'}" style="height: 50px; padding: 4px;">
        </div>

        <div class="form-group">
          <label>اللون الثانوي (الذهبي)</label>
          <input type="color" id="color-accent" class="form-control" value="${currentTheme.accent || '#B8863B'}" style="height: 50px; padding: 4px;">
        </div>

        <div class="form-group">
          <label>لون الخلفية</label>
          <input type="color" id="color-bg" class="form-control" value="${currentTheme.bg || '#F6F1E6'}" style="height: 50px; padding: 4px;">
        </div>

        <button class="btn btn-primary btn-full" id="save-theme-btn">حفظ الألوان</button>
        <button class="btn btn-outline btn-full mt-2" id="reset-theme-btn">استعادة الألوان الافتراضية</button>
      </div>

      <!-- ============================================================
           الثيمات الجاهزة
           ============================================================ -->
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

      <!-- ============================================================
           الخلفيات الإبداعية
           ============================================================ -->
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

      <!-- ============================================================
           أنماط الأيقونات
           ============================================================ -->
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

      <!-- ============================================================
           تخصيص الخطوط
           ============================================================ -->
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

      <!-- ============================================================
           أوضاع العرض
           ============================================================ -->
      <div class="card" style="background: var(--bg-color); border: none; margin-bottom: 16px;">
        <h3 style="font-size: 16px; margin-bottom: 12px;">👁️ أوضاع العرض</h3>

        <div class="form-group">
          <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; padding: 10px; background: var(--surface-color); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <span>
              <strong>🌙 الوضع الليلي</strong>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">ألوان داكنة مريحة للعين</div>
            </span>
            <input type="checkbox" id="toggle-dark" ${settings.darkMode ? 'checked' : ''} style="width: 22px; height: 22px; cursor: pointer;">
          </label>
        </div>

        <div class="form-group">
          <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; padding: 10px; background: var(--surface-color); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <span>
              <strong>🔲 التباين العالي</strong>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">حدود أوضح لضعاف البصر</div>
            </span>
            <input type="checkbox" id="toggle-contrast" ${settings.highContrast ? 'checked' : ''} style="width: 22px; height: 22px; cursor: pointer;">
          </label>
        </div>

        <div class="form-group">
          <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; padding: 10px; background: var(--surface-color); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <span>
              <strong>📏 الوضع المضغوط</strong>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">مساحات أصغر لعرض أكثر</div>
            </span>
            <input type="checkbox" id="toggle-compact" ${settings.compactMode ? 'checked' : ''} style="width: 22px; height: 22px; cursor: pointer;">
          </label>
        </div>

        <div class="form-group">
          <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; padding: 10px; background: var(--surface-color); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <span>
              <strong>👁️ وضع العميل</strong>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">إخفاء الأرقام المالية الحساسة</div>
            </span>
            <input type="checkbox" id="toggle-client" ${settings.clientMode ? 'checked' : ''} style="width: 22px; height: 22px; cursor: pointer;">
          </label>
        </div>
      </div>

      <!-- ============================================================
           الحد اليومي للطلبات + مواعيد استلام القماش
           ============================================================ -->
      <div class="card" style="background: var(--bg-color); border: none; margin-bottom: 16px;">
        <h3 style="font-size: 16px; margin-bottom: 12px;">📊 الحد اليومي والتنبيهات</h3>

        <div class="form-group">
          <label>الحد اليومي للطلبات (بالجنيه) *</label>
          <input type="number" id="daily-limit" class="form-control" value="${dailyLimit}" min="0" step="50">
        </div>

        <div class="form-group">
          <label>تنبيه استلام القماش (قبل كم يوم؟)</label>
          <input type="number" id="fabric-pickup-days" class="form-control" value="${fabricPickupAlertDays}" min="1" max="14">
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
            💡 ينبّهك التطبيق قبل موعد استلام القماش بهذه المدة.
          </div>
        </div>

        <button class="btn btn-primary btn-full" id="save-daily-limit-btn">حفظ الإعدادات</button>
      </div>

      <!-- ============================================================
           تجميع القياسات
           ============================================================ -->
      <div class="card" style="background: var(--bg-color); border: none; margin-bottom: 16px;">
        <h3 style="font-size: 16px; margin-bottom: 12px;">🧵 تجميع الطلبات المتشابهة</h3>

        <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; padding: 10px; background: var(--surface-color); border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 12px;">
          <span>
            <strong>تفعيل التجميع</strong>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">عرض زر "🧵 تجميع" في صفحة الطلبات</div>
          </span>
          <input type="checkbox" id="grouping-enabled" ${groupingEnabled ? 'checked' : ''} style="width: 22px; height: 22px; cursor: pointer;">
        </label>

        <div id="grouping-options" style="display: ${groupingEnabled ? 'block' : 'none'};">
          <div class="form-group">
            <label>نسبة التقارب (سم) *</label>
            <input type="number" id="grouping-tolerance" class="form-control" value="${groupingTolerance}" min="1" max="20" step="0.5">
          </div>

          <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; padding: 10px; background: var(--surface-color); border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 12px;">
            <span>
              <strong>نفس النوع فقط</strong>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">تجميع الطلبات من نفس نوع الجلابية فقط</div>
            </span>
            <input type="checkbox" id="grouping-by-type" ${groupByGarmentType ? 'checked' : ''} style="width: 22px; height: 22px; cursor: pointer;">
          </label>
        </div>

        <button class="btn btn-primary btn-full" id="save-grouping-btn">حفظ إعدادات التجميع</button>
      </div>

      <!-- ============================================================
           تخصيص شاشة القفل
           ============================================================ -->
      <div class="card" style="background: var(--bg-color); border: none; margin-bottom: 16px;">
        <h3 style="font-size: 16px; margin-bottom: 12px;">🔒 تخصيص شاشة القفل</h3>

        <div class="form-group">
          <label>صورة الخلفية (اختياري)</label>
          <div style="text-align: center; margin-bottom: 10px;">
            <div id="lock-bg-preview" style="width: 100%; height: 120px; border-radius: var(--radius-md); border: 2px dashed var(--border-color); background: linear-gradient(135deg, #1F6D57, #123C2F) center/cover no-repeat; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px;">
              ${lockBg ? '' : 'لا توجد صورة'}
            </div>
            ${lockBg ? `<button type="button" class="btn btn-danger btn-full mt-2" id="remove-lock-bg-btn">🗑️ حذف الصورة</button>` : ''}
          </div>
          <label for="lock-bg-file" class="btn btn-outline btn-full" style="cursor: pointer; text-align: center; display: block;">
            🖼️ اختر صورة
          </label>
          <input type="file" id="lock-bg-file" accept="image/*" style="display: none;">
        </div>

        <div class="form-group">
          <label>الرسالة الترحيبية</label>
          <input type="text" id="lock-message" class="form-control" value="${escapeHtml(lockMsg)}">
        </div>

        <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px; background: var(--surface-color); border-radius: var(--radius-md); border: 1px solid var(--border-color); cursor: pointer; margin-bottom: 12px;">
          <span>
            <strong>إظهار الشعار</strong>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">عرض شعار الورشة في وسط شاشة القفل</div>
          </span>
          <input type="checkbox" id="lock-show-logo" ${lockShowLogo ? 'checked' : ''} style="width: 22px; height: 22px; cursor: pointer;">
        </label>

        <button class="btn btn-primary btn-full" id="save-lock-screen-btn">حفظ إعدادات شاشة القفل</button>
      </div>

      <!-- ============================================================
           الأمان
           ============================================================ -->
      <div class="card" style="background: var(--bg-color); border: none; margin-bottom: 16px;">
        <h3 style="font-size: 16px; margin-bottom: 12px;">🔒 الأمان</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">
          قم بتغيير الرقم السري (PIN) لحماية التطبيق.
        </p>
        <button class="btn btn-primary btn-full" id="change-pin-btn">🔑 تغيير الرقم السري</button>
      </div>

      <!-- ============================================================
           النسخ الاحتياطي
           ============================================================ -->
      <div class="card" style="background: var(--bg-color); border: none; margin-bottom: 16px;">
        <h3 style="font-size: 16px; margin-bottom: 12px;">💾 النسخ الاحتياطي والاستيراد</h3>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button class="btn btn-primary" id="export-btn">📤 تصدير البيانات</button>
          <label for="import-file" class="btn btn-outline" style="cursor: pointer; text-align: center; display: block;">
            📥 استيراد البيانات
          </label>
          <input type="file" id="import-file" accept=".json" style="display: none;">
        </div>
      </div>

      <!-- ============================================================
           منطقة الخطر
           ============================================================ -->
      <div class="card" style="background: #fff5f5; border: 1px solid #f5c6cb; border-radius: var(--radius-lg);">
        <h3 style="font-size: 16px; color: #dc3545; margin-bottom: 12px;">⚠️ منطقة الخطر</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
          حذف جميع البيانات نهائياً. لا يمكن التراجع.
        </p>
        <button class="btn btn-danger" id="reset-btn">🗑️ حذف جميع البيانات</button>
      </div>
    </div>
  `;

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
    const sizeKB = file.size / 1024;
    if (sizeKB > APP_CONFIG.maxFileSizeKB) {
      toast.error(`حجم الصورة كبير جداً. الحد الأقصى ${APP_CONFIG.maxFileSizeKB}KB`);
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
      if (confirm('هل تريد حذف الشعار؟')) {
        let s = storage.loadSettings() || { ...DEFAULT_SETTINGS };
        s.workshopLogo = null;
        storage.saveSettings(s);
        toast.success('تم حذف الشعار');
        setTimeout(() => window.location.reload(), 800);
      }
    });
  }

  const saveInfoBtn = container.querySelector('#save-info-btn');
  saveInfoBtn.addEventListener('click', () => {
    const newName = document.getElementById('workshop-name').value.trim();
    if (!newName) {
      toast.error('الرجاء إدخال اسم الورشة');
      return;
    }
    let s = storage.loadSettings() || { ...DEFAULT_SETTINGS };
    s.workshopName = newName;
    s.workshopLogo = tempLogo;
    storage.saveSettings(s);
    toast.success('تم حفظ المعلومات بنجاح');
    setTimeout(() => window.location.reload(), 800);
  });

  /* ============================================================
     المواسم
     ============================================================ */
  const occasionsToggle = container.querySelector('#occasions-alert-enabled');
  if (occasionsToggle) {
    occasionsToggle.addEventListener('change', (e) => {
      let s = storage.loadSettings() || { ...DEFAULT_SETTINGS };
      s.occasionsAlertEnabled = e.target.checked;
      storage.saveSettings(s);
      toast.success(e.target.checked ? 'تم تفعيل تنبيهات المواسم' : 'تم إلغاء تنبيهات المواسم');
    });
  }

  /* ============================================================
     الألوان
     ============================================================ */
  container.querySelector('#save-theme-btn').addEventListener('click', () => {
    const theme = {
      primary: document.getElementById('color-primary').value,
      accent: document.getElementById('color-accent').value,
      bg: document.getElementById('color-bg').value
    };
    saveTheme(theme);
    toast.success('تم حفظ الألوان بنجاح');
  });

  container.querySelector('#reset-theme-btn').addEventListener('click', () => {
    if (confirm('هل تريد استعادة الألوان الافتراضية؟')) {
      saveTheme(DEFAULT_SETTINGS.theme);
      renderSettingsPage(container);
      toast.success('تم استعادة الألوان الافتراضية');
    }
  });

  /* ============================================================
     الثيمات
     ============================================================ */
  container.querySelectorAll('.theme-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset;
      const presetInfo = THEME_PRESETS[preset];
      if (confirm(`هل تريد تطبيق ثيم "${presetInfo.name}"؟`)) {
        if (applyThemePreset(preset)) {
          toast.success(`تم تطبيق ثيم ${presetInfo.name} بنجاح`);
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
      toast.success(`تم تطبيق خلفية "${BACKGROUNDS[bgId].name}"`);
      renderSettingsPage(container);
    });
  });

  /* ============================================================
     أنماط الأيقونات
     ============================================================ */
  container.querySelectorAll('.icon-style-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const styleId = btn.dataset.style;
      saveIconStyle(styleId);
      toast.success(`تم تطبيق نمط "${ICON_STYLES[styleId].name}"`);
      renderSettingsPage(container);
    });
  });

  /* ============================================================
     الخطوط
     ============================================================ */
  const saveFontBtn = container.querySelector('#save-font-btn');
  if (saveFontBtn) {
    saveFontBtn.addEventListener('click', () => {
      const fontFamily = container.querySelector('#font-family-select').value;
      const fontSize = container.querySelector('#font-size-select').value;
      saveFontSettings(fontFamily, fontSize);
      toast.success('تم حفظ الخط بنجاح');
    });
  }

  const resetFontBtn = container.querySelector('#reset-font-btn');
  if (resetFontBtn) {
    resetFontBtn.addEventListener('click', () => {
      if (confirm('هل تريد استعادة الخط الافتراضي؟')) {
        resetFontSettings();
        toast.success('تم استعادة الخط الافتراضي');
        renderSettingsPage(container);
      }
    });
  }

  /* ============================================================
     أوضاع العرض
     ============================================================ */
  container.querySelector('#toggle-dark').addEventListener('change', (e) => {
    setDisplayMode('darkMode', e.target.checked);
    const topbarBtn = document.getElementById('dark-mode-toggle');
    if (topbarBtn) topbarBtn.textContent = e.target.checked ? '☀️' : '🌙';
    toast.success(e.target.checked ? 'تم تفعيل الوضع الليلي' : 'تم إلغاء الوضع الليلي');
  });

  container.querySelector('#toggle-contrast').addEventListener('change', (e) => {
    setDisplayMode('highContrast', e.target.checked);
  });

  container.querySelector('#toggle-compact').addEventListener('change', (e) => {
    setDisplayMode('compactMode', e.target.checked);
  });

  container.querySelector('#toggle-client').addEventListener('change', (e) => {
    setDisplayMode('clientMode', e.target.checked);
    toast.info(e.target.checked ? 'وضع العميل مفعّل' : 'وضع العميل ملغي');
  });

  /* ============================================================
     الحد اليومي + استلام القماش
     ============================================================ */
  const saveDailyLimitBtn = container.querySelector('#save-daily-limit-btn');
  if (saveDailyLimitBtn) {
    saveDailyLimitBtn.addEventListener('click', () => {
      const value = parseFloat(document.getElementById('daily-limit').value);
      const fabricDays = parseInt(document.getElementById('fabric-pickup-days').value) || 2;

      if (isNaN(value) || value < 0) {
        toast.error('الرجاء إدخال قيمة صحيحة');
        return;
      }

      let s = storage.loadSettings() || { ...DEFAULT_SETTINGS };
      s.dailyOrderLimit = value;
      s.fabricPickupAlertDays = fabricDays;
      storage.saveSettings(s);
      toast.success('تم حفظ الإعدادات بنجاح');
    });
  }

  /* ============================================================
     تجميع القياسات
     ============================================================ */
  const groupingEnabledCheckbox = container.querySelector('#grouping-enabled');
  const groupingOptions = container.querySelector('#grouping-options');

  if (groupingEnabledCheckbox) {
    groupingEnabledCheckbox.addEventListener('change', (e) => {
      groupingOptions.style.display = e.target.checked ? 'block' : 'none';
    });
  }

  const saveGroupingBtn = container.querySelector('#save-grouping-btn');
  if (saveGroupingBtn) {
    saveGroupingBtn.addEventListener('click', () => {
      const enabled = container.querySelector('#grouping-enabled').checked;
      const tolerance = parseFloat(container.querySelector('#grouping-tolerance').value) || 2;
      const byType = container.querySelector('#grouping-by-type').checked;

      if (enabled && (tolerance < 1 || tolerance > 20)) {
        toast.error('نسبة التقارب يجب أن تكون بين 1 و 20 سم');
        return;
      }

      let s = storage.loadSettings() || { ...DEFAULT_SETTINGS };
      s.enableMeasurementGrouping = enabled;
      s.measurementTolerance = tolerance;
      s.groupByGarmentType = byType;
      storage.saveSettings(s);

      toast.success('تم حفظ إعدادات التجميع بنجاح');
    });
  }

  /* ============================================================
     شاشة القفل
     ============================================================ */
  let tempLockBg = lockBg;
  const lockBgFile = container.querySelector('#lock-bg-file');
  const lockBgPreview = container.querySelector('#lock-bg-preview');

  if (lockBg) {
    lockBgPreview.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.5)), url('${lockBg}')`;
  }

  if (lockBgFile) {
    lockBgFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const sizeKB = file.size / 1024;
      if (sizeKB > 800) {
        toast.error('حجم الصورة كبير جداً. الحد الأقصى 800KB');
        return;
      }
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
      if (confirm('هل تريد حذف صورة خلفية شاشة القفل؟')) {
        let s = storage.loadSettings() || { ...DEFAULT_SETTINGS };
        s.lockScreenBackground = null;
        storage.saveSettings(s);
        toast.success('تم حذف الصورة');
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

      toast.success('تم حفظ إعدادات شاشة القفل بنجاح');
    });
  }

  /* ============================================================
     تغيير PIN
     ============================================================ */
  container.querySelector('#change-pin-btn').addEventListener('click', () => {
    const formHtml = `
      <h3 class="card-title no-border">🔑 تغيير الرقم السري</h3>
      <form id="pin-form">
        <div class="form-group">
          <label>الرقم السري الحالي *</label>
          <input type="password" id="old-pin" class="form-control" maxlength="4" inputmode="numeric" pattern="[0-9]*" required>
        </div>
        <div class="form-group">
          <label>الرقم السري الجديد *</label>
          <input type="password" id="new-pin" class="form-control" maxlength="4" inputmode="numeric" pattern="[0-9]*" required>
        </div>
        <div class="form-group">
          <label>تأكيد الرقم الجديد *</label>
          <input type="password" id="confirm-pin" class="form-control" maxlength="4" inputmode="numeric" pattern="[0-9]*" required>
        </div>
        <div class="flex-between mt-2">
          <button type="button" class="btn btn-outline" id="cancel-pin-btn">إلغاء</button>
          <button type="submit" class="btn btn-primary">تغيير</button>
        </div>
      </form>
    `;

    import('../ui/modal.js').then(({ openModal, closeModal }) => {
      openModal(formHtml);

      const form = document.getElementById('pin-form');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const oldPin = document.getElementById('old-pin').value.trim();
        const newPin = document.getElementById('new-pin').value.trim();
        const confirmPin = document.getElementById('confirm-pin').value.trim();

        const dbState = storage.loadDB();
        const correctPin = dbState ? (dbState.password || '0000') : '0000';
        if (oldPin !== String(correctPin)) {
          toast.error('الرقم السري الحالي غير صحيح');
          return;
        }
        if (!/^\d{4}$/.test(newPin)) {
          toast.error('الرقم الجديد يجب أن يكون 4 أرقام');
          return;
        }
        if (newPin !== confirmPin) {
          toast.error('الرقم الجديد وتأكيده غير متطابقين');
          return;
        }
        if (changePin(newPin)) {
          toast.success('تم تغيير الرقم السري بنجاح');
          closeModal();
        } else {
          toast.error('فشل تغيير الرقم السري');
        }
      });

      document.getElementById('cancel-pin-btn').addEventListener('click', closeModal);
    });
  });

  /* ============================================================
     النسخ الاحتياطي
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

    toast.success('تم تصدير البيانات بنجاح');
  });

  container.querySelector('#import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (!importedData || typeof importedData !== 'object') {
          toast.error('ملف غير صالح');
          return;
        }
        if (confirm('هل أنت متأكد من استيراد هذه البيانات؟ سيتم استبدال البيانات الحالية.')) {
          db.setState(importedData);
          toast.success('تم استيراد البيانات بنجاح!');
          setTimeout(() => window.location.reload(), 1000);
        }
      } catch (err) {
        console.error(err);
        toast.error('فشل قراءة الملف. تأكد من أنه ملف JSON صالح.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  /* ============================================================
     حذف البيانات
     ============================================================ */
  container.querySelector('#reset-btn').addEventListener('click', () => {
    if (confirm('هل أنت متأكد تماماً؟ سيتم حذف جميع البيانات نهائياً!')) {
      if (confirm('تأكيد أخير: لا يمكن التراجع!')) {
        db.reset();
        toast.success('تم حذف جميع البيانات');
        setTimeout(() => window.location.reload(), 1000);
      }
    }
  });
}
