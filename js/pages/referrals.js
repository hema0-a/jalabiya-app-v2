/* ============================================================
   referrals.js - صفحة نظام الإحالات (V2)
   (تسجيل من رشّح من + تتبع المكافآت + الإحصائيات)
   ============================================================ */

import * as db from '../core/db.js';
import { toast } from '../ui/toast.js';
import { openModal, closeModal } from '../ui/modal.js';
import { today, money, formatDate, uid } from '../core/utils.js';
import { events } from '../core/events.js';
import * as storage from '../core/storage.js';
import { DEFAULT_SETTINGS } from '../core/config.js';

// متغيرات حالة الصفحة
let searchQuery = '';

/* ============================================================
   دوال مساعدة محلية للتعامل مع الإحالات
   ============================================================ */
function getReferrals() {
  const state = db.getState();
  if (!Array.isArray(state.referrals)) state.referrals = [];
  return state.referrals;
}

function addReferral(data) {
  const state = db.getState();
  if (!Array.isArray(state.referrals)) state.referrals = [];
  const newReferral = {
    ...data,
    id: uid(),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  state.referrals.push(newReferral);
  db.save(true);
  events.emit('referral:added', newReferral);
  return newReferral;
}

function updateReferral(id, updates) {
  const state = db.getState();
  const referral = state.referrals.find(r => r.id === id);
  if (!referral) return null;
  Object.assign(referral, updates, { updatedAt: Date.now() });
  db.save(true);
  return referral;
}

function deleteReferral(id) {
  const state = db.getState();
  const idx = state.referrals.findIndex(r => r.id === id);
  if (idx === -1) return false;
  const [referral] = state.referrals.splice(idx, 1);
  state.trash.push({ id: uid(), type: 'referral', data: referral, deletedAt: today() });
  db.save(true);
  return true;
}

/* ============================================================
   صفحة الإحالات الرئيسية
   ============================================================ */
export function renderReferralsPage(container) {
  const allReferrals = getReferrals();
  const customers = db.getCustomers();

  // جلب نسبة المكافأة من الإعدادات
  const settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  const rewardPercent = settings.referralRewardPercent || 5;

  // 1. تصفية الإحالات بالبحث
  const referrals = allReferrals.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (r.referrerName || '').toLowerCase().includes(q) ||
           (r.referredName || '').toLowerCase().includes(q);
  }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  // 2. حساب الإحصائيات
  const totalReferrals = allReferrals.length;
  const totalRewards = allReferrals.reduce((sum, r) => sum + (r.reward || 0), 0);
  const paidRewards = allReferrals.filter(r => r.rewardPaid).reduce((sum, r) => sum + (r.reward || 0), 0);
  const pendingRewards = totalRewards - paidRewards;

  // 3. بناء الواجهة
  let html = `
    <div class="card">
      <div class="flex-between mb-2">
        <h2 class="card-title no-border" style="margin:0;">🤝 نظام الإحالات</h2>
        <button class="btn btn-primary" id="add-referral-btn">+ إحالة جديدة</button>
      </div>

      <!-- إحصائيات -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px;">
        <div class="stat-card" style="padding: 10px 6px;">
          <div class="stat-value" style="font-size: 20px;">${totalReferrals}</div>
          <div class="stat-label">إجمالي الإحالات</div>
        </div>
        <div class="stat-card" style="padding: 10px 6px;">
          <div class="stat-value" style="font-size: 18px; color: #2E7D32;">${money(paidRewards)}</div>
          <div class="stat-label">مكافآت مدفوعة</div>
        </div>
        <div class="stat-card" style="padding: 10px 6px;">
          <div class="stat-value" style="font-size: 18px; color: #dc3545;">${money(pendingRewards)}</div>
          <div class="stat-label">مكافآت معلقة</div>
        </div>
      </div>

      <!-- إعداد نسبة المكافأة -->
      <div style="background: var(--bg-color); padding: 12px; border-radius: var(--radius-md); margin-bottom: 16px;">
        <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 8px;">📊 نسبة المكافأة الافتراضية: <strong style="color: var(--primary-color);">${rewardPercent}%</strong></div>
        <button class="btn btn-outline btn-full" id="edit-reward-percent-btn" style="font-size: 12px; min-height: 36px;">✏️ تعديل النسبة</button>
      </div>

      <!-- حقل البحث -->
      <div class="form-group" style="margin-bottom: 12px;">
        <input type="text" id="search-referral-input" class="form-control" placeholder="🔍 ابحث باسم المُرشِّح أو المُرشَّح..." value="${searchQuery}">
      </div>
  `;

  // 4. عرض القائمة
  if (referrals.length === 0) {
    html += `
      <div class="empty-state">
        <div class="empty-state-icon">🤝</div>
        <p>${searchQuery ? 'لا توجد نتائج مطابقة.' : 'لا توجد إحالات مسجلة حتى الآن.'}</p>
      </div>
    `;
  } else {
    html += `<div style="display:flex; flex-direction:column; gap:8px;">`;
    referrals.forEach(r => {
      const statusColor = r.rewardPaid ? '#2E7D32' : '#F57C00';
      const statusText = r.rewardPaid ? '✓ مدفوعة' : '⏳ معلقة';

      html += `
        <div class="referral-item" data-id="${r.id}" style="border: 1px solid var(--border-color); border-right: 4px solid ${statusColor}; padding: 12px; border-radius: var(--radius-md); background: var(--bg-color); cursor: pointer;">
          <div class="flex-between" style="margin-bottom: 6px;">
            <div style="font-weight: bold; font-size: 14px;">
              🎯 ${r.referrerName} → ${r.referredName}
            </div>
            <span class="badge" style="background: ${statusColor}20; color: ${statusColor};">${statusText}</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 12px; color: var(--text-muted);">
            <div>💰 المكافأة: <strong style="color: var(--primary-color);">${money(r.reward || 0)}</strong></div>
            <div>📅 ${formatDate(r.date)}</div>
          </div>
          ${r.note ? `<div style="font-size: 11px; color: var(--text-muted); margin-top: 6px;">📝 ${r.note}</div>` : ''}
        </div>
      `;
    });
    html += `</div>`;
  }

  html += `</div>`;
  container.innerHTML = html;

  // ============================================================
  // نموذج إضافة/تعديل إحالة
  // ============================================================
  function openReferralModal(referral = null) {
    const isEdit = referral !== null;
    const title = isEdit ? 'تعديل الإحالة' : 'إحالة جديدة';

    // خيارات العملاء (للمُرشِّح)
    const customerOptions = customers.length > 0
      ? customers.map(c => {
          const selected = (isEdit && referral.referrerCustomerId === c.id) ? 'selected' : '';
          return `<option value="${c.id}" ${selected}>${c.name}</option>`;
        }).join('')
      : '<option value="">لا يوجد عملاء مسجلين</option>';

    const formHtml = `
      <h3 class="card-title no-border">${title}</h3>
      <form id="referral-form">
        <div class="form-group">
          <label>المُرشِّح (من رشّح) *</label>
          <select id="r-referrer" class="form-control" required>
            <option value="">اختر العميل...</option>
            ${customerOptions}
          </select>
        </div>
        <div class="form-group">
          <label>اسم الشخص المُرشَّح *</label>
          <input type="text" id="r-referred" class="form-control" value="${isEdit ? referral.referredName : ''}" placeholder="مثال: أحمد محمد" required>
        </div>
        <div class="form-group">
          <label>هاتف المُرشَّح (اختياري)</label>
          <input type="tel" id="r-phone" class="form-control" value="${isEdit ? (referral.referredPhone || '') : ''}">
        </div>
        <div class="form-group">
          <label>مبلغ المكافأة</label>
          <input type="number" id="r-reward" class="form-control" value="${isEdit ? (referral.reward || 0) : 0}" min="0" step="any" placeholder="0">
        </div>
        <div class="form-group">
          <label>تاريخ الإحالة</label>
          <input type="date" id="r-date" class="form-control" value="${isEdit ? referral.date : today()}">
        </div>
        <div class="form-group">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" id="r-paid" ${isEdit && referral.rewardPaid ? 'checked' : ''} style="width: 18px; height: 18px;">
            <span>تم دفع المكافأة</span>
          </label>
        </div>
        <div class="form-group">
          <label>ملاحظات</label>
          <input type="text" id="r-note" class="form-control" value="${isEdit ? (referral.note || '') : ''}" placeholder="اختياري">
        </div>
        <div class="flex-between mt-2">
          <div>
            ${isEdit ? `<button type="button" class="btn btn-danger" id="delete-referral-btn">حذف</button>` : ''}
          </div>
          <div>
            <button type="button" class="btn btn-outline" id="cancel-referral-btn">إلغاء</button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'تحديث' : 'حفظ'}</button>
          </div>
        </div>
      </form>
    `;

    openModal(formHtml);

    const form = document.getElementById('referral-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const referrerCustomerId = document.getElementById('r-referrer').value;
      const referredName = document.getElementById('r-referred').value.trim();
      const referredPhone = document.getElementById('r-phone').value.trim();
      const reward = parseFloat(document.getElementById('r-reward').value) || 0;
      const date = document.getElementById('r-date').value;
      const rewardPaid = document.getElementById('r-paid').checked;
      const note = document.getElementById('r-note').value.trim();

      if (!referrerCustomerId || !referredName) {
        toast.error('الرجاء ملء الحقول المطلوبة');
        return;
      }

      // الحصول على اسم المُرشِّح
      const referrer = db.getCustomer(referrerCustomerId);
      const referrerName = referrer ? referrer.name : 'عميل محذوف';

      const data = {
        referrerCustomerId,
        referrerName,
        referredName,
        referredPhone,
        reward,
        date,
        rewardPaid,
        note
      };

      if (isEdit) {
        updateReferral(referral.id, data);
        toast.success('تم تحديث الإحالة');
      } else {
        addReferral(data);
        toast.success('تم إضافة الإحالة بنجاح');
      }

      closeModal();
      renderReferralsPage(container);
    });

    document.getElementById('cancel-referral-btn').addEventListener('click', closeModal);

    if (isEdit) {
      document.getElementById('delete-referral-btn').addEventListener('click', () => {
        if (confirm('هل أنت متأكد من حذف هذه الإحالة؟')) {
          deleteReferral(referral.id);
          toast.success('تم حذف الإحالة');
          closeModal();
          renderReferralsPage(container);
        }
      });
    }
  }

  // ============================================================
  // نموذج تعديل نسبة المكافأة
  // ============================================================
  function openRewardPercentModal() {
    const currentPercent = rewardPercent;

    const formHtml = `
      <h3 class="card-title no-border">📊 نسبة المكافأة الافتراضية</h3>
      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">
        النسبة التي ستُحسب تلقائياً كمكافأة للمُرشِّح من إجمالي طلب المُرشَّح الجديد.
      </p>
      <form id="reward-percent-form">
        <div class="form-group">
          <label>النسبة (%) *</label>
          <input type="number" id="rp-percent" class="form-control" value="${currentPercent}" min="0" max="100" step="0.5" required>
        </div>
        <div class="flex-between mt-2">
          <button type="button" class="btn btn-outline" id="cancel-rp-btn">إلغاء</button>
          <button type="submit" class="btn btn-primary">حفظ</button>
        </div>
      </form>
    `;

    openModal(formHtml);

    const form = document.getElementById('reward-percent-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const percent = parseFloat(document.getElementById('rp-percent').value);
      if (isNaN(percent) || percent < 0 || percent > 100) {
        toast.error('الرجاء إدخال نسبة صحيحة (0-100)');
        return;
      }
      let s = storage.loadSettings() || { ...DEFAULT_SETTINGS };
      s.referralRewardPercent = percent;
      storage.saveSettings(s);
      toast.success('تم حفظ النسبة');
      closeModal();
      renderReferralsPage(container);
    });

    document.getElementById('cancel-rp-btn').addEventListener('click', closeModal);
  }

  // ============================================================
  // ربط الأحداث
  // ============================================================

  const addBtn = container.querySelector('#add-referral-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => openReferralModal(null));
  }

  const editPercentBtn = container.querySelector('#edit-reward-percent-btn');
  if (editPercentBtn) {
    editPercentBtn.addEventListener('click', openRewardPercentModal);
  }

  // البحث
  const searchInput = container.querySelector('#search-referral-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      const pos = e.target.selectionStart;
      renderReferralsPage(container);
      const newInput = container.querySelector('#search-referral-input');
      if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(pos, pos);
      }
    });
  }

  // النقر على إحالة للتعديل
  container.querySelectorAll('.referral-item').forEach(item => {
    item.addEventListener('click', () => {
      const state = db.getState();
      const referral = (state.referrals || []).find(r => r.id === item.dataset.id);
      if (referral) openReferralModal(referral);
    });
  });
}
