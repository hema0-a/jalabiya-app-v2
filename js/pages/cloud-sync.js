/* ============================================================
   cloud-sync.js - صفحة المزامنة السحابية (V2)
   (مُحدَّث: تحقق من البريد + قوة كلمة المرور)
   ============================================================ */

import { toast } from '../ui/toast.js';
import { openModal, closeModal } from '../ui/modal.js';
import {
  signIn,
  signUp,
  signOut,
  resetPassword,
  isSignedIn,
  getUserEmail,
  getSavedSession,
  isOnline,
  isAuthReady,
  initFirebase,
  waitForAuthReady
} from '../core/cloud-auth.js';
import {
  initSync,
  syncNow,
  stopSync,
  getSyncState
} from '../core/sync.js';
import * as db from '../core/db.js';
import { events } from '../core/events.js';
import { formatDate, isValidEmail, validatePasswordStrength, escapeHtml } from '../core/utils.js';

let currentStatus = { status: 'idle', message: '' };
let statusListener = null;

/* ============================================================
   الصفحة الرئيسية
   ============================================================ */
export function renderCloudSyncPage(container) {
  // ✅ إظهار شاشة تحميل حتى تنتهي تهيئة Firebase
  if (!isAuthReady()) {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 60px 20px;">
        <div style="display: inline-block; width: 40px; height: 40px; border: 3px solid var(--border-color); border-top-color: var(--primary-color); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
        <p style="color: var(--text-muted); margin-top: 16px;">جاري التحقق من حالة تسجيل الدخول...</p>
      </div>
    `;
    initFirebase()
       .then(() => waitForAuthReady())
      .then(() => renderCloudSyncPage(container))
      .catch(e => {
        console.warn('فشل تهيئة Firebase في صفحة المزامنة:', e);
        renderCloudSyncPage(container);
      });
    return;
  }

  const signedIn = isSignedIn();
  const userEmail = getUserEmail();
  const session = getSavedSession();
  const online = isOnline();
  const syncState = getSyncState();

  const state = db.getState();
  const itemsCount =
    (state.customers?.length || 0) +
    (state.orders?.length || 0) +
    (state.payments?.length || 0) +
    (state.expenses?.length || 0) +
    (state.inventory?.length || 0) +
    (state.workers?.length || 0) +
    (state.commitments?.length || 0) +
    (state.houseExpenses?.length || 0) +
    (state.personalLoans?.length || 0) +
    (state.portfolio?.length || 0);

  let html = `
    <div class="card">
      <h2 class="card-title no-border">☁️ المزامنة السحابية</h2>
      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
        حماية بياناتك في السحابة — يعمل التطبيق حتى بدون إنترنت، ويُزامن تلقائياً عند توفر الاتصال.
      </p>

      <div style="padding: 10px 12px; border-radius: var(--radius-md); margin-bottom: 16px; background: ${online ? '#E8F5E9' : '#FFEBEE'}; border-right: 4px solid ${online ? '#2E7D32' : '#C62828'};">
        <div class="flex-between">
          <div style="font-size: 13px; font-weight: 700; color: ${online ? '#1B5E20' : '#B71C1C'};">
            ${online ? '🌐 متصل بالإنترنت' : '📴 غير متصل'}
          </div>
          <div style="font-size: 11px; color: ${online ? '#1B5E20' : '#B71C1C'};">
            ${online ? 'جاهز للمزامنة' : 'سيُزامن عند العودة'}
          </div>
        </div>
      </div>
  `;

  if (signedIn && userEmail) {
    html += `
      <div style="background: linear-gradient(135deg, var(--primary-color), var(--primary-dark)); color: white; padding: 16px; border-radius: var(--radius-md); margin-bottom: 16px;">
        <div style="font-size: 11px; opacity: 0.85; margin-bottom: 4px;">الحساب الحالي</div>
        <div style="font-size: 16px; font-weight: 800; word-break: break-all;">${escapeHtml(userEmail)}</div>
        ${session && session.savedAt ? `
          <div style="font-size: 11px; opacity: 0.7; margin-top: 6px;">
            آخر دخول: ${new Date(session.savedAt).toLocaleString('ar-EG')}
          </div>
        ` : ''}
      </div>

      <div id="sync-status-box" style="padding: 16px; background: var(--bg-color); border-radius: var(--radius-md); margin-bottom: 16px; border: 1px solid var(--border-color);">
        <div class="flex-between" style="margin-bottom: 8px;">
          <div style="font-size: 13px; font-weight: 700;">حالة المزامنة</div>
          <div id="sync-status-indicator" style="font-size: 11px; padding: 4px 10px; border-radius: var(--radius-full); background: #E8F5E9; color: #2E7D32; font-weight: 700;">
            ${getStatusLabel(currentStatus.status)}
          </div>
        </div>
        <div id="sync-status-message" style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">
          ${currentStatus.message || 'المزامنة تعمل تلقائياً عند كل تغيير'}
        </div>
        
        <div style="background: var(--surface-color); padding: 10px; border-radius: var(--radius-md); font-size: 12px;">
          <div class="flex-between" style="margin-bottom: 4px;">
            <span style="color: var(--text-muted);">📦 إجمالي العناصر:</span>
            <strong>${itemsCount}</strong>
          </div>
          <div class="flex-between">
            <span style="color: var(--text-muted);">⏰ آخر مزامنة:</span>
            <strong id="last-sync-time">${syncState.lastSyncAgo !== null ? `منذ ${formatAgo(syncState.lastSyncAgo)}` : 'لم تتم بعد'}</strong>
          </div>
        </div>
      </div>

      <button class="btn btn-primary btn-full" id="sync-now-btn" style="margin-bottom: 8px;">
        🔄 مزامنة الآن
      </button>
      <button class="btn btn-outline btn-full" id="signout-btn" style="color: #dc3545; border-color: #dc3545;">
        🚪 تسجيل الخروج
      </button>
    `;
  } else {
    html += `
      <div style="text-align: center; padding: 20px 10px; background: var(--bg-color); border-radius: var(--radius-md); margin-bottom: 16px;">
        <div style="font-size: 50px; margin-bottom: 10px;">☁️</div>
        <h3 style="font-size: 16px; margin-bottom: 6px;">احمِ بياناتك في السحابة</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 0;">
          سجّل الدخول لتفعيل المزامنة التلقائية والنسخ الاحتياطي على Google Cloud.
        </p>
      </div>

      <div style="background: var(--bg-color); padding: 12px; border-radius: var(--radius-md); margin-bottom: 16px; font-size: 12px;">
        <div style="margin-bottom: 8px; color: var(--text-muted); font-weight: 700;">💡 لماذا المزامنة السحابية؟</div>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <div>✅ حماية كاملة لبياناتك</div>
          <div>✅ استرجاع من أي جهاز بسهولة</div>
          <div>✅ مزامنة تلقائية بين الأجهزة</div>
          <div>✅ استمرار العمل بدون إنترنت</div>
        </div>
      </div>

      <button class="btn btn-primary btn-full" id="signin-btn" style="margin-bottom: 8px;">
        🔑 تسجيل الدخول
      </button>
      <button class="btn btn-outline btn-full" id="signup-btn">
        ✨ إنشاء حساب جديد
      </button>
    `;
  }

  html += `</div>`;
  container.innerHTML = html;

  /* ربط الأحداث */
  const signinBtn = container.querySelector('#signin-btn');
  if (signinBtn) signinBtn.addEventListener('click', () => openSignInModal(container));

  const signupBtn = container.querySelector('#signup-btn');
  if (signupBtn) signupBtn.addEventListener('click', () => openSignUpModal(container));

  const syncBtn = container.querySelector('#sync-now-btn');
  if (syncBtn) {
    syncBtn.addEventListener('click', async () => {
      if (!isOnline()) {
        toast.error('لا يوجد اتصال بالإنترنت');
        return;
      }
      syncBtn.disabled = true;
      syncBtn.textContent = '⏳ جاري المزامنة...';
      await syncNow();
      syncBtn.disabled = false;
      syncBtn.textContent = '🔄 مزامنة الآن';
    });
  }

  const signoutBtn = container.querySelector('#signout-btn');
  if (signoutBtn) {
    signoutBtn.addEventListener('click', async () => {
      if (!confirm('هل أنت متأكد من تسجيل الخروج؟\n(لن تُحذف بياناتك من السحابة)')) return;
      signoutBtn.disabled = true;
      signoutBtn.textContent = '⏳ جاري الخروج...';
      const result = await signOut();
      if (result.success) {
        toast.success('تم تسجيل الخروج');
        renderCloudSyncPage(container);
      } else {
        toast.error(result.error || 'فشل تسجيل الخروج');
        signoutBtn.disabled = false;
        signoutBtn.textContent = '🚪 تسجيل الخروج';
      }
    });
  }

  /* تحديث مباشر للحالة */
  const statusIndicator = container.querySelector('#sync-status-indicator');
  const statusMessage = container.querySelector('#sync-status-message');
  const lastSyncTime = container.querySelector('#last-sync-time');

  if (statusListener) statusListener();

  const statusHandler = (data) => {
    if (!statusIndicator || !statusMessage) return;
    statusIndicator.textContent = getStatusLabel(data.status);
    statusMessage.textContent = data.message || '';

    const colors = {
      'idle': { bg: '#E8F5E9', color: '#2E7D32' },
      'syncing': { bg: '#E1F5FE', color: '#0277BD' },
      'downloading': { bg: '#E1F5FE', color: '#0277BD' },
      'merging': { bg: '#FFF3E0', color: '#E65100' },
      'uploading': { bg: '#E1F5FE', color: '#0277BD' },
      'error': { bg: '#FFEBEE', color: '#C62828' },
      'offline': { bg: '#F5F5F5', color: '#666' }
    };
    const c = colors[data.status] || colors.idle;
    statusIndicator.style.background = c.bg;
    statusIndicator.style.color = c.color;
  };

  events.on('cloud:sync:status', statusHandler);
  statusListener = () => events.off('cloud:sync:status', statusHandler);

  const timeUpdater = setInterval(() => {
    if (!lastSyncTime || !document.body.contains(lastSyncTime)) {
      clearInterval(timeUpdater);
      return;
    }
    const st = getSyncState();
    if (st.lastSyncAgo !== null) {
      lastSyncTime.textContent = `منذ ${formatAgo(st.lastSyncAgo)}`;
    }
  }, 10000);
}

/* ============================================================
   ترجمة حالة المزامنة
   ============================================================ */
function getStatusLabel(status) {
  const labels = {
    'idle': '✓ متزامن',
    'syncing': '🔄 جاري...',
    'downloading': '⬇️ تنزيل',
    'merging': '🔀 دمج',
    'uploading': '⬆️ رفع',
    'error': '⚠️ خطأ',
    'offline': '📴 بدون اتصال'
  };
  return labels[status] || '✓ جاهز';
}

function formatAgo(seconds) {
  if (seconds < 60) return 'ثوانٍ';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} دقيقة`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} ساعة`;
  return `${Math.floor(seconds / 86400)} يوم`;
}

/* ============================================================
   نافذة تسجيل الدخول
   ============================================================ */
function openSignInModal(container) {
  const formHtml = `
    <h3 class="card-title no-border">🔑 تسجيل الدخول</h3>
    <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
      أدخل البريد الإلكتروني وكلمة المرور.
    </p>
    <form id="signin-form">
      <div class="form-group">
        <label>البريد الإلكتروني *</label>
        <input type="email" id="signin-email" class="form-control" placeholder="you@example.com" autocomplete="email" required>
      </div>
      <div class="form-group">
        <label>كلمة المرور *</label>
        <input type="password" id="signin-password" class="form-control" placeholder="••••••" autocomplete="current-password" required minlength="6">
      </div>
      <div class="flex-between mt-2">
        <button type="button" class="btn btn-outline" id="cancel-signin-btn">إلغاء</button>
        <button type="submit" class="btn btn-primary" id="submit-signin-btn">دخول</button>
      </div>
      <button type="button" class="btn btn-outline btn-full mt-3" id="forgot-password-btn" style="font-size: 12px; min-height: 36px;">
        🔐 نسيت كلمة المرور؟
      </button>
    </form>
  `;

  openModal(formHtml);

  document.getElementById('signin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signin-email').value.trim();
    const password = document.getElementById('signin-password').value;
    const submitBtn = document.getElementById('submit-signin-btn');

    // ✅ التحقق من البريد
    if (!isValidEmail(email)) {
      toast.error('صيغة البريد الإلكتروني غير صحيحة');
      return;
    }

    if (!password) {
      toast.error('الرجاء إدخال كلمة المرور');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ جاري...';

    const result = await signIn(email, password);

    if (result.success) {
      toast.success('تم تسجيل الدخول بنجاح ✓');
      closeModal();
      setTimeout(() => {
        renderCloudSyncPage(container);
        setTimeout(() => {
          initSync().then(() => syncNow());
        }, 500);
      }, 300);
    } else {
      toast.error(result.error || 'فشل تسجيل الدخول');
      submitBtn.disabled = false;
      submitBtn.textContent = 'دخول';
    }
  });

  document.getElementById('cancel-signin-btn').addEventListener('click', closeModal);

  document.getElementById('forgot-password-btn').addEventListener('click', async () => {
    const email = document.getElementById('signin-email').value.trim();
    if (!isValidEmail(email)) {
      toast.error('أدخل بريداً إلكترونياً صالحاً أولاً');
      return;
    }
    const result = await resetPassword(email);
    if (result.success) {
      toast.success('تم إرسال رابط إعادة التعيين إلى بريدك');
    } else {
      toast.error(result.error || 'فشل إرسال الرابط');
    }
  });
}

/* ============================================================
   نافذة إنشاء حساب
   ============================================================ */
function openSignUpModal(container) {
  const formHtml = `
    <h3 class="card-title no-border">✨ إنشاء حساب جديد</h3>
    <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
      أنشئ حساباً لحماية بياناتك في السحابة.
    </p>
    <form id="signup-form">
      <div class="form-group">
        <label>البريد الإلكتروني *</label>
        <input type="email" id="signup-email" class="form-control" placeholder="you@example.com" autocomplete="email" required>
      </div>
      <div class="form-group">
        <label>كلمة المرور *</label>
        <input type="password" id="signup-password" class="form-control" placeholder="8 أحرف على الأقل" autocomplete="new-password" required minlength="8">
        <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
          💡 يجب أن تحتوي على 8 أحرف على الأقل، حرف، ورقم.
        </div>
      </div>
      <div class="form-group">
        <label>تأكيد كلمة المرور *</label>
        <input type="password" id="signup-confirm" class="form-control" placeholder="••••••" autocomplete="new-password" required minlength="8">
      </div>
      <div id="password-errors" style="display: none; background: #FFEBEE; border-right: 3px solid #C62828; padding: 8px 12px; border-radius: var(--radius-md); margin-bottom: 12px; font-size: 12px; color: #B71C1C;">
      </div>
      <div style="background: #FFF8E1; padding: 10px; border-radius: var(--radius-md); margin-bottom: 12px; font-size: 12px; color: #E65100;">
        💡 <strong>ملاحظة مهمة:</strong> احفظ البريد وكلمة المرور في مكان آمن. ستحتاجهما لاستعادة بياناتك على أي جهاز آخر.
      </div>
      <div class="flex-between mt-2">
        <button type="button" class="btn btn-outline" id="cancel-signup-btn">إلغاء</button>
        <button type="submit" class="btn btn-primary" id="submit-signup-btn">إنشاء</button>
      </div>
    </form>
  `;

  openModal(formHtml);

  const passwordInput = document.getElementById('signup-password');
  const errorsDiv = document.getElementById('password-errors');

  // عرض الأخطاء أثناء الكتابة
  passwordInput.addEventListener('input', () => {
    const pwd = passwordInput.value;
    if (!pwd) {
      errorsDiv.style.display = 'none';
      return;
    }
    const errors = validatePasswordStrength(pwd);
    if (errors.length > 0) {
      errorsDiv.style.display = 'block';
      errorsDiv.innerHTML = '⚠️ كلمة المرور تحتاج: ' + errors.join('، ');
    } else {
      errorsDiv.style.display = 'none';
    }
  });

  document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;
    const submitBtn = document.getElementById('submit-signup-btn');

    // ✅ التحقق من البريد
    if (!isValidEmail(email)) {
      toast.error('صيغة البريد الإلكتروني غير صحيحة');
      return;
    }

    // ✅ التحقق من قوة كلمة المرور
    const pwdErrors = validatePasswordStrength(password);
    if (pwdErrors.length > 0) {
      errorsDiv.style.display = 'block';
      errorsDiv.innerHTML = '⚠️ كلمة المرور تحتاج: ' + pwdErrors.join('، ');
      toast.error('كلمة المرور ضعيفة');
      return;
    }

    if (password !== confirm) {
      toast.error('كلمتا المرور غير متطابقتين');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ جاري...';

    const result = await signUp(email, password);

    if (result.success) {
      toast.success('تم إنشاء الحساب بنجاح ✓');
      closeModal();
      setTimeout(() => {
        renderCloudSyncPage(container);
        setTimeout(() => {
          initSync().then(() => syncNow());
        }, 500);
      }, 300);
    } else {
      toast.error(result.error || 'فشل إنشاء الحساب');
      submitBtn.disabled = false;
      submitBtn.textContent = 'إنشاء';
    }
  });

  document.getElementById('cancel-signup-btn').addEventListener('click', closeModal);
}
