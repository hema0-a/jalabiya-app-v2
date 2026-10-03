/* ============================================================
   auto-messages-settings.js - صفحة إعدادات الرسائل التلقائية (V2)
   (تخصيص القوالب + تفعيل/تعطيل + معاينة)
   ============================================================ */

import { toast } from '../ui/toast.js';
import { openModal, closeModal } from '../ui/modal.js';
import { escapeHtml } from '../core/utils.js';
import {
  getMessageTemplates,
  saveMessageTemplate,
  resetMessageTemplate,
  previewTemplate,
  getAvailableVariables,
  canAutoSend,
  setAutoSendEnabled,
  DEFAULT_MESSAGE_TEMPLATES
} from '../core/auto-messages.js';

/* ============================================================
   الصفحة الرئيسية
   ============================================================ */
export function renderAutoMessagesSettingsPage(container) {
  const templates = getMessageTemplates();
  const enabled = canAutoSend();

  let html = `
    <div class="card">
      <div class="flex-between mb-2">
        <h2 class="card-title no-border" style="margin: 0;">💬 الرسائل التلقائية</h2>
        <a href="#/settings" class="btn btn-outline" style="font-size: 12px; padding: 6px 12px; min-height: 32px; text-decoration: none;">← الإعدادات</a>
      </div>

      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
        خصص القوالب التلقائية التي تُرسل للعملاء عبر واتساب عند تغيير حالة الطلب.
      </p>

      <!-- المفتاح الرئيسي -->
      <label style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: ${enabled ? '#E8F5E9' : '#FFEBEE'}; border-radius: var(--radius-md); cursor: pointer; margin-bottom: 16px; border: 2px solid ${enabled ? '#2E7D32' : '#C62828'};">
        <span>
          <strong style="color: ${enabled ? '#1B5E20' : '#B71C1C'}; font-size: 14px;">
            ${enabled ? '✅ الإرسال التلقائي مفعّل' : '⛔ الإرسال التلقائي معطّل'}
          </strong>
          <div style="font-size: 11px; color: ${enabled ? '#2E7D32' : '#C62828'}; margin-top: 2px;">
            ${enabled ? 'سيظهر زر الإرسال بجانب كل حالة' : 'فعّل لإظهار زر الإرسال بجانب كل حالة'}
          </div>
        </span>
        <input type="checkbox" id="auto-messages-toggle" ${enabled ? 'checked' : ''} style="width: 24px; height: 24px; cursor: pointer;">
      </label>

      <!-- المتغيرات المتاحة -->
      <div style="background: var(--bg-color); padding: 12px; border-radius: var(--radius-md); margin-bottom: 16px;">
        <h4 style="font-size: 13px; margin-bottom: 8px; color: var(--primary-dark);">📝 المتغيرات المتاحة:</h4>
        <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px;">
          انسخ أي متغير والصقه في القالب، وسيتم استبداله تلقائياً بالقيمة الحقيقية.
        </p>
        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
          ${getAvailableVariables().map(v => `
            <button type="button" class="variable-chip" data-var="${v.var}" style="padding: 4px 10px; background: var(--surface-color); border: 1px solid var(--border-color); border-radius: var(--radius-full); font-size: 11px; font-family: monospace; direction: ltr; cursor: pointer; color: var(--primary-color); font-weight: 600;">
              ${v.var}
            </button>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- قائمة القوالب -->
    <div class="card">
      <h3 class="card-title" style="font-size: 15px;">📋 قوالب الرسائل (${Object.keys(templates).length})</h3>
      <div style="display: flex; flex-direction: column; gap: 10px;">
        ${Object.keys(templates).map(key => {
          const template = templates[key];
          return `
            <div style="border: 1px solid var(--border-color); border-right: 4px solid ${template.enabled ? 'var(--primary-color)' : '#ccc'}; padding: 12px; border-radius: var(--radius-md); background: var(--bg-color);">
              <div class="flex-between" style="margin-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <div style="font-size: 22px;">${template.icon}</div>
                  <div>
                    <div style="font-weight: 700; font-size: 14px;">${escapeHtml(template.label)}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">
                      ${template.enabled ? '✅ مفعّل' : '⛔ معطّل'}
                    </div>
                  </div>
                </div>
                <div style="display: flex; gap: 6px;">
                  <button type="button" class="toggle-template-btn" data-key="${key}" data-enabled="${template.enabled}" style="background: ${template.enabled ? '#2E7D32' : '#999'}; color: white; border: none; padding: 6px 10px; border-radius: var(--radius-md); font-size: 11px; cursor: pointer; font-weight: 700;">
                    ${template.enabled ? '⏸️ تعطيل' : '▶️ تفعيل'}
                  </button>
                  <button type="button" class="edit-template-btn" data-key="${key}" style="background: var(--accent-color); color: white; border: none; padding: 6px 10px; border-radius: var(--radius-md); font-size: 11px; cursor: pointer; font-weight: 700;">
                    ✏️ تعديل
                  </button>
                </div>
              </div>
              <div style="background: var(--surface-color); padding: 10px; border-radius: var(--radius-md); font-size: 12px; color: var(--text-secondary); white-space: pre-wrap; line-height: 1.6; max-height: 100px; overflow: hidden;">
                ${escapeHtml(template.text.substring(0, 150))}${template.text.length > 150 ? '...' : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  container.innerHTML = html;

  /* ============================================================
     ربط الأحداث
     ============================================================ */

  // المفتاح الرئيسي
  const mainToggle = container.querySelector('#auto-messages-toggle');
  mainToggle.addEventListener('change', (e) => {
    const newState = setAutoSendEnabled(e.target.checked);
    toast.success(newState ? 'تم تفعيل الإرسال التلقائي' : 'تم تعطيل الإرسال التلقائي');
    renderAutoMessagesSettingsPage(container);
  });

  // المتغيرات - نسخ عند النقر
  container.querySelectorAll('.variable-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const text = chip.dataset.var;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          toast.success(`تم نسخ: ${text}`);
        }).catch(() => {
          toast.info(`انسخ يدوياً: ${text}`);
        });
      } else {
        toast.info(`انسخ يدوياً: ${text}`);
      }
    });
  });

  // تفعيل/تعطيل قالب
  container.querySelectorAll('.toggle-template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      const wasEnabled = btn.dataset.enabled === 'true';
      saveMessageTemplate(key, { enabled: !wasEnabled });
      toast.success(wasEnabled ? 'تم تعطيل القالب' : 'تم تفعيل القالب');
      renderAutoMessagesSettingsPage(container);
    });
  });

  // تعديل قالب
  container.querySelectorAll('.edit-template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      openEditTemplateModal(key, container);
    });
  });
}

/* ============================================================
   نافذة تعديل القالب
   ============================================================ */
function openEditTemplateModal(key, container) {
  const templates = getMessageTemplates();
  const template = templates[key];
  if (!template) return;

  const variables = getAvailableVariables();

  const formHtml = `
    <h3 class="card-title no-border">${template.icon} ${escapeHtml(template.label)}</h3>
    <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">
      عدّل نص الرسالة، واستخدم المتغيرات من القائمة أدناه.
    </p>

    <!-- أزرار المتغيرات السريعة -->
    <div style="background: var(--bg-color); padding: 10px; border-radius: var(--radius-md); margin-bottom: 12px;">
      <div style="font-size: 11px; font-weight: 700; margin-bottom: 6px; color: var(--primary-dark);">
        📝 اضغط على متغير لإضافته في نهاية النص:
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 4px;">
        ${variables.map(v => `
          <button type="button" class="insert-var-btn" data-var="${v.var}" style="padding: 3px 8px; background: var(--surface-color); border: 1px solid var(--border-color); border-radius: var(--radius-full); font-size: 10px; font-family: monospace; direction: ltr; cursor: pointer; color: var(--primary-color); font-weight: 600;">
            ${v.var}
          </button>
        `).join('')}
      </div>
    </div>

    <form id="template-form">
      <div class="form-group">
        <label>نص الرسالة *</label>
        <textarea id="template-text" class="form-control" rows="10" style="font-family: inherit; line-height: 1.6; min-height: 200px;" required>${escapeHtml(template.text)}</textarea>
        <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;" id="char-counter">
          عدد الأحرف: ${template.text.length}
        </div>
      </div>

      <div class="form-group">
        <label>معاينة الرسالة (بعد استبدال المتغيرات)</label>
        <div id="template-preview" style="background: #E8F5E9; padding: 12px; border-radius: var(--radius-md); font-size: 12px; white-space: pre-wrap; line-height: 1.6; color: #1B5E20; border: 1px solid #A5D6A7;"></div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px;">
        <button type="button" class="btn btn-outline" id="reset-template-btn">↩️ استعادة الافتراضي</button>
        <button type="button" class="btn btn-outline" id="cancel-template-btn">إلغاء</button>
      </div>
      <button type="submit" class="btn btn-primary btn-full mt-2">💾 حفظ التعديلات</button>
    </form>
  `;

  openModal(formHtml);

  const textarea = document.getElementById('template-text');
  const preview = document.getElementById('template-preview');
  const counter = document.getElementById('char-counter');

  // تحديث المعاينة والعداد
  function updatePreview() {
    counter.textContent = `عدد الأحرف: ${textarea.value.length}`;

    // معاينة باستبدال المتغيرات
    const sample = {
      '{customer_name}': 'أحمد محمد',
      '{workshop_name}': 'ورشة تفصيل الجلابيب',
      '{garment_type}': 'جلابية سادة',
      '{total_price}': '500',
      '{deposit}': '200',
      '{remaining}': '300',
      '{due_date}': '2026/01/25',
      '{received_date}': '2026/01/20',
      '{today}': '2026/01/22'
    };

    let previewText = textarea.value;
    Object.entries(sample).forEach(([placeholder, value]) => {
      previewText = previewText.split(placeholder).join(value);
    });
    preview.textContent = previewText;
  }

  updatePreview();

  textarea.addEventListener('input', updatePreview);

  // إدراج متغير في النص
  document.querySelectorAll('.insert-var-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const varText = btn.dataset.var;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const before = textarea.value.substring(0, start);
      const after = textarea.value.substring(end);

      textarea.value = before + varText + after;
      textarea.focus();
      textarea.setSelectionRange(start + varText.length, start + varText.length);
      updatePreview();
    });
  });

  // حفظ التعديلات
  document.getElementById('template-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const newText = textarea.value.trim();
    if (!newText) {
      toast.error('الرسالة لا يمكن أن تكون فارغة');
      return;
    }
    saveMessageTemplate(key, { text: newText });
    toast.success('تم حفظ القالب بنجاح');
    closeModal();
    renderAutoMessagesSettingsPage(container);
  });

  // استعادة الافتراضي
  document.getElementById('reset-template-btn').addEventListener('click', () => {
    if (confirm('هل تريد استعادة القالب الافتراضي؟ سيتم فقدان التعديلات الحالية.')) {
      resetMessageTemplate(key);
      const defaultTemplate = DEFAULT_MESSAGE_TEMPLATES[key];
      textarea.value = defaultTemplate.text;
      updatePreview();
      toast.success('تم استعادة القالب الافتراضي');
    }
  });

  // إلغاء
  document.getElementById('cancel-template-btn').addEventListener('click', closeModal);
}
