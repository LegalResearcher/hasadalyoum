/**
 * أداة تحسين الصور - حصاد اليوم
 * تُصغّر الصور إلى أقصى عرض/ارتفاع 1200px، تحوّلها إلى WebP، وتضغطها لأقل من 100KB
 *
 * كما توفر نسخة "مصغّرة" (Thumbnail) بحجم أصغر بكثير (400px / ~25KB) تُستخدم في
 * بطاقات القوائم (الرئيسية، الأقسام، الأكثر قراءة) بدل الصورة الكاملة، لتقليل
 * استهلاك Storage Egress على Supabase — الصورة الكاملة تبقى محفوظة وتُستخدم فقط
 * داخل صفحة الخبر نفسه.
 */

const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1200;
const TARGET_SIZE_KB = 100;
const INITIAL_QUALITY = 0.85;
const MIN_QUALITY = 0.3;

// إعدادات النسخة المصغّرة المستخدمة في بطاقات القوائم فقط
const THUMB_MAX_WIDTH = 400;
const THUMB_MAX_HEIGHT = 400;
const THUMB_TARGET_SIZE_KB = 25;
const THUMB_INITIAL_QUALITY = 0.8;

interface OptimizedImage {
  blob: Blob;
  width: number;
  height: number;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => resolve(img);
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let width = originalWidth;
  let height = originalHeight;

  if (width > maxWidth) {
    height = (height * maxWidth) / width;
    width = maxWidth;
  }

  if (height > maxHeight) {
    width = (width * maxHeight) / height;
    height = maxHeight;
  }

  return { width: Math.round(width), height: Math.round(height) };
}

function canvasToWebP(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("فشل في إنشاء الصورة المضغوطة"));
      },
      "image/webp",
      quality
    );
  });
}

/**
 * النواة المشتركة: تصغير الصورة إلى أقصى أبعاد معطاة، تحويلها WebP، وضغطها
 * تدريجياً حتى تصل للحجم المستهدف. يُستخدمها كل من optimizeImage و generateThumbnail.
 */
async function resizeAndCompress(
  file: File,
  maxWidth: number,
  maxHeight: number,
  targetSizeKb: number,
  initialQuality: number
): Promise<OptimizedImage> {
  const originalSize = file.size;
  const img = await loadImage(file);

  const { width, height } = calculateDimensions(img.naturalWidth, img.naturalHeight, maxWidth, maxHeight);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    URL.revokeObjectURL(img.src);
    throw new Error("فشل في تهيئة نظام الرسم (Canvas)");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);

  URL.revokeObjectURL(img.src);

  let quality = initialQuality;
  let blob = await canvasToWebP(canvas, quality);

  while (blob.size > targetSizeKb * 1024 && quality > MIN_QUALITY) {
    quality -= 0.05;
    blob = await canvasToWebP(canvas, quality);
  }

  return {
    blob,
    width,
    height,
    originalSize,
    optimizedSize: blob.size,
    compressionRatio: originalSize / blob.size,
  };
}

/**
 * تحسين ملف صورة: تصغير + تحويل لـ WebP + ضغط للحجم المستهدف (النسخة الكاملة،
 * تُستخدم في صفحة الخبر نفسها)
 */
export async function optimizeImage(file: File): Promise<OptimizedImage> {
  return resizeAndCompress(file, MAX_WIDTH, MAX_HEIGHT, TARGET_SIZE_KB, INITIAL_QUALITY);
}

/**
 * توليد نسخة مصغّرة جداً من نفس الصورة (400px تقريباً، أقل من 25KB) لاستخدامها
 * في بطاقات القوائم (الرئيسية، الأقسام، الأكثر قراءة) بدل الصورة الكاملة.
 */
export async function generateThumbnail(file: File): Promise<OptimizedImage> {
  return resizeAndCompress(file, THUMB_MAX_WIDTH, THUMB_MAX_HEIGHT, THUMB_TARGET_SIZE_KB, THUMB_INITIAL_QUALITY);
}

export function isOptimizableImage(file: File): boolean {
  const optimizableTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
  return optimizableTypes.includes(file.type);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
