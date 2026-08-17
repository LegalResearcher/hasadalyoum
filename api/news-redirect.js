import { createClient } from '@supabase/supabase-js';
import { getYemenDateParts } from './_lib/yemenDate.js';

const SITE_URL = 'https://hasad-alyoum.com';

function sendNotFound(res) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  return res.status(404).send('Not Found');
}

/**
 * /api/news-redirect?slug=:slug
 *
 * يحوّل روابط /news/:slug القديمة بتحويل HTTP 301 مباشر إلى
 * /YYYY/MM/DD/slug. هذا يحافظ على قيمة الروابط الخارجية ويفرض
 * رابطاً واحداً يمكن لمحركات البحث اعتماده كنسخة قانونية للمقال.
 */
export default async function handler(req, res) {
  const { slug } = req.query;

  if (!slug) {
    return sendNotFound(res);
  }

  try {
    let decodedSlug;
    try {
      decodedSlug = decodeURIComponent(slug);
    } catch {
      return sendNotFound(res);
    }

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data: post, error } = await supabase
      .from('posts')
      .select('id, slug, created_at, published_at')
      .eq('slug', decodedSlug)
      .eq('status', 'published')
      .maybeSingle();

    if (error || !post) {
      return sendNotFound(res);
    }

    const dateUsed = post.published_at || post.created_at;
    const { year, month, day } = getYemenDateParts(dateUsed);
    const canonicalUrl = `${SITE_URL}/${year}/${month}/${day}/${post.slug || post.id}`;

    return res.redirect(301, encodeURI(canonicalUrl));
  } catch (error) {
    console.error('news-redirect error:', error);
    return res.status(500).send('Internal Server Error');
  }
}
