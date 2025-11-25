import NewsCard from "./NewsCard";
import SectionHeader from "./SectionHeader";
import { NewsItem } from "@/data/newsData";

interface NewsSectionProps {
  title: string;
  href: string;
  news: NewsItem[];
  layout?: "grid" | "list" | "featured";
}

const NewsSection = ({ title, href, news, layout = "grid" }: NewsSectionProps) => {
  if (layout === "featured" && news.length > 0) {
    const [mainNews, ...sideNews] = news;
    return (
      <section className="mb-10">
        <SectionHeader title={title} href={href} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <NewsCard
              id={mainNews.id}
              title={mainNews.title}
              category={mainNews.category}
              image={mainNews.image}
              slug={mainNews.slug}
              date={mainNews.date}
              excerpt={mainNews.excerpt}
            />
          </div>
          <div className="space-y-4">
            {sideNews.slice(0, 4).map((item) => (
              <NewsCard
                key={item.id}
                id={item.id}
                title={item.title}
                category={item.category}
                image={item.image}
                slug={item.slug}
                date={item.date}
                variant="horizontal"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (layout === "list") {
    return (
      <section className="mb-10">
        <SectionHeader title={title} href={href} />
        <div className="space-y-4">
          {news.map((item) => (
            <NewsCard
              key={item.id}
              id={item.id}
              title={item.title}
              category={item.category}
              image={item.image}
              slug={item.slug}
              date={item.date}
              variant="horizontal"
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mb-10">
      <SectionHeader title={title} href={href} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {news.map((item) => (
          <NewsCard
            key={item.id}
            id={item.id}
            title={item.title}
            category={item.category}
            image={item.image}
            slug={item.slug}
            date={item.date}
            variant="small"
          />
        ))}
      </div>
    </section>
  );
};

export default NewsSection;
