/* ============================================================
   auth.js - نظام القفل والتحقق (V2)
   (يدير قفل التطبيق بـ PIN + القفل التلقائي + الجلسة)
   ============================================================ */

import { APP_CONFIG, DEFAULT_DB } from './config.js';
import * as storage from './storage.js';
import { events, EVENTS } from './events.js';

/* ============================================================
   حالة النظام (State)
   ============================================================ */
let failedAttempts = 0;      // عدد المحاولات الفاشلة
let lockUntil = 0;            // وقت انتهاء الحظر (timestamp)
let idleTimer = null;         // مؤقت القفل التلقائي
let isLocked = true;          // هل التطبيق مقفل حالياً؟

/* ============================================================
   دوال التحقق من PIN
   ============================================================ */

/**
 * التحقق من صحة الـ PIN المُدخل
 * @param {string} inputPin - الرقم الذي أدخله المستخدم
 * @returns {Object} نتيجة التحقق { success: boolean, message: string }
 */
export function verifyPin(inputPin) {
  // 1. التحقق من وجود حظر مؤقت
  if (Date.now() < lockUntil) {
    const remaining = Math.ceil((lockUntil - Date.now()) / 1000);
    return { 
      success: false, 
      message: `محظور مؤقتاً. انتظر ${remaining} ثانية` 
    };
  }

  // 2. التحقق من صيغة الـ PIN (4 أرقام)
  if (!/^\d{4}$/.test(String(inputPin))) {
    return { 
      success: false, 
      message: 'الرقم السري يجب أن يكون 4 أرقام' 
    };
  }

  // 3. جلب الـ PIN الصحيح من قاعدة البيانات
  const db = storage.loadDB() || { ...DEFAULT_DB };
  const correctPin = db.password || DEFAULT_DB.password;

  // 4. مقارنة الـ PIN
  if (String(inputPin) === String(correctPin)) {
    // نجاح: تصفير المحاولات الفاشلة
    failedAttempts = 0;
    lockUntil = 0;
    saveSession(true);
    return { success: true, message: 'تم الدخول بنجاح' };
  } else {
    // فشل: زيادة عدد المحاولات
    failedAttempts++;
    
    if (failedAttempts >= APP_CONFIG.maxPinAttempts) {
      lockUntil = Date.now() + (APP_CONFIG.pinLockSeconds * 1000);
      failedAttempts = 0;
      return { 
        success: false, 
        message: `محاولات كثيرة خاطئة! انتظر ${APP_CONFIG.pinLockSeconds} ثانية` 
      };
    }
    
    return { 
      success: false, 
      message: `رقم خاطئ. تبقى ${APP_CONFIG.maxPinAttempts - failedAttempts} محاولات` 
    };
  }
}

/**
 * تغيير الـ PIN
 * @param {string} newPin - الرقم الجديد
 * @returns {boolean} نجاح العملية
 */
export function changePin(newPin) {
  if (!/^\d{4}$/.test(String(newPin))) {
    return false;
  }
  
  const db = storage.loadDB() || { ...DEFAULT_DB };
  db.password = String(newPin);
  db.updatedAt = Date.now();
  storage.saveDB(db);
  
  return true;
}

/* ============================================================
   إدارة الجلسة
   ============================================================ */

/**
 * حفظ حالة الجلسة (مفتوح/مقفل)
 * @param {boolean} unlocked - هل التطبيق مفتوح؟
 */
function saveSession(unlocked) {
  storage.saveSession({
    unlocked: unlocked,
    timestamp: Date.now()
  });
  isLocked = !unlocked;
}

/**
 * التحقق من وجود جلسة نشطة سابقة
 * @returns {boolean} هل الجلسة مفتوحة؟
 */
export function checkSession() {
  const session = storage.loadSession();
  if (!session) return false;
  
  // إذا كانت الجلسة مفتوحة خلال آخر 24 ساعة، اعتبرها نشطة
  const ONE_DAY = 24 * 60 * 60 * 1000;
  if (session.unlocked && (Date.now() - session.timestamp) < ONE_DAY) {
    isLocked = false;
    return true;
  }
  
  return false;
}

/**
 * قفل التطبيق
 */
export function lock() {
  saveSession(false);
  clearSession();
  isLocked = true;
  events.emit('auth:locked');
}

/**
 * فتح التطبيق (بعد التحقق من الـ PIN)
 */
export function unlock() {
  saveSession(true);
  isLocked = false;
  events.emit('auth:unlocked');
}

/**
 * مسح الجلسة (لإجبار المستخدم على إدخال الـ PIN مرة أخرى)
 */
function clearSession() {
  storage.clearSession();
}

/**
 * هل التطبيق مقفل حالياً؟
 * @returns {boolean}
 */
export function getIsLocked() {
  return isLocked;
}

/* ============================================================
   القفل التلقائي (Idle Auto-Lock)
   ============================================================ */

/**
 * بدء مؤقت القفل التلقائي
 */
export function startIdleTimer() {
  resetIdleTimer();
  
  // مراقبة أي نشاط من المستخدم
  const activityEvents = ['click', 'touchstart', 'keydown', 'scroll', 'mousemove'];
  activityEvents.forEach(eventName => {
    document.addEventListener(eventName, resetIdleTimer, { passive: true });
  });
}

/**
 * إعادة ضبط مؤقت القفل التلقائي
 */
function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  
  const idleMs = APP_CONFIG.idleLockMinutes * 60 * 1000;
  idleTimer = setTimeout(() => {
    lock();
  }, idleMs);
}

/**
 * إيقاف مؤقت القفل التلقائي
 */
export function stopIdleTimer() {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
}

/* ============================================================
   شاشة القفل (UI)
   ============================================================ */

/**
 * إنشاء وعرض شاشة القفل
 */
export function renderLockScreen() {
  // إزالة أي شاشة قفل سابقة
  const existing = document.getElementById('lock-screen');
  if (existing) existing.remove();

  const lockScreen = document.createElement('div');
  lockScreen.id = 'lock-screen';
  lockScreen.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: linear-gradient(135deg, #1F6D57, #123C2F);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    color: white;
    padding: 20px;
  `;

  lockScreen.innerHTML = `
    <div style="font-size: 60px; margin-bottom: 20px;">🔒</div>
    <h1 style="color: white; margin-bottom: 8px; font-size: 22px;">ورشة تفصيل الجلابيب</h1>
    <p style="color: rgba(255,255,255,0.7); margin-bottom: 30px; font-size: 14px;">أدخل الرقم السري</p>
    
    <!-- حقل إدخال PIN -->
    <input 
      type="password" 
      id="pin-input" 
      maxlength="4" 
      inputmode="numeric" 
      pattern="[0-9]*"
      autocomplete="off"
      style="
        width: 200px;
        text-align: center;
        font-size: 32px;
        letter-spacing: 15px;
        padding: 15px;
        border-radius: 12px;
        border: 2px solid rgba(255,255,255,0.3);
        background: rgba(255,255,255,0.1);
        color: white;
        outline: none;
        margin-bottom: 20px;
      "
      placeholder="••••"
    >
    
    <!-- رسالة الخطأ -->
    <p id="pin-message" style="color: #ffcccc; font-size: 14px; min-height: 20px; margin-bottom: 20px; text-align: center;"></p>
    
    <!-- لوحة الأرقام -->
    <div id="numpad" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; max-width: 280px; width: 100%;">
      ${[1,2,3,4,5,6,7,8,9].map(n => `
        <button class="numpad-btn" data-num="${n}" style="
          padding: 18px;
          font-size: 22px;
          font-weight: bold;
          border-radius: 50%;
          border: none;
          background: rgba(255,255,255,0.15);
          color: white;
          cursor: pointer;
          transition: background 0.2s;
        ">${n}</button>
      `).join('')}
      <button class="numpad-btn" data-action="clear" style="
        padding: 18px;
        font-size: 18px;
        border-radius: 50%;
        border: none;
        background: rgba(255,255,255,0.15);
        color: white;
        cursor: pointer;
      ">✕</button>
      <button class="numpad-btn" data-num="0" style="
        padding: 18px;
        font-size: 22px;
        font-weight: bold;
        border-radius: 50%;
        border: none;
        background: rgba(255,255,255,0.15);
        color: white;
        cursor: pointer;
      ">0</button>
      <button class="numpad-btn" data-action="submit" style="
        padding: 18px;
        font-size: 18px;
        border-radius: 50%;
        border: none;
        background: var(--accent-color);
        color: white;
        cursor: pointer;
      ">✓</button>
    </div>
    
    <p style="color: rgba(255,255,255,0.5); font-size: 12px; margin-top: 20px;">الرقم الافتراضي: 0000</p>
  `;

  document.body.appendChild(lockScreen);

  // ===== ربط الأحداث =====
  const pinInput = lockScreen.querySelector('#pin-input');
  const message = lockScreen.querySelector('#pin-message');

  // التركيز التلقائي على الحقل
  setTimeout(() => pinInput.focus(), 100);

  // إدخال الأرقام من لوحة الأرقام
  lockScreen.querySelectorAll('.numpad-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const num = btn.dataset.num;
      const action = btn.dataset.action;

      if (action === 'clear') {
        pinInput.value = '';
        message.textContent = '';
      } else if (action === 'submit') {
        attemptUnlock();
      } else if (num !== undefined) {
        if (pinInput.value.length < 4) {
          pinInput.value += num;
          message.textContent = '';
          // محاولة تلقائية عند إكمال 4 أرقام
          if (pinInput.value.length === 4) {
            setTimeout(attemptUnlock, 200);
          }
        }
      }
    });
  });

  // الإدخال المباشر من لوحة المفاتيح
  pinInput.addEventListener('input', () => {
    pinInput.value = pinInput.value.replace(/\D/g, '');
    message.textContent = '';
    if (pinInput.value.length === 4) {
      setTimeout(attemptUnlock, 200);
    }
  });

  pinInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      attemptUnlock();
    }
  });

  // ===== دالة محاولة الفتح =====
  function attemptUnlock() {
    const pin = pinInput.value;
    if (pin.length < 4) {
      message.textContent = 'أدخل 4 أرقام';
      return;
    }

    const result = verifyPin(pin);
    
    if (result.success) {
      message.style.color = '#90ee90';
      message.textContent = '✅ ' + result.message;
      setTimeout(() => {
        lockScreen.remove();
        unlock();
        startIdleTimer();
      }, 400);
    } else {
      message.style.color = '#ffcccc';
      message.textContent = '❌ ' + result.message;
      pinInput.value = '';
      // اهتزاز بسيط
      lockScreen.animate([
        { transform: 'translateX(0)' },
        { transform: 'translateX(-10px)' },
        { transform: 'translateX(10px)' },
        { transform: 'translateX(0)' }
      ], { duration: 300 });
    }
  }
}

/**
 * عرض شاشة القفل وتهيئة النظام
 * @returns {boolean} هل التطبيق مفتوح؟ (true = ابدأ التطبيق، false = الشاشة معروضة)
 */
export function initAuth() {
  // التحقق من وجود جلسة سابقة
  if (checkSession()) {
    isLocked = false;
    startIdleTimer();
    return true;
  }
  
  // عرض شاشة القفل
  isLocked = true;
  renderLockScreen();
  return false;
}
