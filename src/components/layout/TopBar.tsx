import { Calendar, MapPin, Rss } from "lucide-react";
import { FaFacebookF, FaTwitter, FaTelegram, FaYoutube, FaWhatsapp } from "react-icons/fa";

const TopBar = () => {
  const today = new Date();
  const arabicDate = today.toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="bg-header text-header-foreground py-2 text-sm">
      <div className="container flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="https://youtube.com/" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
            <FaYoutube size={16} />
          </a>
          <a href="https://t.me/hasadalyoum" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
            <FaTelegram size={16} />
          </a>
          <a href="https://x.com/hasadalyoum1?t=S5MqAxFXwEE6j49KyoILKQ&s=09" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
            <FaTwitter size={16} />
          </a>
          <a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
            <FaFacebookF size={16} />
          </a>
          <a href="https://wa.me/" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
            <FaWhatsapp size={16} />
          </a>
          <a href="/feed" className="hover:text-accent transition-colors">
            <Rss size={16} />
          </a>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <MapPin size={14} />
            <span>ينطلق من العاصمة صنعاء</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={14} />
            <span>{arabicDate}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
