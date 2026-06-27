import { useActiveAdsByPosition } from "@/hooks/useSiteSettings";

interface AdSlotProps {
  position: string;
  className?: string;
}

/**
 * فتحة إعلانية تعرض الإعلانات الفعّالة لموضع معيّن من قاعدة البيانات
 * تدعم نوعين: صورة + رابط، أو كود HTML/JS خام (مثل AdSense)
 *
 * المواضع المقترحة: "header", "sidebar", "in-article", "footer"
 */
const AdSlot = ({ position, className = "" }: AdSlotProps) => {
  const { data: ads, isLoading } = useActiveAdsByPosition(position);

  if (isLoading || !ads || ads.length === 0) return null;

  return (
    <div className={`ad-slot space-y-4 ${className}`} data-ad-position={position}>
      {ads.map((ad) => (
        <div key={ad.id} className="flex justify-center">
          {ad.html_code ? (
            // إعلانات بكود خام (AdSense / شبكات إعلانية) — يُسمح بإدخال هذا الحقل
            // فقط من حساب "أدمن" موثوق (محمي بـ RLS)، لذا لا يُعقَّم هنا عمداً
            // لأن تعقيمه (DOMPurify) سيُزيل وسوم <script> الضرورية لعمل الإعلان
            <div className="w-full" dangerouslySetInnerHTML={{ __html: ad.html_code }} />
          ) : ad.image_url ? (
            ad.link_url ? (
              <a href={ad.link_url} target="_blank" rel="noopener noreferrer sponsored" className="block">
                <img src={ad.image_url} alt={ad.name} className="max-w-full rounded-lg" loading="lazy" />
              </a>
            ) : (
              <img src={ad.image_url} alt={ad.name} className="max-w-full rounded-lg" loading="lazy" />
            )
          ) : null}
        </div>
      ))}
    </div>
  );
};

export default AdSlot;
