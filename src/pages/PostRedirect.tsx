import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * يتعامل مع الروابط القديمة بصيغة /post/:id (مثل أنظمة سابقة أو WordPress)
 * ويُحوّل تلقائياً للرابط الجديد /article/:slug — لحماية SEO وعدم فقدان
 * الزيارات/الباك لينكات القادمة من جوجل أو منشورات تواصل اجتماعي قديمة
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
          .select("id, slug")
          .eq("id", id)
          .maybeSingle();

        if (fetchError || !post) {
          setError(true);
          return;
        }

        navigate(`/article/${post.slug || post.id}`, { replace: true });
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
