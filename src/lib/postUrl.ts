/**
 * رابط الموقع الرسمي — يُستخدم في sitemap.xml، تصدير HTML/Word،
 * وكل ما يحتاج رابطاً مطلقاً بصيغة /YYYY/MM/DD/slug بتوقيت اليمن
 */
export const SITE_URL = "https://hasad-alyoum.com";

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

/**
 * نفس getPostUrl لكن يُرجع المسار النسبي فقط (بدون الدومين) — للاستخدام
 * داخل <Link to="..."> بمكونات الموقع (NewsCard, HeroSlider, MostRead,
 * TopFeatured, Article...) بدل الرابط القديم /article/:slug.
 *
 * لماذا هذا مهم لفهرسة جوجل: كل هذه الروابط الداخلية كانت تشير سابقاً إلى
 * /article/:slug، وهو مسار تحويل بجافاسكريبت فقط بالمتصفح (لا يوجد 301
 * حقيقي)، وغير مشمول بقاعدة اكتشاف الزواحف (bot-detection) في vercel.json.
 * فكان Googlebot عند تتبعه لأي رابط داخلي بالموقع يصطدم بصفحة index.html
 * الفارغة (SPA shell) بدل صفحة SSR الغنية بالـ schema المخصصة لكل خبر —
 * ما كان يُبطئ اكتشاف الروابط الجديدة وفهرستها الفعلية رغم أن كل شيء آخر
 * بالبنية التحتية (sitemap, IndexNow, Google Indexing API) يعمل فوراً.
 */
export function getPostPath(slug: string, createdAt: string): string {
  return getPostUrl(slug, createdAt).replace(SITE_URL, "");
}
