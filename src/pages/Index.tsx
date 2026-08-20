import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";
import Layout from "@/components/layout/Layout";
import HeroSlider from "@/components/news/HeroSlider";
import NewsSection from "@/components/news/NewsSection";
import MostRead from "@/components/news/MostRead";
import AdSlot from "@/components/news/AdSlot";
import CurrencyGoldPrices from "@/components/news/CurrencyGoldPrices";
import { SITE_NAME, SITE_URL, SITE_LOGO } from "@/lib/seoHelpers";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const TELEGRAM_HASAD_VISIT_ENDPOINT = "https://moilegbot-cd9jlnvj.manus.space/api/telegram/hasad-visit";
type TelegramMiniApp = { initData?: string; ready: () => void };
type TelegramWindow = Window & { Telegram?: { WebApp?: TelegramMiniApp } };

// slug خاص للأكثر قراءة — يُعالج كمكوّن منفصل وليس قسماً عادياً
const MOST_READ_SLUG = "most-read";

// ─── خريطة slug → layout ───────────────────────────────────────────────────────
// عدّل هذه الخريطة إذا أردت تغيير طريقة عرض قسم معيّن
const LAYOUT_MAP: Record<string, "featured" | "grid" | "list" | "opinions"> = {
  "local-news":    "featured",
  "news-reports":  "featured",
  "opinions":      "opinions",
};

// ─── جلب الأقسام المُفعَّلة في الرئيسية من category_settings ─────────────────
const useHomeCategories = () => {
  return useQuery({
    queryKey: ["home-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("category_settings")
        .select(
          "show_in_home, home_order, posts_per_page, categories(id, name, slug)"
        )
        .eq("show_in_home", true)
        .order("home_order", { ascending: true });

      if (error) throw error;

      return (data || [])
        .map((row: any) => ({
          slug:       row.categories?.slug  as string,
          name:       row.categories?.name  as string,
          limit:      (row.posts_per_page   as number) ?? 5,
          home_order: (row.home_order       as number) ?? 99,
        }))
        .filter((c) => c.slug && c.name);
    },
    staleTime: 1000 * 60 * 2,
  });
};

// ─── الصفحة الرئيسية ──────────────────────────────────────────────────────────
const Index = () => {
  const { data: settings } = useSiteSettings();
  const { data: homeCategories = [] } = useHomeCategories();
  const [telegramVisitStatus, setTelegramVisitStatus] = useState<"idle" | "checking" | "verified" | "failed">("idle");

  useEffect(() => {
    const webApp = (window as TelegramWindow).Telegram?.WebApp;
    if (!webApp?.initData) return;
    webApp.ready();
    setTelegramVisitStatus("checking");
    fetch(TELEGRAM_HASAD_VISIT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        initData: webApp.initData,
        region: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    })
      .then(response => {
        if (!response.ok) throw new Error("verification-failed");
        setTelegramVisitStatus("verified");
      })
      .catch(() => setTelegramVisitStatus("failed"));
  }, []);

  const siteDescription =
    settings?.site_description ||
    "منبرك الأول لأخبار اليمن والحدث لحظة بلحظة";

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type":    "NewsMediaOrganization",
    name:       SITE_NAME,
    url:        SITE_URL,
    logo:       { "@type": "ImageObject", url: SITE_LOGO },
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type":    "WebSite",
    name:       SITE_NAME,
    url:        SITE_URL,
    potentialAction: {
      "@type":       "SearchAction",
      target:        `${SITE_URL}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <Layout>
      {telegramVisitStatus !== "idle" && (
        <div className="fixed left-4 right-4 top-4 z-50 mx-auto max-w-md rounded-2xl border border-amber-400/30 bg-white/95 px-4 py-3 text-center text-sm font-bold text-slate-800 shadow-xl backdrop-blur" role="status">
          {telegramVisitStatus === "checking" && "جارٍ توثيق زيارتك لحصاد اليوم…"}
          {telegramVisitStatus === "verified" && "تم توثيق زيارتك لحصاد اليوم بنجاح. يمكنك العودة إلى البوت."}
          {telegramVisitStatus === "failed" && "تعذر توثيق الزيارة حاليًا. افتح حصاد اليوم من زر التحقق داخل البوت وحاول مرة أخرى."}
        </div>
      )}
      <Helmet>
        <title>{`${SITE_NAME} | منبرك الأول لأخبار اليمن والحدث لحظة بلحظة`}</title>
        <meta name="description" content={siteDescription} />
        <link rel="canonical" href={SITE_URL} />
        <meta property="og:type"      content="website" />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:url"       content={SITE_URL} />
        <script type="application/ld+json">{JSON.stringify(organizationSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(websiteSchema)}</script>
      </Helmet>

      {/* السلايدر الرئيسي */}
      <section className="mb-10">
        <HeroSlider />
      </section>

      {/* إعلان أعلى الصفحة */}
      <AdSlot position="header" className="mb-10" />

      {/* قسم أسعار العملات والذهب */}
      <CurrencyGoldPrices />

      {/* الأقسام الديناميكية — تُعرض فقط إذا كان show_in_home = true في لوحة التحكم */}
      {homeCategories.map((cat) =>
        cat.slug === MOST_READ_SLUG ? (
          // "الأكثر قراءة" يُعرض كمكوّن خاص وليس NewsSection عادي
          <MostRead key="most-read" limit={cat.limit} />
        ) : (
          <NewsSection
            key={cat.slug}
            title={cat.name}
            categorySlug={cat.slug}
            layout={LAYOUT_MAP[cat.slug] ?? "grid"}
            limit={cat.limit}
          />
        )
      )}
    </Layout>
  );
};

export default Index;
