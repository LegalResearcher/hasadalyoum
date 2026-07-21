import { createClient } from '@supabase/supabase-js';

const escapeHtml = (str) =>
  (str || '')
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const SITE_URL = "https://hasad-alyoum.com";
const SITE_NAME = "حصاد اليوم";

export default async function handler(req, res) {
  try {
    const { id } = req.query;
    if (!id) return res.redirect(SITE_URL);

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data: post, error } = await supabase
      .from('posts')
      .select('id, title, excerpt, featured_image, slug, created_at, published_at')
      .eq('id', id)
      .maybeSingle();

    if (error || !post) {
      return res.redirect(SITE_URL);
    }

    const dateUsed = post.published_at || post.created_at;
    const postDate = new Date(dateUsed);
    const y = postDate.getFullYear();
    const m = String(postDate.getMonth() + 1).padStart(2, '0');
    const d = String(postDate.getDate()).padStart(2, '0');
    const s = post.slug || post.id;

    // الرابط الحقيقي (عربي بدون تشفير) — للـ canonical وللـ redirect
    const canonicalUrl = `${SITE_URL}/${y}/${m}/${d}/${s}`;

    // رابط المشاركة القصير
    const shareUrl = `${SITE_URL}/share/${id}`;

    // الصورة
    const rawImage = post.featured_image;
    const image = rawImage && rawImage.trim() && rawImage !== 'null'
      ? (rawImage.startsWith('http') ? rawImage : `${SITE_URL}${rawImage.startsWith('/') ? '' : '/'}${rawImage}`)
      : `${SITE_URL}/logo.png`;

    const title       = escapeHtml(post.title);
    const description = escapeHtml(post.excerpt || post.title);

    const ua          = (req.headers['user-agent'] || '').toLowerCase();
    const isSearchBot = /googlebot|bingbot/.test(ua);
    const isSocialBot = /facebookexternalhit|twitterbot|telegrambot|whatsapp|linkedinbot|slackbot|discordbot/.test(ua);

    // ① محركات البحث → 301 مباشر (SEO)
    if (isSearchBot) {
      return res.redirect(301, canonicalUrl);
    }

    // ② بوتات التواصل → OG tags فقط، صفحة نهائية بلا redirect
    // (نفس منطق الجنوب فويس: تفادي تشفير الحروف العربية بالـ slug عبر meta refresh)
    if (isSocialBot) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <title>${title} | ${SITE_NAME}</title>
  <meta name="description" content="${description}"/>

  <meta property="og:type" content="article"/>
  <meta property="og:site_name" content="${SITE_NAME}"/>
  <meta property="og:locale" content="ar_AR"/>
  <meta property="og:title" content="${title}"/>
  <meta property="og:description" content="${description}"/>
  <meta property="og:url" content="${shareUrl}"/>
  <meta property="og:image" content="${image}"/>
  <meta property="og:image:secure_url" content="${image}"/>
  <meta property="og:image:type" content="image/jpeg"/>
  <meta property="og:image:width" content="1200"/>
  <meta property="og:image:height" content="630"/>

  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${title}"/>
  <meta name="twitter:description" content="${description}"/>
  <meta name="twitter:image" content="${image}"/>

  <link rel="image_src" href="${image}"/>
  <link rel="canonical" href="${canonicalUrl}"/>
</head>
<body></body>
</html>`);
    }

    // ③ المستخدم العادي → redirect مباشر للخبر الحقيقي
    return res.redirect(302, encodeURI(canonicalUrl));

  } catch (e) {
    console.error('share.js error:', e);
    return res.redirect(SITE_URL);
  }
}
