import Layout from "@/components/layout/Layout";
import HeroSlider from "@/components/news/HeroSlider";
import NewsSection from "@/components/news/NewsSection";
import { newsData } from "@/data/newsData";

const Index = () => {
  const adenNews = newsData.filter((n) => n.categorySlug === "aden-news");
  const localNews = newsData.filter((n) => n.categorySlug === "local-news");
  const economyNews = newsData.filter((n) => n.categorySlug === "economy");
  const sportsNews = newsData.filter((n) => n.categorySlug === "sports");
  const healthNews = newsData.filter((n) => n.categorySlug === "health");
  const cultureNews = newsData.filter((n) => n.categorySlug === "culture");
  const techNews = newsData.filter((n) => n.categorySlug === "technology");
  const internationalNews = newsData.filter((n) => n.categorySlug === "international");

  return (
    <Layout>
      {/* Hero Slider */}
      <section className="mb-10">
        <HeroSlider />
      </section>

      {/* Aden News - Featured Layout */}
      <NewsSection
        title="أخبار عدن"
        href="/category/aden-news"
        news={[...adenNews, ...newsData.slice(0, 5)]}
        layout="featured"
      />

      {/* Local News */}
      <NewsSection
        title="أخبار محلية"
        href="/category/local-news"
        news={[...localNews, ...newsData.slice(0, 4)]}
        layout="grid"
      />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <NewsSection
          title="اقتصاد"
          href="/category/economy"
          news={[...economyNews, ...newsData.slice(0, 4)]}
          layout="list"
        />
        <NewsSection
          title="شؤون دولية"
          href="/category/international"
          news={[...internationalNews, ...newsData.slice(0, 4)]}
          layout="list"
        />
      </div>

      {/* Sports */}
      <NewsSection
        title="رياضة"
        href="/category/sports"
        news={[...sportsNews, ...newsData.slice(0, 4)]}
        layout="grid"
      />

      {/* Three Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        <NewsSection
          title="صحة"
          href="/category/health"
          news={[...healthNews, ...newsData.slice(0, 3)]}
          layout="list"
        />
        <NewsSection
          title="ثقافة وفن"
          href="/category/culture"
          news={[...cultureNews, ...newsData.slice(0, 3)]}
          layout="list"
        />
        <NewsSection
          title="علوم وتكنولوجيا"
          href="/category/technology"
          news={[...techNews, ...newsData.slice(0, 3)]}
          layout="list"
        />
      </div>
    </Layout>
  );
};

export default Index;
