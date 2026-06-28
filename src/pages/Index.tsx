import { Helmet } from "react-helmet-async";
import Layout from "@/components/layout/Layout";
import HeroSlider from "@/components/news/HeroSlider";
import NewsSection from "@/components/news/NewsSection";
import MostRead from "@/components/news/MostRead";
import AdSlot from "@/components/news/AdSlot";
import { SITE_NAME, SITE_URL, SITE_LOGO } from "@/lib/seoHelpers";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const Index = () => {
  const { data: settings } = useSiteSettings();
  const siteDescription = settings?.site_description || "منبرك الأول لأخبار اليمن والحدث لحظة بلحظة";

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: { "@type": "ImageObject", url: SITE_LOGO },
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <Layout>
      <Helmet>
        <title>{`${SITE_NAME} | منبرك الأول لأخبار اليمن والحدث لحظة بلحظة`}</title>
        <meta name="description" content={siteDescription} />
        <link rel="canonical" href={SITE_URL} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:url" content={SITE_URL} />
        <script type="application/ld+json">{JSON.stringify(organizationSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(websiteSchema)}</script>
      </Helmet>

      <section className="mb-10">
        <HeroSlider />
      </section>

      <AdSlot position="header" className="mb-10" />

      <NewsSection title="أخبار محلية" categorySlug="local-news" layout="featured" limit={5} />
      <MostRead limit={6} />
      <NewsSection title="أخبار وتقارير" categorySlug="news-reports" layout="featured" limit={5} />
      <NewsSection title="اليمن في الصحافة" categorySlug="yemen-press" layout="grid" limit={4} />
      <NewsSection title="شؤون دولية" categorySlug="international" layout="grid" limit={3} />
      <NewsSection title="آراء واتجاهات" categorySlug="opinions" layout="opinions" limit={4} />
      <NewsSection title="علوم وتكنولوجيا" categorySlug="technology" layout="grid" limit={2} />
      <NewsSection title="رياضة" categorySlug="sports" layout="grid" limit={3} />
      <NewsSection title="فيديو حصاد اليوم" categorySlug="videos" layout="grid" limit={3} />
    </Layout>
  );
};

export default Index;
