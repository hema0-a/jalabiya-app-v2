/* ============================================================
   settings.js - صفحة الإعدادات والنسخ الاحتياطي (V2)
   (تدعم تغيير الألوان + النسخ الاحتياطي)
   ============================================================ */

import * as db from '../core/db.js';
import { toast } from '../ui/toast.js';
import { saveTheme } from '../core/theme.js';
import { APP_CONFIG, DEFAULT_SETTINGS } from '../core/config.js';
import * as storage from '../core/storage.js';

export function renderSettingsPage(container) {
  // جلب الإعدادات الحالية أو الافتراضية
  const settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  const currentTheme = settings.theme || DEFAULT_SETTINGS.theme;

  container.innerHTML = `
    <div class="card">
      <h2 class="card-title">⚙️ الإعدادات</h2>
      
      <!-- قسم تخصيص الألوان -->
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

      <!-- قسم النسخ الاحتياطي -->
      <div class="card" style="background: var(--bg-color); border: none; margin-bottom: 16px;">
        <h3 style="font-size: 16px; margin-bottom: 12px;">💾 النسخ الاحتياطي والاستيراد</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
          يمكنك تصدير بياناتك كملف نسخة احتياطية، أو استيراد ملف سابق لاستعادة البيانات.
        </p>
        
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button class="btn btn-primary" id="export-btn">📤 تصدير البيانات (نسخ احتياطي)</button>
          
          <label for="import-file" class="btn btn-outline" style="cursor: pointer; text-align: center; display: block;">
            📥 استيراد البيانات (استعادة)
          </label>
          <input type="file" id="import-file" accept=".json" style="display: none;">
        </div>
      </div>

      <!-- قسم منطقة الخطر -->
      <div class="card" style="background: #fff5f5; border: 1px solid #f5c6cb; border-radius: var(--radius-lg);">
        <h3 style="font-size: 16px; color: #dc3545; margin-bottom: 12px;">⚠️ منطقة الخطر</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
          حذف جميع البيانات نهائياً. لا يمكن التراجع عن هذه العملية.
        </p>
        <button class="btn btn-danger" id="reset-btn">🗑️ حذف جميع البيانات</button>
      </div>
    </div>
  `;

  // ===== أحداث الألوان =====
  const saveThemeBtn = container.querySelector('#save-theme-btn');
  saveThemeBtn.addEventListener('click', () => {
    const theme = {
      primary: document.getElementById('color-primary').value,
      accent: document.getElementById('color-accent').value,
      bg: document.getElementById('color-bg').value
    };
    saveTheme(theme);
    toast.success('تم حفظ الألوان بنجاح');
  });

  const resetThemeBtn = container.querySelector('#reset-theme-btn');
  resetThemeBtn.addEventListener('click', () => {
    if (confirm('هل تريد استعادة الألوان الافتراضية؟')) {
      saveTheme(DEFAULT_SETTINGS.theme);
      // إعادة تحميل الصفحة لتحديث قيم حقول الألوان
      renderSettingsPage(container);
      toast.success('تم استعادة الألوان الافتراضية');
    }
  });

  // ===== أحداث النسخ الاحتياطي =====
  const exportBtn = container.querySelector('#export-btn');
  exportBtn.addEventListener('click', () => {
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

  const importInput = container.querySelector('#import-file');
  importInput.addEventListener('change', (e) => {
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
    importInput.value = '';
  });

  // ===== حدث حذف البيانات =====
  const resetBtn = container.querySelector('#reset-btn');
  resetBtn.addEventListener('click', () => {
    if (confirm('هل أنت متأكد تماماً؟ سيتم حذف جميع البيانات نهائياً!')) {
      if (confirm('تأكيد أخير: هل أنت متأكد؟ لا يمكن التراجع!')) {
        db.reset();
        toast.success('تم حذف جميع البيانات');
        setTimeout(() => window.location.reload(), 1000);
      }
    }
  });
}
