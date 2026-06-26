import { Link } from "react-router-dom";
import { usePostsByCategory } from "@/hooks/usePosts";
import NewsCard from "./NewsCard";
import SectionHeader from "./SectionHeader";

interface NewsSectionProps {
  title: string;
  categorySlug: string;
  layout?: "featured" | "grid" | "list" | "opinions";
  limit?: number;
  sectionVariant?: "default" | "opinions" | "sports" | "tech";
}

const NewsSectionSkeleton = ({ title, categorySlug, sectionVariant }: { title: string; categorySlug: string; sectionVariant?: string }) => (
  <section className="mb-10 md:mb-14">
    <SectionHeader title={title} categorySlug={categorySlug} variant={(sectionVariant as any) || "default"} />
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-muted rounded h-48 md:h-64 animate-pulse" />
      ))}
    </div>
  </section>
);

const NewsSection = ({ title, categorySlug, layout = "grid", limit, sectionVariant = "default" }: NewsSectionProps) => {
  const { data: posts, isLoading } = usePostsByCategory(categorySlug, limit);

  if (isLoading) return <NewsSectionSkeleton title={title} categorySlug={categorySlug} sectionVariant={sectionVariant} />;
  if (!posts || posts.length === 0) return null;

  return (
    <section className="mb-10 md:mb-14">
      <SectionHeader title={title} categorySlug={categorySlug} variant={sectionVariant} />

      {layout === "featured" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {posts[0] && (
            <div className="lg:col-span-2">
              <NewsCard post={posts[0]} />
            </div>
          )}
          <div className="space-y-3 md:space-y-4">
            {posts.slice(1, 5).map((post) => (
              <NewsCard key={post.id} post={post} variant="horizontal" />
            ))}
          </div>
        </div>
      )}

      {layout === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {posts.map((post) => (
            <NewsCard key={post.id} post={post} variant="small" />
          ))}
        </div>
      )}

      {layout === "list" && (
        <div className="space-y-3 md:space-y-4">
          {posts.map((post) => (
            <NewsCard key={post.id} post={post} variant="horizontal" />
          ))}
        </div>
      )}

      {layout === "opinions" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {posts.map((post) => (
            <NewsCard key={post.id} post={post} variant="opinion" />
          ))}
        </div>
      )}
    </section>
  );
};

export default NewsSection;
