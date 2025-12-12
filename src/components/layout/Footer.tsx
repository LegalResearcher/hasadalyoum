import { Link } from "react-router-dom";
import { FaFacebookF, FaTwitter, FaTelegram, FaYoutube, FaWhatsapp } from "react-icons/fa";
import { Rss } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-footer text-footer-foreground">
      <div className="container py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="text-xl font-bold mb-4">
              <span className="text-accent">حصاد</span> اليوم
            </h3>
            <p className="text-sm text-footer-foreground/80 leading-relaxed">
              حصاداليوم منبر إعلامي يمني حُر ومستقل، ينطلق من العاصمة صنعاء لينقل الحقيقة كما هي، منحازاً لقضايا المواطن وتطلعات الشارع اليمني.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold mb-4">روابط سريعة</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-accent transition-colors">الرئيسية</Link></li>
              <li><Link to="/category/local-news" className="hover:text-accent transition-colors">أخبار محلية</Link></li>
              <li><Link to="/category/news-reports" className="hover:text-accent transition-colors">أخبار وتقارير</Link></li>
              <li><Link to="/category/international" className="hover:text-accent transition-colors">شؤون دولية</Link></li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-bold mb-4">الأقسام</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/category/yemen-press" className="hover:text-accent transition-colors">اليمن في الصحافة</Link></li>
              <li><Link to="/category/opinions" className="hover:text-accent transition-colors">آراء واتجاهات</Link></li>
              <li><Link to="/category/sports" className="hover:text-accent transition-colors">رياضة</Link></li>
              <li><Link to="/category/technology" className="hover:text-accent transition-colors">علوم وتكنولوجيا</Link></li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="font-bold mb-4">تابعنا</h4>
            <div className="flex gap-3">
              <a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-footer-foreground/10 flex items-center justify-center hover:bg-accent transition-colors">
                <FaFacebookF size={18} />
              </a>
              <a href="https://x.com/hasadalyoum1?t=S5MqAxFXwEE6j49KyoILKQ&s=09" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-footer-foreground/10 flex items-center justify-center hover:bg-accent transition-colors">
                <FaTwitter size={18} />
              </a>
              <a href="https://t.me/hasadalyoum" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-footer-foreground/10 flex items-center justify-center hover:bg-accent transition-colors">
                <FaTelegram size={18} />
              </a>
              <a href="https://youtube.com/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-footer-foreground/10 flex items-center justify-center hover:bg-accent transition-colors">
                <FaYoutube size={18} />
              </a>
              <a href="https://wa.me/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-footer-foreground/10 flex items-center justify-center hover:bg-accent transition-colors">
                <FaWhatsapp size={18} />
              </a>
              <a href="/feed" className="w-10 h-10 rounded-full bg-footer-foreground/10 flex items-center justify-center hover:bg-accent transition-colors">
                <Rss size={18} />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-footer-foreground/20 py-4">
        <div className="container text-center text-sm text-footer-foreground/70">
          © {new Date().getFullYear()} الناصر تِك للحلول الرقمية (Alnasser Tech Digital Solutions). جميع الحقوق محفوظة.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
