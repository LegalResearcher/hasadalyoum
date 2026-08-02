import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * دالة ربط "حصاد اليوم" بمحرك بحث جوجل
 * تقوم بإخطار جوجل فوراً عند نشر خبر جديد أو تحديثه
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// توليد توكن الوصول (Access Token) باستخدام الحساب البرمجي
async function getAccessToken(serviceAccountKey: any): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  
  const payload = {
    iss: serviceAccountKey.client_email,
    scope: "https://www.googleapis.com/auth/indexing",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const base64UrlEncode = (obj: any) => {
    const str = JSON.stringify(obj);
    const bytes = new TextEncoder().encode(str);
    return btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  };

  const headerB64 = base64UrlEncode(header);
  const payloadB64 = base64UrlEncode(payload);
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // معالجة المفتاح الخاص
  let pemContents = serviceAccountKey.private_key;
  pemContents = pemContents.replace(/-----BEGIN PRIVATE KEY-----/g, "")
                           .replace(/-----END PRIVATE KEY-----/g, "")
                           .replace(/\s/g, "");
  
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  const jwt = `${unsignedToken}.${signatureB64}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) throw new Error(`Google Auth Failed: ${JSON.stringify(tokenData)}`);

  return tokenData.access_token;
}

// إرسال طلب الفهرسة لرابط محدد
async function requestIndexing(url: string, accessToken: string, type: string) {
  const response = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ url, type }),
  });

  return { success: response.ok, status: response.status, data: await response.json() };
}

// ─── Google Indexing API ────────────────────────────────────────────────
// تنبيه مهم: هذا الـ API مخصص رسمياً من جوجل لصفحات JobPosting أو
// BroadcastEvent (بث مباشر) فقط. استخدامه لأخبار عادية خارج نطاقه المدعوم
// لا يضمن فهرسة أسرع، وفريق جوجل (Search Relations) صرّح في مايو 2025 أن
// إساءة الاستخدام لمحتوى غير مدعوم قد تؤدي لسحب صلاحية الوصول دون إنذار.
// النجاح هنا يعني فقط أن جوجل "استلمت" الطلب، وليس أنه انفهرس فعلاً.
// أبقيناه يعمل كما هو لأنه موجود مسبقاً، لكن مصدر الفهرسة الأساسي
// المدعوم فعلياً بالكامل من جوجل يبقى: Search Console + sitemap.
async function runGoogleIndexing(urls: string[], type: string) {
  const serviceAccountKeyStr = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
  if (!serviceAccountKeyStr) throw new Error("مفتاح Google Service Account غير مهيأ في البيئة (Env)");

  const serviceAccountKey = JSON.parse(serviceAccountKeyStr);

  console.log(`[Indexing] جاري جلب توكن الوصول لـ ${urls.length} رابط...`);
  const accessToken = await getAccessToken(serviceAccountKey);

  return Promise.all(
    urls.map(async (url) => {
      try {
        return await requestIndexing(url, accessToken, type);
      } catch (error) {
        return { url, success: false, error: error.message };
      }
    })
  );
}

// ─── IndexNow (Bing / Yandex / Naver / Seznam) ──────────────────────────
// بروتوكول مفتوح تشارك فيه بينج وياندكس ومحركات أخرى — لا تشارك فيه جوجل
// حتى الآن رغم اختبارها له منذ 2021. طلب POST واحد يوزَّع تلقائياً على كل
// المحركات المشاركة. المفتاح يطابق ملف التحقق في public/{key}.txt
const INDEXNOW_KEY = "c570532ba20a465391420358b5ad8b3a";
const INDEXNOW_HOST = "hasad-alyoum.com";

async function submitToIndexNow(urls: string[]) {
  if (!urls || urls.length === 0) {
    return { success: false, error: "لا توجد روابط" };
  }

  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: INDEXNOW_HOST,
      key: INDEXNOW_KEY,
      keyLocation: `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`,
      urlList: urls,
    }),
  });

  // IndexNow يرجع 200 أو 202 عند نجاح الاستلام، بدون جسم JSON غالباً
  return { success: response.ok, status: response.status };
}

serve(async (req) => {
  // معالجة طلبات الـ CORS
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let urls: string[];
  let type: string;
  try {
    const body = await req.json();
    urls = body.urls;
    type = body.type || "URL_UPDATED";
    if (!urls || !Array.isArray(urls)) {
      throw new Error("يجب إرسال مصفوفة من الروابط (URLs)");
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // نشغّل Google Indexing API وIndexNow بالتوازي — فشل أحدهما لا يوقف الثاني
  const [googleOutcome, indexNowOutcome] = await Promise.allSettled([
    runGoogleIndexing(urls, type),
    submitToIndexNow(urls),
  ]);

  if (googleOutcome.status === "rejected") {
    console.error("[Google Indexing Error]:", googleOutcome.reason?.message || googleOutcome.reason);
  }
  if (indexNowOutcome.status === "rejected") {
    console.error("[IndexNow Error]:", indexNowOutcome.reason?.message || indexNowOutcome.reason);
  }

  const responseBody = {
    success: googleOutcome.status === "fulfilled",
    results:
      googleOutcome.status === "fulfilled"
        ? googleOutcome.value
        : urls.map((url) => ({
            url,
            success: false,
            error: googleOutcome.reason?.message || String(googleOutcome.reason),
          })),
    ...(googleOutcome.status === "rejected"
      ? { error: googleOutcome.reason?.message || String(googleOutcome.reason) }
      : {}),
    indexNow:
      indexNowOutcome.status === "fulfilled"
        ? indexNowOutcome.value
        : { success: false, error: indexNowOutcome.reason?.message || String(indexNowOutcome.reason) },
  };

  return new Response(JSON.stringify(responseBody), {
    status: googleOutcome.status === "fulfilled" ? 200 : 500,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
