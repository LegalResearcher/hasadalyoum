import { Link } from "react-router-dom";
import { TrendingUp, Mail, ExternalLink } from "lucide-react";
import { FaFacebookF, FaTwitter, FaTelegram, FaYoutube } from "react-icons/fa";
import { useState } from "react";

// Sidebar: Most Read + Newsletter + Social
const mockMostRead = [
  { id: "1", title: "تطورات ميدانية في المحافظات اليمنية الجنوبية", slug: "#", views: "12.4K" },
  { id: "2", title: "بيان المجلس السياسي الأعلى بشأن المستجدات الأخيرة", slug: "#", views: "9.1K" },
  { id: "3", title: "تقرير: أوضاع الاقتصاد اليمني في ظل الأزمة", slug: "#", views: "7.8K" },
  { id: "4", title: "دبلوماسيون يبحثون عن حل سياسي شامل للأزمة", slug: "#", views: "6.2K" },
  { id: "5", title: "الأمم المتحدة: الوضع الإنساني يستدعي تدخلاً عاجلاً", slug: "#", views: "5.5K" },
];

const Sidebar = () => {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = () => {
    if (email.includes("@")) {
      setSubscribed(true);
      setEmail("");
    }
  };

  return (
    <aside className="space-y-8">
      {/* Most Read */}
      <div>
        <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-foreground">
          <TrendingUp size={16} className="text-accent" />
          <h3 className="text-sm font-bold tracking-[0.1em] uppercase text-foreground">الأكثر قراءة</h3>
        </div>
        <ol className="space-y-0">
          {mockMostRead.map((item, i) => (
            <li key={item.id}>
              <Link
                to={item.slug !== "#" ? `/article/${item.slug}` : "#"}
                className="flex gap-3 py-3 group border-b border-border last:border-0"
              >
                <span
                  className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-xs font-bold"
                  style={{
                    background: i === 0 ? "hsl(var(--accent))" : "transparent",
                    color: i === 0 ? "white" : "hsl(var(--muted-foreground))",
                    border: i === 0 ? "none" : "1px solid hsl(var(--border))",
                  }}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground line-clamp-2 leading-relaxed group-hover:text-accent transition-colors">
                    {item.title}
                  </p>
                  <span className="text-[10px] text-muted-foreground mt-1 block">{item.views} مشاهدة</span>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </div>

      {/* Divider */}
      <div className="h-px bg-border" />

      {/* Newsletter */}
      <div className="bg-secondary p-5" style={{ borderRight: "3px solid hsl(var(--accent))" }}>
        <div className="flex items-center gap-2 mb-2">
          <Mail size={14} className="text-accent" />
          <h3 className="text-xs font-bold tracking-[0.15em] uppercase text-foreground">النشرة البريدية</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          اشترك في نشرتنا اليومية وكن أول من يعلم بالأخبار العاجلة.
        </p>
        {subscribed ? (
          <p className="text-xs text-accent font-semibold">✓ تم الاشتراك بنجاح، شكراً لك!</p>
        ) : (
          <div className="space-y-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="بريدك الإلكتروني"
              className="w-full px-3 py-2 text-xs bg-background border border-border focus:border-accent focus:outline-none transition-colors"
              dir="rtl"
            />
            <button
              onClick={handleSubscribe}
              className="w-full px-3 py-2 text-xs font-bold tracking-[0.15em] uppercase text-white transition-colors"
              style={{ background: "hsl(var(--accent))" }}
            >
              اشتراك
            </button>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-border" />

      {/* Social */}
      <div>
        <h3 className="text-xs font-bold tracking-[0.15em] uppercase text-foreground mb-4 pb-3 border-b border-border">
          تابعنا
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: FaFacebookF, label: "فيسبوك", count: "12K", href: "https://www.facebook.com/", color: "#1877F2" },
            { icon: FaTwitter, label: "تويتر", count: "8.4K", href: "https://x.com/hasadalyoum1", color: "#1DA1F2" },
            { icon: FaTelegram, label: "تيليغرام", count: "21K", href: "https://t.me/hasadalyoum", color: "#0088CC" },
            { icon: FaYoutube, label: "يوتيوب", count: "5.1K", href: "https://youtube.com/", color: "#FF0000" },
          ].map(({ icon: Icon, label, count, href, color }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2.5 border border-border hover:border-foreground/30 transition-colors group bg-card"
            >
              <Icon size={14} style={{ color }} />
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-foreground truncate">{label}</p>
                <p className="text-[10px] text-muted-foreground">{count}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Ad placeholder */}
      <div
        className="flex items-center justify-center text-muted-foreground/40 text-xs border border-dashed border-border"
        style={{ height: 250 }}
      >
        إعلان
      </div>
    </aside>
  );
};

export default Sidebar;
