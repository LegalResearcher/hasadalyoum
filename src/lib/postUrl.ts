/**
 * يُرجع رابط الخبر الكامل على نطاق الموقع الرسمي
 * يُستخدم في sitemap.xml، تصدير HTML/Word، وكل ما يحتاج رابطاً مطلقاً
 */
export function getPostUrl(slug: string): string {
  return `https://hasadalyoum.com/article/${slug}`;
}