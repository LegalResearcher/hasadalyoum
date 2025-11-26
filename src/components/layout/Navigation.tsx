import { Link, useLocation } from "react-router-dom";
import { Search } from "lucide-react";
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

  return (
    <nav className="bg-nav sticky top-0 z-50 shadow-md">
      <div className="container">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="p-2 text-nav-foreground hover:text-accent transition-colors">
              <Search size={20} />
            </button>
            <Link
              to="/category/video"
              className="flex items-center gap-2 px-3 py-2 text-nav-foreground hover:text-accent transition-colors"
            >
              <span className="text-sm font-medium">فيديو</span>
              <FaYoutube size={18} className="text-breaking" />
            </Link>
          </div>

          <ul className="flex items-center">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={cn(
                    "block px-3 py-3 text-sm font-medium transition-colors",
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
      </div>
    </nav>
  );
};

export default Navigation;
