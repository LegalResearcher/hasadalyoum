import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  categorySlug: string;
  variant?: "default" | "opinions" | "sports" | "tech";
}

const SectionHeader = ({ title, categorySlug, variant = "default" }: SectionHeaderProps) => {
  if (variant === "opinions") {
    return (
      <div className="flex items-center justify-between mb-5 md:mb-7">
        <div className="flex items-center gap-3">
          <span
            className="text-xs tracking-[0.2em] uppercase font-semibold px-3 py-1.5"
            style={{ background: "hsl(var(--foreground))", color: "hsl(var(--background))" }}
          >
            {title}
          </span>
        </div>
        <Link
          to={`/category/${categorySlug}`}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-accent transition-colors"
        >
          <span>المزيد</span>
          <ChevronLeft size={13} />
        </Link>
      </div>
    );
  }

  if (variant === "sports") {
    return (
      <div className="flex items-center justify-between mb-5 md:mb-7">
        <div className="flex items-center gap-3">
          <div
            className="w-1.5 h-7 rounded-sm"
            style={{ background: "hsl(var(--accent))" }}
          />
          <h2 className="text-lg md:text-xl font-bold text-foreground">{title}</h2>
          <span
            className="hidden sm:inline-block text-[10px] tracking-[0.15em] uppercase px-2 py-0.5 rounded font-medium"
            style={{ background: "hsl(var(--accent) / 0.12)", color: "hsl(var(--accent))" }}
          >
            sport
          </span>
        </div>
        <Link
          to={`/category/${categorySlug}`}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-accent transition-colors"
        >
          <span>المزيد</span>
          <ChevronLeft size={13} />
        </Link>
      </div>
    );
  }

  if (variant === "tech") {
    return (
      <div className="flex items-center justify-between mb-5 md:mb-7">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 flex items-center justify-center" style={{ background: "hsl(var(--foreground))" }}>
            <span className="text-[8px] font-black" style={{ color: "hsl(var(--background))" }}>T</span>
          </div>
          <h2 className="text-lg md:text-xl font-bold text-foreground">{title}</h2>
        </div>
        <Link
          to={`/category/${categorySlug}`}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-accent transition-colors"
        >
          <span>المزيد</span>
          <ChevronLeft size={13} />
        </Link>
      </div>
    );
  }

  // default
  return (
    <div className="flex items-center justify-between mb-5 md:mb-7">
      <div className="flex items-center gap-3">
        <div className="w-1 h-7 rounded-full" style={{ background: "hsl(var(--accent))" }} />
        <h2 className="text-lg md:text-xl font-bold text-foreground">{title}</h2>
      </div>
      <Link
        to={`/category/${categorySlug}`}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-accent transition-colors"
      >
        <span>المزيد</span>
        <ChevronLeft size={13} />
      </Link>
    </div>
  );
};

export default SectionHeader;
