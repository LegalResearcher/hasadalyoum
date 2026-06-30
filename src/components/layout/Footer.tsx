import { Link } from "react-router-dom";
import { FaFacebookF, FaTwitter, FaTelegram, FaYoutube, FaWhatsapp } from "react-icons/fa";
import { Rss, Mail, Phone, MapPin, ArrowLeft } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useMenuCategories, useCategories } from "@/hooks/useCategories";

const Footer = () => {
  const { data: settings } = useSiteSettings();
  const { data: menuCategories = [] } = useMenuCategories();
  const { data: allCategories = [] } = useCategories();

  const facebookUrl = settings?.facebook_url || "#";
  const twitterUrl  = settings?.twitter_url  || "#";
  const telegramUrl = settings?.telegram_url || "#";
  const youtubeUrl  = settings?.youtube_url  || "#";
  const whatsappUrl = settings?.whatsapp_url || "#";

  const footerAbout    = settings?.footer_about    || settings?.site_description || "منبر إعلامي يمني حُر ومستقل، يرصد الحدث لحظة بلحظة بمهنية وموضوعية.";
  const contactEmail   = settings?.contact_email   || "";
  const contactPhone   = settings?.contact_phone   || "";
  const contactAddress = settings?.contact_address || "";

  const quickLinks    = allCategories.slice(0, 5);
  const sectionLinks  = menuCategories.slice(0, 5);
  const year          = new Date().getFullYear();

  const socialLinks = [
    { href: facebookUrl,  icon: <FaFacebookF size={15} />,  label: "Facebook"  },
    { href: twitterUrl,   icon: <FaTwitter   size={15} />,  label: "X"         },
    { href: telegramUrl,  icon: <FaTelegram  size={15} />,  label: "Telegram"  },
    { href: youtubeUrl,   icon: <FaYoutube   size={15} />,  label: "YouTube"   },
    { href: whatsappUrl,  icon: <FaWhatsapp  size={15} />,  label: "WhatsApp"  },
    { href: "/feed",      icon: <Rss         size={15} />,  label: "RSS"       },
  ];

  return (
    <footer className="bg-footer text-footer-foreground mt-20" dir="rtl">

      {/* ── الشريط الذهبي العلوي ── */}
      <div className="h-[3px] w-full" style={{ background: "var(--gradient-gold)" }} />

      {/* ── القسم الرئيسي ── */}
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8">

          {/* ── العمود الأول: الهوية ── */}
          <div className="md:col-span-4 space-y-6">
            {/* الشعار النصي */}
            <div>
              <p className="text-[9px] tracking-[0.5em] uppercase text-accent/70 mb-1 font-light">
                HASAD AL · YOUM
              </p>
              <h2 className="font-serif-ar text-3xl text-footer-foreground mb-3 leading-tight">
                حصاد اليوم
              </h2>
              <div className="w-10 h-[2px]" style={{ background: "var(--gradient-gold)" }} />
            </div>

            {/* النبذة */}
            <p className="text-sm text-footer-foreground/60 leading-relaxed max-w-sm">
              {footerAbout}
            </p>

            {/* أيقونات التواصل */}
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-accent/60 mb-3 font-medium">
                تابعنا
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {socialLinks.map(({ href, icon, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="group w-9 h-9 flex items-center justify-center border border-footer-foreground/15 hover:border-accent hover:bg-accent/10 transition-all duration-200"
                  >
                    <span className="text-footer-foreground/50 group-hover:text-accent transition-colors">
                      {icon}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* ── الفاصل العمودي (desktop فقط) ── */}
          <div className="hidden md:block md:col-span-1">
            <div className="h-full w-px bg-footer-foreground/10 mx-auto" />
          </div>

          {/* ── العمود الثاني: روابط سريعة ── */}
          <div className="md:col-span-2 space-y-5">
            <h3 className="text-[10px] tracking-[0.35em] uppercase text-accent font-semibold">
              روابط سريعة
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/"
                  className="group flex items-center gap-2 text-sm text-footer-foreground/60 hover:text-accent transition-colors"
                >
                  <ArrowLeft size={11} className="opacity-0 group-hover:opacity-100 transition-opacity -mr-1" />
                  الرئيسية
                </Link>
              </li>
              <li>
                <Link
                  to="/most-read"
                  className="group flex items-center gap-2 text-sm text-footer-foreground/60 hover:text-accent transition-colors"
                >
                  <ArrowLeft size={11} className="opacity-0 group-hover:opacity-100 transition-opacity -mr-1" />
                  الأكثر قراءة
                </Link>
              </li>
              {quickLinks.map((cat) => (
                <li key={cat.id}>
                  <Link
                    to={`/category/${cat.slug}`}
                    className="group flex items-center gap-2 text-sm text-footer-foreground/60 hover:text-accent transition-colors"
                  >
                    <ArrowLeft size={11} className="opacity-0 group-hover:opacity-100 transition-opacity -mr-1" />
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── العمود الثالث: الأقسام ── */}
          <div className="md:col-span-2 space-y-5">
            <h3 className="text-[10px] tracking-[0.35em] uppercase text-accent font-semibold">
              الأقسام
            </h3>
            <ul className="space-y-3">
              {sectionLinks.map((cat) => (
                <li key={cat.id}>
                  <Link
                    to={`/category/${cat.slug}`}
                    className="group flex items-center gap-2 text-sm text-footer-foreground/60 hover:text-accent transition-colors"
                  >
                    <ArrowLeft size={11} className="opacity-0 group-hover:opacity-100 transition-opacity -mr-1" />
                    {cat.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  to="/about"
                  className="group flex items-center gap-2 text-sm text-footer-foreground/60 hover:text-accent transition-colors"
                >
                  <ArrowLeft size={11} className="opacity-0 group-hover:opacity-100 transition-opacity -mr-1" />
                  من نحن
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="group flex items-center gap-2 text-sm text-footer-foreground/60 hover:text-accent transition-colors"
                >
                  <ArrowLeft size={11} className="opacity-0 group-hover:opacity-100 transition-opacity -mr-1" />
                  اتصل بنا
                </Link>
              </li>
            </ul>
          </div>

          {/* ── العمود الرابع: تواصل معنا ── */}
          {(contactEmail || contactPhone || contactAddress) && (
            <div className="md:col-span-3 space-y-5">
              <h3 className="text-[10px] tracking-[0.35em] uppercase text-accent font-semibold">
                تواصل معنا
              </h3>
              <ul className="space-y-4">
                {contactEmail && (
                  <li>
                    <a
                      href={`mailto:${contactEmail}`}
                      className="group flex items-start gap-3 text-sm text-footer-foreground/60 hover:text-accent transition-colors"
                    >
                      <span className="mt-0.5 p-1.5 border border-footer-foreground/15 group-hover:border-accent/40 transition-colors">
                        <Mail size={12} />
                      </span>
                      <span dir="ltr" className="break-all">{contactEmail}</span>
                    </a>
                  </li>
                )}
                {contactPhone && (
                  <li>
                    <a
                      href={`tel:${contactPhone}`}
                      className="group flex items-start gap-3 text-sm text-footer-foreground/60 hover:text-accent transition-colors"
                    >
                      <span className="mt-0.5 p-1.5 border border-footer-foreground/15 group-hover:border-accent/40 transition-colors">
                        <Phone size={12} />
                      </span>
                      <span dir="ltr">{contactPhone}</span>
                    </a>
                  </li>
                )}
                {contactAddress && (
                  <li>
                    <div className="flex items-start gap-3 text-sm text-footer-foreground/60">
                      <span className="mt-0.5 p-1.5 border border-footer-foreground/15">
                        <MapPin size={12} />
                      </span>
                      <span>{contactAddress}</span>
                    </div>
                  </li>
                )}
                <li className="pt-2">
                  <Link
                    to="/feed"
                    className="inline-flex items-center gap-2 text-xs text-footer-foreground/40 hover:text-accent transition-colors border border-footer-foreground/10 hover:border-accent/30 px-3 py-2"
                  >
                    <Rss size={12} />
                    <span>اشترك في RSS</span>
                  </Link>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* ── الفاصل ── */}
      <div className="border-t border-footer-foreground/8">
        <div className="container py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-footer-foreground/35">

            {/* اليسار: الحقوق */}
            <p className="tracking-wide">
              © {year} الناصر تِك للحلول الرقمية
              <span className="mx-2 opacity-40">·</span>
              <span dir="ltr">Alnasser Tech Digital Solutions</span>
              <span className="mx-2 opacity-40">·</span>
              جميع الحقوق محفوظة
            </p>

            {/* اليمين: روابط قانونية */}
            <div className="flex items-center gap-4">
              <Link to="/privacy" className="hover:text-accent transition-colors">
                سياسة الخصوصية
              </Link>
              <span className="opacity-30">·</span>
              <Link to="/about" className="hover:text-accent transition-colors">
                من نحن
              </Link>
              <span className="opacity-30">·</span>
              <Link to="/contact" className="hover:text-accent transition-colors">
                اتصل بنا
              </Link>
            </div>
          </div>
        </div>
      </div>

    </footer>
  );
};

export default Footer;
