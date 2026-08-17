import { createClient } from '@supabase/supabase-js';
import { getYemenDateParts } from './_lib/yemenDate.js';

const SITE_URL = 'https://hasad-alyoum.com';
const GOOGLEBOT_USER_AGENT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

function sendJson(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
}

function buildCanonicalUrl(post) {
  const dateUsed = post.published_at || post.created_at;
  const { year, month, day } = getYemenDateParts(dateUsed);
  return `${SITE_URL}/${year}/${month}/${day}/${post.slug || post.id}`;
}

async function fetchText(url, options = {}) {
  try {
    const response = await fetch(url, options);
    return { ok: response.ok, status: response.status, body: await response.text() };
  } catch (error) {
    return { ok: false, status: 0, body: '', error: error.message };
  }
}

/**
 * /api/publish-readiness?id=<post UUID>
 *
 * لا يطلب فهرسة Google ولا يدّعي حدوثها. بدلاً من ذلك يتحقق من عوامل
 * الاكتشاف التي يملك الموقع التحكم بها بعد النشر: الرابط الكنسي، Sitemap،
 * News Sitemap وRSS. تستخدم واجهة التحرير النتيجة لإظهار جاهزية الخبر.
 */
export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return sendJson(res, 400, { ready: false, error: 'معرف الخبر مطلوب' });

  try {
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data: post, error } = await supabase
      .from('posts')
      .select('id, slug, status, created_at, published_at')
      .eq('id', id)
      .eq('status', 'published')
      .maybeSingle();

    if (error || !post) {
      return sendJson(res, 404, { ready: false, error: 'الخبر المنشور غير موجود' });
    }

    const canonicalUrl = buildCanonicalUrl(post);
    const cacheBypass = `publishCheck=${Date.now()}`;
    const [article, sitemap, newsSitemap, rss] = await Promise.all([
      fetchText(canonicalUrl, { headers: { 'User-Agent': GOOGLEBOT_USER_AGENT } }),
      fetchText(`${SITE_URL}/sitemap.xml?${cacheBypass}`),
      fetchText(`${SITE_URL}/sitemap-news.xml?${cacheBypass}`),
      fetchText(`${SITE_URL}/rss.xml?${cacheBypass}`),
    ]);

    const checks = {
      canonicalPage: article.ok && article.body.includes(`<link rel="canonical" href="${canonicalUrl}"`),
      sitemap: sitemap.ok && sitemap.body.includes(canonicalUrl),
      newsSitemap: newsSitemap.ok && newsSitemap.body.includes(canonicalUrl),
      rss: rss.ok && rss.body.includes(canonicalUrl),
    };

    const ready = Object.values(checks).every(Boolean);
    return sendJson(res, 200, {
      ready,
      canonicalUrl,
      checks,
      statuses: {
        canonicalPage: article.status,
        sitemap: sitemap.status,
        newsSitemap: newsSitemap.status,
        rss: rss.status,
      },
    });
  } catch (error) {
    console.error('publish-readiness error:', error);
    return sendJson(res, 500, { ready: false, error: 'تعذر التحقق من جاهزية النشر' });
  }
}
