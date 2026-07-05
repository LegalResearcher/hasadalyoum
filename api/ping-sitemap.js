export default async function handler(req, res) {
  try {
    const sitemapUrl = "https://hasadalyoum.vercel.app/sitemap.xml";
    const sitemapNewsUrl = "https://hasadalyoum.vercel.app/sitemap-news.xml";

    // إرسال ping لجوجل من الـ server
    const [googleMain, googleNews] = await Promise.all([
      fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`),
      fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapNewsUrl)}`)
    ]);

    // إرسال ping لبينج من الـ server
    const bingPing = await fetch(
      `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`
    );

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({
      success: true,
      results: {
        google_main: googleMain.status,
        google_news: googleNews.status,
        bing: bingPing.status
      }
    });

  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
}
