import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getPostUrl } from "@/lib/postUrl";

/**
 * يحافظ على الروابط القديمة بصيغة /article/:slug ويُحوّلها للصيغة الجديدة
 * /YYYY/MM/DD/slug — لحماية SEO والباك لينكات المحفوظة سابقاً
 */
const ArticleLegacyRedirect = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!slug) { setError(true); return; }
      const { data: post, error: fetchError } = await supabase
        .from("posts")
        .select("slug, created_at, published_at")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();

      if (fetchError || !post) { setError(true); return; }
      // getPostUrl يُرجع رابط مطلق — نستخرج المسار فقط للتنقل الداخلي
      const absolute = getPostUrl(post.slug, post.published_at || post.created_at);
      const path = absolute.replace(/^https?:\/\/[^/]+/, "");
      navigate(path, { replace: true });
    };
    run();
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

export default ArticleLegacyRedirect;