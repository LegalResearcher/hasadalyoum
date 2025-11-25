import { Link } from "react-router-dom";

interface NewsCardProps {
  id: number;
  title: string;
  category: string;
  image: string;
  slug: string;
  date?: string;
  excerpt?: string;
  variant?: "default" | "horizontal" | "small";
}

const NewsCard = ({ title, category, image, slug, date, excerpt, variant = "default" }: NewsCardProps) => {
  if (variant === "horizontal") {
    return (
      <Link
        to={`/article/${slug}`}
        className="flex gap-4 group bg-card rounded-lg overflow-hidden hover:shadow-md transition-shadow"
      >
        <div className="w-32 h-24 flex-shrink-0 overflow-hidden">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        <div className="flex-1 py-2 pl-2">
          <span className="text-xs text-category font-medium">{category}</span>
          <h4 className="text-sm font-bold text-foreground line-clamp-2 mt-1 group-hover:text-accent transition-colors">
            {title}
          </h4>
          {date && <span className="text-xs text-muted-foreground mt-1 block">{date}</span>}
        </div>
      </Link>
    );
  }

  if (variant === "small") {
    return (
      <Link
        to={`/article/${slug}`}
        className="block group"
      >
        <div className="relative aspect-video rounded-lg overflow-hidden mb-2">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <span className="absolute top-2 right-2 bg-category text-primary-foreground px-2 py-0.5 rounded text-xs font-medium">
            {category}
          </span>
        </div>
        <h4 className="text-sm font-bold text-foreground line-clamp-2 group-hover:text-accent transition-colors">
          {title}
        </h4>
      </Link>
    );
  }

  return (
    <Link
      to={`/article/${slug}`}
      className="block group bg-card rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="relative aspect-video overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <span className="absolute top-3 right-3 bg-category text-primary-foreground px-3 py-1 rounded text-sm font-medium">
          {category}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-foreground line-clamp-2 group-hover:text-accent transition-colors leading-relaxed">
          {title}
        </h3>
        {excerpt && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{excerpt}</p>
        )}
        {date && <span className="text-xs text-muted-foreground mt-2 block">{date}</span>}
      </div>
    </Link>
  );
};

export default NewsCard;
