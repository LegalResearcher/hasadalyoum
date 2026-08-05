import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getPostPath } from "@/lib/postUrl";

/**
 * يتعامل مع الروابط القديمة بصيغة /news/:slug (نمط شائع في الأنظمة الإخبارية القديمة
 * وبعض روابط "اقرأ أيضاً" المحفوظة سابقاً) ويُحوّلها مباشرة للرابط الكنسي
 * /YYYY/MM/DD/slug (بدون المرور بـ /article/:slug كخطوة وسيطة)
 */
const NewsSlugRedirect = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchAndRedirect = async () => {
      if (!slug) {
        setError(true);
        return;
      }

      const decodedSlug = (() => {
        try {
          return decodeURIComponent(slug);
        } catch {
          return slug;
        }
      })();

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decodedSlug);

      try {
        const { data: post, error: fetchError } = await supabase
          .from("posts")
          .select("id, slug, created_at, published_at")
          // بعض الروابط القديمة قد تحتوي على المعرّف (id) بدل الرابط (slug)
          // ملاحظة: لا يمكن دمجهما في استعلام OR واحد لأن عمود id من نوع UUID،
          // وأي قيمة غير صالحة كـ UUID تُسقط الاستعلام بالكامل (حتى مطابقة الـ slug الصحيحة)
          .eq(isUUID ? "id" : "slug", decodedSlug)
          .eq("status", "published")
          .limit(1)
          .maybeSingle();

        if (fetchError || !post) {
          setError(true);
          return;
        }

        navigate(getPostPath(post.slug || post.id, post.published_at || post.created_at), { replace: true });
      } catch (err) {
        console.error("Error redirecting /news/:slug:", err);
        setError(true);
      }
    };

    fetchAndRedirect();
  }, [slug, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <p className="text-xl text-muted-foreground">الخبر غير موجود</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center" dir="rtl">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      <p className="mr-4 text-muted-foreground">جاري التحويل...</p>
    </div>
  );
};

export default NewsSlugRedirect;
