import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header className="bg-header py-4">
      <div className="container flex items-center justify-between">
        <div className="flex-1">
          {/* Ad Space */}
          <div className="bg-header/50 border border-header-foreground/20 rounded h-16 flex items-center justify-center text-header-foreground/50 text-sm">
            مساحة إعلانية 728x90
          </div>
        </div>
        
        <Link to="/" className="flex items-center gap-3 mr-8">
          <div className="text-left">
            <h1 className="text-3xl font-bold text-header-foreground">
              <span className="text-accent">حصاد</span> اليوم
            </h1>
            <p className="text-xs text-header-foreground/80">منبر إعلامي يمني حر ومستقل</p>
          </div>
          <div className="w-16 h-16 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-14 h-14 text-accent">
              <path
                fill="currentColor"
                d="M50 5 C60 5 70 10 75 20 L85 45 C90 55 85 65 75 70 L60 75 L65 95 L50 80 L35 95 L40 75 L25 70 C15 65 10 55 15 45 L25 20 C30 10 40 5 50 5Z"
              />
              <circle cx="50" cy="40" r="15" fill="hsl(var(--header-bg))" />
              <path
                fill="currentColor"
                d="M45 35 L55 40 L45 45 Z"
              />
            </svg>
          </div>
        </Link>
      </div>
    </header>
  );
};

export default Header;
