import { Link } from "react-router-dom";
import { Clock, Eye } from "lucide-react";
import { Post } from "@/hooks/usePosts";

interface NewsCardProps {
  post: Post;
  variant?: "default" | "horizontal" | "small" | "opinion";
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const readingTime = (text: string | null) => {
  if (!text) return "2 د";
  const words = text.split(" ").length;
  return `${Math.max(1, Math.ceil(words / 200))} د`;
};

const NewsCard = ({ post, variant = "default" }: NewsCardProps) => {
  if (variant === "opinion") {
    return (
      <Link to={`/article/${post.slug}`} className="block group">
        <div className="bg-card p-4 hover:shadow-lg transition-shadow border border-border group-hover:border-accent/30">
          <div className="flex items-center gap-3 mb-3">
            {post.author?.avatar_url ? (
              <img
                src={post.author.avatar_url}
                alt={post.author.name}
                className="w-14 h-14 rounded-full object-cover border-2 border-accent"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center border-2 border-accent flex-shrink-0">
                <span className="text-2xl font-bold text-muted-foreground">
                  {post.author?.name?.charAt(0) || "؟"}
                </span>
              </div>
            )}
            <div>
              <p className="font-bold text-foreground text-sm">{post.author?.name || "كاتب"}</p>
              <p className="text-xs text-muted-foreground">{formatDate(post.published_at)}</p>
            </div>
          </div>
          {/* Opinion divider line */}
          <div className="w-8 h-px mb-3" style={{ background: "hsl(var(--accent))" }} />
          <h3 className="font-bold text-foreground text-sm group-hover:text-accent transition-colors line-clamp-3 leading-relaxed">
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
        className="flex gap-3 group bg-card overflow-hidden hover:shadow-md transition-shadow border border-border"
      >
        <div className="w-24 h-20 sm:w-28 sm:h-[88px] flex-shrink-0 overflow-hidden">
          <img
            src={post.featured_image || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400"}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        <div className="flex-1 py-2 pl-2 flex flex-col justify-between">
          <div>
            {post.category && (
              <span className="text-[10px] text-accent font-semibold tracking-wide">{post.category.name}</span>
            )}
            <h4 className="text-xs font-bold text-foreground line-clamp-2 mt-0.5 group-hover:text-accent transition-colors leading-snug">
              {post.title}
            </h4>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <Clock size={9} />
            <span>{readingTime(post.excerpt)}</span>
            <span>·</span>
            <span>{formatDate(post.published_at)}</span>
          </div>
        </div>
      </Link>
    );
  }

  if (variant === "small") {
    return (
      <Link to={`/article/${post.slug}`} className="block group">
        <div className="relative aspect-video overflow-hidden mb-2">
          <img
            src={post.featured_image || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400"}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {post.category && (
            <span className="absolute top-2 right-2 bg-accent text-white px-2 py-0.5 text-[10px] font-semibold">
              {post.category.name}
            </span>
          )}
        </div>
        <h4 className="text-xs font-bold text-foreground line-clamp-2 group-hover:text-accent transition-colors leading-snug mb-1.5">
          {post.title}
        </h4>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Clock size={9} />
          <span>{readingTime(post.excerpt)}</span>
          <span>·</span>
          <Eye size={9} />
          <span>{Math.floor(Math.random() * 5 + 1)}K</span>
        </div>
      </Link>
    );
  }

  // default — large card
  return (
    <Link
      to={`/article/${post.slug}`}
      className="block group bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-border"
    >
      <div className="relative aspect-video overflow-hidden">
        <img
          src={post.featured_image || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400"}
          alt={post.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {post.category && (
          <span className="absolute top-3 right-3 bg-accent text-white px-2.5 py-0.5 text-xs font-semibold">
            {post.category.name}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold text-foreground text-sm md:text-base line-clamp-2 group-hover:text-accent transition-colors leading-snug mb-2">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{post.excerpt}</p>
        )}
        <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground border-t border-border pt-2.5">
          <div className="flex items-center gap-1">
            <Clock size={9} />
            <span>{readingTime(post.excerpt)} قراءة</span>
          </div>
          <span>·</span>
          <span>{formatDate(post.published_at)}</span>
          <span className="mr-auto flex items-center gap-1">
            <Eye size={9} />
            <span>{Math.floor(Math.random() * 8 + 1)}K</span>
          </span>
        </div>
      </div>
    </Link>
  );
};

export default NewsCard;
