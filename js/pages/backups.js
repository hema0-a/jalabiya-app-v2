/* ============================================================
   backups.js - صفحة إدارة النسخ الاحتياطية (V2)
   (عرض + استرجاع + حذف + تحميل + إعدادات)
   ============================================================ */

import { toast } from '../ui/toast.js';
import { openModal, closeModal } from '../ui/modal.js';
import { escapeHtml, formatDate } from '../core/utils.js';
import * as storage from '../core/storage.js';
import { DEFAULT_SETTINGS } from '../core/config.js';
import {
  getAutoBackups,
  createAutoBackup,
  restoreAutoBackup,
  deleteAutoBackup,
  clearAllBackups,
  downloadBackup,
  getBackupsStats,
  getTimeSinceLastBackup
} from '../core/auto-backup.js';

/* ============================================================
   الصفحة الرئيسية
   ============================================================ */
export function renderBackupsPage(container) {
  const backups = getAutoBackups();
  const stats = getBackupsStats();
  const settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  const autoBackupEnabled = settings.autoBackupEnabled !== false;
  const intervalHours = settings.autoBackupIntervalHours || 24;

  let html = `
    <div class="card">
      <div class="flex-between mb-2">
        <h2 class="card-title no-border" style="margin: 0;">💾 النسخ الاحتياطية</h2>
        <div style="display: flex; gap: 6px;">
          <button class="btn btn-primary" id="create-backup-btn" style="font-size: 12px; padding: 6px 12px; min-height: 32px;">+ نسخة جديدة</button>
          <a href="#/settings" class="btn btn-outline" style="font-size: 12px; padding: 6px 12px; min-height: 32px; text-decoration: none;">← الإعدادات</a>
        </div>
      </div>

      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
        نسخ احتياطية تلقائية كل ${intervalHours} ساعة. يتم الاحتفاظ بآخر ${stats.maxBackups} نسخ.
      </p>

      <!-- الإحصائيات -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px;">
        <div class="stat-card" style="padding: 10px 6px;">
          <div class="stat-value" style="font-size: 20px; color: var(--primary-color);">${stats.count}</div>
          <div class="stat-label">عدد النسخ</div>
        </div>
        <div class="stat-card" style="padding: 10px 6px;">
          <div class="stat-value" style="font-size: 16px; color: var(--accent-color);">${stats.totalSizeMB} MB</div>
          <div class="stat-label">الحجم الكلي</div>
        </div>
        <div class="stat-card" style="padding: 10px 6px;">
          <div class="stat-value" style="font-size: 16px; color: ${autoBackupEnabled ? '#2E7D32' : '#999'};">${autoBackupEnabled ? '✓' : '✗'}</div>
          <div class="stat-label">تلقائي</div>
        </div>
      </div>

      <!-- التفعيل/التعطيل -->
      <label style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: ${autoBackupEnabled ? '#E8F5E9' : '#FFEBEE'}; border-radius: var(--radius-md); cursor: pointer; margin-bottom: 12px; border: 2px solid ${autoBackupEnabled ? '#2E7D32' : '#C62828'};">
        <span>
          <strong style="color: ${autoBackupEnabled ? '#1B5E20' : '#B71C1C'}; font-size: 14px;">
            ${autoBackupEnabled ? '✅ النسخ التلقائي مفعّل' : '⛔ النسخ التلقائي معطّل'}
          </strong>
          <div style="font-size: 11px; color: ${autoBackupEnabled ? '#2E7D32' : '#C62828'}; margin-top: 2px;">
            ${autoBackupEnabled ? `نسخة تلقائية كل ${intervalHours} ساعة` : 'فعّل لحماية بياناتك تلقائياً'}
          </div>
        </span>
        <input type="checkbox" id="auto-backup-toggle" ${autoBackupEnabled ? 'checked' : ''} style="width: 24px; height: 24px; cursor: pointer;">
      </label>

      <!-- فترة النسخ -->
      <div class="form-group">
        <label>الفترة بين كل نسخة (بالساعات)</label>
        <select id="backup-interval" class="form-control">
          <option value="6" ${intervalHours === 6 ? 'selected' : ''}>كل 6 ساعات</option>
          <option value="12" ${intervalHours === 12 ? 'selected' : ''}>كل 12 ساعة</option>
          <option value="24" ${intervalHours === 24 ? 'selected' : ''}>كل 24 ساعة (يومياً)</option>
          <option value="48" ${intervalHours === 48 ? 'selected' : ''}>كل 48 ساعة</option>
          <option value="168" ${intervalHours === 168 ? 'selected' : ''}>كل أسبوع</option>
        </select>
      </div>

      <button class="btn btn-primary btn-full" id="save-backup-settings-btn">حفظ الإعدادات</button>
    </div>
  `;

  // ============================================================
  // قائمة النسخ
  // ============================================================
  html += `
    <div class="card">
      <div class="flex-between mb-2">
        <h3 class="card-title no-border" style="margin: 0; font-size: 15px;">📋 النسخ المحفوظة (${backups.length})</h3>
        ${backups.length > 0 ? `<button class="btn btn-danger" id="clear-all-backups-btn" style="font-size: 11px; padding: 4px 10px; min-height: 28px;">🗑️ مسح الكل</button>` : ''}
      </div>
  `;

  if (backups.length === 0) {
    html += `
      <div class="empty-state">
        <div class="empty-state-icon">💾</div>
        <p>لا توجد نسخ احتياطية بعد.</p>
        <button class="btn btn-primary mt-3" id="first-backup-btn">+ إنشاء أول نسخة</button>
      </div>
    `;
  } else {
    html += `<div style="display: flex; flex-direction: column; gap: 8px;">`;
    backups.forEach((backup, idx) => {
      const isNewest = idx === 0;
      const reasonLabels = {
        'scheduled': { label: 'تلقائية', color: '#1565C0', icon: '⏰' },
        'manual': { label: 'يدوية', color: '#2E7D32', icon: '👆' },
        'before-restore': { label: 'قبل الاسترجاع', color: '#F57C00', icon: '⚠️' },
        'before-import': { label: 'قبل الاستيراد', color: '#F57C00', icon: '⚠️' }
      };
      const reason = reasonLabels[backup.reason] || reasonLabels.manual;

      html += `
        <div class="backup-item" data-id="${backup.id}" style="border: 1px solid var(--border-color); border-right: 4px solid ${isNewest ? 'var(--primary-color)' : 'var(--border-strong)'}; padding: 12px; border-radius: var(--radius-md); background: var(--bg-color);">
          <div class="flex-between" style="margin-bottom: 8px;">
            <div>
              <div style="font-weight: 700; font-size: 14px;">
                📅 ${escapeHtml(backup.date)} — ${escapeHtml(backup.time)}
                ${isNewest ? '<span class="badge" style="background: var(--primary-color); color: white; margin-right: 6px; font-size: 10px;">الأحدث</span>' : ''}
              </div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                <span style="color: ${reason.color}; font-weight: 700;">${reason.icon} ${reason.label}</span>
                &nbsp;|&nbsp; 💾 ${backup.sizeKB} KB
              </div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-bottom: 8px; font-size: 10px; text-align: center;">
            <div style="background: var(--surface-color); padding: 4px; border-radius: var(--radius-sm);">
              <div style="font-weight: 800; color: var(--primary-color);">${backup.counts.customers}</div>
              <div style="color: var(--text-muted);">عميل</div>
            </div>
            <div style="background: var(--surface-color); padding: 4px; border-radius: var(--radius-sm);">
              <div style="font-weight: 800; color: #1565C0;">${backup.counts.orders}</div>
              <div style="color: var(--text-muted);">طلب</div>
            </div>
            <div style="background: var(--surface-color); padding: 4px; border-radius: var(--radius-sm);">
              <div style="font-weight: 800; color: var(--accent-color);">${backup.counts.payments}</div>
              <div style="color: var(--text-muted);">دفعة</div>
            </div>
            <div style="background: var(--surface-color); padding: 4px; border-radius: var(--radius-sm);">
              <div style="font-weight: 800; color: #C62828;">${backup.counts.expenses}</div>
              <div style="color: var(--text-muted);">مصروف</div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px;">
            <button class="btn btn-primary restore-backup-btn" data-id="${backup.id}" style="font-size: 11px; padding: 6px 4px; min-height: 32px;">♻️ استرجاع</button>
            <button class="btn btn-outline download-backup-btn" data-id="${backup.id}" style="font-size: 11px; padding: 6px 4px; min-height: 32px;">⬇️ تحميل</button>
            <button class="btn btn-danger delete-backup-btn" data-id="${backup.id}" style="font-size: 11px; padding: 6px 4px; min-height: 32px;">🗑️ حذف</button>
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }

  html += `</div>`;
  container.innerHTML = html;

  /* ============================================================
     ربط الأحداث
     ============================================================ */

  // تفعيل/تعطيل النسخ التلقائي
  const toggle = container.querySelector('#auto-backup-toggle');
  if (toggle) {
    toggle.addEventListener('change', (e) => {
      let s = storage.loadSettings() || { ...DEFAULT_SETTINGS };
      s.autoBackupEnabled = e.target.checked;
      storage.saveSettings(s);
      toast.success(e.target.checked ? 'تم تفعيل النسخ التلقائي' : 'تم تعطيل النسخ التلقائي');
      renderBackupsPage(container);
    });
  }

  // حفظ الإعدادات (الفترة)
  const saveBtn = container.querySelector('#save-backup-settings-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const interval = parseInt(container.querySelector('#backup-interval').value);
      let s = storage.loadSettings() || { ...DEFAULT_SETTINGS };
      s.autoBackupIntervalHours = interval;
      storage.saveSettings(s);
      toast.success('تم حفظ الإعدادات');
    });
  }

  // إنشاء نسخة جديدة
  const createBtn = container.querySelector('#create-backup-btn');
  if (createBtn) {
    createBtn.addEventListener('click', () => {
      const backup = createAutoBackup('manual');
      if (backup) {
        toast.success(`تم إنشاء نسخة احتياطية (${backup.sizeKB} KB)`);
        renderBackupsPage(container);
      } else {
        toast.error('فشل إنشاء النسخة');
      }
    });
  }

  const firstBtn = container.querySelector('#first-backup-btn');
  if (firstBtn) {
    firstBtn.addEventListener('click', () => {
      const backup = createAutoBackup('manual');
      if (backup) {
        toast.success('تم إنشاء أول نسخة احتياطية');
        renderBackupsPage(container);
      }
    });
  }

  // استرجاع نسخة
  container.querySelectorAll('.restore-backup-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      if (confirm('⚠️ سيتم استبدال كل البيانات الحالية بهذه النسخة!\n\nهل أنت متأكد؟')) {
        const result = restoreAutoBackup(id);
        if (result.success) {
          toast.success('✅ تم الاسترجاع بنجاح! جاري إعادة التحميل...');
          setTimeout(() => window.location.reload(), 1500);
        } else {
          toast.error(result.error || 'فشل الاسترجاع');
        }
      }
    });
  });

  // تحميل نسخة
  container.querySelectorAll('.download-backup-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      if (downloadBackup(id)) {
        toast.success('تم تحميل النسخة');
      } else {
        toast.error('فشل التحميل');
      }
    });
  });

  // حذف نسخة
  container.querySelectorAll('.delete-backup-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      if (confirm('هل أنت متأكد من حذف هذه النسخة؟')) {
        const result = deleteAutoBackup(id);
        if (result.success) {
          toast.success('تم الحذف');
          renderBackupsPage(container);
        } else {
          toast.error(result.error || 'فشل الحذف');
        }
      }
    });
  });

  // مسح الكل
  const clearAllBtn = container.querySelector('#clear-all-backups-btn');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      if (confirm('⚠️ سيتم حذف كل النسخ الاحتياطية!\n\nهل أنت متأكد؟')) {
        const result = clearAllBackups();
        if (result.success) {
          toast.success('تم مسح كل النسخ');
          renderBackupsPage(container);
        }
      }
    });
  }
}
