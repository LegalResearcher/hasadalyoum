import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Search, Menu, X } from "lucide-react";
import { FaYoutube } from "react-icons/fa";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "الرئيسية", href: "/" },
  { label: "أخبار محلية", href: "/category/local-news" },
  { label: "أخبار وتقارير", href: "/category/news-reports" },
  { label: "اليمن في الصحافة", href: "/category/yemen-press" },
  { label: "شؤون دولية", href: "/category/international" },
  { label: "آراء واتجاهات", href: "/category/opinions" },
  { label: "علوم وتكنولوجيا", href: "/category/technology" },
  { label: "رياضة", href: "/category/sports" },
];

const Navigation = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <nav className="bg-nav sticky top-0 z-50 shadow-md">
      <div className="container">
        <div className="flex items-center justify-between">
          {/* Left side - Search & Video */}
          <div className="flex items-center gap-1 md:gap-2">
            <button className="p-2 text-nav-foreground hover:text-accent transition-colors">
              <Search size={18} className="md:w-5 md:h-5" />
            </button>
            <Link
              to="/category/video"
              className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2 text-nav-foreground hover:text-accent transition-colors"
            >
              <span className="text-xs md:text-sm font-medium">فيديو</span>
              <FaYoutube size={16} className="md:w-[18px] md:h-[18px] text-breaking" />
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={toggleMenu}
            className="lg:hidden p-2 text-nav-foreground hover:text-accent transition-colors"
            aria-label={isMenuOpen ? "إغلاق القائمة" : "فتح القائمة"}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Desktop Navigation */}
          <ul className="hidden lg:flex items-center">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={cn(
                    "block px-2 xl:px-3 py-3 text-xs xl:text-sm font-medium transition-colors whitespace-nowrap",
                    location.pathname === item.href
                      ? "text-accent"
                      : "text-nav-foreground hover:text-accent"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Mobile Navigation Menu */}
        <div
          className={cn(
            "lg:hidden overflow-hidden transition-all duration-300 ease-in-out",
            isMenuOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <ul className="py-2 border-t border-nav-foreground/20">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  to={item.href}
                  onClick={closeMenu}
                  className={cn(
                    "block px-4 py-3 text-sm font-medium transition-colors border-b border-nav-foreground/10 last:border-0",
                    location.pathname === item.href
                      ? "text-accent bg-nav-foreground/5"
                      : "text-nav-foreground hover:text-accent hover:bg-nav-foreground/5"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
