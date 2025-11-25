import { useParams, Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { newsData, categories } from "@/data/newsData";
import NewsCard from "@/components/news/NewsCard";
import SectionHeader from "@/components/news/SectionHeader";

const Category = () => {
  const { slug } = useParams();
  const category = categories.find((c) => c.slug === slug);
  const categoryNews = newsData.filter((n) => n.categorySlug === slug);

  // If no specific category news, show all news
  const displayNews = categoryNews.length > 0 ? categoryNews : newsData;

  if (!category) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold text-foreground mb-4">القسم غير موجود</h1>
          <Link to="/" className="text-accent hover:underline">
            العودة للرئيسية
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-accent">الرئيسية</Link>
        <span>/</span>
        <span className="text-foreground">{category.name}</span>
      </nav>

      <SectionHeader title={category.name} showMore={false} />

      {displayNews.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayNews.map((item) => (
            <NewsCard
              key={item.id}
              id={item.id}
              title={item.title}
              category={item.category}
              image={item.image}
              slug={item.slug}
              date={item.date}
              excerpt={item.excerpt}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-muted-foreground">لا توجد أخبار في هذا القسم حالياً</p>
        </div>
      )}
    </Layout>
  );
};

export default Category;
