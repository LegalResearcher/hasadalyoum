const escapeHtml = (str) =>
  (str || '')
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const SITE_URL = "https://hasad-alyoum.com";
const SITE_NAME = "حصاد اليوم";
const PAGE_URL = `${SITE_URL}/about`;
const LOGO = `${SITE_URL}/logo.png`;

const PAGE_TITLE = `أ.معين الناصر | ناشر ورئيس تحرير موقع "${SITE_NAME}" الإخباري`;
const PAGE_DESCRIPTION = `أ.معين الناصر، مؤسس ورئيس تحرير موقع "${SITE_NAME}" الإخباري المستقل (تأسس عام 2011م). يشرف على الخط التحريري والتغطيات السياسية والاقتصادية والميدانية للشأن المحلي والإقليمي من العاصمة صنعاء.`;

// ⚠️ يجب أن يبقى هذا المحتوى مطابقاً تماماً لما يعرضه src/pages/About.tsx
// للزوار العاديين — أي تعديل بالنص أو المسمى الوظيفي هناك يجب أن يُنسخ هنا أيضاً.
export default function handler(req, res) {
  const schemaJson = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "معين الناصر",
    "honorificPrefix": "أ.",
    "alternateName": "Moieen Alnaser",
    "url": PAGE_URL,
    "jobTitle": "ناشر ورئيس تحرير",
    "description": PAGE_DESCRIPTION,
    "image": LOGO,
    "worksFor": { "@type": "NewsMediaOrganization", "name": SITE_NAME, "url": SITE_URL },
    "sameAs": [
      "https://alnaseer.org/",
      "https://www.facebook.com/hasadalyoum",
      "https://twitter.com/hasadalyoum",
    ],
  });

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=300");

  return res.status(200).send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeHtml(PAGE_TITLE)}</title>
  <meta name="description" content="${escapeHtml(PAGE_DESCRIPTION)}"/>
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1"/>
  <link rel="canonical" href="${PAGE_URL}"/>

  <meta property="og:type" content="profile"/>
  <meta property="og:title" content="${escapeHtml(PAGE_TITLE)}"/>
  <meta property="og:description" content="${escapeHtml(PAGE_DESCRIPTION)}"/>
  <meta property="og:url" content="${PAGE_URL}"/>
  <meta property="og:site_name" content="${SITE_NAME}"/>
  <meta property="og:image" content="${LOGO}"/>

  <meta name="twitter:card" content="summary"/>
  <meta name="twitter:title" content="${escapeHtml(PAGE_TITLE)}"/>
  <meta name="twitter:description" content="${escapeHtml(PAGE_DESCRIPTION)}"/>

  <script type="application/ld+json">${schemaJson}<\/script>
  <style>
    body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;direction:rtl;margin:0;background:#f5f5f5;color:#222}
    .wrap{max-width:760px;margin:0 auto;padding:32px 16px}
    header{background:#111;padding:12px 16px}
    header a{color:#d4a017;text-decoration:none;font-size:22px;font-weight:bold}
    h1{font-size:26px;margin:0 0 6px}
    .role{color:#b91c1c;font-weight:700;margin-bottom:20px}
    .body{background:#fff;padding:20px;border-radius:8px;font-size:17px;line-height:1.9}
    footer{text-align:center;padding:20px;color:#888;font-size:13px;margin-top:24px}
  </style>
</head>
<body>
  <header><a href="${SITE_URL}">${SITE_NAME}</a></header>
  <div class="wrap">
    <h1>أ.معين الناصر</h1>
    <p class="role">ناشر ورئيس تحرير موقع «${SITE_NAME}» الإخباري</p>
    <div class="body">
      <p>مؤسس ورئيس تحرير موقع «${SITE_NAME}» الإخباري المستقل (تأسس عام 2011م). يشرف على الخط التحريري والتغطيات السياسية والاقتصادية والميدانية للشأن المحلي والإقليمي من العاصمة صنعاء.</p>
    </div>
  </div>
  <footer>© ${SITE_NAME} — جميع الحقوق محفوظة</footer>
</body>
</html>`);
}
