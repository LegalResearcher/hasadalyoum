import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useFeaturedPosts } from "@/hooks/usePosts";
import { Clock } from "lucide-react";

const fallbackPosts = [
  {
    id: "1",
    title: "مرحباً بكم في حصاد اليوم — منبر إعلامي يمني حر ومستقل",
    slug: "#",
    featured_image: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200",
    category: { name: "أخبار محلية", slug: "local-news" },
    published_at: new Date().toISOString(),
    excerpt: "نقدم لكم آخر المستجدات والأخبار من اليمن والعالم بمهنية وحياد.",
  },
  {
    id: "2",
    title: "تطورات ميدانية مهمة في عدة محافظات يمنية",
    slug: "#",
    featured_image: "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800",
    category: { name: "شؤون دولية", slug: "international" },
    published_at: new Date().toISOString(),
    excerpt: null,
  },
  {
    id: "3",
    title: "اجتماعات دبلوماسية مكثفة بشأن الملف اليمني",
    slug: "#",
    featured_image: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800",
    category: { name: "أخبار وتقارير", slug: "news-reports" },
    published_at: new Date().toISOString(),
    excerpt: null,
  },
  {
    id: "4",
    title: "تقرير: الوضع الإنساني في اليمن ومستجداته الراهنة",
    slug: "#",
    featured_image: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800",
    category: { name: "اليمن في الصحافة", slug: "yemen-press" },
    published_at: new Date().toISOString(),
    excerpt: null,
  },
];

const readingTime = (text: string | null) => {
  if (!text) return "2 دقيقة";
  const words = text.split(" ").length;
  const mins = Math.max(1, Math.ceil(words / 200));
  return `${mins} دقيقة`;
};

const HeroGrid = () => {
  const { data: posts, isLoading } = useFeaturedPosts(10);
  const items = posts && posts.length >= 3 ? posts : fallbackPosts;

  const main = items[0];
  const secondary = items.slice(1, 3);
  const tertiary = items.slice(3, 5);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-border" style={{ minHeight: 520 }}>
        <div className="lg:col-span-7 bg-muted animate-pulse" style={{ minHeight: 420 }} />
        <div className="lg:col-span-5 grid grid-rows-2 gap-px">
          <div className="bg-muted animate-pulse" />
          <div className="bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="hero-grid-wrapper mb-10">
      {/* Main grid: 7+5 columns, gap replaced by border lines */}
      <div
        className="grid grid-cols-1 lg:grid-cols-12"
        style={{ border: "1px solid hsl(var(--border))", gap: 1, background: "hsl(var(--border))" }}
      >
        {/* Main story — left large column */}
        <Link
          to={main.slug !== "#" ? `/article/${main.slug}` : "#"}
          className="lg:col-span-7 relative group overflow-hidden"
          style={{ minHeight: 460 }}
        >
          <img
            src={main.featured_image || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200"}
            alt={main.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.3) 55%, transparent 100%)" }} />

          {/* Content */}
          <div className="absolute bottom-0 right-0 left-0 p-5 md:p-8">
            {main.category && (
              <span className="inline-block bg-accent text-white text-[10px] tracking-[0.2em] uppercase px-2.5 py-1 mb-3 font-semibold">
                {main.category.name}
              </span>
            )}
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-white leading-snug mb-3 group-hover:text-accent/90 transition-colors"
              style={{ textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
              {main.title}
            </h2>
            {main.excerpt && (
              <p className="text-white/75 text-sm leading-relaxed line-clamp-2 mb-3 hidden md:block">{main.excerpt}</p>
            )}
            <div className="flex items-center gap-3 text-white/60 text-xs">
              <Clock size={12} />
              <span>{readingTime(main.excerpt)} للقراءة</span>
            </div>
          </div>
        </Link>

        {/* Right column — 2 secondary stories stacked */}
        <div className="lg:col-span-5 grid grid-rows-2" style={{ gap: 1, background: "hsl(var(--border))" }}>
          {secondary.map((post, i) => (
            <Link
              key={post.id}
              to={post.slug !== "#" ? `/article/${post.slug}` : "#"}
              className="relative group overflow-hidden bg-card"
              style={{ minHeight: 230 }}
            >
              <img
                src={post.featured_image || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800"}
                alt={post.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)" }} />
              <div className="absolute bottom-0 right-0 left-0 p-4 md:p-5">
                {post.category && (
                  <span className="inline-block text-accent text-[10px] tracking-[0.15em] uppercase font-semibold mb-1.5 border-b border-accent pb-0.5">
                    {post.category.name}
                  </span>
                )}
                <h3 className="text-sm md:text-base font-bold text-white leading-snug group-hover:text-accent/90 transition-colors line-clamp-2">
                  {post.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Tertiary strip — small horizontal cards */}
      {tertiary.length > 0 && (
        <div
          className="grid grid-cols-1 sm:grid-cols-2"
          style={{ borderLeft: "1px solid hsl(var(--border))", borderRight: "1px solid hsl(var(--border))", borderBottom: "1px solid hsl(var(--border))", gap: 1, background: "hsl(var(--border))" }}
        >
          {tertiary.map((post) => (
            <Link
              key={post.id}
              to={post.slug !== "#" ? `/article/${post.slug}` : "#"}
              className="flex items-center gap-4 bg-card px-4 py-3 group hover:bg-secondary transition-colors"
            >
              <div className="w-16 h-14 flex-shrink-0 overflow-hidden">
                <img
                  src={post.featured_image || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=200"}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="flex-1 min-w-0">
                {post.category && (
                  <span className="text-[10px] text-accent font-semibold tracking-wide">{post.category.name}</span>
                )}
                <h4 className="text-xs font-bold text-foreground line-clamp-2 leading-snug group-hover:text-accent transition-colors mt-0.5">
                  {post.title}
                </h4>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default HeroGrid;
