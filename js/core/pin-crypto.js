/* ============================================================
   pin-crypto.js - تشفير آمن للرقم السري (SHA-256 + Salt)
   ------------------------------------------------------------
   - الصيغة الجديدة: sha256:<hex>  (لا رجعة فيه - آمن)
   - يدعم صيغتين قديمتين للتوافق:
     * enc:<base64>  (الإصدار السابق)
     * نص عادي       (الإصدار الأقدم)
   ============================================================ */

const B64_PREFIX = 'enc:';
const HASH_PREFIX = 'sha256:';
const SALT = 'jalabiya_v2_pin_salt_2024';

/* ============================================================
   التشفير الحقيقي (SHA-256 + Salt)
   ============================================================ */
export async function hashPin(pin) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(String(pin) + SALT);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return HASH_PREFIX + hashHex;
  } catch (e) {
    console.error('⚠️ [PinCrypto] فشل التشفير:', e);
    throw e;
  }
}

/* ============================================================
   التحقق من PIN مقابل القيمة المخزنة
   يدعم الصيغ الثلاث (جديدة + قديمة)
   ============================================================ */
export async function verifyPinAgainstStored(inputPin, storedValue) {
  if (typeof storedValue !== 'string') return false;

  // 1. الصيغة الجديدة: SHA-256
  if (storedValue.startsWith(HASH_PREFIX)) {
    const hashedInput = await hashPin(inputPin);
    return hashedInput === storedValue;
  }

  // 2. صيغة Base64 (الإصدار السابق)
  if (storedValue.startsWith(B64_PREFIX)) {
    try {
      const decoded = atob(storedValue.slice(B64_PREFIX.length));
      return String(inputPin) === decoded;
    } catch (e) {
      console.warn('⚠️ [PinCrypto] فشل فك Base64:', e);
      return false;
    }
  }

  // 3. نص عادي (الإصدار الأقدم)
  return String(inputPin) === storedValue;
}

/* ============================================================
   فك التشفير — للتوافق مع الكود القديم فقط
   @deprecated استخدم verifyPinAgainstStored بدلاً منه
   ============================================================ */
export function decryptPin(encrypted) {
  if (typeof encrypted !== 'string') return encrypted;
  if (encrypted.startsWith(B64_PREFIX)) {
    try {
      return atob(encrypted.slice(B64_PREFIX.length));
    } catch (e) {
      return encrypted;
    }
  }
  return encrypted;
}

/* ============================================================
   التشفير القديم (Base64) — للتوافق فقط
   @deprecated استخدم hashPin بدلاً منه
   ============================================================ */
export function encryptPin(pin) {
  try {
    return B64_PREFIX + btoa(String(pin));
  } catch (e) {
    console.warn('⚠️ [PinCrypto] فشل التشفير القديم:', e);
    return String(pin);
  }
}
