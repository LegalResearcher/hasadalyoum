import { Link } from "react-router-dom";
import { FaFacebookF, FaTwitter, FaTelegram, FaYoutube, FaWhatsapp } from "react-icons/fa";
import { Rss } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-footer text-footer-foreground">
      <div className="container py-8 md:py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {/* About */}
          <div className="col-span-2 md:col-span-1">
            <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4">
              <span className="text-accent">حصاد</span> اليوم
            </h3>
            <p className="text-xs md:text-sm text-footer-foreground/80 leading-relaxed">
              حصاداليوم منبر إعلامي يمني حُر ومستقل، ينطلق من العاصمة صنعاء لينقل الحقيقة كما هي، منحازاً لقضايا المواطن وتطلعات الشارع اليمني.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold mb-3 md:mb-4 text-sm md:text-base">روابط سريعة</h4>
            <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
              <li><Link to="/" className="hover:text-accent transition-colors">الرئيسية</Link></li>
              <li><Link to="/category/local-news" className="hover:text-accent transition-colors">أخبار محلية</Link></li>
              <li><Link to="/category/news-reports" className="hover:text-accent transition-colors">أخبار وتقارير</Link></li>
              <li><Link to="/category/international" className="hover:text-accent transition-colors">شؤون دولية</Link></li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-bold mb-3 md:mb-4 text-sm md:text-base">الأقسام</h4>
            <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
              <li><Link to="/category/yemen-press" className="hover:text-accent transition-colors">اليمن في الصحافة</Link></li>
              <li><Link to="/category/opinions" className="hover:text-accent transition-colors">آراء واتجاهات</Link></li>
              <li><Link to="/category/sports" className="hover:text-accent transition-colors">رياضة</Link></li>
              <li><Link to="/category/technology" className="hover:text-accent transition-colors">علوم وتكنولوجيا</Link></li>
            </ul>
          </div>

          {/* Social */}
          <div className="col-span-2 md:col-span-1">
            <h4 className="font-bold mb-3 md:mb-4 text-sm md:text-base">تابعنا</h4>
            <div className="flex flex-wrap gap-2 md:gap-3">
              <a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer" className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-footer-foreground/10 flex items-center justify-center hover:bg-accent transition-colors">
                <FaFacebookF size={14} className="md:w-[18px] md:h-[18px]" />
              </a>
              <a href="https://x.com/hasadalyoum1?t=S5MqAxFXwEE6j49KyoILKQ&s=09" target="_blank" rel="noopener noreferrer" className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-footer-foreground/10 flex items-center justify-center hover:bg-accent transition-colors">
                <FaTwitter size={14} className="md:w-[18px] md:h-[18px]" />
              </a>
              <a href="https://t.me/hasadalyoum" target="_blank" rel="noopener noreferrer" className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-footer-foreground/10 flex items-center justify-center hover:bg-accent transition-colors">
                <FaTelegram size={14} className="md:w-[18px] md:h-[18px]" />
              </a>
              <a href="https://youtube.com/" target="_blank" rel="noopener noreferrer" className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-footer-foreground/10 flex items-center justify-center hover:bg-accent transition-colors">
                <FaYoutube size={14} className="md:w-[18px] md:h-[18px]" />
              </a>
              <a href="https://wa.me/" target="_blank" rel="noopener noreferrer" className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-footer-foreground/10 flex items-center justify-center hover:bg-accent transition-colors">
                <FaWhatsapp size={14} className="md:w-[18px] md:h-[18px]" />
              </a>
              <a href="/feed" className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-footer-foreground/10 flex items-center justify-center hover:bg-accent transition-colors">
                <Rss size={14} className="md:w-[18px] md:h-[18px]" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-footer-foreground/20 py-3 md:py-4">
        <div className="container text-center text-xs md:text-sm text-footer-foreground/70">
          © {new Date().getFullYear()} الناصر تِك للحلول الرقمية (Alnasser Tech Digital Solutions). جميع الحقوق محفوظة.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
