import Layout from "@/components/layout/Layout";
import HeroSlider from "@/components/news/HeroSlider";
import NewsSection from "@/components/news/NewsSection";

const Index = () => {
  return (
    <Layout>
      <section className="mb-10">
        <HeroSlider />
      </section>

      <NewsSection title="أخبار محلية" categorySlug="local-news" layout="featured" limit={5} />
      <NewsSection title="أخبار وتقارير" categorySlug="news-reports" layout="featured" limit={5} />
      <NewsSection title="اليمن في الصحافة" categorySlug="yemen-press" layout="grid" limit={4} />
      <NewsSection title="شؤون دولية" categorySlug="international" layout="grid" limit={3} />
      <NewsSection title="آراء واتجاهات" categorySlug="opinions" layout="opinions" limit={4} />
      <NewsSection title="علوم وتكنولوجيا" categorySlug="technology" layout="grid" limit={2} />
      <NewsSection title="رياضة" categorySlug="sports" layout="grid" limit={3} />
      <NewsSection title="فيديو حصاد اليوم" categorySlug="video" layout="grid" limit={3} />
    </Layout>
  );
};

export default Index;
