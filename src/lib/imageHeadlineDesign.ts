/**
 * أداة تصميم شريط العنوان - حصاد اليوم
 * نفس منطق apply_headline_design_to_image() في hasad_news_bot_fixed.py حرفياً،
 * لكن بلغة Canvas API بدل Pillow. يُنتج صورة الخبر بنفس نسبة OG (1200×630)
 * مع شريط سفلي بخط علوي مستقيم (أسود فحمي + خط حافة ذهبي رفيع + تدرّج
 * تعتيم ناعم فوقه يذوب داخل الصورة الأصلية) فيه شعار حصاد + اسمه يسار
 * الشريط، وعنوان الخبر يمين الشريط. العنوان يظهر كاملاً دائماً بدون أي
 * قص — الخط يصغر تلقائياً والشريط يكبر تلقائياً عند الحاجة.
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
const LINE_THICKNESS = 3; // سمك الخط المستقيم العلوي (بدل انحناء الموجة)
const FADE_H = 90; // ارتفاع تدرّج التعتيم فوق الشريط الذي يذوب داخل الصورة

const BAND_COLOR_TOP = "rgb(8, 8, 10)";
const BAND_COLOR_BOTTOM = "rgb(22, 22, 24)";
const CURVE_COLOR = "rgb(197, 160, 76)"; // ذهبي — لون الخط المستقيم العلوي
const TEXT_COLOR = "rgb(250, 250, 248)";
const SITE_NAME_COLOR = "rgb(212, 175, 90)";
const DIVIDER_COLOR = "rgba(255, 255, 255, 0.24)"; // فاصل رفيع خفيف بين كتلة الشعار وكتلة العنوان
const ACCENT_COLOR = "rgb(196, 155, 58)"; // ذهبي — الشريط العمودي الصغير (kicker) جنب العنوان

const HEADLINE_FONT_SIZE = 54;
const HEADLINE_FONT_MIN_SIZE = 30; // أصغر حجم خط مسموح قبل تكبير الشريط بدل قصّ النص
const SITE_FONT_SIZE = 45;
const HEADLINE_MAX_LINES = 2; // عدد الأسطر "المفضّل" فقط — لا يُستخدم للقص أبداً
const MIN_PHOTO_VISIBLE = 90; // أقل ارتفاع من الصورة الأصلية يبقى ظاهراً فوق الشريط دائماً
const LOGO_SIZE = 108;

const TOP_PAD = 26; // خط علوي مستقيم بدل موجة — لا حاجة لهامش تغطية انحناء
const BOTTOM_PAD = 20;
const LEFT_MARGIN = 30;
const RIGHT_MARGIN = 40;
const GAP_BETWEEN = 30;
const DIVIDER_GAP = 26; // مسافة الفاصل الرفيع بين كتلة الشعار/الاسم وكتلة العنوان
const ACCENT_BAR_W = 4; // عرض الشريط الذهبي الصغير (kicker)
const ACCENT_GAP = 18; // مسافة بين الشريط الذهبي وبداية نص العنوان

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
  const fadeH = Math.min(FADE_H, topY);
  const fadeTop = topY - fadeH;

  // تدرّج تعتيم ناعم فوق الشريط يذوب داخل الصورة الأصلية (بدل القطع الفجائي)
  if (fadeH > 0) {
    const fadeGradient = ctx.createLinearGradient(0, fadeTop, 0, topY);
    fadeGradient.addColorStop(0, "rgba(8, 8, 10, 0)");
    fadeGradient.addColorStop(1, "rgba(8, 8, 10, 1)");
    ctx.fillStyle = fadeGradient;
    ctx.fillRect(0, fadeTop, width, fadeH);
  }

  // تدرّج أسود-فحمي رأسي عبر كامل ارتفاع الشريط (معتم بالكامل)
  const gradient = ctx.createLinearGradient(0, topY, 0, height);
  gradient.addColorStop(0, BAND_COLOR_TOP);
  gradient.addColorStop(1, BAND_COLOR_BOTTOM);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, topY, width, bandH);

  // خط الحافة العلوية — مستقيم رفيع بدل المنحنى
  ctx.fillStyle = CURVE_COLOR;
  ctx.fillRect(0, topY - LINE_THICKNESS, width, LINE_THICKNESS);
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

    // 2) قياس مسبق لعرض كتلة الشعار+الاسم (لا يعتمد على ارتفاع الشريط)
    //    عشان نعرف العرض المتاح للعنوان قبل تحديد حجم الخط النهائي
    const logoScale = Math.min(LOGO_SIZE / logo.naturalWidth, LOGO_SIZE / logo.naturalHeight, 1);
    const logoW = logo.naturalWidth * logoScale;
    const logoH = logo.naturalHeight * logoScale;

    ctx.direction = "rtl";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${SITE_FONT_SIZE}px ${FONT_FAMILY}`;
    const siteGap = 22;
    const siteX = LEFT_MARGIN + logoW + siteGap;
    const siteTextW = ctx.measureText(siteName).width;
    const leftBlockEndX = siteX + siteTextW + DIVIDER_GAP;
    const accentX = leftBlockEndX + GAP_BETWEEN;
    const textStartX = accentX + ACCENT_BAR_W + ACCENT_GAP;
    const maxTextW = Math.max(100, OG_WIDTH - RIGHT_MARGIN - textStartX);

    // 3) العنوان يُعرض كاملاً دائماً مهما طال — بدون أي قص أو حذف كلمات.
    //    نصغّر الخط تدريجياً حتى الحد الأدنى إن لم يتّسع بعدد الأسطر
    //    المفضّل، وإن ظل النص أطول نكتفي بأكبر عدد أسطر ينتجه أصغر خط —
    //    wrapText لا يحذف كلمات أبداً، فقط يلفّها على أسطر إضافية.
    const trimmedHeadline = headlineText.trim();
    let fontSize = HEADLINE_FONT_SIZE;
    let lines: string[] = [];
    while (true) {
      ctx.font = `700 ${fontSize}px ${FONT_FAMILY}`;
      lines = wrapText(ctx, trimmedHeadline, maxTextW);
      if (lines.length <= HEADLINE_MAX_LINES || fontSize <= HEADLINE_FONT_MIN_SIZE) break;
      fontSize -= 2;
    }
    const lineH = fontSize * 1.25;
    const textBlockH = lineH * lines.length;

    // 4) ارتفاع الشريط: نسبة افتراضية للعناوين القصيرة، ويكبر تلقائياً
    //    إن احتاج العنوان مساحة أكثر — بحد أقصى يترك جزءاً من الصورة
    //    الأصلية ظاهراً فوق الشريط دائماً
    const defaultBandH = Math.round(OG_HEIGHT * BAND_HEIGHT_PERCENT);
    const maxBandH = OG_HEIGHT - MIN_PHOTO_VISIBLE;
    const requiredBandH = TOP_PAD + BOTTOM_PAD + Math.max(LOGO_SIZE, textBlockH);
    const bandH = Math.max(defaultBandH, Math.min(requiredBandH, maxBandH));

    drawBand(ctx, OG_WIDTH, OG_HEIGHT, bandH);

    const rowTop = OG_HEIGHT - bandH + TOP_PAD;
    const rowBottom = OG_HEIGHT - BOTTOM_PAD;
    const rowCenterY = (rowTop + rowBottom) / 2;

    // 5) الشعار + اسمه يسار الشريط (بدون خط عمودي ثقيل بينهما — مساحة تنفّس فقط)
    const logoX = LEFT_MARGIN;
    const logoY = rowCenterY - logoH / 2;
    ctx.drawImage(logo, logoX, logoY, logoW, logoH);

    ctx.font = `700 ${SITE_FONT_SIZE}px ${FONT_FAMILY}`;
    ctx.fillStyle = SITE_NAME_COLOR;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(siteName, siteX, rowCenterY);

    // فاصل رفيع خفيف بين كتلة الشعار/الاسم وكتلة العنوان (بدل تكرار نفس
    // الخط الثقيل) — يمنح توازناً واضحاً بين يمين الصورة ويسارها
    const dividerX = siteX + siteTextW + DIVIDER_GAP;
    ctx.save();
    ctx.strokeStyle = DIVIDER_COLOR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(dividerX, rowTop + 6);
    ctx.lineTo(dividerX, rowBottom - 6);
    ctx.stroke();
    ctx.restore();

    // 6) عنوان الخبر يمين الشريط — كل الأسطر تُرسم كاملة (lines أعلاه لا تُقصّ إطلاقاً)
    ctx.font = `700 ${fontSize}px ${FONT_FAMILY}`;
    ctx.fillStyle = TEXT_COLOR;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    const startY = rowCenterY - textBlockH / 2 + lineH / 2;
    const rightEdge = OG_WIDTH - RIGHT_MARGIN;

    // شريط ذهبي عمودي صغير (kicker) يفتح كتلة العنوان — لمسة القنوات العالمية
    ctx.fillStyle = ACCENT_COLOR;
    ctx.fillRect(accentX, rowCenterY - textBlockH / 2, ACCENT_BAR_W, textBlockH);

    ctx.fillStyle = TEXT_COLOR;
    lines.forEach((line, i) => {
      ctx.fillText(line, rightEdge, startY + i * lineH);
    });

    // 7) توليد المخرجات النهائية بصيغة WebP
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
