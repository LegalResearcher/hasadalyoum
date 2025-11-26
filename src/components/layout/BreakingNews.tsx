import { useBreakingNews } from "@/hooks/useBreakingNews";

const BreakingNews = () => {
  const { data: breakingNews } = useBreakingNews();

  const fallbackNews = [
    "مرحباً بكم في حصاد اليوم - منبر إعلامي يمني حر ومستقل",
  ];

  const newsItems = breakingNews && breakingNews.length > 0 
    ? breakingNews.map(item => item.text)
    : fallbackNews;

  return (
    <div className="bg-ticker py-2 border-b border-border overflow-hidden">
      <div className="container flex items-center gap-4">
        <span className="bg-breaking text-primary-foreground px-3 py-1 rounded text-sm font-bold whitespace-nowrap flex-shrink-0">
          عاجـل
        </span>
        <div className="overflow-hidden flex-1">
          <div className="animate-ticker whitespace-nowrap flex gap-8">
            {newsItems.map((news, index) => (
              <span key={index} className="text-ticker-foreground">
                {news}
                {index < newsItems.length - 1 && (
                  <span className="mx-4 text-muted-foreground">|</span>
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
