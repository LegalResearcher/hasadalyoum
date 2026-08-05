import { Link } from "react-router-dom";
import { Eye, TrendingUp, ChevronLeft } from "lucide-react";
import { useMostReadPosts } from "@/hooks/usePosts";
import { getPostPath } from "@/lib/postUrl";

interface MostReadProps {
  limit?: number;
  showHeading?: boolean;
}

const rankColor = (index: number) => {
  if (index === 0) return "bg-amber-500";
  if (index === 1) return "bg-slate-400";
  if (index === 2) return "bg-orange-400";
  return "bg-accent/90";
};

const MostRead = ({ limit = 6, showHeading = true }: MostReadProps) => {
  const { data: posts, isLoading } = useMostReadPosts(limit);

  if (isLoading) {
    return <div className="py-10 text-center animate-pulse text-muted-foreground">جاري تحميل الأكثر قراءة...</div>;
  }

  if (!posts || posts.length === 0) return null;

  return (
    <section className="py-6" dir="rtl">
      {showHeading && (
        <div className="flex items-center justify-between mb-6 border-r-4 border-accent pr-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-accent" />
            <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight">الأكثر قراءة</h2>
          </div>
          <Link
            to="/most-read"
            className="group flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-accent transition-colors"
          >
            استعرض الكل
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {posts.map((post, index) => (
          <Link
            key={post.id}
            to={getPostPath(post.slug, post.created_at)}
            className="group relative bg-card rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-border overflow-hidden"
          >
            <div className="relative aspect-[16/9] overflow-hidden bg-muted flex items-center justify-center">
              <img
                src={post.thumbnail_image || post.featured_image || "/logo.png"}
                alt={post.title}
                className={(post.thumbnail_image || post.featured_image) ? "w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" : "w-1/2 h-1/2 object-contain"}
                loading="lazy"
              />
              <div
                className={`absolute top-0 right-0 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-bl-2xl shadow-lg z-10 ${rankColor(index)}`}
              >
                <span className="text-white font-black text-base md:text-lg">#{index + 1}</span>
              </div>
            </div>

            <div className="p-3 md:p-4">
              <div className="flex items-center justify-between mb-2">
                {post.category && (
                  <span className="bg-accent/10 text-accent border-none text-[10px] font-black px-2 py-0.5 rounded">
                    {post.category.name}
                  </span>
                )}
                <div className="flex items-center gap-1 text-muted-foreground" dir="ltr">
                  <span className="text-[11px] font-bold">{(post.views_count || 0).toLocaleString()}</span>
                  <Eye className="w-3 h-3" />
                </div>
              </div>

              <h3 className="font-bold text-foreground text-sm md:text-base leading-snug line-clamp-2 group-hover:text-accent transition-colors min-h-[2.5rem] md:min-h-[3rem]">
                {post.title}
              </h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default MostRead;
