/* ============================================================
   pin-crypto.js - تشفير وفك تشفير الرقم السري (V2)
   ============================================================ */

const PREFIX = 'enc:';

/**
 * تشفير الرقم السري باستخدام Base64
 * @param {string} pin - الرقم السري (4 أرقام)
 * @returns {string} الرقم السري المشفر
 */
export function encryptPin(pin) {
    try {
        return PREFIX + btoa(String(pin));
    } catch (e) {
        console.warn('⚠️ [PinCrypto] فشل التشفير:', e);
        return String(pin);
    }
}

/**
 * فك تشفير الرقم السري
 * إذا كان النص غير مشفر (توافق مع الإصدارات السابقة) يُعاد كما هو
 * @param {string} encrypted - الرقم السري المشفر
 * @returns {string} الرقم السري الأصلي
 */
export function decryptPin(encrypted) {
    if (typeof encrypted !== 'string') return encrypted;
    if (encrypted.startsWith(PREFIX)) {
        try {
            return atob(encrypted.slice(PREFIX.length));
        } catch (e) {
            console.warn('⚠️ [PinCrypto] فشل فك التشفير:', e);
            return encrypted;
        }
    }
    return encrypted; // نص عادي (توافق مع الإصدارات السابقة)
}
