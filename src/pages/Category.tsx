import { useParams, Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { useCategoryBySlug } from "@/hooks/useCategories";
import { usePosts } from "@/hooks/usePosts";
import NewsCard from "@/components/news/NewsCard";

const Category = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: category, isLoading: categoryLoading } = useCategoryBySlug(slug || "");
  const { data: posts, isLoading: postsLoading } = usePosts({ categorySlug: slug });

  if (categoryLoading || postsLoading) {
    return (
      <Layout>
        <div className="animate-pulse">
          <div className="h-8 md:h-10 bg-muted rounded w-1/4 mb-4 md:mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-muted rounded-lg h-48 md:h-64" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!category) {
    return (
      <Layout>
        <div className="text-center py-16 md:py-20">
          <h1 className="text-xl md:text-2xl font-bold text-foreground mb-4">القسم غير موجود</h1>
          <Link to="/" className="text-accent hover:underline">العودة للرئيسية</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <nav className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
        <Link to="/" className="hover:text-accent">الرئيسية</Link>
        <span className="mx-1 md:mx-2">/</span>
        <span className="text-foreground">{category.name}</span>
      </nav>
      
      <div className="flex items-center gap-2 md:gap-3 mb-6 md:mb-8">
        <div className="w-1 h-8 md:h-10 bg-accent rounded-full" />
        <h1 className="text-xl md:text-2xl font-bold text-foreground">{category.name}</h1>
      </div>
      
      {posts && posts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {posts.map((post) => (
            <NewsCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 md:py-20 bg-card rounded-lg">
          <p className="text-muted-foreground text-sm md:text-base">لا توجد أخبار في هذا القسم حالياً</p>
        </div>
      )}
    </Layout>
  );
};

export default Category;
