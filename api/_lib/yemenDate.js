// أداة موحّدة لحساب التاريخ بتوقيت اليمن (Asia/Aden, UTC+3 ثابت بدون توقيت صيفي)
// تُستخدم من كل دوال api/*.js (sitemap, sitemap-news, news, post-redirect, rss/*)
// لضمان أن كل مكان بالمشروع يحسب نفس التاريخ لنفس الخبر — بما يطابق تماماً
// نفس المنطق المستخدم في src/lib/postUrl.ts للواجهة الأمامية والبوت البايثوني.
//
// قبل هذا الملف: كل ملف api كان يستخدم `new Date(x).getFullYear()` وما شابه،
// وهذه دوال تعتمد على توقيت السيرفر المحلي (UTC على Vercel) — ما كان يُنتج
// أحياناً تاريخاً مختلفاً (وبالتالي رابط /YYYY/MM/DD/slug مختلف) عن الرابط
// الفعلي الذي تعرضه الواجهة الأمامية لنفس الخبر، تحديداً للأخبار المنشورة
// بين 21:00–23:59 بتوقيت UTC (منتصف الليل–02:59 فجراً بتوقيت اليمن).

const YEMEN_OFFSET_MS = 3 * 60 * 60 * 1000;

/**
 * يحوّل تاريخ UTC (من قاعدة البيانات) إلى أجزاء تاريخ بتوقيت اليمن
 * @param {string} utcDateString - created_at أو published_at من Supabase
 * @returns {{ year: string, month: string, day: string }}
 */
export function getYemenDateParts(utcDateString) {
  const utcMs = new Date(utcDateString).getTime();
  const yemenDate = new Date(utcMs + YEMEN_OFFSET_MS);

  const year = String(yemenDate.getUTCFullYear());
  const month = String(yemenDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(yemenDate.getUTCDate()).padStart(2, "0");

  return { year, month, day };
}

/**
 * العكس: يحوّل تاريخ /YYYY/MM/DD المطلوب بالرابط إلى مدى زمني بتوقيت UTC
 * صالح للاستعلام عن created_at بقاعدة البيانات (UTC دائماً)
 * @param {string|number} year
 * @param {string|number} month - 1-12
 * @param {string|number} day
 * @returns {{ startUtcIso: string, endUtcIso: string }}
 */
export function yemenDayToUtcRange(year, month, day) {
  const y = Number(year);
  const m = Number(month) - 1;
  const d = Number(day);

  const startUtcMs = Date.UTC(y, m, d, 0, 0, 0, 0) - YEMEN_OFFSET_MS;
  const endUtcMs = Date.UTC(y, m, d, 23, 59, 59, 999) - YEMEN_OFFSET_MS;

  return {
    startUtcIso: new Date(startUtcMs).toISOString(),
    endUtcIso: new Date(endUtcMs).toISOString(),
  };
}
