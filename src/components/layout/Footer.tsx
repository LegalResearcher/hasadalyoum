import { Link } from "react-router-dom";
import { FaFacebookF, FaTwitter, FaTelegram, FaYoutube, FaWhatsapp } from "react-icons/fa";
import { Rss, Mail, Phone, MapPin } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useMenuCategories, useCategories } from "@/hooks/useCategories";

const Footer = () => {
  const { data: settings } = useSiteSettings();
  const { data: menuCategories = [] } = useMenuCategories();
  const { data: allCategories = [] } = useCategories();

  // أول 4 أقسام نشطة للروابط السريعة
  const quickLinks = allCategories.slice(0, 4);
  // الأقسام الظاهرة في القائمة للعمود الثاني
  const sectionLinks = menuCategories.slice(0, 5);

  const facebookUrl  = settings?.facebook_url  || "https://www.facebook.com/";
  const twitterUrl   = settings?.twitter_url   || "https://x.com/hasadalyoum1";
  const telegramUrl  = settings?.telegram_url  || "https://t.me/hasadalyoum";
  const youtubeUrl   = settings?.youtube_url   || "https://youtube.com/";
  const whatsappUrl  = settings?.whatsapp_url  || "https://wa.me/";
  const siteDescription = settings?.site_description || "صحيفة إلكترونية مستقلة تنقل الحقيقة بمهنية وحياد، منحازة لقضايا المواطن العربي.";

  // ── بيانات الاتصال والنبذة (تُدار من لوحة التحكم) ──
  const footerAbout      = settings?.footer_about      || "";
  const contactEmail     = settings?.contact_email     || "";
  const contactPhone     = settings?.contact_phone     || "";
  const contactAddress   = settings?.contact_address   || "";

  // نعرض قسم "تواصل معنا" فقط إذا كان هناك بيانات
  const hasContactInfo = contactEmail || contactPhone || contactAddress;

  return (
    <footer className="bg-footer text-footer-foreground mt-16">
      <div className="h-[3px] w-full" style={{ background: "var(--gradient-gold)" }} />
      <div className="container py-12 md:py-16">

        {/* اسم الموقع والوصف */}
        <div className="text-center mb-10 pb-10 border-b border-footer-foreground/15">
          <p className="text-[10px] tracking-[0.35em] uppercase text-accent mb-2">HASAD AL · YOUM</p>
          <h3 className="font-serif-ar text-3xl md:text-4xl mb-3">حصاد اليوم</h3>
          <p className="text-xs md:text-sm text-footer-foreground/70 max-w-xl mx-auto leading-relaxed">
            {footerAbout || siteDescription}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">

          {/* روابط سريعة — ديناميكية من قاعدة البيانات */}
          <div>
            <h4 className="text-[11px] tracking-[0.25em] uppercase text-accent mb-4">روابط سريعة</h4>
            <ul className="space-y-2 text-xs md:text-sm">
              <li><Link to="/" className="hover:text-accent transition-colors">الرئيسية</Link></li>
              {quickLinks.map((cat) => (
                <li key={cat.id}>
                  <Link to={`/category/${cat.slug}`} className="hover:text-accent transition-colors">
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* الأقسام — ديناميكية من القائمة */}
          <div>
            <h4 className="text-[11px] tracking-[0.25em] uppercase text-accent mb-4">الأقسام</h4>
            <ul className="space-y-2 text-xs md:text-sm">
              {sectionLinks.map((cat) => (
                <li key={cat.id}>
                  <Link to={`/category/${cat.slug}`} className="hover:text-accent transition-colors">
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* عن الموقع */}
          <div>
            <h4 className="text-[11px] tracking-[0.25em] uppercase text-accent mb-4">عن الموقع</h4>
            <ul className="space-y-2 text-xs md:text-sm">
              <li><Link to="/about" className="hover:text-accent transition-colors">من نحن</Link></li>
              <li><Link to="/contact" className="hover:text-accent transition-colors">اتصل بنا</Link></li>
              <li><Link to="/privacy" className="hover:text-accent transition-colors">سياسة الخصوصية</Link></li>
              <li><Link to="/feed" className="hover:text-accent transition-colors">RSS</Link></li>
            </ul>
          </div>

          {/* تابعنا */}
          <div className="col-span-2 md:col-span-1">
            <h4 className="text-[11px] tracking-[0.25em] uppercase text-accent mb-4">تابعنا</h4>
            <div className="flex flex-wrap gap-2">
              <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="w-9 h-9 border border-footer-foreground/20 flex items-center justify-center hover:bg-accent hover:border-accent transition-colors">
                <FaFacebookF size={13} />
              </a>
              <a href={twitterUrl} target="_blank" rel="noopener noreferrer" className="w-9 h-9 border border-footer-foreground/20 flex items-center justify-center hover:bg-accent hover:border-accent transition-colors">
                <FaTwitter size={13} />
              </a>
              <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className="w-9 h-9 border border-footer-foreground/20 flex items-center justify-center hover:bg-accent hover:border-accent transition-colors">
                <FaTelegram size={13} />
              </a>
              <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="w-9 h-9 border border-footer-foreground/20 flex items-center justify-center hover:bg-accent hover:border-accent transition-colors">
                <FaYoutube size={13} />
              </a>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="w-9 h-9 border border-footer-foreground/20 flex items-center justify-center hover:bg-accent hover:border-accent transition-colors">
                <FaWhatsapp size={13} />
              </a>
              <a href="/feed" className="w-9 h-9 border border-footer-foreground/20 flex items-center justify-center hover:bg-accent hover:border-accent transition-colors">
                <Rss size={13} />
              </a>
            </div>
          </div>
        </div>

        {/* ── قسم تواصل معنا (يظهر فقط إذا أُدخلت بيانات من لوحة التحكم) ── */}
        {hasContactInfo && (
          <div className="mt-10 pt-8 border-t border-footer-foreground/15">
            <h4 className="text-[11px] tracking-[0.25em] uppercase text-accent mb-4 text-center">تواصل معنا</h4>
            <div className="flex flex-wrap justify-center gap-6 text-xs md:text-sm text-footer-foreground/70">
              {contactEmail && (
                <a href={`mailto:${contactEmail}`} className="flex items-center gap-2 hover:text-accent transition-colors">
                  <Mail size={14} />
                  <span dir="ltr">{contactEmail}</span>
                </a>
              )}
              {contactPhone && (
                <a href={`tel:${contactPhone}`} className="flex items-center gap-2 hover:text-accent transition-colors">
                  <Phone size={14} />
                  <span dir="ltr">{contactPhone}</span>
                </a>
              )}
              {contactAddress && (
                <span className="flex items-center gap-2">
                  <MapPin size={14} />
                  <span>{contactAddress}</span>
                </span>
              )}
            </div>
          </div>
        )}

      </div>

      {/* حقوق النشر */}
      <div className="border-t border-footer-foreground/15 py-4">
        <div className="container text-center text-[11px] md:text-xs tracking-wide text-footer-foreground/60">
          © {new Date().getFullYear()} الناصر تِك للحلول الرقمية (Alnasser Tech Digital Solutions). جميع الحقوق محفوظة.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
