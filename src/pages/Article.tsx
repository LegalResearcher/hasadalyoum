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
      <nav className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4 line-clamp-1">
        <Link to="/" className="hover:text-accent">الرئيسية</Link>
        <span className="mx-1 md:mx-2">/</span>
        {article.category && <><Link to={`/category/${article.category.slug}`} className="hover:text-accent">{article.category.name}</Link><span className="mx-1 md:mx-2">/</span></>}
        <span className="text-foreground">{article.title}</span>
      </nav>

      <article className="bg-card rounded-lg overflow-hidden shadow-sm">
        <div className="p-4 md:p-6">
          <p className="text-xs md:text-sm text-muted-foreground mb-2">{article.source_type}</p>
          {article.category && <Link to={`/category/${article.category.slug}`} className="inline-block bg-accent text-accent-foreground px-2 md:px-3 py-0.5 md:py-1 rounded text-xs md:text-sm font-medium mb-2 md:mb-3">{article.category.name}</Link>}
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3 md:mb-4 leading-relaxed">{article.title}</h1>
          <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
            {article.author && <div className="flex items-center gap-1 md:gap-2"><User size={14} className="md:w-4 md:h-4" /><span>{article.author.name}</span></div>}
            <div className="flex items-center gap-1"><Calendar size={14} className="md:w-4 md:h-4" /><span>{formatDate(article.published_at)}</span></div>
            <div className="flex items-center gap-1"><Eye size={14} className="md:w-4 md:h-4" /><span>{article.views_count} مشاهدة</span></div>
          </div>
          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            <span className="text-xs md:text-sm text-muted-foreground">مشاركة:</span>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-[#1877f2] text-white flex items-center justify-center hover:opacity-80"><FaFacebookF size={12} className="md:w-3.5 md:h-3.5" /></a>
            <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-[#1da1f2] text-white flex items-center justify-center hover:opacity-80"><FaTwitter size={12} className="md:w-3.5 md:h-3.5" /></a>
            <a href={`https://wa.me/?text=${encodeURIComponent(article.title + " " + shareUrl)}`} target="_blank" rel="noopener noreferrer" className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-[#25d366] text-white flex items-center justify-center hover:opacity-80"><FaWhatsapp size={12} className="md:w-3.5 md:h-3.5" /></a>
            <a href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-[#0088cc] text-white flex items-center justify-center hover:opacity-80"><FaTelegram size={12} className="md:w-3.5 md:h-3.5" /></a>
          </div>
        </div>
        {article.featured_image && <div className="aspect-video"><img src={article.featured_image} alt={article.title} className="w-full h-full object-cover" /></div>}
        {article.external_video_url && <div className="p-4 md:p-6"><VideoEmbed url={article.external_video_url} title={article.title} /></div>}
        <div className="p-4 md:p-6">
          {article.excerpt && <p className="text-base md:text-lg font-medium text-foreground mb-4 md:mb-6 leading-relaxed">{article.excerpt}</p>}
          {article.content && <div className="prose prose-sm md:prose max-w-none" dangerouslySetInnerHTML={{ __html: article.content }} />}
        </div>
      </article>

      {filteredRelated.length > 0 && (
        <section className="mt-8 md:mt-10">
          <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6"><div className="w-1 h-6 md:h-8 bg-accent rounded-full" /><h2 className="text-lg md:text-xl font-bold text-foreground">أخبار ذات صلة</h2></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {filteredRelated.map((post) => <NewsCard key={post.id} post={post} variant="small" />)}
          </div>
        </section>
      )}
    </Layout>
  );
};

export default Article;
