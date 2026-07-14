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
            className="group flex-1 flex items-center justify-center gap-4 md:gap-5 min-w-0 order-1 sm:order-2"
          >
            {/* أيقونة الشعار */}
            <div className="flex items-center justify-center self-center">
              <img
                src="/logo.png"
                alt="حصاد اليوم"
                className="w-16 h-16 md:w-18 md:h-18 lg:w-20 lg:h-20 object-contain transition-transform duration-500 group-hover:rotate-[6deg] group-hover:scale-105"
              />
            </div>

            {/* الاسم العربي فوق الإنجليزي — وحدة نصية واحدة بدون فاصل */}
            <div className="flex flex-col items-start justify-center self-center min-w-0 leading-none">
              <h1 className="font-cairo font-extrabold text-xl md:text-3xl lg:text-[2.15rem] text-foreground tracking-tight whitespace-nowrap">
                حصاد اليوم
              </h1>
              <span className="mt-1 text-[9px] md:text-[10px] lg:text-[11px] font-cairo font-semibold text-accent tracking-[0.22em] uppercase whitespace-nowrap">
                Hasad Al-Youm
              </span>
            </div>
          </Link>

          {/* موازنة التخطيط */}
          <div className="w-9 order-3" />
        </div>
      </div>
    </header>
  );
};

export default Header;
