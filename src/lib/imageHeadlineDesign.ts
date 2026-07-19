/**
 * أداة تصميم شريط العنوان - حصاد اليوم
 * نفس منطق apply_headline_design_to_image() في hasad_news_bot_fixed.py حرفياً،
 * لكن بلغة Canvas API بدل Pillow. يُنتج صورة الخبر بنفس نسبة OG (1200×630)
 * مع شريط سفلي منحني (أسود فحمي + حافة ذهبية) فيه شعار حصاد + اسمه يسار
 * الشريط، وعنوان الخبر يمين الشريط (حتى سطرين).
 *
 * ⚠️ أي تعديل بالألوان/الأبعاد هنا لازم ينعكس بنفس القيم بملف
 * hasad_news_bot_fixed.py (الثوابت HEADLINE_*) وإلا صار شكل الصورة مختلف
 * حسب مصدر النشر (يدوي عبر لوحة الإدارة أو آلي عبر البوت).
 *
 * ملاحظة: الشعار (logoSrc) يُمرَّر من إعدادات الموقع (site_settings →
 * watermark_logo_url)، تماماً مثل applyWatermark الحالية بهذا المشروع —
 * لا يوجد شعار ثابت مرفق بالكود.
 */

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

const BAND_HEIGHT_PERCENT = 0.33;
const CURVE_AMPLITUDE = 22;

const BAND_COLOR_TOP = "rgb(8, 8, 10)";
const BAND_COLOR_BOTTOM = "rgb(22, 22, 24)";
const CURVE_COLOR = "rgb(197, 160, 76)";
const TEXT_COLOR = "rgb(250, 250, 248)";
const SITE_NAME_COLOR = "rgb(212, 175, 90)";
const DIVIDER_COLOR = "rgba(212, 175, 90, 0.55)";

const HEADLINE_FONT_SIZE = 54;
const SITE_FONT_SIZE = 45;
const HEADLINE_MAX_LINES = 2;
const LOGO_SIZE = 108;

const TOP_PAD = 34;
const BOTTOM_PAD = 20;
const LEFT_MARGIN = 30;
const RIGHT_MARGIN = 40;
const GAP_BETWEEN = 30;

// نفس خط البوت (Amiri-Bold) — محمّل أصلاً بالموقع عبر Google Fonts
const FONT_FAMILY = '"Amiri", serif';

const DEFAULT_SITE_NAME = "حصاد اليوم";

export interface HeadlineDesignResult {
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
    img.onerror = () => reject(new Error("فشل في تحميل الصورة، تأكد من المسار وصيغة الملف"));
    img.src = src;
  });
}

function loadImageFromFile(file: File | Blob): Promise<{ img: HTMLImageElement; objectUrl: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => resolve({ img, objectUrl: url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("فشل في قراءة ملف الصورة المرفوع"));
    };
    img.src = url;
  });
}

async function ensureFontsReady(): Promise<void> {
  try {
    await Promise.all([
      document.fonts.load(`700 ${HEADLINE_FONT_SIZE}px ${FONT_FAMILY}`),
      document.fonts.load(`700 ${SITE_FONT_SIZE}px ${FONT_FAMILY}`),
    ]);
  } catch {
    // لو تعذّر تحميل الخط استباقياً، نتابع الرسم (المتصفح يستخدم بديل النظام)
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = (cur + " " + w).trim();
    const width = ctx.measureText(test).width;
    if (width <= maxWidth || !cur) {
      cur = test;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawBand(ctx: CanvasRenderingContext2D, width: number, height: number, bandH: number) {
  const topY = height - bandH;
  const curvePoints: { x: number; y: number }[] = [];
  for (let x = 0; x <= width; x += 4) {
    const y = topY + CURVE_AMPLITUDE * Math.sin((x / width) * Math.PI * 1.4);
    curvePoints.push({ x, y });
  }

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, height);
  curvePoints.forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.clip();

  const gradient = ctx.createLinearGradient(0, topY, 0, height);
  gradient.addColorStop(0, BAND_COLOR_TOP);
  gradient.addColorStop(1, BAND_COLOR_BOTTOM);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, topY - CURVE_AMPLITUDE, width, bandH + CURVE_AMPLITUDE);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  curvePoints.forEach((p, i) => {
    const y = p.y - 4;
    if (i === 0) ctx.moveTo(p.x, y);
    else ctx.lineTo(p.x, y);
  });
  ctx.strokeStyle = CURVE_COLOR;
  ctx.lineWidth = 6;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();
}

/**
 * الوظيفة الرئيسية: تصميم صورة الخبر بشريط العنوان (شعار + اسم الموقع +
 * عنوان الخبر) — نفس apply_headline_design_to_image() بالبوت حرفياً.
 */
export async function applyHeadlineDesign(
  imageSource: string | File | Blob,
  logoSrc: string,
  headlineText: string,
  siteName: string = DEFAULT_SITE_NAME
): Promise<HeadlineDesignResult> {
  let objectUrlToRevoke: string | null = null;

  try {
    await ensureFontsReady();

    const mainImage =
      typeof imageSource === "string"
        ? await loadImage(imageSource)
        : await (async () => {
            const { img, objectUrl } = await loadImageFromFile(imageSource);
            objectUrlToRevoke = objectUrl;
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

    // 1) قصّ مركزي لنسبة OG (نفس منطق العلامة المائية)
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

    // 2) الشريط السفلي المنحني
    const bandH = Math.round(OG_HEIGHT * BAND_HEIGHT_PERCENT);
    drawBand(ctx, OG_WIDTH, OG_HEIGHT, bandH);

    const rowTop = OG_HEIGHT - bandH + TOP_PAD;
    const rowBottom = OG_HEIGHT - BOTTOM_PAD;
    const rowCenterY = (rowTop + rowBottom) / 2;

    // 3) الشعار + اسم الموقع يسار الشريط
    let leftBlockEndX = LEFT_MARGIN;
    const logoScale = Math.min(LOGO_SIZE / logo.naturalWidth, LOGO_SIZE / logo.naturalHeight, 1);
    const logoW = logo.naturalWidth * logoScale;
    const logoH = logo.naturalHeight * logoScale;
    const logoX = LEFT_MARGIN;
    const logoY = rowCenterY - logoH / 2;
    ctx.drawImage(logo, logoX, logoY, logoW, logoH);

    const dividerX = logoX + logoW + 16;
    const dividerPad = 6;
    ctx.save();
    ctx.strokeStyle = DIVIDER_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(dividerX, logoY + dividerPad);
    ctx.lineTo(dividerX, logoY + logoH - dividerPad);
    ctx.stroke();
    ctx.restore();

    ctx.direction = "rtl";
    ctx.font = `700 ${SITE_FONT_SIZE}px ${FONT_FAMILY}`;
    ctx.fillStyle = SITE_NAME_COLOR;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const siteX = dividerX + 16;
    ctx.fillText(siteName, siteX, rowCenterY);
    leftBlockEndX = siteX + ctx.measureText(siteName).width;

    // 4) عنوان الخبر يمين الشريط (حتى سطرين)
    ctx.font = `700 ${HEADLINE_FONT_SIZE}px ${FONT_FAMILY}`;
    ctx.fillStyle = TEXT_COLOR;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    const maxTextW = Math.max(100, OG_WIDTH - RIGHT_MARGIN - leftBlockEndX - GAP_BETWEEN);
    const lines = wrapText(ctx, headlineText.trim(), maxTextW).slice(0, HEADLINE_MAX_LINES);
    const lineH = HEADLINE_FONT_SIZE * 1.25;
    const textBlockH = lineH * lines.length;
    const startY = rowCenterY - textBlockH / 2 + lineH / 2;
    const rightEdge = OG_WIDTH - RIGHT_MARGIN;

    lines.forEach((line, i) => {
      ctx.fillText(line, rightEdge, startY + i * lineH);
    });

    // 5) توليد المخرجات النهائية بصيغة WebP
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("فشل في إنشاء صورة المشاركة"))), "image/webp", 0.9);
    });
    const previewUrl = canvas.toDataURL("image/webp", 0.9);

    if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);

    return { blob, previewUrl, width: OG_WIDTH, height: OG_HEIGHT };
  } catch (error) {
    if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
    console.error("Headline Design Error:", error);
    throw error;
  }
}

export async function generateHeadlineDesignPreview(
  imageUrl: string,
  logoSrc: string,
  headlineText: string,
  siteName?: string
): Promise<string> {
  const result = await applyHeadlineDesign(imageUrl, logoSrc, headlineText, siteName);
  return result.previewUrl;
}
