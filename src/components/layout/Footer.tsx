import { Link } from "react-router-dom";
import { FaFacebookF, FaTwitter, FaTelegram, FaYoutube, FaWhatsapp } from "react-icons/fa";
import { Rss } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-footer text-footer-foreground mt-16">
      <div className="h-[3px] w-full" style={{ background: "var(--gradient-gold)" }} />
      <div className="container py-12 md:py-16">
        <div className="text-center mb-10 pb-10 border-b border-footer-foreground/15">
          <p className="text-[10px] tracking-[0.35em] uppercase text-accent mb-2">HASAD AL · YOUM</p>
          <h3 className="font-serif-ar text-3xl md:text-4xl mb-3">حصاد اليوم</h3>
          <p className="text-xs md:text-sm text-footer-foreground/70 max-w-xl mx-auto leading-relaxed">
            صحيفة إلكترونية مستقلة تنقل الحقيقة بمهنية وحياد، منحازة لقضايا المواطن العربي.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          <div>
            <h4 className="text-[11px] tracking-[0.25em] uppercase text-accent mb-4">روابط سريعة</h4>
            <ul className="space-y-2 text-xs md:text-sm">
              <li><Link to="/" className="hover:text-accent transition-colors">الرئيسية</Link></li>
              <li><Link to="/category/local-news" className="hover:text-accent transition-colors">أخبار محلية</Link></li>
              <li><Link to="/category/news-reports" className="hover:text-accent transition-colors">أخبار وتقارير</Link></li>
              <li><Link to="/category/international" className="hover:text-accent transition-colors">شؤون دولية</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[11px] tracking-[0.25em] uppercase text-accent mb-4">الأقسام</h4>
            <ul className="space-y-2 text-xs md:text-sm">
              <li><Link to="/category/yemen-press" className="hover:text-accent transition-colors">اليمن في الصحافة</Link></li>
              <li><Link to="/category/opinions" className="hover:text-accent transition-colors">آراء واتجاهات</Link></li>
              <li><Link to="/category/sports" className="hover:text-accent transition-colors">رياضة</Link></li>
              <li><Link to="/category/technology" className="hover:text-accent transition-colors">علوم وتكنولوجيا</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[11px] tracking-[0.25em] uppercase text-accent mb-4">عن الموقع</h4>
            <ul className="space-y-2 text-xs md:text-sm">
              <li><Link to="/about" className="hover:text-accent transition-colors">من نحن</Link></li>
              <li><Link to="/contact" className="hover:text-accent transition-colors">اتصل بنا</Link></li>
              <li><Link to="/privacy" className="hover:text-accent transition-colors">سياسة الخصوصية</Link></li>
              <li><Link to="/feed" className="hover:text-accent transition-colors">RSS</Link></li>
            </ul>
          </div>
          <div className="col-span-2 md:col-span-1">
            <h4 className="text-[11px] tracking-[0.25em] uppercase text-accent mb-4">تابعنا</h4>
            <div className="flex flex-wrap gap-2">
              <a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer" className="w-9 h-9 border border-footer-foreground/20 flex items-center justify-center hover:bg-accent hover:border-accent transition-colors">
                <FaFacebookF size={13} />
              </a>
              <a href="https://x.com/hasadalyoum1" target="_blank" rel="noopener noreferrer" className="w-9 h-9 border border-footer-foreground/20 flex items-center justify-center hover:bg-accent hover:border-accent transition-colors">
                <FaTwitter size={13} />
              </a>
              <a href="https://t.me/hasadalyoum" target="_blank" rel="noopener noreferrer" className="w-9 h-9 border border-footer-foreground/20 flex items-center justify-center hover:bg-accent hover:border-accent transition-colors">
                <FaTelegram size={13} />
              </a>
              <a href="https://youtube.com/" target="_blank" rel="noopener noreferrer" className="w-9 h-9 border border-footer-foreground/20 flex items-center justify-center hover:bg-accent hover:border-accent transition-colors">
                <FaYoutube size={13} />
              </a>
              <a href="https://wa.me/" target="_blank" rel="noopener noreferrer" className="w-9 h-9 border border-footer-foreground/20 flex items-center justify-center hover:bg-accent hover:border-accent transition-colors">
                <FaWhatsapp size={13} />
              </a>
              <a href="/feed" className="w-9 h-9 border border-footer-foreground/20 flex items-center justify-center hover:bg-accent hover:border-accent transition-colors">
                <Rss size={13} />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-footer-foreground/15 py-4">
        <div className="container text-center text-[11px] md:text-xs tracking-wide text-footer-foreground/60">
          © {new Date().getFullYear()} الناصر تِك للحلول الرقمية (Alnasser Tech Digital Solutions). جميع الحقوق محفوظة.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
