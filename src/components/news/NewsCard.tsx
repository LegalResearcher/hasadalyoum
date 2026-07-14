import { Link } from "react-router-dom";
import { Post } from "@/hooks/usePosts";

interface NewsCardProps {
  post: Post;
  variant?: "default" | "horizontal" | "small" | "opinion";
}

const NewsCard = ({ post, variant = "default" }: NewsCardProps) => {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (variant === "opinion") {
    return (
      <Link to={`/article/${post.slug}`} className="block group">
        <div className="border-t border-border pt-4">
          <div className="flex items-center gap-3 mb-3">
            {post.author?.avatar_url ? (
              <img
                src={post.author.avatar_url}
                alt={post.author.name}
                className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover grayscale group-hover:grayscale-0 transition-all"
              />
            ) : (
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-muted flex items-center justify-center">
                <span className="text-lg font-serif-ar text-muted-foreground">
                  {post.author?.name?.charAt(0) || "؟"}
                </span>
              </div>
            )}
            <div>
              <p className="font-serif-ar text-foreground text-sm md:text-base leading-tight">{post.author?.name || "كاتب"}</p>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">رأي</p>
            </div>
          </div>
          <h3 className="font-serif-ar text-foreground text-base md:text-lg leading-snug group-hover:text-accent transition-colors line-clamp-3">
            {post.title}
          </h3>
        </div>
      </Link>
    );
  }

  if (variant === "horizontal") {
    return (
      <Link
        to={`/article/${post.slug}`}
        className="flex gap-3 md:gap-4 group py-3 border-b border-border last:border-0"
      >
        <div className="w-24 h-20 sm:w-32 sm:h-24 flex-shrink-0 overflow-hidden bg-muted flex items-center justify-center">
          <img
            src={post.featured_image || "/logo.png"}
            alt={post.title}
            className={post.featured_image ? "w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" : "w-1/2 h-1/2 object-contain"}
          />
        </div>
        <div className="flex-1">
          {post.category && (
            <span className="text-[10px] md:text-xs uppercase tracking-[0.18em] text-accent font-semibold">{post.category.name}</span>
          )}
          <h4 className="font-serif-ar text-sm md:text-base text-foreground line-clamp-2 mt-1 leading-snug group-hover:text-accent transition-colors">
            {post.title}
          </h4>
          <span className="text-[10px] md:text-xs text-muted-foreground mt-1.5 block">{formatDate(post.published_at)}</span>
        </div>
      </Link>
    );
  }

  if (variant === "small") {
    return (
      <Link to={`/article/${post.slug}`} className="block group">
        <div className="relative aspect-[4/3] overflow-hidden mb-3 bg-muted flex items-center justify-center">
          <img
            src={post.featured_image || "/logo.png"}
            alt={post.title}
            className={post.featured_image ? "w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" : "w-1/2 h-1/2 object-contain"}
          />
        </div>
        {post.category && (
          <span className="text-[10px] uppercase tracking-[0.18em] text-accent font-semibold">{post.category.name}</span>
        )}
        <h4 className="font-serif-ar text-sm md:text-base text-foreground line-clamp-3 mt-1 leading-snug group-hover:text-accent transition-colors">
          {post.title}
        </h4>
        <span className="text-[10px] text-muted-foreground mt-1.5 block">{formatDate(post.published_at)}</span>
      </Link>
    );
  }

  return (
    <Link
      to={`/article/${post.slug}`}
      className="block group"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted flex items-center justify-center">
        <img
          src={post.featured_image || "/logo.png"}
          alt={post.title}
          className={post.featured_image ? "w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" : "w-1/2 h-1/2 object-contain"}
        />
      </div>
      <div className="pt-3 md:pt-4">
        {post.category && (
          <span className="text-[10px] md:text-xs uppercase tracking-[0.18em] text-accent font-semibold">{post.category.name}</span>
        )}
        <h3 className="font-serif-ar text-foreground text-base md:text-lg line-clamp-3 mt-1.5 leading-snug group-hover:text-accent transition-colors">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="text-xs md:text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{post.excerpt}</p>
        )}
        <span className="text-[10px] md:text-xs text-muted-foreground mt-2 block">{formatDate(post.published_at)}</span>
      </div>
    </Link>
  );
};

export default NewsCard;
