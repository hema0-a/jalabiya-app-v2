/* ============================================================
   occasions.js - صفحة إدارة المواسم والأعياد (V2)
   (إضافة/تعديل/حذف المواسم + تنبيهات + اقتراحات)
   ============================================================ */

import * as db from '../core/db.js';
import { toast } from '../ui/toast.js';
import { openModal, closeModal } from '../ui/modal.js';
import { today, formatDate, escapeHtml } from '../core/utils.js';
import {
  getCriticalOccasionAlerts,
  getTimeUntilOccasion,
  getOccasionsStats,
  suggestOccasionPricing,
  getOccasionIcon,
  generatePreparationPlan
} from '../core/occasions.js';

const MONTH_NAMES = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                     'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

/* ============================================================
   الصفحة الرئيسية
   ============================================================ */
export function renderOccasionsPage(container) {
  const stats = getOccasionsStats();
  const alerts = getCriticalOccasionAlerts();
  const allOccasions = db.getOccasions();

  let html = `
    <div class="card">
      <div class="flex-between mb-2">
        <h2 class="card-title no-border" style="margin:0;">🎉 المواسم والأعياد</h2>
        <button class="btn btn-primary" id="add-occasion-btn">+ إضافة مناسبة</button>
      </div>

      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
        أضف المواسم والأعياد (رمضان، عيد الفطر، المولد...) وسينبهك التطبيق قبلها استعداداً للطلبات.
      </p>

      <!-- الإحصائيات -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px;">
        <div class="stat-card" style="padding: 10px 6px;">
          <div class="stat-value" style="font-size: 20px;">${stats.total}</div>
          <div class="stat-label">إجمالي</div>
        </div>
        <div class="stat-card" style="padding: 10px 6px;">
          <div class="stat-value" style="font-size: 20px; color: #2E7D32;">${stats.enabled}</div>
          <div class="stat-label">مفعّلة</div>
        </div>
        <div class="stat-card" style="padding: 10px 6px;">
          <div class="stat-value" style="font-size: 20px; color: ${stats.alertCount > 0 ? '#C62828' : 'var(--text-muted)'};">${stats.alertCount}</div>
          <div class="stat-label">تحتاج تنبيه</div>
        </div>
      </div>

      ${stats.next ? `
        <div style="background: linear-gradient(135deg, var(--primary-color), var(--primary-dark)); color: white; padding: 12px; border-radius: var(--radius-md); margin-bottom: 16px;">
          <div style="font-size: 11px; opacity: 0.85;">🎯 المناسبة القادمة</div>
          <div style="font-size: 18px; font-weight: 800; margin-top: 4px;">
            ${getOccasionIcon(stats.next)} ${stats.next.name}
          </div>
          <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">
            📅 ${formatDate(stats.next.nextDate)} — ${getTimeUntilOccasion(stats.next)}
          </div>
        </div>
      ` : ''}
    </div>
  `;

  // ============================================================
  // التنبيهات
  // ============================================================
  if (alerts.length > 0) {
    html += `
      <div class="card">
        <h3 class="card-title" style="font-size: 15px;">🔔 تنبيهات المواسم</h3>
        ${alerts.map(occ => {
          const pricingSuggestions = suggestOccasionPricing(occ);
          const plan = generatePreparationPlan(occ);
          
          return `
            <div style="background: ${occ.bg}; border-right: 4px solid ${occ.color}; padding: 12px; border-radius: var(--radius-md); margin-bottom: 10px;">
              <div class="flex-between" style="margin-bottom: 6px;">
                <div style="font-weight: 800; font-size: 14px; color: ${occ.color};">
                  ${getOccasionIcon(occ)} ${escapeHtml(occ.name)}
                </div>
                <div style="font-size: 12px; font-weight: 700; color: ${occ.color};">
                  ${occ.daysLeft === 0 ? 'اليوم!' : occ.daysLeft === 1 ? 'غداً' : `بعد ${occ.daysLeft} يوم`}
                </div>
              </div>
              <div style="font-size: 12px; color: ${occ.color}; margin-bottom: 8px;">
                📅 ${formatDate(occ.nextDate)}
              </div>
              
              <!-- اقتراحات الأسعار -->
              <div style="background: rgba(255,255,255,0.5); padding: 8px 10px; border-radius: var(--radius-md); margin-top: 8px;">
                <div style="font-size: 11px; font-weight: 700; color: ${occ.color}; margin-bottom: 6px;">💡 اقتراحات:</div>
                ${pricingSuggestions.slice(0, 3).map(s => `
                  <div style="font-size: 11px; color: ${occ.color}; margin-bottom: 4px; display: flex; gap: 6px;">
                    <span>${s.icon}</span>
                    <span>${escapeHtml(s.text)}</span>
                  </div>
                `).join('')}
              </div>
              
              <!-- خطة الاستعداد -->
              <div style="margin-top: 8px;">
                <div style="font-size: 11px; font-weight: 700; color: ${occ.color}; margin-bottom: 6px;">📋 خطة الاستعداد:</div>
                ${plan.slice(0, 4).map(p => `
                  <div style="font-size: 11px; color: ${occ.color}; margin-bottom: 3px; padding-right: 12px; position: relative;">
                    <span style="position: absolute; right: 0;">•</span>
                    ${escapeHtml(p)}
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // ============================================================
  // قائمة كل المواسم
  // ============================================================
  html += `
    <div class="card">
      <h3 class="card-title" style="font-size: 15px;">📋 جميع المواسم (${allOccasions.length})</h3>
  `;

  if (allOccasions.length === 0) {
    html += `
      <div class="empty-state">
        <div class="empty-state-icon">🎉</div>
        <p>لا توجد مواسم مضافة.</p>
      </div>
    `;
  } else {
    // ترتيب حسب الشهر
    const sorted = [...allOccasions].sort((a, b) => {
      if (a.month !== b.month) return a.month - b.month;
      return a.day - b.day;
    });

    html += `<div style="display: flex; flex-direction: column; gap: 8px;">`;
    sorted.forEach(occ => {
      const isDisabled = occ.enabled === false;
      html += `
        <div class="occasion-item" data-id="${occ.id}" style="border: 1px solid var(--border-color); border-right: 4px solid ${isDisabled ? '#ccc' : 'var(--primary-color)'}; padding: 10px 12px; border-radius: var(--radius-md); background: ${isDisabled ? '#f5f5f5' : 'var(--bg-color)'}; cursor: pointer; ${isDisabled ? 'opacity: 0.6;' : ''}">
          <div class="flex-between">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="font-size: 22px;">${getOccasionIcon(occ)}</div>
              <div>
                <div style="font-weight: 700; font-size: 14px;">${escapeHtml(occ.name)}</div>
                <div style="font-size: 11px; color: var(--text-muted);">
                  📅 ${occ.day} ${MONTH_NAMES[occ.month - 1]}
                  ${occ.recurring ? ' • 🔁 سنوي' : ''}
                </div>
              </div>
            </div>
            <div style="text-align: left; font-size: 11px;">
              ${isDisabled 
                ? '<span style="color: #999; font-weight: 700;">معطّلة</span>' 
                : `<span style="color: var(--primary-color); font-weight: 700;">تنبيه قبل ${occ.alertDaysBefore} يوم</span>`
              }
            </div>
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }

  html += `</div>`;
  container.innerHTML = html;

  /* ============================================================
     نموذج إضافة/تعديل مناسبة
     ============================================================ */
  function openOccasionModal(occasion = null) {
    const isEdit = occasion !== null;
    const title = isEdit ? 'تعديل المناسبة' : 'إضافة مناسبة جديدة';

    const monthOptions = MONTH_NAMES.map((m, i) => {
      const selected = (isEdit && occasion.month === (i + 1)) ? 'selected' : '';
      return `<option value="${i + 1}" ${selected}>${m}</option>`;
    }).join('');

    const formHtml = `
      <h3 class="card-title no-border">${title}</h3>
      <form id="occasion-form">
        <div class="form-group">
          <label>اسم المناسبة *</label>
          <input type="text" id="occ-name" class="form-control" value="${isEdit ? escapeHtml(occasion.name) : ''}" placeholder="مثال: عيد الفطر" required>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div class="form-group">
            <label>الشهر *</label>
            <select id="occ-month" class="form-control" required>
              ${monthOptions}
            </select>
          </div>
          <div class="form-group">
            <label>اليوم *</label>
            <input type="number" id="occ-day" class="form-control" value="${isEdit ? occasion.day : 1}" min="1" max="31" required>
          </div>
        </div>

        <div class="form-group">
          <label>الأيقونة (إيموجي)</label>
          <input type="text" id="occ-icon" class="form-control" value="${isEdit ? escapeHtml(occasion.icon || '🎉') : '🎉'}" placeholder="🎉" maxlength="4" style="font-size: 24px; text-align: center;">
        </div>

        <div class="form-group">
          <label>كم يوماً قبل المناسبة تُنبَّه؟ *</label>
          <input type="number" id="occ-alert-days" class="form-control" value="${isEdit ? occasion.alertDaysBefore : 14}" min="1" max="90" required>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
            💡 يبدأ التنبيه قبل المناسبة بهذه المدة.
          </div>
        </div>

        <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px; background: var(--bg-color); border-radius: var(--radius-md); cursor: pointer; margin-bottom: 8px;">
          <span>
            <strong>🔁 متكررة سنوياً</strong>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">تعود المناسبة كل سنة في نفس التاريخ</div>
          </span>
          <input type="checkbox" id="occ-recurring" ${!isEdit || occasion.recurring !== false ? 'checked' : ''} style="width: 20px; height: 20px;">
        </label>

        <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px; background: var(--bg-color); border-radius: var(--radius-md); cursor: pointer; margin-bottom: 12px;">
          <span>
            <strong>🔔 تفعيل التنبيه</strong>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">إظهار التنبيه قبل المناسبة</div>
          </span>
          <input type="checkbox" id="occ-enabled" ${!isEdit || occasion.enabled !== false ? 'checked' : ''} style="width: 20px; height: 20px;">
        </label>

        <div class="flex-between mt-2">
          <div>
            ${isEdit ? `<button type="button" class="btn btn-danger" id="delete-occasion-btn">حذف</button>` : ''}
          </div>
          <div>
            <button type="button" class="btn btn-outline" id="cancel-occasion-btn">إلغاء</button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'تحديث' : 'حفظ'}</button>
          </div>
        </div>
      </form>
    `;

    openModal(formHtml);

    document.getElementById('occasion-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('occ-name').value.trim();
      const month = parseInt(document.getElementById('occ-month').value);
      const day = parseInt(document.getElementById('occ-day').value);
      const icon = document.getElementById('occ-icon').value.trim() || '🎉';
      const alertDaysBefore = parseInt(document.getElementById('occ-alert-days').value);
      const recurring = document.getElementById('occ-recurring').checked;
      const enabled = document.getElementById('occ-enabled').checked;

      if (!name || !month || !day || !alertDaysBefore) {
        toast.error('الرجاء ملء جميع الحقول المطلوبة');
        return;
      }

      if (day < 1 || day > 31) {
        toast.error('اليوم يجب أن يكون بين 1 و 31');
        return;
      }

      const data = { name, month, day, icon, alertDaysBefore, recurring, enabled };

      if (isEdit) {
        db.updateOccasion(occasion.id, data);
        toast.success('تم تحديث المناسبة');
      } else {
        db.addOccasion(data);
        toast.success('تم إضافة المناسبة بنجاح');
      }

      closeModal();
      renderOccasionsPage(container);
    });

    document.getElementById('cancel-occasion-btn').addEventListener('click', closeModal);

    if (isEdit) {
      document.getElementById('delete-occasion-btn').addEventListener('click', () => {
        if (confirm('هل أنت متأكد من حذف هذه المناسبة؟')) {
          db.deleteOccasion(occasion.id);
          toast.success('تم حذف المناسبة');
          closeModal();
          renderOccasionsPage(container);
        }
      });
    }
  }

  /* ============================================================
     ربط الأحداث
     ============================================================ */
  const addBtn = container.querySelector('#add-occasion-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => openOccasionModal(null));
  }

  container.querySelectorAll('.occasion-item').forEach(item => {
    item.addEventListener('click', () => {
      const occ = db.getOccasion(item.dataset.id);
      if (occ) openOccasionModal(occ);
    });
  });
}
