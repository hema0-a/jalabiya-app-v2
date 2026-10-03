/* ============================================================
   pin-crypto.js - تشفير وفك تشفير الرقم السري (V2)
   ============================================================ */

const PREFIX = 'enc:';

export function encryptPin(pin) {
    try {
        return PREFIX + btoa(String(pin));
    } catch (e) {
        console.warn('⚠️ [PinCrypto] فشل التشفير:', e);
        return String(pin);
    }
}

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
    return encrypted;
}
