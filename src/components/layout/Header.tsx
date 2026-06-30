import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import hasadLogo from "@/assets/logo.png";

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

        {/* Logo — بجانب النص، بنفس منطق الجنوب فويس */}
        <Link to="/" className="flex items-center justify-center gap-4 group">
          <img
            src={hasadLogo}
            alt="شعار حصاد اليوم"
            className="w-14 h-14 md:w-20 md:h-20 object-contain transition-all duration-500 group-hover:rotate-[8deg] group-hover:scale-110"
          />

          <div className="flex flex-col items-start border-r-2 border-border pr-4">
            <span className="text-[10px] md:text-xs tracking-[0.35em] uppercase text-accent mb-1">
              HASAD AL · YOUM
            </span>
            <h1 className="font-serif-ar text-2xl md:text-4xl lg:text-5xl leading-none text-foreground">
              حصاد اليوم
            </h1>
            <span className="mt-1.5 text-[10px] md:text-xs text-muted-foreground tracking-widest font-bold uppercase group-hover:text-accent transition-colors">
              صحيفة إلكترونية مستقلة
            </span>
          </div>
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
