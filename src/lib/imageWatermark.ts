/**
 * أداة العلامة المائية - حصاد اليوم
 * تضيف شعار الموقع على صور المشاركة (Open Graph) مع الحفاظ على الشفافية والأبعاد القياسية
 *
 * ملاحظة: لا يوجد شعار ثابت مرفق بالكود — رابط الشعار يأتي من إعدادات الموقع
 * (site_settings → watermark_logo_url) التي يرفعها الأدمن من لوحة التحكم
 */

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const LOGO_SIZE_PERCENT = 0.12;
const PADDING_PERCENT = 0.03;
const LOGO_OPACITY = 0.85;

interface WatermarkResult {
  blob: Blob;
  previewUrl: string;
  width: number;
  height: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (src.startsWith("http")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.error("خطأ في تحميل الصورة من المسار:", src);
      reject(new Error("فشل في تحميل الصورة، تأكد من المسار وصيغة الملف"));
    };
    img.src = src;
  });
}

function loadImageFromFile(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => resolve(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("فشل في قراءة ملف الصورة المرفوع"));
    };
    img.src = url;
  });
}

/**
 * دمج العلامة المائية (شعار حصاد اليوم) مع الصورة الأصلية لإنشاء صورة مشاركة جاهزة
 */
export async function applyWatermark(imageSource: string | File | Blob, logoSrc: string): Promise<WatermarkResult> {
  let objectUrlToRevoke: string | null = null;

  try {
    const mainImage =
      typeof imageSource === "string"
        ? await loadImage(imageSource)
        : await (async () => {
            const img = await loadImageFromFile(imageSource);
            objectUrlToRevoke = img.src;
            return img;
          })();

    const logo = await loadImage(logoSrc);

    const canvas = document.createElement("canvas");
    canvas.width = OG_WIDTH;
    canvas.height = OG_HEIGHT;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("فشل في تهيئة نظام الرسم (Canvas)");

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const sourceAspect = mainImage.naturalWidth / mainImage.naturalHeight;
    const targetAspect = OG_WIDTH / OG_HEIGHT;

    let sx = 0,
      sy = 0,
      sw = mainImage.naturalWidth,
      sh = mainImage.naturalHeight;

    if (sourceAspect > targetAspect) {
      sw = mainImage.naturalHeight * targetAspect;
      sx = (mainImage.naturalWidth - sw) / 2;
    } else {
      sh = mainImage.naturalWidth / targetAspect;
      sy = (mainImage.naturalHeight - sh) / 2;
    }

    ctx.drawImage(mainImage, sx, sy, sw, sh, 0, 0, OG_WIDTH, OG_HEIGHT);

    const logoWidth = OG_WIDTH * LOGO_SIZE_PERCENT;
    const logoHeight = (logo.naturalHeight / logo.naturalWidth) * logoWidth;
    const padding = OG_WIDTH * PADDING_PERCENT;
    const logoX = OG_WIDTH - logoWidth - padding;
    const logoY = OG_HEIGHT - logoHeight - padding;

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    ctx.globalAlpha = LOGO_OPACITY;
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
    ctx.restore();

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("فشل في إنشاء صورة المشاركة"))), "image/webp", 0.9);
    });

    const previewUrl = canvas.toDataURL("image/webp", 0.9);

    if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);

    return { blob, previewUrl, width: OG_WIDTH, height: OG_HEIGHT };
  } catch (error) {
    if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
    console.error("Watermark Error:", error);
    throw error;
  }
}

export async function generateWatermarkPreview(imageUrl: string, logoSrc: string): Promise<string> {
  const result = await applyWatermark(imageUrl, logoSrc);
  return result.previewUrl;
}
