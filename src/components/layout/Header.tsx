import { Link } from "react-router-dom";
import { Search } from "lucide-react";

const Header = () => {
  const today = new Date().toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="bg-background border-b border-border">
      {/* Gold hairline accent */}
      <div className="h-[3px] w-full" style={{ background: "var(--gradient-gold)" }} />

      {/* Date strip */}
      <div className="container flex items-center justify-between py-2 text-[11px] md:text-xs text-muted-foreground border-b border-border/60">
        <span className="tracking-wide">{today}</span>
        <span className="hidden md:inline tracking-[0.2em] uppercase text-accent font-semibold">
          منبر إعلامي حر · مستقل
        </span>
      </div>

      {/* Masthead */}
      <div className="container py-6 md:py-10 grid grid-cols-3 items-center">
        {/* Search */}
        <div className="flex justify-start">
          <button
            aria-label="بحث"
            className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full border border-border hover:border-accent hover:text-accent transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>

        {/* Logo */}
        <Link to="/" className="flex flex-col items-center text-center group">
          <img
            src="/logo.png"
            alt="حصاد اليوم"
            className="h-14 md:h-20 lg:h-24 w-auto object-contain mb-1 transition-transform duration-200 group-hover:scale-[1.03]"
          />
          <span className="mt-1 text-[10px] md:text-xs text-muted-foreground tracking-widest">
            صحيفة إلكترونية مستقلة
          </span>
        </Link>

        {/* Auth / actions */}
        <div className="flex justify-end">
          <Link
            to="/auth"
            className="hidden md:inline-flex items-center px-4 py-2 text-xs tracking-widest uppercase border border-foreground/80 hover:bg-foreground hover:text-background transition-colors"
          >
            دخول
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
