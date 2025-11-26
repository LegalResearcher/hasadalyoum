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
      <section className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-accent rounded-full" />
            <h2 className="text-xl font-bold text-foreground">{title}</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-muted rounded-lg h-64 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (!posts || posts.length === 0) {
    return null;
  }

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-accent rounded-full" />
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
        </div>
        <Link
          to={`/category/${categorySlug}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-accent transition-colors"
        >
          <span>المزيد</span>
          <ChevronLeft size={16} />
        </Link>
      </div>

      {layout === "featured" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {posts[0] && (
            <div className="lg:col-span-2">
              <NewsCard post={posts[0]} />
            </div>
          )}
          <div className="space-y-4">
            {posts.slice(1, 5).map((post) => (
              <NewsCard key={post.id} post={post} variant="horizontal" />
            ))}
          </div>
        </div>
      )}

      {layout === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {posts.map((post) => (
            <NewsCard key={post.id} post={post} variant="small" />
          ))}
        </div>
      )}

      {layout === "list" && (
        <div className="space-y-4">
          {posts.map((post) => (
            <NewsCard key={post.id} post={post} variant="horizontal" />
          ))}
        </div>
      )}

      {layout === "opinions" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {posts.map((post) => (
            <NewsCard key={post.id} post={post} variant="opinion" />
          ))}
        </div>
      )}
    </section>
  );
};

export default NewsSection;
