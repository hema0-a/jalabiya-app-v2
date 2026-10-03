/* ============================================================
   image-compressor.js - ضغط الصور التلقائي (V2)
   (تصغير الأبعاد + تقليل الجودة + توفير المساحة)
   ============================================================ */

import { DEFAULT_SETTINGS } from './config.js';
import * as storage from './storage.js';

/* ============================================================
   الإعدادات الافتراضية للضغط
   ============================================================ */
const DEFAULT_COMPRESSION = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.75,
  maxSizeKB: 500,
  outputFormat: 'image/jpeg'
};

/* ============================================================
   الحصول على إعدادات الضغط من التخزين
   ============================================================ */
export function getCompressionSettings() {
  const settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  return {
    maxWidth: settings.imageMaxWidth || DEFAULT_COMPRESSION.maxWidth,
    maxHeight: settings.imageMaxHeight || DEFAULT_COMPRESSION.maxHeight,
    quality: settings.imageQuality || DEFAULT_COMPRESSION.quality,
    maxSizeKB: settings.imageMaxSizeKB || DEFAULT_COMPRESSION.maxSizeKB,
    outputFormat: settings.imageOutputFormat || DEFAULT_COMPRESSION.outputFormat
  };
}

/* ============================================================
   حفظ إعدادات الضغط
   ============================================================ */
export function saveCompressionSettings(options) {
  let settings = storage.loadSettings() || { ...DEFAULT_SETTINGS };
  if (options.maxWidth !== undefined) settings.imageMaxWidth = options.maxWidth;
  if (options.maxHeight !== undefined) settings.imageMaxHeight = options.maxHeight;
  if (options.quality !== undefined) settings.imageQuality = options.quality;
  if (options.maxSizeKB !== undefined) settings.imageMaxSizeKB = options.maxSizeKB;
  if (options.outputFormat !== undefined) settings.imageOutputFormat = options.outputFormat;
  storage.saveSettings(settings);
  return true;
}

/* ============================================================
   ضغط صورة
   الإدخال: File (من <input type="file">)
   الإخراج: { dataUrl, sizeKB, originalSizeKB, ratio, width, height }
   ============================================================ */
export function compressImage(file, options = {}) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('الملف ليس صورة'));
      return;
    }

    const cfg = { ...DEFAULT_COMPRESSION, ...getCompressionSettings(), ...options };
    const originalSizeKB = file.size / 1024;

    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          // حساب الأبعاد الجديدة
          const { width, height } = calculateDimensions(img.width, img.height, cfg.maxWidth, cfg.maxHeight);

          // إنشاء Canvas
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          // تحسين جودة الرسم
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // خلفية بيضاء (للصور PNG الشفافة)
          if (cfg.outputFormat === 'image/jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
          }

          // رسم الصورة
          ctx.drawImage(img, 0, 0, width, height);

          // ضغط تدريجي (لتقليل الحجم إذا كان كبيراً)
          let quality = cfg.quality;
          let dataUrl = canvas.toDataURL(cfg.outputFormat, quality);
          let compressedSizeKB = (dataUrl.length * 0.75) / 1024; // تقريبي

          // محاولة تقليل الجودة إذا تجاوز الحجم الأقصى
          let attempts = 0;
          while (compressedSizeKB > cfg.maxSizeKB && quality > 0.3 && attempts < 6) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL(cfg.outputFormat, quality);
            compressedSizeKB = (dataUrl.length * 0.75) / 1024;
            attempts++;
          }

          // إذا لا يزال كبيراً، صغّر الأبعاد أكثر
          if (compressedSizeKB > cfg.maxSizeKB && attempts >= 6) {
            const smaller = calculateDimensions(width, height, cfg.maxWidth * 0.7, cfg.maxHeight * 0.7);
            canvas.width = smaller.width;
            canvas.height = smaller.height;
            const ctx2 = canvas.getContext('2d');
            ctx2.imageSmoothingEnabled = true;
            ctx2.imageSmoothingQuality = 'high';
            if (cfg.outputFormat === 'image/jpeg') {
              ctx2.fillStyle = '#FFFFFF';
              ctx2.fillRect(0, 0, smaller.width, smaller.height);
            }
            ctx2.drawImage(img, 0, 0, smaller.width, smaller.height);
            dataUrl = canvas.toDataURL(cfg.outputFormat, quality);
            compressedSizeKB = (dataUrl.length * 0.75) / 1024;
          }

          const ratio = originalSizeKB > 0
            ? Math.round((1 - compressedSizeKB / originalSizeKB) * 100)
            : 0;

          resolve({
            dataUrl,
            sizeKB: compressedSizeKB.toFixed(1),
            originalSizeKB: originalSizeKB.toFixed(1),
            ratio: ratio > 0 ? ratio : 0,
            width: canvas.width,
            height: canvas.height,
            quality: Math.round(quality * 100)
          });

        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => reject(new Error('فشل تحميل الصورة'));
      img.src = e.target.result;
    };

    reader.onerror = () => reject(new Error('فشل قراءة الملف'));
    reader.readAsDataURL(file);
  });
}

/* ============================================================
   حساب الأبعاد الجديدة مع الحفاظ على النسبة
   ============================================================ */
function calculateDimensions(origW, origH, maxW, maxH) {
  let width = origW;
  let height = origH;

  if (width > maxW) {
    height = Math.round((height * maxW) / width);
    width = maxW;
  }

  if (height > maxH) {
    width = Math.round((width * maxH) / height);
    height = maxH;
  }

  return { width, height };
}

/* ============================================================
   ضغط صورة من Data URL موجود
   ============================================================ */
export function compressDataUrl(dataUrl, options = {}) {
  return new Promise((resolve, reject) => {
    const cfg = { ...DEFAULT_COMPRESSION, ...getCompressionSettings(), ...options };

    const img = new Image();
    img.onload = () => {
      try {
        const { width, height } = calculateDimensions(img.width, img.height, cfg.maxWidth, cfg.maxHeight);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        if (cfg.outputFormat === 'image/jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL(cfg.outputFormat, cfg.quality);

        resolve({
          dataUrl: compressed,
          sizeKB: ((compressed.length * 0.75) / 1024).toFixed(1),
          width,
          height
        });
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = () => reject(new Error('فشل تحميل الصورة'));
    img.src = dataUrl;
  });
}

/* ============================================================
   التحقق السريع من الحجم قبل الضغط
   ============================================================ */
export function needsCompression(file, maxSizeKB = null) {
  const cfg = { ...DEFAULT_COMPRESSION, ...getCompressionSettings() };
  const limit = maxSizeKB || cfg.maxSizeKB;
  return (file.size / 1024) > limit;
}

/* ============================================================
   التحقق من الحجم النهائي
   ============================================================ */
export function isDataUrlTooBig(dataUrl, maxSizeKB = null) {
  const cfg = { ...DEFAULT_COMPRESSION, ...getCompressionSettings() };
  const limit = maxSizeKB || cfg.maxSizeKB;
  const sizeKB = (dataUrl.length * 0.75) / 1024;
  return sizeKB > limit;
}
