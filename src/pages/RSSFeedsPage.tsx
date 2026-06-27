import { Rss, Copy, Radio, Info, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Helmet } from "react-helmet-async";
import Layout from "@/components/layout/Layout";
import { SITE_NAME, SITE_URL } from "@/lib/seoHelpers";

/**
 * صفحة خلاصات RSS - حصاد اليوم
 * تتيح للزوار الحصول على روابط التغذية لمختلف أقسام الموقع
 */

const rssFeeds = [
  { name: "الرئيسي (جميع الأخبار)", slug: "main", url: `${SITE_URL}/rss.xml` },
  { name: "أخبار محلية", slug: "local-news", url: `${SITE_URL}/api/rss/category?category=local-news` },
  { name: "أخبار وتقارير", slug: "news-reports", url: `${SITE_URL}/api/rss/category?category=news-reports` },
  { name: "اليمن في الصحافة", slug: "yemen-press", url: `${SITE_URL}/api/rss/category?category=yemen-press` },
  { name: "شؤون دولية", slug: "international", url: `${SITE_URL}/api/rss/category?category=international` },
  { name: "آراء واتجاهات", slug: "opinions", url: `${SITE_URL}/api/rss/category?category=opinions` },
  { name: "علوم وتكنولوجيا", slug: "technology", url: `${SITE_URL}/api/rss/category?category=technology` },
  { name: "رياضة", slug: "sports", url: `${SITE_URL}/api/rss/category?category=sports` },
  { name: "فيديو", slug: "video", url: `${SITE_URL}/api/rss/category?category=video` },
];

const RSSFeedsPage = () => {
  const { toast } = useToast();

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "تم نسخ الرابط!", description: "يمكنك الآن إضافة الرابط إلى قارئ الأخبار الخاص بك." });
    } catch {
      toast({ title: "خطأ في النسخ", description: "يرجى المحاولة مرة أخرى أو نسخ الرابط يدوياً.", variant: "destructive" });
    }
  };

  return (
    <Layout>
      <Helmet>
        <title>{`خلاصات RSS | ${SITE_NAME}`}</title>
        <meta name="description" content={`تابع آخر أخبار ${SITE_NAME} لحظة بلحظة عبر خدمة RSS لجميع الأقسام الإخبارية`} />
        <link rel="canonical" href={`${SITE_URL}/feed`} />
      </Helmet>

      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-3 bg-foreground text-background px-6 md:px-8 py-3 rounded-full mb-6 shadow-lg">
          <Radio className="w-5 h-5 md:w-6 md:h-6 animate-pulse" />
          <h1 className="text-xl md:text-2xl font-black">خدمة خلاصات RSS</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed font-medium">
          ابقَ على اتصال دائم مع {SITE_NAME}. اشترك في خلاصاتنا الإخبارية المفضلة واحصل على التحديثات فور صدورها مباشرة على جهازك.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {rssFeeds.map((feed) => (
          <Card key={feed.slug} className="group border border-border shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
            <CardContent className="p-5 md:p-6">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-11 h-11 md:w-12 md:h-12 bg-accent/10 group-hover:bg-accent transition-colors duration-300 rounded-xl flex items-center justify-center shrink-0">
                  <Rss className="w-5 h-5 md:w-6 md:h-6 text-accent group-hover:text-accent-foreground transition-colors duration-300" />
                </div>
                <div className="overflow-hidden">
                  <h3 className="font-bold text-foreground text-sm md:text-base mb-1 truncate">{feed.name}</h3>
                  <p className="text-[10px] text-muted-foreground truncate font-mono" dir="ltr">{feed.url}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button asChild className="flex-1 rounded-lg text-xs font-bold">
                  <a href={feed.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                    عرض التغذية
                  </a>
                </Button>
                <Button variant="outline" onClick={() => copyToClipboard(feed.url)} className="group/btn">
                  <Copy className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-16 bg-card rounded-2xl p-6 md:p-8 border border-border shadow-sm">
        <h2 className="text-lg md:text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 md:w-6 md:h-6 text-accent" />
          حول خدمة RSS
        </h2>
        <div className="text-muted-foreground space-y-4 leading-loose text-sm md:text-base max-w-4xl">
          <p>
            خدمة <strong className="text-accent">RSS</strong> هي الطريقة الأسرع لمتابعة محتوى <strong>{SITE_NAME}</strong> دون الحاجة لفتح المتصفح باستمرار. فور نشر أي خبر جديد في القسم الذي تشترك به، سيظهر تنبيه فوري في تطبيق قراءة الأخبار الخاص بك.
          </p>
          <p>
            يمكنك استخدام برامج مثل <span className="font-bold">Feedly</span> أو <span className="font-bold">Inoreader</span> أو إضافة روابط الـ RSS إلى تطبيقات البريد الإلكتروني أو قنوات التيليجرام لإدارة المحتوى الإخباري الخاص بك بكفاءة.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default RSSFeedsPage;
