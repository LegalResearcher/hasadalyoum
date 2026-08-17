import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INDEXNOW_KEY = "c570532ba20a465391420358b5ad8b3a";
const INDEXNOW_HOST = "hasad-alyoum.com";

function isCanonicalSiteUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;

  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === INDEXNOW_HOST;
  } catch {
    return false;
  }
}

/**
 * دالة توافقية قديمة باسم google-indexing.
 *
 * لا تستخدم Google Indexing API للمقالات الإخبارية العادية، لأنها غير مدعومة
 * لهذا النوع من المحتوى. تحافظ هذه الدالة على التوافق مع المسارات القديمة،
 * لكنها ترسل العناوين القانونية إلى IndexNow فقط لمحركات البحث المشاركة.
 * يعتمد اكتشاف Google على Sitemap وNews Sitemap وRSS وSearch Console.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST method required" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const requestedUrls = Array.isArray(body.urls) ? body.urls : [];
    const urls = [...new Set(requestedUrls.filter(isCanonicalSiteUrl))];

    if (urls.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: "يلزم إرسال رابط HTTPS قانوني واحد على الأقل من hasad-alyoum.com",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const indexNowResponse = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: INDEXNOW_HOST,
        key: INDEXNOW_KEY,
        keyLocation: `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`,
        urlList: urls,
      }),
    });

    const indexNow = { success: indexNowResponse.ok, status: indexNowResponse.status };
    return new Response(JSON.stringify({
      success: indexNow.success,
      acceptedUrls: urls,
      indexNow,
      google: {
        indexingApiSupported: false,
        message: "Google Indexing API لا تدعم المقالات الإخبارية العادية؛ استخدم Sitemap وNews Sitemap وRSS وSearch Console.",
      },
    }), {
      status: indexNow.success ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Discovery signal error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "تعذر تحديث إشارة الاكتشاف",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
