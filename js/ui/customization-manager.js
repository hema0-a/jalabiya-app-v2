/* ============================================================
   customization-manager.js - إدارة المقاسات وأنواع الجلابيات (V2)
   ============================================================ */

import { toast } from './toast.js';
import { openModal, closeModal } from './modal.js';
import { DEFAULT_SETTINGS, DEFAULT_MEASUREMENT_FIELDS } from '../core/config.js';
import * as storage from '../core/storage.js';
import * as db from '../core/db.js';
import { uid } from '../core/utils.js';

/* ============================================================
   إدارة حقول المقاسات
   ============================================================ */

function getMeasurementFields() {
  const settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  const fields = settings.customMeasurementFields;
  if (!Array.isArray(fields) || fields.length === 0) {
    return [...DEFAULT_MEASUREMENT_FIELDS];
  }
  return fields;
}

function saveMeasurementFields(fields) {
  let settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  settings.customMeasurementFields = fields;
  storage.saveSettings(settings);
}

export function renderMeasurementFieldsSection() {
  const fields = getMeasurementFields();
  
  return `
    <div class="card" style="background: var(--bg-color); border: none; margin-bottom: 16px;">
      <div class="flex-between" style="margin-bottom: 12px;">
        <h3 style="font-size: 16px; margin: 0;">📏 حقول المقاسات</h3>
        <button class="btn btn-primary" id="add-measurement-field-btn" style="font-size: 12px; padding: 6px 12px; min-height: 32px;">+ إضافة حقل</button>
      </div>
      <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">
        تحكم في الحقول التي تظهر عند تسجيل مقاسات العملاء. يمكنك إضافة/تعديل/حذف أي حقل.
      </p>
      <div id="measurement-fields-list">
        ${fields.length === 0 
          ? '<p style="text-align:center; color: var(--text-muted); padding: 12px; font-size: 13px;">لا توجد حقول. أضف حقلاً جديداً.</p>'
          : fields.map(f => `
            <div class="measurement-field-item" data-id="${f.id}" style="display: flex; align-items: center; gap: 8px; padding: 10px; background: var(--surface-color); border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 6px;">
              <span style="font-size: 16px;">📏</span>
              <span style="flex: 1; font-size: 13px; ${f.enabled === false ? 'opacity: 0.5; text-decoration: line-through;' : ''}">${f.label}</span>
              <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; font-size: 11px;">
                <input type="checkbox" class="toggle-measurement-field" data-id="${f.id}" ${f.enabled !== false ? 'checked' : ''} style="width: 16px; height: 16px;">
                <span>مفعّل</span>
              </label>
              <button class="btn btn-outline edit-measurement-field" data-id="${f.id}" style="font-size: 11px; padding: 4px 8px; min-height: 30px;">✏️</button>
              <button class="btn btn-danger delete-measurement-field" data-id="${f.id}" style="font-size: 11px; padding: 4px 8px; min-height: 30px;">🗑️</button>
            </div>
          `).join('')
        }
      </div>
    </div>
  `;
}

export function initMeasurementFieldsSection(container, onUpdate) {
  const addBtn = container.querySelector('#add-measurement-field-btn');
  if (addBtn) addBtn.addEventListener('click', () => openMeasurementFieldModal(null, onUpdate));

  container.querySelectorAll('.toggle-measurement-field').forEach(chk => {
    chk.addEventListener('change', (e) => {
      const fields = getMeasurementFields();
      const field = fields.find(f => f.id === chk.dataset.id);
      if (field) {
        field.enabled = e.target.checked;
        saveMeasurementFields(fields);
        toast.success(e.target.checked ? 'تم تفعيل الحقل' : 'تم تعطيل الحقل');
      }
    });
  });

  container.querySelectorAll('.edit-measurement-field').forEach(btn => {
    btn.addEventListener('click', () => {
      const fields = getMeasurementFields();
      const field = fields.find(f => f.id === btn.dataset.id);
      if (field) openMeasurementFieldModal(field, onUpdate);
    });
  });

  container.querySelectorAll('.delete-measurement-field').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('هل أنت متأكد من حذف هذا الحقل؟')) {
        let fields = getMeasurementFields();
        fields = fields.filter(f => f.id !== btn.dataset.id);
        saveMeasurementFields(fields);
        toast.success('تم حذف الحقل');
        if (onUpdate) onUpdate();
      }
    });
  });
}

function openMeasurementFieldModal(field, onUpdate) {
  const isEdit = field !== null;
  const title = isEdit ? 'تعديل حقل المقاس' : 'إضافة حقل مقاس جديد';

  const formHtml = `
    <h3 class="card-title no-border">${title}</h3>
    <form id="measurement-field-form">
      <div class="form-group">
        <label>اسم الحقل *</label>
        <input type="text" id="mf-label" class="form-control" value="${isEdit ? field.label : ''}" placeholder="مثال: عرض الكم" required>
      </div>
      <div class="flex-between mt-2">
        <button type="button" class="btn btn-outline" id="cancel-mf-btn">إلغاء</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'تحديث' : 'حفظ'}</button>
      </div>
    </form>
  `;

  openModal(formHtml);

  document.getElementById('measurement-field-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const label = document.getElementById('mf-label').value.trim();
    if (!label) {
      toast.error('الرجاء إدخال اسم الحقل');
      return;
    }

    let fields = getMeasurementFields();

    if (isEdit) {
      const f = fields.find(x => x.id === field.id);
      if (f) f.label = label;
      toast.success('تم تحديث الحقل');
    } else {
      fields.push({ id: 'field_' + uid(), label, enabled: true });
      toast.success('تم إضافة الحقل');
    }

    saveMeasurementFields(fields);
    closeModal();
    if (onUpdate) onUpdate();
  });

  document.getElementById('cancel-mf-btn').addEventListener('click', closeModal);
}

/* ============================================================
   إدارة أنواع الجلابيات
   ============================================================ */

export function renderGarmentTypesSection() {
  const types = db.getGarmentTypes();

  return `
    <div class="card" style="background: var(--bg-color); border: none; margin-bottom: 16px;">
      <div class="flex-between" style="margin-bottom: 12px;">
        <h3 style="font-size: 16px; margin: 0;">👔 أنواع الجلابيات</h3>
        <button class="btn btn-primary" id="add-garment-type-btn" style="font-size: 12px; padding: 6px 12px; min-height: 32px;">+ إضافة نوع</button>
      </div>
      <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">
        أضف أنواع الجلابيات مع أسعارها. ستظهر هذه الأنواع تلقائياً عند إضافة طلب جديد.
      </p>
      <div id="garment-types-list">
        ${types.length === 0 
          ? '<p style="text-align:center; color: var(--text-muted); padding: 12px; font-size: 13px;">لا توجد أنواع بعد. أضف نوعاً جديداً.</p>'
          : types.map(t => `
            <div class="garment-type-item" data-id="${t.id}" style="display: flex; align-items: center; gap: 8px; padding: 10px; background: var(--surface-color); border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 6px;">
              <span style="font-size: 16px;">👔</span>
              <div style="flex: 1;">
                <div style="font-size: 13px; font-weight: 600;">${t.name}</div>
                <div style="font-size: 11px; color: var(--accent-color); font-weight: 700;">${t.price} جنيه</div>
              </div>
              <button class="btn btn-outline edit-garment-type" data-id="${t.id}" style="font-size: 11px; padding: 4px 8px; min-height: 30px;">✏️</button>
              <button class="btn btn-danger delete-garment-type" data-id="${t.id}" style="font-size: 11px; padding: 4px 8px; min-height: 30px;">🗑️</button>
            </div>
          `).join('')
        }
      </div>
    </div>
  `;
}

export function initGarmentTypesSection(container, onUpdate) {
  const addBtn = container.querySelector('#add-garment-type-btn');
  if (addBtn) addBtn.addEventListener('click', () => openGarmentTypeModal(null, onUpdate));

  container.querySelectorAll('.edit-garment-type').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = db.getGarmentType(btn.dataset.id);
      if (type) openGarmentTypeModal(type, onUpdate);
    });
  });

  container.querySelectorAll('.delete-garment-type').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('هل أنت متأكد من حذف هذا النوع؟')) {
        db.deleteGarmentType(btn.dataset.id);
        toast.success('تم حذف النوع');
        if (onUpdate) onUpdate();
      }
    });
  });
}

function openGarmentTypeModal(type, onUpdate) {
  const isEdit = type !== null;
  const title = isEdit ? 'تعديل نوع الجلابية' : 'إضافة نوع جديد';

  const formHtml = `
    <h3 class="card-title no-border">${title}</h3>
    <form id="garment-type-form">
      <div class="form-group">
        <label>اسم النوع *</label>
        <input type="text" id="gt-name" class="form-control" value="${isEdit ? type.name : ''}" placeholder="مثال: جلابية سادة رجالي" required>
      </div>
      <div class="form-group">
        <label>السعر الافتراضي (جنيه) *</label>
        <input type="number" id="gt-price" class="form-control" value="${isEdit ? type.price : ''}" placeholder="0" min="0" step="any" required>
      </div>
      <div class="form-group">
        <label>ملاحظات</label>
        <input type="text" id="gt-note" class="form-control" value="${isEdit ? (type.note || '') : ''}" placeholder="اختياري">
      </div>
      <div class="flex-between mt-2">
        <button type="button" class="btn btn-outline" id="cancel-gt-btn">إلغاء</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'تحديث' : 'حفظ'}</button>
      </div>
    </form>
  `;

  openModal(formHtml);

  document.getElementById('garment-type-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('gt-name').value.trim();
    const price = parseFloat(document.getElementById('gt-price').value) || 0;
    const note = document.getElementById('gt-note').value.trim();

    if (!name || price < 0) {
      toast.error('الرجاء ملء الحقول المطلوبة');
      return;
    }

    if (isEdit) {
      db.updateGarmentType(type.id, { name, price, note });
      toast.success('تم تحديث النوع');
    } else {
      db.addGarmentType({ name, price, note });
      toast.success('تم إضافة النوع بنجاح');
    }

    closeModal();
    if (onUpdate) onUpdate();
  });

  document.getElementById('cancel-gt-btn').addEventListener('click', closeModal);
}
