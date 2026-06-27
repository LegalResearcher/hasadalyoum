import { Helmet } from "react-helmet-async";
import Layout from "@/components/layout/Layout";
import MostRead from "@/components/news/MostRead";
import { SITE_NAME, SITE_URL } from "@/lib/seoHelpers";

/**
 * صفحة "الأكثر قراءة" الموسعة — حصاد اليوم
 */
const MostReadPage = () => {
  return (
    <Layout>
      <Helmet>
        <title>{`الأكثر قراءة | ${SITE_NAME}`}</title>
        <meta name="description" content={`الأخبار الأكثر قراءة ومتابعة وتفاعلاً على موقع ${SITE_NAME}`} />
        <link rel="canonical" href={`${SITE_URL}/most-read`} />
        <meta property="og:title" content={`الأكثر قراءة | ${SITE_NAME}`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SITE_URL}/most-read`} />
        <meta property="og:site_name" content={SITE_NAME} />
      </Helmet>

      <div className="bg-card rounded-2xl shadow-sm p-4 md:p-8 border border-border">
        <h1 className="text-2xl md:text-3xl font-black text-foreground mb-6">🔥 الأكثر قراءة</h1>
        <MostRead limit={24} showHeading={false} />
      </div>
    </Layout>
  );
};

export default MostReadPage;
