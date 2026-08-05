import { createClient } from '@supabase/supabase-js';
import { getYemenDateParts } from '../_lib/yemenDate.js';

/**
 * خلاصة RSS مخصصة لقسم/تصنيف معيّن - حصاد اليوم
 * يُستدعى بالشكل: /api/rss/category?category=local-news (نفس slug المُستخدم في الموقع)
 */

const SITE_URL = process.env.SITE_URL || 'https://hasad-alyoum.com';

function escapeXml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default async function handler(req, res) {
  try {
    const { category } = req.query;

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return res.status(500).send('Missing Supabase credentials');
    }

    if (!category) {
      return res.status(400).send('Missing category parameter');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // جلب التصنيف عبر الـ slug من قاعدة البيانات مباشرة (لا حاجة لخريطة ثابتة)
    const { data: categoryRow, error: categoryError } = await supabase
      .from('categories')
      .select('id, name, slug')
      .eq('slug', category)
      .maybeSingle();

    if (categoryError || !categoryRow) {
      return res.status(404).send('Category not found');
    }

    const { data: posts, error } = await supabase
      .from('posts')
      .select('id, title, content, excerpt, slug, featured_image, published_at, created_at')
      .eq('category_id', categoryRow.id)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error(error);
      return res.status(500).send('Error fetching data');
    }

    const xmlItems = (posts || []).map((post) => {
      const { year, month, day } = getYemenDateParts(post.published_at || post.created_at);
      const link = `${SITE_URL}/${year}/${month}/${day}/${post.slug || post.id}`;
      const description = post.excerpt || (post.content ? post.content.replace(/<[^>]*>/g, '').substring(0, 500) : post.title);

      return `
      <item>
        <title><![CDATA[${post.title}]]></title>
        <link>${link}</link>
        <description><![CDATA[${description}]]></description>
        <pubDate>${date.toUTCString()}</pubDate>
        <guid isPermaLink="true">${link}</guid>
        ${post.featured_image ? `<enclosure url="${post.featured_image}" length="0" type="image/jpeg" />` : ''}
      </item>`;
    }).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(`حصاد اليوم - ${categoryRow.name}`)}</title>
    <link>${SITE_URL}/category/${categoryRow.slug}</link>
    <description>${escapeXml(`آخر أخبار ${categoryRow.name} من موقع حصاد اليوم`)}</description>
    <language>ar</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${xmlItems}
  </channel>
</rss>`;

    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=300');
    res.status(200).send(xml);
  } catch (err) {
    console.error('Category RSS Error:', err);
    res.status(500).send('Internal Server Error');
  }
}
