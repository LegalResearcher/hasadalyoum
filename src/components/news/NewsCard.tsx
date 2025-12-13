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
        <div className="bg-card rounded-lg p-3 md:p-4 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3 md:gap-4 mb-2 md:mb-3">
            {post.author?.avatar_url ? (
              <img
                src={post.author.avatar_url}
                alt={post.author.name}
                className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover border-2 border-accent"
              />
            ) : (
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-muted flex items-center justify-center border-2 border-accent">
                <span className="text-xl md:text-2xl font-bold text-muted-foreground">
                  {post.author?.name?.charAt(0) || "؟"}
                </span>
              </div>
            )}
            <div>
              <p className="font-bold text-foreground text-sm md:text-base">{post.author?.name || "كاتب"}</p>
              <p className="text-xs md:text-sm text-muted-foreground">{formatDate(post.published_at)}</p>
            </div>
          </div>
          <h3 className="font-bold text-foreground text-sm md:text-base group-hover:text-accent transition-colors line-clamp-2">
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
        className="flex gap-3 md:gap-4 group bg-card rounded-lg overflow-hidden hover:shadow-md transition-shadow"
      >
        <div className="w-24 h-20 sm:w-32 sm:h-24 flex-shrink-0 overflow-hidden">
          <img
            src={post.featured_image || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400"}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        <div className="flex-1 py-1.5 md:py-2 pl-2">
          {post.category && (
            <span className="text-[10px] md:text-xs text-accent font-medium">{post.category.name}</span>
          )}
          <h4 className="text-xs md:text-sm font-bold text-foreground line-clamp-2 mt-0.5 md:mt-1 group-hover:text-accent transition-colors">
            {post.title}
          </h4>
          <span className="text-[10px] md:text-xs text-muted-foreground mt-1 block">{formatDate(post.published_at)}</span>
        </div>
      </Link>
    );
  }

  if (variant === "small") {
    return (
      <Link to={`/article/${post.slug}`} className="block group">
        <div className="relative aspect-video rounded-lg overflow-hidden mb-2">
          <img
            src={post.featured_image || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400"}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {post.category && (
            <span className="absolute top-2 right-2 bg-accent text-accent-foreground px-1.5 md:px-2 py-0.5 rounded text-[10px] md:text-xs font-medium">
              {post.category.name}
            </span>
          )}
        </div>
        <h4 className="text-xs md:text-sm font-bold text-foreground line-clamp-2 group-hover:text-accent transition-colors">
          {post.title}
        </h4>
      </Link>
    );
  }

  return (
    <Link
      to={`/article/${post.slug}`}
      className="block group bg-card rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="relative aspect-video overflow-hidden">
        <img
          src={post.featured_image || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400"}
          alt={post.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {post.category && (
          <span className="absolute top-2 md:top-3 right-2 md:right-3 bg-accent text-accent-foreground px-2 md:px-3 py-0.5 md:py-1 rounded text-xs md:text-sm font-medium">
            {post.category.name}
          </span>
        )}
      </div>
      <div className="p-3 md:p-4">
        <h3 className="font-bold text-foreground text-sm md:text-base line-clamp-2 group-hover:text-accent transition-colors leading-relaxed">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="text-xs md:text-sm text-muted-foreground mt-1.5 md:mt-2 line-clamp-2">{post.excerpt}</p>
        )}
        <span className="text-[10px] md:text-xs text-dateColor mt-1.5 md:mt-2 block">{formatDate(post.published_at)}</span>
      </div>
    </Link>
  );
};

export default NewsCard;
