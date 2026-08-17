import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// توقيت اليمن (Asia/Aden) — UTC+3 ثابت، بدون توقيت صيفي.
// نفس المنطق المستخدم بالضبط في src/lib/postUrl.ts وapi/_lib/yemenDate.js —
// لضمان أن هذه الدالة تحسب نفس التاريخ لنفس الخبر بكل مكان بالمشروع.
// (دالة مستقلة هنا لأن Supabase Edge Functions بتوقيت Deno منفصلة النشر
// عن مجلد api/ الخاص بـ Vercel، ولا يوجد مجلد _shared حالياً بالمشروع)
const YEMEN_OFFSET_MS = 3 * 60 * 60 * 1000;

// Helper to generate post URL
function getPostUrl(post: { id: string; created_at: string; published_at?: string | null; slug?: string | null; title?: string }): string {
  const utcMs = new Date(post.published_at || post.created_at).getTime();
  const yemenDate = new Date(utcMs + YEMEN_OFFSET_MS);
  const year = yemenDate.getUTCFullYear();
  const month = String(yemenDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(yemenDate.getUTCDate()).padStart(2, '0');
  const slug = post.slug || post.id;
  return `/${year}/${month}/${day}/${slug}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Checking for scheduled posts to publish...");

    // Find posts that are scheduled and past their scheduled time
    const now = new Date().toISOString();
    const { data: scheduledPosts, error: fetchError } = await supabase
      .from('posts')
      .select('id, title, slug, created_at, published_at, scheduled_at')
      .eq('status', 'scheduled')
      .not('scheduled_at', 'is', null)
      .lte('scheduled_at', now);

    if (fetchError) {
      console.error("Error fetching scheduled posts:", fetchError);
      throw fetchError;
    }

    if (!scheduledPosts || scheduledPosts.length === 0) {
      console.log("No scheduled posts to publish");
      return new Response(
        JSON.stringify({ success: true, message: "No posts to publish", published: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${scheduledPosts.length} posts to publish`);

    const results = [];

    for (const post of scheduledPosts) {
      try {
        // نثبت وقت النشر الأصلي عند تحقق الجدولة، ثم نبني كل الإشارات منه.
        const publishedAt = post.published_at || post.scheduled_at || new Date().toISOString();
        const { data: publishedPost, error: updateError } = await supabase
          .from('posts')
          .update({
            status: 'published',
            published_at: publishedAt,
            scheduled_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', post.id)
          .select('id, slug, created_at, published_at')
          .single();

        if (updateError || !publishedPost) {
          console.error(`Failed to publish post ${post.id}:`, updateError);
          results.push({ id: post.id, title: post.title, success: false, error: updateError?.message || 'لم يُعثر على الخبر بعد التحديث' });
        } else {
          console.log(`Published post: ${post.title}`);
          const postUrl = `https://hasad-alyoum.com${getPostUrl(publishedPost)}`;
          results.push({ id: post.id, title: post.title, success: true, url: postUrl });
        }
      } catch (error: any) {
        console.error(`Error publishing post ${post.id}:`, error);
        results.push({ id: post.id, title: post.title, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    let discoverySignalsUpdated = false;

    // لا نستخدم Google Indexing API للأخبار العادية. نحدّث IndexNow مرة واحدة
    // بعد الدفعة، بينما تلتقط Google المقالات من Sitemap وNews Sitemap وRSS.
    if (successCount > 0) {
      try {
        const signalResponse = await fetch('https://hasad-alyoum.com/api/ping-sitemap');
        discoverySignalsUpdated = signalResponse.ok;
      } catch (signalError) {
        console.error('Discovery signal refresh failed:', signalError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Published ${successCount} of ${scheduledPosts.length} posts`,
        published: successCount,
        discoverySignalsUpdated,
        results
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Publish scheduled posts error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
