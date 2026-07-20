/**
 * رابط الموقع الرسمي — يُستخدم في sitemap.xml، تصدير HTML/Word،
 * وكل ما يحتاج رابطاً مطلقاً بصيغة /YYYY/MM/DD/slug بتوقيت اليمن
 */
export const SITE_URL = "https://www.hasad-alyoum.com";

// توقيت اليمن (Asia/Aden) — UTC+3 ثابت، لا يوجد توقيت صيفي
const YEMEN_OFFSET_MS = 3 * 60 * 60 * 1000;

export function getPostUrl(slug: string, createdAt: string): string {
  // createdAt قادم من قاعدة البيانات بتوقيت UTC — نحوّله لتوقيت اليمن
  // بدل الاعتماد على توقيت متصفح الزائر المحلي (لأنه يختلف باختلاف الزائر)
  const utcMs = new Date(createdAt).getTime();
  const yemenDate = new Date(utcMs + YEMEN_OFFSET_MS);

  const year = yemenDate.getUTCFullYear();
  const month = String(yemenDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(yemenDate.getUTCDate()).padStart(2, "0");

  return `${SITE_URL}/${year}/${month}/${day}/${slug}`;
}
