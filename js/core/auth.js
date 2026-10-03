/* ============================================================
   auth.js - نظام القفل والتحقق (V2)
   (مُحدَّث: Rate Limiting دائم + شاشة قفل مخصصة)
   ============================================================ */

import { APP_CONFIG, DEFAULT_DB, DEFAULT_SETTINGS } from './config.js';
import * as storage from './storage.js';
import { events, EVENTS } from './events.js';

/* ============================================================
   حالة النظام (State)
   ============================================================ */
let idleTimer = null;
let isLocked = true;

/* ============================================================
   Rate Limiting - مخزّن بشكل دائم (لا يُمسح بإعادة التحميل)
   ============================================================ */
const FAILED_ATTEMPTS_KEY = 'jalabiya_v2_failed_attempts';

function loadFailedAttempts() {
  try {
    const raw = localStorage.getItem(FAILED_ATTEMPTS_KEY);
    if (!raw) return { count: 0, until: 0, timestamp: 0 };
    const data = JSON.parse(raw);
    // نسيان المحاولات بعد 24 ساعة
    if (data.timestamp && Date.now() - data.timestamp > 86400000) {
      localStorage.removeItem(FAILED_ATTEMPTS_KEY);
      return { count: 0, until: 0, timestamp: 0 };
    }
    return data;
  } catch (e) {
    return { count: 0, until: 0, timestamp: 0 };
  }
}

function saveFailedAttempts(count, until = 0) {
  try {
    localStorage.setItem(FAILED_ATTEMPTS_KEY, JSON.stringify({
      count,
      until,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.warn('⚠️ [Auth] فشل حفظ المحاولات:', e);
  }
}

function clearFailedAttempts() {
  try {
    localStorage.removeItem(FAILED_ATTEMPTS_KEY);
  } catch (e) { /* ignore */ }
}

/* ============================================================
   دوال التحقق من PIN
   ============================================================ */

export function verifyPin(inputPin) {
  const attemptData = loadFailedAttempts();

  // 1. التحقق من وجود حظر مؤقت
  if (attemptData.until && Date.now() < attemptData.until) {
    const remaining = Math.ceil((attemptData.until - Date.now()) / 1000);
    return {
      success: false,
      message: `محظور مؤقتاً. انتظر ${remaining} ثانية`
    };
  }

  // 2. التحقق من صيغة PIN (4 أرقام)
  if (!/^\d{4}$/.test(String(inputPin))) {
    return {
      success: false,
      message: 'الرقم السري يجب أن يكون 4 أرقام'
    };
  }

  // 3. جلب PIN الصحيح من قاعدة البيانات
  const db = storage.loadDB() || { ...DEFAULT_DB };
  const correctPin = db.password || DEFAULT_DB.password;

  // 4. مقارنة PIN
  if (String(inputPin) === String(correctPin)) {
    clearFailedAttempts();
    saveSession(true);
    return { success: true, message: 'تم الدخول بنجاح' };
  } else {
    const newCount = (attemptData.count || 0) + 1;

    if (newCount >= APP_CONFIG.maxPinAttempts) {
      const lockUntil = Date.now() + (APP_CONFIG.pinLockSeconds * 1000);
      saveFailedAttempts(0, lockUntil);
      return {
        success: false,
        message: `محاولات كثيرة خاطئة! انتظر ${APP_CONFIG.pinLockSeconds} ثانية`
      };
    }

    saveFailedAttempts(newCount);
    return {
      success: false,
      message: `رقم خاطئ. تبقى ${APP_CONFIG.maxPinAttempts - newCount} محاولات`
    };
  }
}

/**
 * تغيير الـ PIN
 * @param {string} newPin - الرقم الجديد (4 أرقام)
 * @returns {boolean} نجاح العملية
 */
export function changePin(newPin) {
  if (!/^\d{4}$/.test(String(newPin))) return false;

  const db = storage.loadDB() || { ...DEFAULT_DB };
  db.password = String(newPin);
  db.updatedAt = Date.now();
  storage.saveDB(db);
  clearFailedAttempts();
  return true;
}

/* ============================================================
   إدارة الجلسة
   ============================================================ */

function saveSession(unlocked) {
  storage.saveSession({
    unlocked: unlocked,
    timestamp: Date.now()
  });
  isLocked = !unlocked;
}

export function checkSession() {
  const session = storage.loadSession();
  if (!session) return false;

  const ONE_DAY = 24 * 60 * 60 * 1000;
  if (session.unlocked && (Date.now() - session.timestamp) < ONE_DAY) {
    isLocked = false;
    return true;
  }

  return false;
}

export function lock() {
  saveSession(false);
  storage.clearSession();
  isLocked = true;
  events.emit('auth:locked');
}

export function unlock() {
  saveSession(true);
  isLocked = false;
  events.emit('auth:unlocked');
}

function clearSession() {
  storage.clearSession();
}

export function getIsLocked() {
  return isLocked;
}

/* ============================================================
   القفل التلقائي (Idle Auto-Lock)
   ============================================================ */

export function startIdleTimer() {
  resetIdleTimer();

  const activityEvents = ['click', 'touchstart', 'keydown', 'scroll', 'mousemove'];
  activityEvents.forEach(eventName => {
    document.addEventListener(eventName, resetIdleTimer, { passive: true });
  });
}

function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);

  const idleMs = APP_CONFIG.idleLockMinutes * 60 * 1000;
  idleTimer = setTimeout(() => {
    lock();
  }, idleMs);
}

export function stopIdleTimer() {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
}

/* ============================================================
   شاشة القفل (UI)
   ============================================================ */

export function renderLockScreen() {
  const existing = document.getElementById('lock-screen');
  if (existing) existing.remove();

  const settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  const customBg = settings.lockScreenBackground || null;
  const customMsg = settings.lockScreenMessage || 'أدخل الرقم السري للدخول';
  const showLogo = settings.lockScreenShowLogo !== false;
  const workshopLogo = settings.workshopLogo || null;
  const workshopName = settings.workshopName || 'ورشة تفصيل الجلابيب';

  let backgroundStyle = 'linear-gradient(135deg, #1F6D57, #123C2F)';
  if (customBg) {
    backgroundStyle = `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.65)), url('${customBg}') center/cover no-repeat`;
  }

  const lockScreen = document.createElement('div');
  lockScreen.id = 'lock-screen';
  lockScreen.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: ${backgroundStyle};
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    color: white;
    padding: 20px;
  `;

  let logoHtml = '';
  if (showLogo) {
    if (workshopLogo) {
      logoHtml = `<img src="${workshopLogo}" alt="الشعار" style="width: 90px; height: 90px; border-radius: 50%; object-fit: cover; border: 3px solid rgba(255,255,255,0.7); box-shadow: 0 8px 20px rgba(0,0,0,0.4); margin-bottom: 16px;">`;
    } else {
      logoHtml = `<div style="width: 90px; height: 90px; border-radius: 50%; background: linear-gradient(135deg, #B8863B, #8F6626); display: flex; align-items: center; justify-content: center; font-size: 40px; border: 3px solid rgba(255,255,255,0.7); box-shadow: 0 8px 20px rgba(0,0,0,0.4); margin-bottom: 16px;">🔒</div>`;
    }
  }

  lockScreen.innerHTML = `
    ${logoHtml}
    <h1 style="color: white; margin-bottom: 8px; font-size: 22px; text-align: center; text-shadow: 0 2px 8px rgba(0,0,0,0.5);">${workshopName}</h1>
    <p style="color: rgba(255,255,255,0.85); margin-bottom: 30px; font-size: 14px; text-align: center; text-shadow: 0 2px 8px rgba(0,0,0,0.5);">${customMsg}</p>
    <input type="password" id="pin-input" maxlength="4" inputmode="numeric" pattern="[0-9]*" autocomplete="off" style="width: 200px; text-align: center; font-size: 32px; letter-spacing: 15px; padding: 15px; border-radius: 12px; border: 2px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.1); color: white; outline: none; margin-bottom: 20px; backdrop-filter: blur(10px);" placeholder="••••">
    <p id="pin-message" style="color: #ffcccc; font-size: 14px; min-height: 20px; margin-bottom: 20px; text-align: center;"></p>
    <div id="numpad" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; max-width: 280px; width: 100%;">
      ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="numpad-btn" data-num="${n}" style="padding: 18px; font-size: 22px; font-weight: bold; border-radius: 50%; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.15); color: white; cursor: pointer; backdrop-filter: blur(10px);">${n}</button>`).join('')}
      <button class="numpad-btn" data-action="clear" style="padding: 18px; font-size: 18px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.15); color: white; cursor: pointer; backdrop-filter: blur(10px);">✕</button>
      <button class="numpad-btn" data-num="0" style="padding: 18px; font-size: 22px; font-weight: bold; border-radius: 50%; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.15); color: white; cursor: pointer; backdrop-filter: blur(10px);">0</button>
      <button class="numpad-btn" data-action="submit" style="padding: 18px; font-size: 18px; border-radius: 50%; border: none; background: linear-gradient(135deg, #B8863B, #8F6626); color: white; cursor: pointer; box-shadow: 0 4px 12px rgba(184,134,59,0.5);">✓</button>
    </div>
    <p style="color: rgba(255,255,255,0.6); font-size: 12px; margin-top: 20px;">الرقم الافتراضي: 0000</p>
  `;

  document.body.appendChild(lockScreen);

  const pinInput = lockScreen.querySelector('#pin-input');
  const message = lockScreen.querySelector('#pin-message');
  setTimeout(() => pinInput.focus(), 100);

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
          if (pinInput.value.length === 4) setTimeout(attemptUnlock, 200);
        }
      }
    });
  });

  pinInput.addEventListener('input', () => {
    pinInput.value = pinInput.value.replace(/\D/g, '');
    message.textContent = '';
    if (pinInput.value.length === 4) setTimeout(attemptUnlock, 200);
  });

  pinInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      attemptUnlock();
    }
  });

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
      lockScreen.animate([
        { transform: 'translateX(0)' },
        { transform: 'translateX(-10px)' },
        { transform: 'translateX(10px)' },
        { transform: 'translateX(0)' }
      ], { duration: 300 });
    }
  }
}

/* ============================================================
   عرض شاشة القفل وتهيئة النظام
   ============================================================ */

export function initAuth() {
  if (checkSession()) {
    isLocked = false;
    startIdleTimer();
    return true;
  }

  isLocked = true;
  renderLockScreen();
  return false;
}
