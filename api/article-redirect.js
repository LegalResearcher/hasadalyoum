import { createClient } from '@supabase/supabase-js';
import { getYemenDateParts } from './_lib/yemenDate.js';

/**
 * /api/article-redirect?slug=:slug
 *
 * يُعيد HTTP 301 (دائم) من الرابط القديم /article/:slug إلى الرابط الفعلي
 * /YYYY/MM/DD/slug — نفس نمط api/post-redirect.js بالضبط.
 *
 * لماذا هذا الملف موجود: كل الروابط الداخلية بالموقع (NewsCard, HeroSlider,
 * MostRead, TopFeatured, Article...) كانت تُشير إلى /article/:slug، وهو مسار
 * كان يعتمد فقط على تحويل بجافاسكريبت بالمتصفح (ArticleLegacyRedirect.tsx) —
 * أي لا 301 حقيقي يفهمه Googlebot، وغير مشمول أصلاً بقاعدة اكتشاف الزواحف
 * (bot-detection) في vercel.json. بعد هذا الإصلاح: الروابط الداخلية بالموقع
 * أصبحت تُشير مباشرة للرابط الكنسي (لا حاجة لهذا الملف عند التصفح العادي)،
 * وهذا الملف يبقى فقط لحماية الباك لينكات القديمة المحفوظة بمحركات البحث
 * أو منشورات التواصل الاجتماعي بصيغة /article/:slug.
 */
const SITE_URL = "https://hasad-alyoum.com";

export default async function handler(req, res) {
  const { slug } = req.query;

  if (!slug) {
    return res.redirect(302, SITE_URL);
  }

  try {
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const decodedSlug = decodeURIComponent(slug);

    const { data: post, error } = await supabase
      .from('posts')
      .select('id, slug, created_at, published_at')
      .eq('slug', decodedSlug)
      .eq('status', 'published')
      .maybeSingle();

    if (error || !post) {
      return res.redirect(302, SITE_URL);
    }

    const dateUsed = post.published_at || post.created_at;
    const { year, month, day } = getYemenDateParts(dateUsed);
    const newUrl = `${SITE_URL}/${year}/${month}/${day}/${post.slug || post.id}`;

    // 301 دائم — جوجل يُحوّل كل قوة الـ SEO للرابط الجديد
    return res.redirect(301, newUrl);

  } catch (err) {
    console.error('article-redirect error:', err);
    return res.redirect(302, SITE_URL);
  }
}
