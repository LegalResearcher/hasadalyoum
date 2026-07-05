import { createClient } from '@supabase/supabase-js';

/**
 * خلاصة RSS الرئيسية (جميع الأخبار) - حصاد اليوم
 * تُستخدم بنية قاعدة بيانات حصاد اليوم العلائقية (جدول categories) مباشرة
 * بدل الاعتماد على خريطة أسماء ثابتة كما في موقع الجنوب
 */

const SITE_URL = process.env.SITE_URL || 'https://hasadalyoum.vercel.app';
const SITE_NAME = 'حصاد اليوم';

function escapeXml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default async function handler(req, res) {
  try {
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return res.status(500).send('Missing Supabase credentials');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data: posts, error } = await supabase
      .from('posts')
      .select('id, title, content, excerpt, slug, featured_image, published_at, created_at, category:categories(name)')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error(error);
      return res.status(500).send('Error fetching data');
    }

    const safePosts = posts || [];

    const xmlItems = safePosts.map((post) => {
      const date = new Date(post.published_at || post.created_at);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const link = `${SITE_URL}/${year}/${month}/${day}/${post.slug || post.id}`;
      const description = post.excerpt || (post.content ? post.content.replace(/<[^>]*>/g, '').substring(0, 500) : post.title);

      return `
      <item>
        <title><![CDATA[${post.title}]]></title>
        <link>${link}</link>
        <description><![CDATA[${description}]]></description>
        <category><![CDATA[${post.category?.name || 'أخبار'}]]></category>
        <pubDate>${date.toUTCString()}</pubDate>
        <guid isPermaLink="true">${link}</guid>
        ${post.featured_image ? `<enclosure url="${post.featured_image}" length="0" type="image/jpeg" />` : ''}
      </item>`;
    }).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(SITE_NAME)} - آخر الأخبار</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(`آخر الأخبار من موقع ${SITE_NAME}`)}</description>
    <language>ar</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${xmlItems}
  </channel>
</rss>`;

    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=300');
    res.status(200).send(xml);
  } catch (err) {
    console.error('RSS Error:', err);
    res.status(500).send('Internal Server Error');
  }
}
