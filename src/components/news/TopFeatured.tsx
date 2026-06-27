import { Link } from "react-router-dom";
import { useFeaturedPosts } from "@/hooks/usePosts";

const TopFeatured = () => {
  const { data: posts, isLoading } = useFeaturedPosts(5);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10 animate-pulse">
        <div className="lg:col-span-2 aspect-[16/10] bg-muted" />
        <div className="space-y-4">
          <div className="aspect-video bg-muted" />
          <div className="aspect-video bg-muted" />
        </div>
      </div>
    );
  }

  if (!posts || posts.length === 0) return null;

  const [lead, ...rest] = posts;
  const side = rest.slice(0, 2);
  const strip = rest.slice(2, 5);

  const fmt = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString("ar-EG", { month: "long", day: "numeric" })
      : "";

  return (
    <section className="border-b border-border pb-8 md:pb-12 mb-8 md:mb-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
        {/* Lead story */}
        <Link to={`/article/${lead.slug}`} className="lg:col-span-2 group block">
          <div className="relative aspect-[16/10] overflow-hidden bg-muted mb-5">
            <img
              src={
                lead.featured_image ||
                "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1400"
              }
              alt={lead.title}
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700"
            />
          </div>
          {lead.category && (
            <span className="text-[11px] uppercase tracking-[0.22em] text-accent font-bold">
              {lead.category.name}
            </span>
          )}
          <h2 className="font-serif-ar text-2xl md:text-4xl lg:text-5xl text-foreground leading-tight mt-2 group-hover:text-accent transition-colors">
            {lead.title}
          </h2>
          {lead.excerpt && (
            <p className="text-sm md:text-base text-muted-foreground mt-3 leading-relaxed line-clamp-2 max-w-2xl">
              {lead.excerpt}
            </p>
          )}
          <span className="text-[11px] text-muted-foreground mt-3 block">
            {fmt(lead.published_at)}
          </span>
        </Link>

        {/* Side stories */}
        <div className="flex flex-col divide-y divide-border">
          {side.map((p, i) => (
            <Link
              key={p.id}
              to={`/article/${p.slug}`}
              className={`group block ${i === 0 ? "pb-5" : "py-5"}`}
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-muted mb-3">
                <img
                  src={
                    p.featured_image ||
                    "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600"
                  }
                  alt={p.title}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700"
                />
              </div>
              {p.category && (
                <span className="text-[10px] uppercase tracking-[0.2em] text-accent font-semibold">
                  {p.category.name}
                </span>
              )}
              <h3 className="font-serif-ar text-base md:text-lg text-foreground leading-snug mt-1.5 group-hover:text-accent transition-colors line-clamp-3">
                {p.title}
              </h3>
            </Link>
          ))}
        </div>
      </div>

      {/* 3-up strip under hero */}
      {strip.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-10 mt-8 md:mt-10 pt-6 md:pt-8 border-t border-border">
          {strip.map((p) => (
            <Link key={p.id} to={`/article/${p.slug}`} className="group block">
              {p.category && (
                <span className="text-[10px] uppercase tracking-[0.2em] text-accent font-semibold">
                  {p.category.name}
                </span>
              )}
              <h4 className="font-serif-ar text-base md:text-lg text-foreground leading-snug mt-1 group-hover:text-accent transition-colors line-clamp-3">
                {p.title}
              </h4>
              <span className="text-[10px] text-muted-foreground mt-2 block">
                {fmt(p.published_at)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
};

export default TopFeatured;