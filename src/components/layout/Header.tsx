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
      {/* الخط الذهبي العلوي */}
      <div className="h-[3px] w-full" style={{ background: "var(--gradient-gold)" }} />

      {/* شريط التاريخ — سطر واحد ثابت */}
      <div className="container flex items-center justify-between py-2 text-[10px] md:text-xs text-muted-foreground border-b border-border/60 overflow-hidden">
        <span className="tracking-wide whitespace-nowrap">{today}</span>
        <span className="hidden sm:inline tracking-[0.2em] uppercase text-accent font-semibold whitespace-nowrap">
          منبر إعلامي حر · مستقل
        </span>
      </div>

      {/* الهيدر الرئيسي — وحدة واحدة مترابطة بدون فواصل بصرية */}
      <div className="container py-4 md:py-7">
        <div className="flex items-center justify-between gap-3">

          {/* زر البحث */}
          <button
            aria-label="بحث"
            className="shrink-0 w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full border border-border hover:border-accent hover:text-accent transition-colors order-2 sm:order-1"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* الهوية: الأيقونة + الاسم العربي + الاسم الإنجليزي — كتلة واحدة */}
          <Link
            to="/"
            className="group flex-1 flex items-center justify-center gap-2.5 md:gap-3.5 min-w-0 order-1 sm:order-2"
          >
            {/* الأيقونة المجردة (SVG) */}
            <img
              src={hasadIcon}
              alt="حصاد اليوم"
              className="shrink-0 w-9 h-9 md:w-12 md:h-12 lg:w-14 lg:h-14 transition-transform duration-500 group-hover:rotate-[6deg] group-hover:scale-105"
            />

            {/* الاسم العربي فوق الإنجليزي — وحدة نصية واحدة بدون فاصل */}
            <div className="flex flex-col items-start min-w-0 leading-none">
              <h1 className="font-cairo font-extrabold text-xl md:text-3xl lg:text-[2.15rem] text-foreground tracking-tight whitespace-nowrap">
                حصاد اليوم
              </h1>
              <span className="mt-1 text-[9px] md:text-[10px] lg:text-[11px] font-cairo font-semibold text-accent tracking-[0.22em] uppercase whitespace-nowrap">
                Hasad Al-Youm
              </span>
            </div>
          </Link>

          {/* زر الدخول — desktop فقط */}
          <Link
            to="/auth"
            className="shrink-0 hidden md:inline-flex items-center px-4 py-2 text-xs font-cairo font-semibold tracking-widest uppercase border border-foreground/80 hover:bg-foreground hover:text-background transition-colors order-3"
          >
            دخول
          </Link>

          {/* موازنة التخطيط على الموبايل */}
          <div className="w-9 md:hidden order-3" />
        </div>
      </div>
    </header>
  );
};

export default Header;
