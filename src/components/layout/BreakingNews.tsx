import { useBreakingNews } from "@/hooks/useBreakingNews";

const BreakingNews = () => {
  const { data: breakingNews } = useBreakingNews();

  // Only show if there's real breaking news from DB
  if (!breakingNews || breakingNews.length === 0) return null;

  const newsItems = breakingNews.map((item) => item.text);

  return (
    <div className="bg-ticker py-2 border-b border-border overflow-hidden">
      <div className="container flex items-center gap-4">
        <span
          className="text-white px-3 py-1 text-xs font-bold tracking-[0.1em] whitespace-nowrap flex-shrink-0 uppercase"
          style={{ background: "hsl(var(--breaking-badge))" }}
        >
          عاجـل
        </span>
        <div className="w-px h-4 bg-border flex-shrink-0" />
        <div className="overflow-hidden flex-1">
          <div className="animate-ticker whitespace-nowrap flex gap-12">
            {[...newsItems, ...newsItems].map((news, index) => (
              <span key={index} className="text-ticker-foreground text-sm">
                {news}
                {index < newsItems.length * 2 - 1 && (
                  <span className="mx-6 text-accent/50">◆</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BreakingNews;
