/* ============================================================
   settings.js - صفحة الإعدادات الشاملة (V2)
   (معلومات الورشة + الألوان + الأمان PIN + النسخ الاحتياطي + منطقة الخطر)
   ============================================================ */

import * as db from '../core/db.js';
import { toast } from '../ui/toast.js';
import { saveTheme } from '../core/theme.js';
import { changePin } from '../core/auth.js';
import { APP_CONFIG, DEFAULT_SETTINGS } from '../core/config.js';
import * as storage from '../core/storage.js';

export function renderSettingsPage(container) {
  // جلب الإعدادات الحالية أو الافتراضية
  const settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  const currentTheme = settings.theme || DEFAULT_SETTINGS.theme;
  const currentLogo = settings.workshopLogo || null;
  const currentName = settings.workshopName || DEFAULT_SETTINGS.workshopName;

  container.innerHTML = `
    <div class="card">
      <h2 class="card-title">⚙️ الإعدادات</h2>

      <!-- ============================================================
           قسم معلومات الورشة
           ============================================================ -->
      <div class="card" style="background: var(--bg-color); border: none; margin-bottom: 16px;">
        <h3 style="font-size: 16px; margin-bottom: 12px;">🏢 معلومات الورشة</h3>
        
        <div class="form-group">
          <label>اسم الورشة</label>
          <input type="text" id="workshop-name" class="form-control" value="${currentName}" placeholder="مثال: ورشة تفصيل الجلابيب">
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
           قسم تخصيص الألوان
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
           قسم الأمان (تغيير PIN)
           ============================================================ -->
      <div class="card" style="background: var(--bg-color); border: none; margin-bottom: 16px;">
        <h3 style="font-size: 16px; margin-bottom: 12px;">🔒 الأمان</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">
          قم بتغيير الرقم السري (PIN) لحماية التطبيق. الرقم يجب أن يكون 4 أرقام.
        </p>
        
        <button class="btn btn-primary btn-full" id="change-pin-btn">🔑 تغيير الرقم السري</button>
      </div>

      <!-- ============================================================
           قسم النسخ الاحتياطي
           ============================================================ -->
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

      <!-- ============================================================
           منطقة الخطر
           ============================================================ -->
      <div class="card" style="background: #fff5f5; border: 1px solid #f5c6cb; border-radius: var(--radius-lg);">
        <h3 style="font-size: 16px; color: #dc3545; margin-bottom: 12px;">⚠️ منطقة الخطر</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
          حذف جميع البيانات نهائياً. لا يمكن التراجع عن هذه العملية.
        </p>
        <button class="btn btn-danger" id="reset-btn">🗑️ حذف جميع البيانات</button>
      </div>
    </div>
  `;

  // ============================================================
  // أحداث معلومات الورشة
  // ============================================================
  const logoInput = container.querySelector('#logo-file');
  const logoPreview = container.querySelector('#logo-preview');
  const logoPlaceholder = container.querySelector('#logo-placeholder');
  let tempLogo = currentLogo;

  logoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // التحقق من حجم الملف
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

  // ============================================================
  // أحداث الألوان
  // ============================================================
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
      renderSettingsPage(container);
      toast.success('تم استعادة الألوان الافتراضية');
    }
  });

  // ============================================================
  // حدث تغيير الـ PIN
  // ============================================================
  const changePinBtn = container.querySelector('#change-pin-btn');
  changePinBtn.addEventListener('click', () => {
    const formHtml = `
      <h3 class="card-title">🔑 تغيير الرقم السري</h3>
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
          <button type="submit" class="btn btn-primary">تغيير الرقم</button>
        </div>
      </form>
    `;

    openModal(formHtml);

    const form = document.getElementById('pin-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const oldPin = document.getElementById('old-pin').value.trim();
      const newPin = document.getElementById('new-pin').value.trim();
      const confirmPin = document.getElementById('confirm-pin').value.trim();

      // 1. التحقق من الرقم الحالي
      const dbState = storage.loadDB();
      const correctPin = dbState ? (dbState.password || '0000') : '0000';
      if (oldPin !== String(correctPin)) {
        toast.error('الرقم السري الحالي غير صحيح');
        return;
      }

      // 2. التحقق من صيغة الرقم الجديد
      if (!/^\d{4}$/.test(newPin)) {
        toast.error('الرقم الجديد يجب أن يكون 4 أرقام');
        return;
      }

      // 3. التحقق من التطابق
      if (newPin !== confirmPin) {
        toast.error('الرقم الجديد وتأكيده غير متطابقين');
        return;
      }

      // 4. تغيير الرقم
      const success = changePin(newPin);
      if (success) {
        toast.success('تم تغيير الرقم السري بنجاح');
        closeModal();
      } else {
        toast.error('فشل تغيير الرقم السري');
      }
    });

    document.getElementById('cancel-pin-btn').addEventListener('click', closeModal);
  });

  // ============================================================
  // أحداث النسخ الاحتياطي
  // ============================================================
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

  // ============================================================
  // حدث حذف البيانات
  // ============================================================
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
