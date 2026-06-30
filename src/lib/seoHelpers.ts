// أدوات SEO متقدمة لتحسين فهرسة جوجل - مُستنسخة ومُكيّفة لموقع حصاد اليوم

export const SITE_URL = "https://hasadalyoum.vercel.app"; // ⚠️ حدّث هذا الرابط إن وُجد دومين مخصص
export const SITE_NAME = "حصاد اليوم";
export const SITE_LOGO = `${SITE_URL}/logo.png`;

// كلمات الربط العربية التي تُحذف من الروابط لتحسين الـ SEO
const ARABIC_STOP_WORDS = [
  "في", "من", "على", "إلى", "عن", "مع", "هذا", "هذه", "التي", "الذي", "أن", "كان",
  "بين", "ما", "لم", "قد", "بعد", "قبل", "أو", "و", "ال", "إن", "لا", "إذا", "كل",
  "ذلك", "أي", "هو", "هي", "نحن", "هم", "أنت", "كما", "حيث", "لكن", "حتى", "عند",
  "خلال", "منذ", "ضد", "بعض", "أما", "لأن", "ثم", "التى", "الذى", "اذا", "انه",
  "انها", "كذلك", "وقد", "وفي", "ومن", "وعلى", "وإلى", "ولم", "وقال", "وكان",
];

// كيانات جغرافية وسياسية يمنية/إقليمية للاستخراج التلقائي للكلمات المفتاحية
const SEO_ENTITIES = [
  "صنعاء", "عدن", "تعز", "الحديدة", "مأرب", "حضرموت", "المكلا", "شبوة", "أبين",
  "لحج", "الضالع", "سقطرى", "المهرة", "باب المندب", "الساحل الغربي", "الجنوب",
  "اليمن", "السعودية", "الرياض", "الإمارات", "أبوظبي", "سلطنة عمان", "مسقط",
  "مجلس التعاون الخليجي", "الأمم المتحدة", "المجلس الانتقالي الجنوبي", "الحوثي",
];

/**
 * توليد عنوان ميتا محسّن (بحد أقصى 70 حرفاً) مع اسم الموقع
 */
export function generateMetaTitle(title: string): string {
  const brand = ` | ${SITE_NAME}`;
  const maxLength = 70 - brand.length;

  let trimmedTitle = title.trim();
  if (trimmedTitle.length <= maxLength) return trimmedTitle + brand;

  trimmedTitle = trimmedTitle.substring(0, maxLength);
  const lastSpaceIndex = trimmedTitle.lastIndexOf(" ");
  if (lastSpaceIndex > 0) trimmedTitle = trimmedTitle.substring(0, lastSpaceIndex);

  return trimmedTitle + brand;
}

/**
 * توليد رابط (Slug) محسّن: حذف كلمات الربط العربية + تقليل الطول لـ 85 حرفاً
 * (يُستخدم اختياريًا — حصاد اليوم تولّد الـ slug تلقائيًا من قاعدة البيانات)
 */
export function generateSEOSlug(title: string): string {
  let slug = title.trim();

  ARABIC_STOP_WORDS.forEach((word) => {
    const regex = new RegExp(`(^|\\s)${word}(\\s|$)`, "g");
    slug = slug.replace(regex, " ");
  });

  slug = slug
    .replace(/\s+/g, "-")
    .replace(/[^\u0621-\u064A\u0660-\u0669a-zA-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (slug.length > 85) {
    slug = slug.substring(0, 85);
    const lastHyphenIndex = slug.lastIndexOf("-");
    if (lastHyphenIndex > 0) slug = slug.substring(0, lastHyphenIndex);
  }

  return slug;
}

/**
 * استخراج كلمات مفتاحية تلقائيًا من العنوان والمحتوى
 */
export function extractSEOKeywords(title: string, content: string): string[] {
  const text = `${title} ${content}`.toLowerCase();
  const keywords: string[] = [];

  SEO_ENTITIES.forEach((entity) => {
    if (text.includes(entity.toLowerCase()) || text.includes(entity)) {
      keywords.push(entity);
    }
  });

  return [...new Set(keywords)];
}

interface SchemaPost {
  id: string;
  title: string;
  excerpt?: string | null;
  content?: string | null;
  featured_image?: string | null;
  created_at: string;
  updated_at?: string | null;
  published_at?: string | null;
  slug?: string | null;
  category?: { name: string } | null;
  author?: { id: string; name: string; avatar_url?: string | null; bio?: string | null } | null;
}

/**
 * الرابط الكنسي (Canonical URL) لصفحة الخبر — يطابق بنية روابط حصاد اليوم الحالية
 */
export function generateCanonicalUrl(post: { slug?: string | null; id: string }): string {
  return `${SITE_URL}/article/${post.slug || post.id}`;
}

/**
 * توليد Schema.org NewsArticle (JSON-LD) — يساعد على ظهور الخبر في "أهم القصص" بجوجل
 */
export function generateNewsArticleSchema(post: SchemaPost) {
  const canonicalUrl = generateCanonicalUrl(post);
  const dateUsed = post.published_at || post.created_at;

  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
    headline: post.title,
    description: post.excerpt || (post.content || "").substring(0, 160),
    image: post.featured_image ? [post.featured_image] : [SITE_LOGO],
    datePublished: dateUsed,
    dateModified: post.updated_at || dateUsed,
    author: post.author
      ? {
          "@type": "Person",
          name: post.author.name,
          url: `${SITE_URL}/author/${post.author.id}`,
          description: post.author.bio || undefined,
          image: post.author.avatar_url || undefined,
        }
      : {
          "@type": "Person",
          name: SITE_NAME,
          url: `${SITE_URL}/about`,
          worksFor: { "@type": "NewsMediaOrganization", name: SITE_NAME, url: SITE_URL },
        },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: SITE_LOGO, width: 487, height: 487 },
    },
    articleSection: post.category?.name || "أخبار",
    inLanguage: "ar",
    isAccessibleForFree: true,
  };
}

/**
 * توليد Schema.org FAQPage (JSON-LD) من محتوى الخبر
 * - إن وُجدت عناوين فرعية (h2/h3) داخل المحتوى تُستخدم كأسئلة/أجوبة
 * - وإلا تُبنى أسئلة قياسية من عنوان الخبر وملخصه
 */
export function generateFAQSchema(post: SchemaPost) {
  if (!post.content) return null;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(post.content, "text/html");
    const headings = Array.from(doc.querySelectorAll("h2, h3, .article-subheading"));

    let faqItems: Array<{ "@type": string; name: string; acceptedAnswer: { "@type": string; text: string } }> = [];

    if (headings.length >= 2) {
      faqItems = headings.slice(0, 5).map((heading) => {
        const question = heading.textContent?.trim() || "";
        let answer = "";
        let next = heading.nextElementSibling;
        while (next && !["H2", "H3"].includes(next.tagName) && !next.classList.contains("article-subheading")) {
          answer += (next.textContent?.trim() || "") + " ";
          next = next.nextElementSibling;
          if (answer.length > 300) break;
        }
        if (!answer.trim()) answer = post.excerpt || post.title;
        return {
          "@type": "Question",
          name: question,
          acceptedAnswer: { "@type": "Answer", text: answer.trim().substring(0, 300) },
        };
      }).filter((item) => item.name.length > 3);
    }

    if (faqItems.length < 2) {
      const paragraphs = Array.from(doc.querySelectorAll("p"))
        .map((p) => p.textContent?.trim() || "")
        .filter((t) => t.length > 30);
      const bodyAnswer = paragraphs.slice(0, 2).join(" ").substring(0, 300) || post.excerpt || post.title;

      faqItems = [
        {
          "@type": "Question",
          name: `ما هي تفاصيل: ${post.title}؟`,
          acceptedAnswer: { "@type": "Answer", text: post.excerpt || bodyAnswer },
        },
        {
          "@type": "Question",
          name: `ما آخر المستجدات حول: ${post.title}؟`,
          acceptedAnswer: { "@type": "Answer", text: bodyAnswer },
        },
        {
          "@type": "Question",
          name: `أين يمكن متابعة أخبار ${post.category?.name || "اليمن"} لحظة بلحظة؟`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `يمكنك متابعة آخر الأخبار لحظة بلحظة عبر موقع ${SITE_NAME} على ${SITE_URL}`,
          },
        },
      ];
    }

    return { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqItems };
  } catch {
    return null;
  }
}

/**
 * تنبيه محركات البحث (Google/Bing) بوجود sitemap محدّث
 */
export async function pingSearchEngines(sitemapUrl: string): Promise<{ google: boolean; bing: boolean }> {
  const results = { google: false, bing: false };
  try {
    await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`, { method: "GET", mode: "no-cors" });
    results.google = true;
  } catch (e) {
    console.error("Google ping failed:", e);
  }
  try {
    await fetch(`https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`, { method: "GET", mode: "no-cors" });
    results.bing = true;
  } catch (e) {
    console.error("Bing ping failed:", e);
  }
  return results;
}
