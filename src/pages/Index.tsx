import Layout from "@/components/layout/Layout";
import HeroGrid from "@/components/news/HeroGrid";
import NewsSection from "@/components/news/NewsSection";
import Sidebar from "@/components/layout/Sidebar";

const Index = () => {
  return (
    <Layout>
      {/* Hero Grid — full width */}
      <HeroGrid />

      {/* Main content + Sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 md:gap-10">
        {/* Main content — 8/12 columns */}
        <main className="xl:col-span-8 min-w-0">
          <NewsSection
            title="أخبار محلية"
            categorySlug="local-news"
            layout="featured"
            limit={5}
          />

          {/* Thin rule separator */}
          <div className="h-px bg-border mb-10 md:mb-14" />

          <NewsSection
            title="أخبار وتقارير"
            categorySlug="news-reports"
            layout="featured"
            limit={5}
          />

          <div className="h-px bg-border mb-10 md:mb-14" />

          <NewsSection
            title="اليمن في الصحافة"
            categorySlug="yemen-press"
            layout="grid"
            limit={4}
          />

          <div className="h-px bg-border mb-10 md:mb-14" />

          <NewsSection
            title="شؤون دولية"
            categorySlug="international"
            layout="grid"
            limit={4}
          />

          <div className="h-px bg-border mb-10 md:mb-14" />

          <NewsSection
            title="آراء واتجاهات"
            categorySlug="opinions"
            layout="opinions"
            limit={4}
            sectionVariant="opinions"
          />

          <div className="h-px bg-border mb-10 md:mb-14" />

          <NewsSection
            title="علوم وتكنولوجيا"
            categorySlug="technology"
            layout="grid"
            limit={4}
            sectionVariant="tech"
          />

          <div className="h-px bg-border mb-10 md:mb-14" />

          <NewsSection
            title="رياضة"
            categorySlug="sports"
            layout="grid"
            limit={4}
            sectionVariant="sports"
          />

          <div className="h-px bg-border mb-10 md:mb-14" />

          <NewsSection
            title="فيديو حصاد اليوم"
            categorySlug="video"
            layout="grid"
            limit={3}
          />
        </main>

        {/* Sidebar — 4/12 columns, sticky */}
        <aside className="xl:col-span-4">
          <div className="sticky top-20">
            <Sidebar />
          </div>
        </aside>
      </div>
    </Layout>
  );
};

export default Index;
