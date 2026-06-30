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
      {/* الخط الذهبي العلوي */}
      <div className="h-[3px] w-full" style={{ background: "var(--gradient-gold)" }} />

      {/* شريط التاريخ — سطر واحد دائماً، حتى على الموبايل */}
      <div className="container flex items-center justify-between py-2 text-[10px] md:text-xs text-muted-foreground border-b border-border/60 overflow-hidden">
        <span className="tracking-wide whitespace-nowrap">{today}</span>
        <span className="hidden sm:inline tracking-[0.2em] uppercase text-accent font-semibold whitespace-nowrap">
          منبر إعلامي حر · مستقل
        </span>
      </div>

      {/* الهيدر الرئيسي */}
      <div className="container py-4 md:py-8">
        <div className="flex items-center justify-between gap-3">

          {/* زر البحث */}
          <button
            aria-label="بحث"
            className="shrink-0 w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full border border-border hover:border-accent hover:text-accent transition-colors order-2 sm:order-1"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* الشعار + الاسم — يأخذ المساحة المتوسطة دائماً */}
          <Link
            to="/"
            className="group flex-1 flex items-center justify-center gap-2.5 md:gap-4 min-w-0 order-1 sm:order-2"
          >
            {/* الشعار */}
            <img
              src={hasadLogo}
              alt="حصاد اليوم"
              className="shrink-0 w-11 h-11 md:w-16 md:h-16 lg:w-20 lg:h-20 object-contain transition-transform duration-500 group-hover:rotate-[8deg] group-hover:scale-105"
            />

            {/* الفاصل العمودي — يظهر فقط من sm وما فوق */}
            <div className="hidden sm:block w-px self-stretch bg-border" />

            {/* النص */}
            <div className="flex flex-col items-start min-w-0">
              <span className="hidden md:block text-[9px] lg:text-[10px] tracking-[0.3em] uppercase text-accent font-semibold mb-0.5 whitespace-nowrap">
                HASAD AL-YOUM
              </span>
              <h1 className="font-serif-ar text-xl md:text-3xl lg:text-4xl leading-none text-foreground whitespace-nowrap">
                حصاد اليوم
              </h1>
              <span className="hidden md:block mt-1 text-[10px] lg:text-xs text-muted-foreground tracking-widest font-medium whitespace-nowrap group-hover:text-accent transition-colors">
                صحيفة إلكترونية مستقلة
              </span>
            </div>
          </Link>

          {/* زر الدخول — desktop فقط */}
          <Link
            to="/auth"
            className="shrink-0 hidden md:inline-flex items-center px-4 py-2 text-xs tracking-widest uppercase border border-foreground/80 hover:bg-foreground hover:text-background transition-colors order-3"
          >
            دخول
          </Link>

          {/* مساحة فارغة لموازنة التخطيط على الموبايل */}
          <div className="w-9 md:hidden order-3" />
        </div>
      </div>
    </header>
  );
};

export default Header;
