/**
 * أداة تحسين الصور - حصاد اليوم
 * تُصغّر الصور إلى أقصى عرض/ارتفاع 1200px، تحوّلها إلى WebP، وتضغطها لأقل من 100KB
 */

const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1200;
const TARGET_SIZE_KB = 100;
const INITIAL_QUALITY = 0.85;
const MIN_QUALITY = 0.3;

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
 * تحسين ملف صورة: تصغير + تحويل لـ WebP + ضغط للحجم المستهدف
 */
export async function optimizeImage(file: File): Promise<OptimizedImage> {
  const originalSize = file.size;
  const img = await loadImage(file);

  const { width, height } = calculateDimensions(img.naturalWidth, img.naturalHeight, MAX_WIDTH, MAX_HEIGHT);

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

  let quality = INITIAL_QUALITY;
  let blob = await canvasToWebP(canvas, quality);

  while (blob.size > TARGET_SIZE_KB * 1024 && quality > MIN_QUALITY) {
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

export function isOptimizableImage(file: File): boolean {
  const optimizableTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
  return optimizableTypes.includes(file.type);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
