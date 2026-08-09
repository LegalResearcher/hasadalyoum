import { Helmet } from "react-helmet-async";
import Layout from "@/components/layout/Layout";
import { SITE_NAME, SITE_URL, SITE_LOGO } from "@/lib/seoHelpers";

/**
 * صفحة "من نحن / عن صاحب الامتياز" — حصاد اليوم
 *
 * الهدف: بناء هوية رقمية واضحة لـ "معين الناصر" مرتبطة بالموقع، بحيث يظهر
 * اسمه بنتائج بحث جوجل بنفس الصيغة المعتمدة، أسوة بما يحدث مع alnaseer.org.
 * هذي الصفحة تُقرأ من قبل الزوار العاديين (Helmet) ومن قبل الروبوتات التي لا
 * تُنفّذ JavaScript عبر واجهة SSR منفصلة (api/about.js) بنفس المحتوى بالضبط.
 */
const PAGE_TITLE = `معين الناصر | صاحب الامتياز ورئيس تحرير "${SITE_NAME}" - موقع إخباري يمني مستقل`;
const PAGE_DESCRIPTION = `معين الناصر، صاحب الامتياز ورئيس تحرير صحيفة ${SITE_NAME} الإلكترونية، منبر إعلامي يمني حر ومستقل ينطلق من العاصمة صنعاء لتغطية الشأن اليمني بمصداقية واستقلالية.`;
const PAGE_URL = `${SITE_URL}/about`;

const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "معين الناصر",
  "alternateName": "Moieen Alnaser",
  "url": PAGE_URL,
  "jobTitle": "صاحب الامتياز ورئيس التحرير",
  "description": PAGE_DESCRIPTION,
  "image": SITE_LOGO,
  "worksFor": {
    "@type": "NewsMediaOrganization",
    "name": SITE_NAME,
    "url": SITE_URL,
  },
  "sameAs": [
    "https://alnaseer.org/",
    "https://www.facebook.com/hasadalyoum",
    "https://twitter.com/hasadalyoum",
  ],
};

const About = () => {
  return (
    <Layout>
      <Helmet>
        <title>{PAGE_TITLE}</title>
        <meta name="description" content={PAGE_DESCRIPTION} />
        <link rel="canonical" href={PAGE_URL} />

        <meta property="og:type" content="profile" />
        <meta property="og:title" content={PAGE_TITLE} />
        <meta property="og:description" content={PAGE_DESCRIPTION} />
        <meta property="og:url" content={PAGE_URL} />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:image" content={SITE_LOGO} />

        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={PAGE_TITLE} />
        <meta name="twitter:description" content={PAGE_DESCRIPTION} />

        <script type="application/ld+json">{JSON.stringify(personSchema)}</script>
      </Helmet>

      <div className="bg-card rounded-2xl shadow-sm p-6 md:p-10 border border-border max-w-3xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-black text-foreground mb-2">
          معين الناصر
        </h1>
        <p className="text-primary font-bold text-lg mb-6">
          صاحب الامتياز ورئيس تحرير "{SITE_NAME}" - موقع إخباري يمني مستقل
        </p>

        <div className="space-y-4 text-foreground/90 leading-relaxed text-[15px] md:text-base">
          <p>
            معين الناصر هو صاحب الامتياز ورئيس تحرير صحيفة <strong>{SITE_NAME}</strong> الإلكترونية،
            المنبر الإعلامي اليمني الحر والمستقل الذي ينطلق من العاصمة صنعاء لتغطية الأحداث
            السياسية والاقتصادية والميدانية في اليمن والجنوب والعالم لحظة بلحظة.
          </p>
          <p>
            يتمتع معين الناصر بخلفية قانونية وشرعية، وهو مؤسس ومطوّر{" "}
            <a href="https://alnaseer.org/" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              منصة الناصر القانونية
            </a>{" "}
            الموجهة لطلاب الشريعة والقانون بالجمهورية اليمنية، إلى جانب إشرافه على عدد من
            المنصات الإعلامية والتقنية اليمنية.
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-border flex flex-wrap gap-4 text-sm">
          <a href={SITE_URL} className="text-primary font-semibold hover:underline">
            {SITE_NAME} — الصفحة الرئيسية
          </a>
          <a href="https://alnaseer.org/" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">
            منصة الناصر القانونية
          </a>
        </div>
      </div>
    </Layout>
  );
};

export default About;
