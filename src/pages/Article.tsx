import { useParams, Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { newsData } from "@/data/newsData";
import { Calendar, User, Tag, Share2, Facebook, Twitter } from "lucide-react";
import { FaTelegram, FaWhatsapp } from "react-icons/fa";
import NewsCard from "@/components/news/NewsCard";
import SectionHeader from "@/components/news/SectionHeader";

const Article = () => {
  const { slug } = useParams();
  const article = newsData.find((n) => n.slug === slug);

  if (!article) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold text-foreground mb-4">المقال غير موجود</h1>
          <Link to="/" className="text-accent hover:underline">
            العودة للرئيسية
          </Link>
        </div>
      </Layout>
    );
  }

  const relatedNews = newsData
    .filter((n) => n.categorySlug === article.categorySlug && n.id !== article.id)
    .slice(0, 4);

  return (
    <Layout>
      <article className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-accent">الرئيسية</Link>
          <span>/</span>
          <Link to={`/category/${article.categorySlug}`} className="hover:text-accent">
            {article.category}
          </Link>
          <span>/</span>
          <span className="text-foreground line-clamp-1">{article.title}</span>
        </nav>

        {/* Category Badge */}
        <span className="inline-block bg-category text-primary-foreground px-4 py-1 rounded text-sm font-medium mb-4">
          {article.category}
        </span>

        {/* Title */}
        <h1 className="text-3xl font-bold text-foreground leading-relaxed mb-6">
          {article.title}
        </h1>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground mb-6 pb-6 border-b border-border">
          <div className="flex items-center gap-2">
            <User size={16} />
            <span>{article.author}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={16} />
            <span>{article.date}</span>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-sm text-muted-foreground flex items-center gap-2">
            <Share2 size={16} />
            مشاركة:
          </span>
          <div className="flex gap-2">
            <button className="w-8 h-8 rounded-full bg-[#1877f2] text-primary-foreground flex items-center justify-center hover:opacity-80 transition-opacity">
              <Facebook size={16} />
            </button>
            <button className="w-8 h-8 rounded-full bg-[#1da1f2] text-primary-foreground flex items-center justify-center hover:opacity-80 transition-opacity">
              <Twitter size={16} />
            </button>
            <button className="w-8 h-8 rounded-full bg-[#25d366] text-primary-foreground flex items-center justify-center hover:opacity-80 transition-opacity">
              <FaWhatsapp size={16} />
            </button>
            <button className="w-8 h-8 rounded-full bg-[#0088cc] text-primary-foreground flex items-center justify-center hover:opacity-80 transition-opacity">
              <FaTelegram size={16} />
            </button>
          </div>
        </div>

        {/* Featured Image */}
        <div className="relative aspect-video rounded-lg overflow-hidden mb-8">
          <img
            src={article.image}
            alt={article.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content */}
        <div className="prose prose-lg max-w-none mb-8">
          <p className="text-foreground leading-loose text-lg mb-6">
            {article.excerpt}
          </p>
          <p className="text-foreground leading-loose">
            {article.content}
          </p>
          <p className="text-foreground leading-loose mt-4">
            وأضاف المصدر أن الجهود المبذولة تهدف إلى تحقيق الاستقرار في المنطقة وتعزيز التعاون بين جميع الأطراف. وأشار إلى أن هناك تقدماً ملموساً في المحادثات الجارية، مع التأكيد على أهمية الحوار كوسيلة أساسية لحل الخلافات.
          </p>
          <p className="text-foreground leading-loose mt-4">
            من جانبه، أكد المتحدث الرسمي أن جميع الإجراءات المتخذة تأتي في إطار السعي لتحقيق المصلحة العامة وخدمة المواطنين. وشدد على ضرورة التكاتف والتعاون بين جميع مؤسسات الدولة لتجاوز التحديات الراهنة.
          </p>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-2 mb-8 pb-8 border-b border-border">
          <Tag size={16} className="text-muted-foreground" />
          {article.tags.map((tag) => (
            <Link
              key={tag}
              to={`/tag/${tag}`}
              className="bg-muted text-muted-foreground px-3 py-1 rounded text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {tag}
            </Link>
          ))}
        </div>
      </article>

      {/* Related News */}
      {relatedNews.length > 0 && (
        <section className="mt-10">
          <SectionHeader title="أخبار ذات صلة" showMore={false} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedNews.map((item) => (
              <NewsCard
                key={item.id}
                id={item.id}
                title={item.title}
                category={item.category}
                image={item.image}
                slug={item.slug}
                variant="small"
              />
            ))}
          </div>
        </section>
      )}
    </Layout>
  );
};

export default Article;
