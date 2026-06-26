import { Link } from "react-router-dom";
import { Search, Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";

const Header = () => {
  const [isDark, setIsDark] = useState(false);

  const today = new Date();
  const arabicDate = today.toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Hijri date approximation display
  const hijriDate = today.toLocaleDateString("ar-SA-u-ca-islamic", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  }, []);

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <header className="bg-background border-b border-border">
      {/* Gold hairline */}
      <div className="h-[3px] w-full" style={{ background: "var(--gradient-gold)" }} />

      {/* Unified top strip: date + social signals */}
      <div className="container flex items-center justify-between py-2 text-[11px] text-muted-foreground border-b border-border/60">
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline">{arabicDate}</span>
          <span className="text-border">|</span>
          <span className="text-accent/80 font-medium">{hijriDate} هـ</span>
        </div>
        <span className="tracking-[0.18em] uppercase text-accent font-semibold text-[10px] hidden md:inline">
          منبر إعلامي حر · مستقل
        </span>
      </div>

      {/* Masthead */}
      <div className="container py-5 md:py-8 grid grid-cols-3 items-center">
        {/* Search + Dark mode */}
        <div className="flex items-center gap-2 justify-start">
          <button
            aria-label="بحث"
            className="w-9 h-9 flex items-center justify-center border border-border hover:border-accent hover:text-accent transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            aria-label="تبديل الوضع"
            onClick={toggleDark}
            className="w-9 h-9 flex items-center justify-center border border-border hover:border-accent hover:text-accent transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Logo */}
        <Link to="/" className="flex flex-col items-center text-center group">
          <span className="text-[9px] md:text-[10px] tracking-[0.4em] uppercase text-accent mb-1 font-medium">
            HASAD AL · YOUM
          </span>
          <h1 className="font-serif-ar text-3xl md:text-5xl lg:text-6xl leading-none text-foreground">
            حصاد
            <span className="mx-2 text-accent">·</span>
            اليوم
          </h1>
          <span className="mt-1.5 text-[9px] md:text-[10px] text-muted-foreground tracking-widest">
            صحيفة إلكترونية مستقلة · صنعاء
          </span>
        </Link>

        {/* Auth */}
        <div className="flex justify-end">
          <Link
            to="/auth"
            className="hidden md:inline-flex items-center px-4 py-2 text-xs tracking-widest uppercase border border-foreground/70 hover:bg-foreground hover:text-background transition-colors"
          >
            دخول
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
