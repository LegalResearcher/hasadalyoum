import { createClient } from '@supabase/supabase-js';
import { getYemenDateParts } from './_lib/yemenDate.js';

// تشفير أحرف XML الخاصة فقط — بدون تشفير الحروف العربية
const escapeXml = (str) =>
  (str || '')
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const SITE_URL = "https://hasad-alyoum.com";
const SITE_NAME = "حصاد اليوم";

export default async function handler(req, res) {
  try {
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // تضم خريطة أخبار Google المقالات المنشورة في آخر 48 ساعة. يجب أن يستند
    // الاختيار إلى وقت النشر الفعلي لا وقت إنشاء المسودة، وإلا تغيب المقالات
    // المُعدّة مسبقاً ثم المنشورة حديثاً.
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: posts, error } = await supabase
      .from("posts")
      .select("id, slug, created_at, published_at, title")
      .eq("status", "published")
      .or(`published_at.gt.${twoDaysAgo},and(published_at.is.null,created_at.gt.${twoDaysAgo})`)
      .order("published_at", { ascending: false });

    if (error) throw error;

    const newsUrls = (posts || []).map(post => {
      const dateUsed = post.published_at || post.created_at;
      const date  = new Date(dateUsed);
      const { year, month, day } = getYemenDateParts(dateUsed);
      const postSlug = post.slug || post.id;

      // ✅ بدون encodeURI — الروابط العربية مقبولة في XML
      const fullUrl = escapeXml(`${SITE_URL}/${year}/${month}/${day}/${postSlug}`);

      return `
  <url>
    <loc>${fullUrl}</loc>
    <news:news>
      <news:publication>
        <news:name>${SITE_NAME}</news:name>
        <news:language>ar</news:language>
      </news:publication>
      <news:publication_date>${date.toISOString()}</news:publication_date>
      <news:title>${escapeXml(post.title)}</news:title>
    </news:news>
  </url>`;
    }).join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${newsUrls}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).send(xml);

  } catch (err) {
    console.error("News Sitemap Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
