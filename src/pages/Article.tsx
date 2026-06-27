import { useParams, Link } from "react-router-dom";
import { useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { usePostBySlug, usePosts, useIncrementPostView } from "@/hooks/usePosts";
import NewsCard from "@/components/news/NewsCard";
import VideoEmbed from "@/components/news/VideoEmbed";
import { FaFacebookF, FaTwitter, FaWhatsapp, FaTelegram } from "react-icons/fa";
import { Calendar, User, Eye } from "lucide-react";

const Article = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: article, isLoading } = usePostBySlug(slug || "");
  const incrementView = useIncrementPostView();
  const { data: relatedPosts } = usePosts({ categorySlug: article?.category?.slug, limit: 4 });

  useEffect(() => {
    if (article?.id) incrementView.mutate(article.id);
  }, [article?.id]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  };

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  if (isLoading) {
    return <Layout><div className="animate-pulse"><div className="h-6 md:h-8 bg-muted rounded w-1/3 mb-4" /><div className="aspect-video bg-muted rounded mb-6" /></div></Layout>;
  }

  if (!article) {
    return <Layout><div className="text-center py-16 md:py-20"><h1 className="text-xl md:text-2xl font-bold mb-4">الخبر غير موجود</h1><Link to="/" className="text-accent hover:underline">العودة للرئيسية</Link></div></Layout>;
  }

  const filteredRelated = relatedPosts?.filter((p) => p.id !== article.id).slice(0, 4) || [];

  return (
    <Layout>
      <nav className="text-[11px] md:text-xs uppercase tracking-[0.18em] text-muted-foreground mb-6 line-clamp-1">
        <Link to="/" className="hover:text-accent">الرئيسية</Link>
        <span className="mx-2">·</span>
        {article.category && (
          <Link to={`/category/${article.category.slug}`} className="hover:text-accent">{article.category.name}</Link>
        )}
      </nav>

      <article className="max-w-3xl mx-auto">
        <header className="mb-8 md:mb-10 text-center">
          {article.category && (
            <Link
              to={`/category/${article.category.slug}`}
              className="inline-block text-[11px] md:text-xs uppercase tracking-[0.22em] text-accent font-bold mb-4"
            >
              {article.category.name}
            </Link>
          )}
          <h1 className="font-serif-ar text-2xl sm:text-3xl md:text-5xl text-foreground leading-tight mb-5">
            {article.title}
          </h1>
          {article.excerpt && (
            <p className="text-base md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-6">
              {article.excerpt}
            </p>
          )}
          <div className="flex items-center justify-center gap-4 text-[11px] md:text-xs text-muted-foreground border-t border-b border-border py-3">
            {article.author && (
              <div className="flex items-center gap-1.5"><User size={13} /><span className="font-medium text-foreground">{article.author.name}</span></div>
            )}
            <span className="text-border">|</span>
            <div className="flex items-center gap-1.5"><Calendar size={13} /><span>{formatDate(article.published_at)}</span></div>
            <span className="text-border">|</span>
            <div className="flex items-center gap-1.5"><Eye size={13} /><span>{article.views_count}</span></div>
          </div>
        </header>

        {article.featured_image && (
          <figure className="mb-8 -mx-4 md:mx-0">
            <img src={article.featured_image} alt={article.title} className="w-full aspect-[16/9] object-cover" />
            <figcaption className="text-[11px] uppercase tracking-wider text-muted-foreground mt-2 px-4 md:px-0">
              {article.source_type}
            </figcaption>
          </figure>
        )}
        {article.external_video_url && (
          <div className="mb-8"><VideoEmbed url={article.external_video_url} title={article.title} /></div>
        )}

        {article.content && (
          <div
            className="prose prose-lg max-w-none text-base md:text-lg leading-loose font-serif-ar"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        )}

        <div className="flex items-center gap-3 mt-10 pt-6 border-t border-border">
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">شارك</span>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 border border-border hover:border-accent hover:text-accent flex items-center justify-center transition-colors"><FaFacebookF size={12} /></a>
          <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 border border-border hover:border-accent hover:text-accent flex items-center justify-center transition-colors"><FaTwitter size={12} /></a>
          <a href={`https://wa.me/?text=${encodeURIComponent(article.title + " " + shareUrl)}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 border border-border hover:border-accent hover:text-accent flex items-center justify-center transition-colors"><FaWhatsapp size={12} /></a>
          <a href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 border border-border hover:border-accent hover:text-accent flex items-center justify-center transition-colors"><FaTelegram size={12} /></a>
        </div>
      </article>

      {filteredRelated.length > 0 && (
        <section className="mt-14 md:mt-20 max-w-5xl mx-auto">
          <div className="flex items-end justify-between mb-6 border-b-2 border-foreground pb-2">
            <h2 className="font-serif-ar text-xl md:text-2xl text-foreground">قراءات ذات صلة</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {filteredRelated.map((post) => <NewsCard key={post.id} post={post} variant="small" />)}
          </div>
        </section>
      )}
    </Layout>
  );
};

export default Article;
