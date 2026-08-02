// ─────────────────────────────────────────────────────────────────────────
// ملاحظة تقنية مهمة:
// نقطتا "ping" القديمتان (google.com/ping?sitemap=... و bing.com/ping?sitemap=...)
// ألغتهما الشركتان رسمياً — جوجل من يونيو 2023 (ترجع الآن 404)، وبينج نهاية
// 2021 (ترجعها الآن 410) واستبدلته ببروتوكول IndexNow. الكود القديم هنا كان
// يستدعي الاثنين ويرجع "success: true" دون أي فائدة فعلية.
//
// البديل الحقيقي الذي لا يزال يعمل فعلياً هو IndexNow (بينج/ياندكس/Naver/Seznam).
// جوجل نفسها لا تشارك في IndexNow حتى الآن — القناة الوحيدة المدعومة لجوجل هي
// Search Console + sitemap (لا يوجد "ping" فوري بديل لها).
//
// هذا الملف الآن يجلب sitemap.xml + sitemap-news.xml الحاليين، يستخرج كل
// الروابط منهما، ويرسلها دفعة واحدة لـ IndexNow.
// ─────────────────────────────────────────────────────────────────────────

const SITE_URL = "https://hasad-alyoum.com";
const INDEXNOW_KEY = "c570532ba20a465391420358b5ad8b3a";
const INDEXNOW_HOST = "hasad-alyoum.com";

function extractLocUrls(xml) {
  if (!xml) return [];
  const matches = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)];
  return matches.map((m) =>
    m[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
  );
}

export default async function handler(req, res) {
  try {
    const [sitemapXml, newsXml] = await Promise.all([
      fetch(`${SITE_URL}/sitemap.xml`).then((r) => r.text()).catch(() => ""),
      fetch(`${SITE_URL}/sitemap-news.xml`).then((r) => r.text()).catch(() => ""),
    ]);

    const urls = [...new Set([...extractLocUrls(sitemapXml), ...extractLocUrls(newsXml)])];

    if (urls.length === 0) {
      res.setHeader("Content-Type", "application/json");
      return res.status(200).json({ success: false, message: "لم يتم العثور على روابط في الـ sitemap" });
    }

    const indexNowRes = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: INDEXNOW_HOST,
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList: urls,
      }),
    });

    res.setHeader("Content-Type", "application/json");
    return res.status(200).json({
      success: true,
      urlsSubmitted: urls.length,
      indexNow: { success: indexNowRes.ok, status: indexNowRes.status },
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
}
