import { createClient } from '@supabase/supabase-js';
import { getYemenDateParts } from './_lib/yemenDate.js';

// تشفير الأحرف الخاصة في XML فقط (& < > " ') — بدون تشفير الحروف العربية
const escapeXml = (str) =>
  String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const SITE_URL = "https://hasad-alyoum.com";

export default async function handler(req, res) {
  try {
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data: posts, error } = await supabase
      .from("posts")
      .select("id, slug, created_at, updated_at, published_at")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      // ملاحظة: كان محدداً بـ 1000 سابقاً بينما قاعدة البيانات فيها أكثر من 1700
      // خبر منشور — أي أن ~700 خبر قديم كانوا غائبين تماماً عن الفهرسة عبر
      // sitemap.xml. حد جوجل الرسمي هو 50,000 رابط لكل ملف sitemap واحد.
      // رفعناه إلى 45000 كهامش أمان (بمعدل نشر ~48 خبر/يوم هذا يكفي لأكثر من
      // سنتين). عند الاقتراب من هذا الرقم مستقبلاً يجب التحويل لبنية
      // sitemap index مع ملفات مجزّأة بدل رفع الرقم أكثر.
      .limit(45000);

    if (error) throw error;

    const postUrls = (posts || []).map(post => {
      const dateUsed = post.published_at || post.created_at;
      const date = new Date(dateUsed);
      const postSlug = post.slug || post.id;
      const ageInDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);

      const priority   = ageInDays < 7  ? '0.9' : '0.6';
      const changefreq = ageInDays < 7  ? 'daily' : 'monthly';

      const { year, month, day } = getYemenDateParts(dateUsed);

      // ✅ لا نستخدم encodeURI — الروابط العربية مقبولة في XML و Google
      const fullUrl = escapeXml(`${SITE_URL}/${year}/${month}/${day}/${postSlug}`);
      const lastmod = new Date(post.updated_at || dateUsed).toISOString();

      return `
  <url>
    <loc>${fullUrl}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
    }).join("");

    // جلب الأقسام الفعّالة ديناميكياً من قاعدة البيانات
    // (بدل خريطة ثابتة كما بالجنوب فويس، لأن حصاد اليوم يدير الأقسام من لوحة التحكم)
    const { data: categories } = await supabase
      .from("categories")
      .select("slug")
      .eq("is_active", true);

    const staticPages = [
      { loc: SITE_URL, priority: '1.0', changefreq: 'hourly' },
      ...(categories || []).map(c => ({
        loc: `${SITE_URL}/category/${c.slug}`,
        priority: '0.7',
        changefreq: 'daily',
      })),
      { loc: `${SITE_URL}/most-read`, priority: '0.5', changefreq: 'daily' },
    ].map(page => `
  <url>
    <loc>${escapeXml(page.loc)}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages}
${postUrls}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.status(200).send(xml);
  } catch (err) {
    console.error('Sitemap error:', err);
    res.status(500).send("Internal Server Error");
  }
}
