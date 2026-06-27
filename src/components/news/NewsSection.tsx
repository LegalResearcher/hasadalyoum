import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { usePostsByCategory } from "@/hooks/usePosts";
import NewsCard from "./NewsCard";

interface NewsSectionProps {
  title: string;
  categorySlug: string;
  layout?: "featured" | "grid" | "list" | "opinions";
  limit?: number;
}

const NewsSection = ({ title, categorySlug, layout = "grid", limit }: NewsSectionProps) => {
  const { data: posts, isLoading } = usePostsByCategory(categorySlug, limit);

  if (isLoading) {
    return (
      <section className="mb-8 md:mb-10">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-1 h-6 md:h-8 bg-accent rounded-full" />
            <h2 className="text-lg md:text-xl font-bold text-foreground">{title}</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-muted rounded-lg h-48 md:h-64 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (!posts || posts.length === 0) {
    return null;
  }

  return (
    <section className="mb-8 md:mb-10">
      <div className="flex items-end justify-between mb-5 md:mb-7 border-b-2 border-foreground pb-2">
        <h2 className="font-serif-ar text-xl md:text-2xl text-foreground tracking-tight">{title}</h2>
        <Link
          to={`/category/${categorySlug}`}
          className="flex items-center gap-1 text-[11px] md:text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-accent transition-colors font-semibold"
        >
          <span>المزيد</span>
          <ChevronLeft size={14} className="md:w-4 md:h-4" />
        </Link>
      </div>

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
