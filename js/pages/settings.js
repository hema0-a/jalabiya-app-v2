/* ============================================================
   settings.js - صفحة الإعدادات والنسخ الاحتياطي (V2)
   ============================================================ */

import * as db from '../core/db.js';
import { toast } from '../ui/toast.js';

export function renderSettingsPage(container) {
  container.innerHTML = `
    <div class="card">
      <h2 class="card-title">⚙️ الإعدادات</h2>
      
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

  // 1. تصدير البيانات
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

  // 2. استيراد البيانات
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

  // 3. حذف جميع البيانات
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
