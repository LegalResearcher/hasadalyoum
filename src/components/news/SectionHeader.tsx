import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  href?: string;
  showMore?: boolean;
}

const SectionHeader = ({ title, href, showMore = true }: SectionHeaderProps) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="w-1 h-8 bg-accent rounded-full" />
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
      </div>
      {showMore && href && (
        <Link
          to={href}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-accent transition-colors"
        >
          <span>المزيد</span>
          <ChevronLeft size={16} />
        </Link>
      )}
    </div>
  );
};

export default SectionHeader;
