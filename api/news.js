import { createClient } from "@supabase/supabase-js";

const escapeHtml = (str) =>
  (str || '')
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const SITE_URL = "https://hasadalyoum.vercel.app";
const SITE_NAME = "حصاد اليوم";

export default async function handler(req, res) {
  try {
    const { year, month, day, slug, type } = req.query;

    // --- 1. معاينة الصفحة الرئيسية ---
    if (type === "home") {
      const MAIN_IMAGE = `${SITE_URL}/logo.png`;

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <title>${SITE_NAME} | ينطلق من العاصمة صنعاء</title>

  <meta property="og:type" content="website"/>
  <meta property="og:title" content="${SITE_NAME} | ينطلق من العاصمة صنعاء"/>
  <meta property="og:description" content="تغطية إخبارية شاملة ومستقلة لأحداث اليمن والمنطقة لحظة بلحظة."/>
  <meta property="og:url" content="${SITE_URL}/"/>
  <meta property="og:site_name" content="${SITE_NAME}"/>
  <meta property="og:image" content="${MAIN_IMAGE}"/>
  <meta property="og:image:secure_url" content="${MAIN_IMAGE}"/>
  <meta property="og:image:type" content="image/png"/>
  <meta property="og:image:width" content="600"/>
  <meta property="og:image:height" content="600"/>

  <meta name="twitter:card" content="summary"/>
  <meta name="twitter:title" content="${SITE_NAME} | ينطلق من العاصمة صنعاء"/>
  <meta name="twitter:description" content="تغطية إخبارية شاملة ومستقلة لأحداث اليمن والمنطقة لحظة بلحظة."/>
  <meta name="twitter:image" content="${MAIN_IMAGE}"/>
</head>
<body></body>
</html>`);
    }

    // --- 2. معاينة صفحة الخبر ---
    if (!year || !month || !day || !slug) {
      return res.redirect(302, SITE_URL);
    }

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const startDate = new Date(year, month - 1, day, 0, 0, 0).toISOString();
    const endDate   = new Date(year, month - 1, day, 23, 59, 59).toISOString();

    const decodedSlug = decodeURIComponent(slug);

    const { data: post, error } = await supabase
      .from("posts")
      .select("id, title, excerpt, featured_image, slug, created_at, published_at, content, category:categories(name)")
      .eq("slug", decodedSlug)
      .eq("status", "published")
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .maybeSingle();

    if (error || !post) {
      return res.status(404).send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <title>404 - الخبر غير موجود | ${SITE_NAME}</title>
  <meta name="robots" content="noindex, nofollow"/>
  <meta http-equiv="refresh" content="3;url=${SITE_URL}"/>
</head>
<body><p>الخبر غير موجود</p></body>
</html>`);
    }

    const dateUsed = post.published_at || post.created_at;
    const finalUrl = `${SITE_URL}/${year}/${month}/${day}/${post.slug || decodedSlug}`;

    // الصورة مع fallback
    const rawImage = post.featured_image;
    const image = rawImage && rawImage.trim() && rawImage !== 'null'
      ? (rawImage.startsWith("http") ? rawImage : `${SITE_URL}${rawImage.startsWith('/') ? '' : '/'}${rawImage}`)
      : `${SITE_URL}/logo.png`;

    const title       = escapeHtml(post.title);
    const description = escapeHtml(post.excerpt || post.title);
    const category    = escapeHtml(post.category?.name || 'أخبار');

    // تنظيف المحتوى من وسوم HTML للعرض النصي لجوجل
    const rawContent = post.content || '';
    const textContent = rawContent
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 5000);

    const publishDate = new Date(dateUsed).toLocaleDateString('ar-YE', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    const schemaJson = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      "headline": post.title,
      "description": post.excerpt || post.title,
      "image": image,
      "datePublished": dateUsed,
      "url": finalUrl,
      "mainEntityOfPage": { "@type": "WebPage", "@id": finalUrl },
      "publisher": {
        "@type": "Organization",
        "name": SITE_NAME,
        "url": SITE_URL,
        "logo": { "@type": "ImageObject", "url": `${SITE_URL}/logo.png` }
      },
      "articleSection": post.category?.name || "أخبار",
      "inLanguage": "ar"
    });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=300");

    return res.status(200).send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <title>${title} | ${SITE_NAME}</title>
  <meta name="description" content="${description}"/>
  <meta name="robots" content="index, follow"/>
  <meta property="og:type" content="article"/>
  <meta property="og:title" content="${title}"/>
  <meta property="og:description" content="${description}"/>
  <meta property="og:image" content="${image}"/>
  <meta property="og:image:secure_url" content="${image}"/>
  <meta property="og:image:width" content="1200"/>
  <meta property="og:image:height" content="630"/>
  <meta property="og:url" content="${finalUrl}"/>
  <meta property="og:site_name" content="${SITE_NAME}"/>
  <meta property="article:published_time" content="${dateUsed}"/>
  <meta property="article:section" content="${category}"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${title}"/>
  <meta name="twitter:description" content="${description}"/>
  <meta name="twitter:image" content="${image}"/>
  <link rel="image_src" href="${image}"/>
  <link rel="canonical" href="${finalUrl}"/>
  <script type="application/ld+json">${schemaJson}<\/script>
  <style>
    body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;direction:rtl;margin:0;background:#f5f5f5;color:#222}
    .wrap{max-width:860px;margin:0 auto;padding:24px 16px}
    header{background:#111;padding:12px 16px}
    header a{color:#d4a017;text-decoration:none;font-size:22px;font-weight:bold}
    .cat{display:inline-block;background:#111;color:#d4a017;padding:3px 12px;border-radius:4px;font-size:13px;margin-bottom:12px}
    h1{font-size:28px;line-height:1.5;margin:0 0 12px}
    .meta{color:#666;font-size:13px;margin-bottom:16px}
    .excerpt{background:#fff;border-right:4px solid #d4a017;padding:12px 16px;font-size:17px;font-weight:600;margin-bottom:20px;border-radius:4px}
    img.hero{width:100%;border-radius:8px;margin-bottom:20px}
    .body{background:#fff;padding:20px;border-radius:8px;font-size:18px;line-height:1.9}
    footer{text-align:center;padding:20px;color:#888;font-size:13px;margin-top:24px}
  </style>
</head>
<body>
  <header><a href="${SITE_URL}">${SITE_NAME}</a></header>
  <div class="wrap">
    <span class="cat">${category}</span>
    <h1>${title}</h1>
    <div class="meta">${SITE_NAME} | ${publishDate}</div>
    ${post.featured_image ? `<img class="hero" src="${image}" alt="${title}" width="860" height="480"/>` : ''}
    ${post.excerpt ? `<div class="excerpt">${escapeHtml(post.excerpt)}</div>` : ''}
    <div class="body">${textContent}</div>
  </div>
  <footer>© ${SITE_NAME} — جميع الحقوق محفوظة</footer>
</body>
</html>`);

  } catch (err) {
    console.error("news.js error:", err);
    return res.redirect(302, SITE_URL);
  }
}
