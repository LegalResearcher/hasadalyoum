import { createClient } from '@supabase/supabase-js';
import { getYemenDateParts } from './_lib/yemenDate.js';

/**
 * /api/post-redirect?id=:id
 *
 * يُعيد HTTP 301 (دائم) من الرابط القديم /post/:id
 * إلى الرابط الفعلي /YYYY/MM/DD/slug
 *
 * يُستدعى من vercel.json:
 * { "source": "/post/:id", "destination": "/api/post-redirect?id=:id", "permanent": true }
 *
 * الفرق عن PostRedirect.tsx:
 * - هذا يُرجع 301 HTTP حقيقي يفهمه Googlebot فوراً
 * - PostRedirect.tsx يعتمد على JavaScript في المتصفح (لا يُعدّ 301 لجوجل)
 */
const SITE_URL = "https://hasad-alyoum.com";

function sendNotFound(res) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  return res.status(404).send('Not Found');
}

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return sendNotFound(res);
  }

  try {
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data: post, error } = await supabase
      .from('posts')
      .select('id, created_at, published_at, slug')
      .eq('id', id)
      .eq('status', 'published')
      .maybeSingle();

    if (error || !post) {
      return sendNotFound(res);
    }

    const dateUsed = post.published_at || post.created_at;
    const { year, month, day } = getYemenDateParts(dateUsed);
    const slug  = post.slug || post.id;

    const newUrl = `${SITE_URL}/${year}/${month}/${day}/${slug}`;

    // 301 دائم — جوجل يُحوّل كل قوة الـ SEO للرابط الجديد
    return res.redirect(301, encodeURI(newUrl));

  } catch (err) {
    console.error('post-redirect error:', err);
    return res.status(500).send('Internal Server Error');
  }
}
