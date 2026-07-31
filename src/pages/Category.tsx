import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/layout/Layout";
import { useCategoryBySlug, useCategorySettingsBySlug } from "@/hooks/useCategories";
import { Post } from "@/hooks/usePosts";
import NewsCard from "@/components/news/NewsCard";
import { SITE_NAME, SITE_URL } from "@/lib/seoHelpers";

const Category = () => {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState(1);

  const { data: category, isLoading: categoryLoading } = useCategoryBySlug(slug || "");
  const { data: categorySettings } = useCategorySettingsBySlug(slug || "");
  const postsLimit = 10;
  const displayStyle = categorySettings?.display_style || "grid";

  // إعادة ضبط رقم الصفحة عند تغيير القسم (نفس منطق الجنوب فويس)
  useEffect(() => {
    setPage(1);
  }, [slug]);

  // التمرير للأعلى فور تغيير القسم أو رقم الصفحة (نفس منطق الجنوب فويس)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug, page]);

  const { data, isLoading: postsLoading } = useQuery({
    queryKey: ["category-posts", category?.id, page, postsLimit],
    queryFn: async () => {
      if (!category) return { posts: [] as Post[], total: 0 };

      const from = (page - 1) * postsLimit;
      const to = from + postsLimit - 1;

      // نستبعد عمداً حقل content (نص المقال الكامل) هنا — صفحة القسم تعرض بطاقات
      // فقط (عنوان + صورة + ملخص)، وجلب المحتوى الكامل لكل مقال بالقائمة كان
      // يستهلك Database Egress على Supabase بدون أي فائدة فعلية.
      const { data, count, error } = await supabase
        .from("posts")
        .select(
          `id, title, slug, excerpt, featured_image, thumbnail_image, category_id,
           author_id, status, is_featured, is_breaking, views_count, word_count,
           reading_time, published_at, created_at,
           category:categories(id, name, slug), author:authors(id, name, avatar_url)`,
          { count: "exact" }
        )
        .eq("category_id", category.id)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      return { posts: (data || []) as Post[], total: count || 0 };
    },
    enabled: !!category?.id,
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 60 * 5,
  });

  const posts = data?.posts || [];
  const totalPages = Math.ceil((data?.total || 0) / postsLimit);

  // دالة لتوليد نطاق الأرقام (5 صفحات فقط) - نفس منطق الجنوب فويس
  const getPaginationGroup = () => {
    let start = Math.floor((page - 1) / 5) * 5;
    return Array.from({ length: Math.min(5, totalPages - start) }, (_, i) => start + i + 1);
  };

  if (categoryLoading || (postsLoading && !data)) {
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
      <Helmet>
        <title>{`${category.name} | ${SITE_NAME}`}</title>
        <meta name="description" content={`آخر أخبار ${category.name} لحظة بلحظة عبر ${SITE_NAME}`} />
        <link rel="canonical" href={`${SITE_URL}/category/${category.slug}`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${category.name} | ${SITE_NAME}`} />
        <meta property="og:url" content={`${SITE_URL}/category/${category.slug}`} />
        <meta property="og:site_name" content={SITE_NAME} />
        {/* صفحات الترقيم: noindex للصفحات بعد الأولى لتجنب تكرار المحتوى */}
        {page > 1 && <meta name="robots" content="noindex, follow" />}
      </Helmet>

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
        <>
          {displayStyle === "list" ? (
            <div className="flex flex-col gap-4 md:gap-5">
              {posts.map((post) => (
                <NewsCard key={post.id} post={post} variant="horizontal" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {posts.map((post) => (
                <NewsCard key={post.id} post={post} />
              ))}
            </div>
          )}

          {/* نظام ترقيم الصفحات (نفس منطق وأزرار الجنوب فويس) */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-10 md:mt-12 gap-2 flex-wrap" dir="rtl">
              {/* زر السابق */}
              <button
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg border border-border text-sm font-bold bg-card text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-40 disabled:hover:bg-card disabled:hover:text-foreground transition-all duration-300"
              >
                السابق
              </button>

              {/* أرقام الصفحات */}
              {getPaginationGroup().map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-10 h-10 rounded-lg border text-sm font-bold transition-all duration-300
                    ${p === page
                      ? "bg-accent text-accent-foreground border-accent shadow-md scale-110"
                      : "bg-card text-foreground hover:bg-muted border-border"
                    }`}
                >
                  {p}
                </button>
              ))}

              {/* زر التالي */}
              <button
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-lg border border-border text-sm font-bold bg-card text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-40 disabled:hover:bg-card disabled:hover:text-foreground transition-all duration-300"
              >
                التالي
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 md:py-20 bg-card rounded-lg">
          <p className="text-muted-foreground text-sm md:text-base">لا توجد أخبار في هذا القسم حالياً</p>
        </div>
      )}
    </Layout>
  );
};

export default Category;
