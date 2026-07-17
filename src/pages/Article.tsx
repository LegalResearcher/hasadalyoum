import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DOMPurify from "dompurify";
import Layout from "@/components/layout/Layout";
import { usePostBySlug, useIncrementPostView, useMostReadPosts } from "@/hooks/usePosts";
import type { Post } from "@/hooks/usePosts";
import NewsCard from "@/components/news/NewsCard";
import VideoEmbed from "@/components/news/VideoEmbed";
import { Facebook, Copy, MessageCircle, Send, Share2, Clock, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  SITE_NAME,
  SITE_URL,
  generateCanonicalUrl,
  generateNewsArticleSchema,
  generateFAQSchema,
} from "@/lib/seoHelpers";

// ===== التوقيع الثابت لقنوات التواصل =====
const SOCIAL_SIGNATURE = `\n\n📲 تابعونا على: ⤵\n\n✅ تيليجرام: https://t.me/hasadalyoum`;

const Article = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: article, isLoading } = usePostBySlug(slug || "");
  const incrementView = useIncrementPostView();

  // ===== الأخبار ذات الصلة — نفس منطق الجنوب فويس حرفياً =====
  // أولوية للأخبار من نفس القسم ونفس اليوم، ثم استكمال العدد بالأحدث
  const { data: relatedPosts = [] } = useQuery({
    queryKey: ["related-posts", article?.id, article?.category_id, article?.created_at],
    queryFn: async () => {
      const limit = 6;
      const selectFields = `*, category:categories(id, name, slug), author:authors(id, name, avatar_url)`;
      let sameDayPosts: Post[] = [];

      // 1. محاولة جلب أخبار من نفس القسم ونفس اليوم
      if (article!.created_at) {
        const date = new Date(article!.created_at);
        const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0).toISOString();
        const endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59).toISOString();

        const { data: sameDayData, error: sameDayError } = await supabase
          .from("posts")
          .select(selectFields)
          .eq("category_id", article!.category_id)
          .eq("status", "published")
          .neq("id", article!.id)
          .gte("created_at", startDate)
          .lte("created_at", endDate)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (sameDayError) throw sameDayError;
        sameDayPosts = (sameDayData || []) as Post[];
      }

      if (sameDayPosts.length >= limit) {
        return sameDayPosts.slice(0, limit);
      }

      // 2. استكمال العدد بأحدث أخبار نفس القسم
      const excludeIds = [article!.id, ...sameDayPosts.map((p) => p.id)];
      const remainingCount = limit - sameDayPosts.length;

      const { data: latestData, error: latestError } = await supabase
        .from("posts")
        .select(selectFields)
        .eq("category_id", article!.category_id)
        .eq("status", "published")
        .not("id", "in", `(${excludeIds.join(",")})`)
        .order("created_at", { ascending: false })
        .limit(remainingCount);

      if (latestError) throw latestError;

      return [...sameDayPosts, ...((latestData || []) as Post[])];
    },
    enabled: !!article?.id && !!article?.category_id,
  });

  // ===== الوسائط الإضافية للخبر — نفس منطق الجنوب فويس =====
  const { data: additionalMedia = [] } = useQuery({
    queryKey: ["post-media", article?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_media")
        .select("*")
        .eq("post_id", article!.id)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!article?.id,
  });

  const { data: mostReadPosts } = useMostReadPosts(6);

  // ===== تحديث المشاهدات (مرة واحدة per session) — نفس منطق الجنوب =====
  useEffect(() => {
    if (!article?.id) return;
    const viewedKey = `viewed_${article.id}`;
    const alreadyViewed = sessionStorage.getItem(viewedKey);
    if (!alreadyViewed) {
      incrementView.mutate(article.id);
      sessionStorage.setItem(viewedKey, "true");
    }
  }, [article?.id]);

  // ===== التمرير للأعلى عند تغيير الخبر =====
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  // ===== حماية النسخ: إضافة رابط المصدر + توقيع تيليجرام تلقائياً =====
  useEffect(() => {
    if (!article) return;
    const handleCopy = (e: ClipboardEvent) => {
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) {
        const decodedUrl = decodeURIComponent(window.location.href);
        const textWithSource = `${selection.toString()}\n\nأقرأ التفاصيل من "${SITE_NAME}": ${decodedUrl}${SOCIAL_SIGNATURE}`;
        e.clipboardData?.setData("text/plain", textWithSource);
        e.preventDefault();
        toast.success("تم نسخ النص مع رابط المصدر والتوقيع");
      }
    };
    document.addEventListener("copy", handleCopy);
    return () => document.removeEventListener("copy", handleCopy);
  }, [article]);

  // ===== معالجة العناوين الفرعية المنتهية بـ ** =====
  const processContentWithSubheadings = useCallback((htmlContent: string): string => {
    try {
      if (htmlContent.length > 500000) return htmlContent;
      let decoded = htmlContent;
      try { decoded = decodeURIComponent(htmlContent); } catch { decoded = htmlContent; }
      const subheadingPattern = /<p([^>]*)>([^<]*?)\*\*<\/p>/gi;
      decoded = decoded.replace(subheadingPattern, (_, _attrs, text) => {
        return `<div class="article-subheading">${text.trim()}</div>`;
      });
      const plainTextPattern = /^([^\n<]{1,1000})\*\*$/gm;
      decoded = decoded.replace(plainTextPattern, (_, text) => {
        return `<div class="article-subheading">${text.trim()}</div>`;
      });
      return decoded;
    } catch {
      return htmlContent;
    }
  }, []);

  // ===== إزالة أي رابط ملفوف حول صور داخل نص الخبر =====
  // بيمنع فتح رابط الصورة عند الضغط عليها (مباشرة أو من داخل رابط <a>)
  const stripImageLinks = useCallback((htmlContent: string): string => {
    try {
      if (typeof window === "undefined" || !htmlContent) return htmlContent;
      const doc = new DOMParser().parseFromString(htmlContent, "text/html");
      const IMAGE_EXT_PATTERN = /\.(jpe?g|png|gif|webp|svg|bmp|avif)(\?.*)?$/i;

      doc.querySelectorAll("a").forEach((anchor) => {
        const href = anchor.getAttribute("href") || "";
        const containsImg = anchor.querySelector("img") !== null;
        const linksToImageFile = IMAGE_EXT_PATTERN.test(href);

        if (containsImg || linksToImageFile) {
          // فكّ الرابط: خلي محتوى الـ <a> (الصورة) بمكانه بدون أي href
          while (anchor.firstChild) {
            anchor.parentNode?.insertBefore(anchor.firstChild, anchor);
          }
          anchor.remove();
        }
      });

      // احتياطاً: أي <img> لسا واقف لحاله، تأكد ما عندها أي سلوك نقر
      doc.querySelectorAll("img").forEach((img) => {
        img.removeAttribute("onclick");
      });

      return doc.body.innerHTML;
    } catch {
      return htmlContent;
    }
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const days = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const dateFormatted = date.toLocaleDateString("ar-YE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timeFormatted = date.toLocaleTimeString("ar-YE", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${days[date.getDay()]} – ${dateFormatted} – ${timeFormatted}`;
  };

  // ===== روابط المشاركة =====
  const SHARE_URL = article ? `${SITE_URL}/share/${article.id}` : "";
  const shareTitle = article?.title || "";
  const fullShareText = `${shareTitle}\n\nأقرأ التفاصيل من "${SITE_NAME}": ${SHARE_URL}${SOCIAL_SIGNATURE}`;
  const telegramShareText = `${shareTitle}\n\nأقرأ التفاصيل من "${SITE_NAME}": ${SHARE_URL}\n\n📲 تابعونا على: ⤵\n\n✅ تيليجرام: https://t.me/hasadalyoum`;
  const shareSummary = article?.excerpt || "";
  const twitterShareText = `${shareSummary}\n\n📲 تفاصيل تابعونا على: ⤵\n\n✅ تيليجرام: https://t.me/hasadalyoum`;

  const shareOnFacebook = () =>
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SHARE_URL)}&quote=${encodeURIComponent(fullShareText)}`, "_blank");
  const shareOnX = () =>
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterShareText)}`, "_blank");
  const shareOnWhatsApp = () =>
    window.open(`https://wa.me/?text=${encodeURIComponent(fullShareText)}`, "_blank");
  const shareOnTelegram = () =>
    window.open(`https://t.me/share/url?text=${encodeURIComponent(telegramShareText)}`, "_blank");
  const copyLink = () => {
    navigator.clipboard.writeText(fullShareText);
    toast.success("تم نسخ النص والرابط بنجاح");
  };

  // ===== حالات التحميل والخطأ =====
  if (isLoading) {
    return (
      <Layout>
        <div className="animate-pulse">
          <div className="h-6 md:h-8 bg-muted rounded w-1/3 mb-4" />
          <div className="aspect-video bg-muted rounded mb-6" />
        </div>
      </Layout>
    );
  }

  if (!article) {
    return (
      <Layout>
        <div className="text-center py-16 md:py-20">
          <h1 className="text-xl md:text-2xl font-bold mb-4">الخبر غير موجود</h1>
          <Link to="/" className="text-accent hover:underline">العودة للرئيسية</Link>
        </div>
      </Layout>
    );
  }

  const filteredRelated = (relatedPosts || [])
    .filter((p) => p.id !== article.id)
    .slice(0, 6);

  const canonicalUrl = generateCanonicalUrl(article);
  const metaDescription = article.meta_description || article.excerpt || article.title;
  const shareImage = article.featured_image || undefined;
  const newsArticleSchema = generateNewsArticleSchema(article);
  const faqSchema = generateFAQSchema(article);

  return (
    <Layout>
      <Helmet>
        <title>{article.meta_title || `${article.title} | ${SITE_NAME}`}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={shareTitle} />
        <meta property="og:description" content={metaDescription} />
        {shareImage && <meta property="og:image" content={shareImage} />}
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="article:published_time" content={article.published_at || article.created_at} />
        <meta property="article:section" content={article.category?.name || "أخبار"} />
        <meta property="article:author" content={article.author?.name || SITE_NAME} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={shareTitle} />
        <meta name="twitter:description" content={metaDescription} />
        {shareImage && <meta name="twitter:image" content={shareImage} />}
        <meta name="author" content={article.author?.name || SITE_NAME} />
        <script type="application/ld+json">{JSON.stringify(newsArticleSchema)}</script>
        {faqSchema && <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>}
      </Helmet>

      {/* Breadcrumb */}
      <nav className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4 line-clamp-1">
        <Link to="/" className="hover:text-accent">الرئيسية</Link>
        <span className="mx-1 md:mx-2">/</span>
        {article.category && (
          <>
            <Link to={`/category/${article.category.slug}`} className="hover:text-accent">
              {article.category.name}
            </Link>
            <span className="mx-1 md:mx-2">/</span>
          </>
        )}
        <span className="text-foreground">{article.title}</span>
      </nav>

      <article className="bg-card rounded-lg overflow-hidden shadow-sm">
        <div className="p-4 md:p-6">

          {/* بادج القسم */}
          {article.category && (
            <Link
              to={`/category/${article.category.slug}`}
              className="inline-block bg-accent text-accent-foreground px-2 md:px-3 py-0.5 md:py-1 rounded text-xs md:text-sm font-medium mb-2 md:mb-3"
            >
              {article.category.name}
            </Link>
          )}

          {/* العنوان */}
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3 md:mb-4 leading-relaxed">
            {article.title}
          </h1>

          {/* التاريخ + المشاهدات */}
          <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground mb-4 md:mb-6">
            <div className="flex items-center gap-1">
              <Clock size={14} className="md:w-4 md:h-4" />
              <span>{formatDate(article.published_at || article.created_at)}</span>
            </div>
            <div className="flex items-center gap-1 border-r pr-3 border-border">
              <Eye size={14} className="md:w-4 md:h-4 text-accent" />
              <span className="font-bold text-foreground">
                {Number(article.views_count || 0).toLocaleString("en-US")}
              </span>
              <span className="text-xs mr-1">مشاهدة</span>
            </div>
          </div>

          {/* بطاقة الكاتب — لقسم الآراء فقط */}
          {article.category?.slug === "opinions" && article.author && (
            <div className="flex items-center gap-4 mb-6 p-4 bg-background rounded-xl border-r-4 border-accent">
              <img
                src={article.author.avatar_url || "/placeholder.svg"}
                alt={article.author.name}
                className="w-14 h-14 md:w-16 md:h-16 rounded-full object-cover border-2 border-border"
              />
              <div>
                <p className="text-muted-foreground text-xs mb-1 font-bold">بقلم الكاتب:</p>
                <h3 className="text-lg md:text-xl font-bold text-accent">{article.author.name}</h3>
              </div>
            </div>
          )}
        </div>

        {/* صورة الخبر */}
        {article.featured_image && (
          article.featured_image.includes("logo.png") ? (
            <div className="aspect-video bg-muted flex items-center justify-center p-8">
              <img
                src={article.featured_image}
                alt={article.title}
                className="max-w-[220px] max-h-full w-auto h-auto object-contain"
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            </div>
          ) : (
            <div className="aspect-video">
              <img
                src={article.featured_image}
                alt={article.title}
                className="w-full h-full object-cover"
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            </div>
          )
        )}

        {/* فيديو */}
        {article.external_video_url && (
          <div className="p-4 md:p-6">
            <VideoEmbed url={article.external_video_url} title={article.title} />
          </div>
        )}

        <div className="p-4 md:p-6">

          {/* ===== 7: حصاد اليوم | خاص ===== */}
          <div className="mb-3 text-accent font-bold text-sm">{SITE_NAME} | خاص</div>

          {/* المقتطف */}
          {article.excerpt && (
            <div className="mb-5 p-4 bg-background rounded-lg border-r-4 border-accent">
              <p className="text-base md:text-lg text-foreground font-semibold leading-relaxed">
                {article.excerpt}
              </p>
            </div>
          )}

          {/* جسم الخبر */}
          {article.content && (
            <div
              className="article-body prose prose-sm md:prose max-w-none text-[18px] leading-loose text-foreground"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(
                  stripImageLinks(processContentWithSubheadings(article.content)),
                  {
                    ALLOWED_TAGS: ["div", "a", "strong", "p", "br", "span", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "b", "i", "em", "blockquote", "img", "figure", "figcaption"],
                    ALLOWED_ATTR: ["href", "class", "target", "rel", "src", "alt", "width", "height"],
                  }
                ),
              }}
            />
          )}

          {/* صور إضافية للخبر */}
          {Array.isArray((article as any).gallery_images) && (article as any).gallery_images.length > 0 && (
            <div className="mt-8 grid grid-cols-2 gap-3">
              {(article as any).gallery_images.map((url: string, idx: number) => (
                <div key={idx} className="rounded-lg overflow-hidden border border-border bg-muted flex items-center justify-center">
                  <img src={url} alt={`${article.title} - صورة ${idx + 1}`} className="w-full h-auto object-contain" loading="lazy" />
                </div>
              ))}
            </div>
          )}

          {/* بطاقة الكاتب التفصيلية (E-E-A-T) */}
          {article.author && (
            <div className="mt-10 p-5 md:p-6 bg-background rounded-2xl border border-border overflow-hidden relative">
              <div className="absolute top-0 left-0 w-2 h-full bg-accent rounded-r" />
              <div className="flex flex-col md:flex-row items-center gap-5">
                <img
                  src={article.author.avatar_url || "/placeholder.svg"}
                  alt={article.author.name}
                  className="w-24 h-24 md:w-28 md:h-28 rounded-full object-cover shadow-lg border-4 border-background"
                />
                <div className="text-center md:text-right flex-1">
                  <span className="inline-block text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full font-bold mb-2">
                    عن الكاتب
                  </span>
                  <h4 className="text-xl md:text-2xl font-bold text-foreground mb-2">{article.author.name}</h4>
                  {(article.author as any).bio && (
                    <p className="text-muted-foreground text-sm leading-relaxed mb-4 italic">
                      "{(article.author as any).bio}"
                    </p>
                  )}
                  <Link to="/" className="text-xs text-accent font-bold hover:underline flex items-center gap-1 justify-center md:justify-start">
                    شاهد كافة مقالات الكاتب <Send size={12} className="rotate-180" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* ===== 13: أزرار المشاركة — حرفياً كالجنوب فويس ===== */}
          <div className="mt-10 py-8 border-t border-border">
            <div className="flex flex-col items-center justify-center gap-6">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Share2 size={20} className="text-accent" /> شارك الخبر
              </h3>
              <div className="flex flex-wrap justify-center gap-4">

                {/* فيسبوك */}
                <button onClick={shareOnFacebook} className="group flex flex-col items-center gap-2">
                  <div className="w-12 h-12 flex items-center justify-center rounded-full bg-[#1877F2] text-white shadow-lg transition-transform group-hover:scale-110">
                    <Facebook size={22} fill="currentColor" />
                  </div>
                  <span className="text-[11px] font-bold text-muted-foreground">فيسبوك</span>
                </button>

                {/* تويتر / X */}
                <button onClick={shareOnX} className="group flex flex-col items-center gap-2">
                  <div className="w-12 h-12 flex items-center justify-center rounded-full bg-black text-white shadow-lg transition-transform group-hover:scale-110 border border-gray-800">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold text-muted-foreground">تويتر</span>
                </button>

                {/* واتساب */}
                <button onClick={shareOnWhatsApp} className="group flex flex-col items-center gap-2">
                  <div className="w-12 h-12 flex items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform group-hover:scale-110">
                    <MessageCircle size={22} fill="currentColor" />
                  </div>
                  <span className="text-[11px] font-bold text-muted-foreground">واتساب</span>
                </button>

                {/* تيليجرام */}
                <button onClick={shareOnTelegram} className="group flex flex-col items-center gap-2">
                  <div className="w-12 h-12 flex items-center justify-center rounded-full bg-[#0088cc] text-white shadow-lg transition-transform group-hover:scale-110">
                    <Send size={22} fill="currentColor" className="mr-1" />
                  </div>
                  <span className="text-[11px] font-bold text-muted-foreground">تيليجرام</span>
                </button>

                {/* نسخ الرابط */}
                <button onClick={copyLink} className="group flex flex-col items-center gap-2">
                  <div className="w-12 h-12 flex items-center justify-center rounded-full bg-muted text-foreground shadow-md transition-transform group-hover:scale-110 border border-border">
                    <Copy size={22} />
                  </div>
                  <span className="text-[11px] font-bold text-muted-foreground">نسخ الرابط</span>
                </button>

              </div>
            </div>
          </div>
        </div>
      </article>

      {/* معرض الوسائط الإضافية — نفس منطق الجنوب فويس */}
      {additionalMedia.length > 0 && (
        <div className="mt-8 space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {additionalMedia.map((media) => (
              <div key={media.id} className="rounded-xl overflow-hidden border border-border shadow-md bg-card p-2">
                {media.media_type === "video" || media.media_url.match(/\.(mp4|mov|webm)$/i) ? (
                  <video src={media.media_url} controls className="w-full max-h-[500px] object-contain bg-black rounded-lg">
                    المتصفح لا يدعم تشغيل الفيديو
                  </video>
                ) : (
                  <img src={media.media_url} alt="" className="w-full h-auto object-cover rounded-lg" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== 14: أخبار ذات صلة — حرفياً كالجنوب فويس ===== */}
      {filteredRelated.length > 0 && (
        <section className="mt-8 md:mt-10">
          <div className="flex items-center justify-between mb-6 border-r-4 border-accent pr-3">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">أخبار ذات صلة</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredRelated.map((post) => (
              <NewsCard key={post.id} post={post} variant="small" />
            ))}
          </div>
        </section>
      )}

      {/* ===== 15: الأكثر قراءة — يظهر دائماً كالجنوب فويس ===== */}
      {mostReadPosts && mostReadPosts.length > 0 && (
        <section className="mt-10 md:mt-12">
          <div className="flex items-center justify-between mb-6 border-r-4 border-accent pr-3">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">الأكثر قراءة</h2>
            <Link to="/most-read" className="text-sm text-accent hover:text-accent/80 font-medium">
              المزيد ‹
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {mostReadPosts.map((post, index) => (
              <Link
                key={post.id}
                to={`/article/${post.slug}`}
                className="group relative bg-card rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-border overflow-hidden"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                  <img
                    src={post.featured_image || "/logo.png"}
                    alt={post.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className={`absolute top-0 right-0 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-bl-2xl shadow-lg z-10 ${
                    index === 0 ? "bg-amber-500" : index === 1 ? "bg-slate-400" : index === 2 ? "bg-orange-400" : "bg-accent/90"
                  }`}>
                    <span className="text-white font-black text-base md:text-lg">#{index + 1}</span>
                  </div>
                </div>
                <div className="p-3 md:p-4">
                  <div className="flex items-center justify-between mb-2">
                    {post.category && (
                      <span className="bg-accent/10 text-accent text-[10px] font-black px-2 py-0.5 rounded">
                        {post.category.name}
                      </span>
                    )}
                    <div className="flex items-center gap-1 text-muted-foreground" dir="ltr">
                      <span className="text-[11px] font-bold">{(post.views_count || 0).toLocaleString()}</span>
                      <Eye className="w-3 h-3" />
                    </div>
                  </div>
                  <h3 className="font-bold text-foreground text-sm md:text-base leading-snug line-clamp-2 group-hover:text-accent transition-colors min-h-[2.5rem] md:min-h-[3rem]">
                    {post.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

    </Layout>
  );
};

export default Article;
