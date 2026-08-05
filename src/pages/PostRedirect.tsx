import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getPostPath } from "@/lib/postUrl";

/**
 * يتعامل مع الروابط القديمة بصيغة /post/:id (مثل أنظمة سابقة أو WordPress)
 * ويُحوّل تلقائياً للرابط الكنسي /YYYY/MM/DD/slug مباشرة (لا نمرّ بـ
 * /article/:slug كخطوة وسيطة — تقليل عدد القفزات يخدم الفهرسة والسرعة).
 * ملاحظة: في الإنتاج vercel.json يعترض /post/:id بـ 301 حقيقي عبر
 * api/post-redirect.js قبل وصول الطلب لهذا المكوّن أصلاً؛ هذا المكوّن
 * يبقى fallback فقط (مثلاً أثناء التطوير المحلي).
 */
const PostRedirect = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchAndRedirect = async () => {
      if (!id) {
        setError(true);
        return;
      }

      try {
        const { data: post, error: fetchError } = await supabase
          .from("posts")
          .select("id, slug, created_at, published_at")
          .eq("id", id)
          .maybeSingle();

        if (fetchError || !post) {
          setError(true);
          return;
        }

        navigate(getPostPath(post.slug || post.id, post.published_at || post.created_at), { replace: true });
      } catch (err) {
        console.error("Error redirecting /post/:id:", err);
        setError(true);
      }
    };

    fetchAndRedirect();
  }, [id, navigate]);

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

export default PostRedirect;
