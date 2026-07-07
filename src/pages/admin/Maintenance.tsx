import { useState, useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCategories } from "@/hooks/useCategories";
import { useQuery } from "@tanstack/react-query";
import JsonNewsImporter from "@/components/admin/JsonNewsImporter";
import { getPostUrl } from "@/lib/postUrl";
import { optimizeImage } from "@/lib/imageOptimizer";
import {
  Globe, FileCode, Map, Download, Wrench, Image as ImgIcon, Trash2,
  Database, Shuffle, Loader2, Search, X
} from "lucide-react";
import JSZip from "jszip";

const SITE_URL = "https://hasadalyoum.com";
const BRAND_COLOR = "#1B3A6B";
const BRAND_COLOR_HEX = "1B3A6B";

function formatArDate(d: string | Date) {
  try {
    return new Date(d).toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return "";
  }
}
function formatArShortDate(d: string) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("ar-EG");
  } catch {
    return d;
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadText(text: string, filename: string, mime = "text/plain") {
  downloadBlob(new Blob([text], { type: `${mime};charset=utf-8` }), filename);
}

function escapeXml(s: string) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function escapeHtml(s: string) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const Maintenance = () => {
  const { data: categories } = useCategories();

  // ============ Section 1 ============
  const [exportCategory, setExportCategory] = useState<string>("all");
  const [htmlFrom, setHtmlFrom] = useState("");
  const [htmlTo, setHtmlTo] = useState("");

  const pingGoogle = () => {
    window.open(`https://www.google.com/ping?sitemap=${SITE_URL}/sitemap.xml`, "_blank");
    toast.success("تم إرسال طلب الأرشفة لجوجل");
  };

  const generateRobots = () => {
    const txt = `# robots.txt — حصاد اليوم
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /auth

User-agent: Googlebot
Allow: /
Disallow: /admin/

User-agent: Bingbot
Allow: /
Disallow: /admin/

User-agent: Twitterbot
Allow: /

User-agent: facebookexternalhit
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
Sitemap: ${SITE_URL}/feed
`;
    downloadText(txt, "robots.txt");
    toast.success("تم توليد robots.txt");
  };

  const generateSitemap = async () => {
    toast.info("جاري جلب الأخبار...");
    const { data, error } = await supabase
      .from("posts")
      .select("slug, updated_at, published_at, created_at")
      .eq("status", "published");
    if (error) {
      toast.error("فشل جلب الأخبار");
      return;
    }
    const urls = (data || [])
      .filter((p) => p.slug)
      .map((p) => {
        const lastmod = (p.updated_at || p.published_at || new Date().toISOString()).split("T")[0];
        return `  <url>
    <loc>${escapeXml(getPostUrl(p.slug!, p.published_at || p.created_at))}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
      })
      .join("\n");
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${urls}
</urlset>`;
    downloadText(xml, "sitemap.xml", "application/xml");
    toast.success(`تم توليد sitemap.xml (${(data || []).length} رابط)`);
  };

  const fetchPostsFiltered = async (categoryId: string | "all", from?: string, to?: string) => {
    let q = supabase
      .from("posts")
      .select("*, category:categories(name), author:authors(name)")
      .order("created_at", { ascending: false });
    if (categoryId !== "all") q = q.eq("category_id", categoryId);
    if (from) q = q.gte("created_at", from);
    if (to) q = q.lte("created_at", to + "T23:59:59");
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  };

  const exportJsonByCategory = async () => {
    try {
      const posts = await fetchPostsFiltered(exportCategory, htmlFrom, htmlTo);
      const payload = {
        exported_at: new Date().toISOString(),
        type: "posts",
        total: posts.length,
        data: posts.map((p: any) => ({
          id: p.id,
          title: p.title,
          content: p.content,
          excerpt: p.excerpt,
          image_url: p.featured_image,
          category: p.category?.name || null,
          author: p.author?.name || null,
          featured: p.is_featured,
          created_at: p.created_at,
          updated_at: p.updated_at,
          source: p.source_type,
          external_video_url: p.external_video_url,
          slug: p.slug,
          meta_title: p.meta_title,
          meta_description: p.meta_description,
          keywords: p.meta_keywords ? p.meta_keywords.split(",").map((k: string) => k.trim()) : [],
          tags: [],
          scheduled_at: p.scheduled_at,
          expires_at: p.hide_after,
          status: p.status,
          views: p.views_count,
          word_count: p.word_count,
          reading_time: p.reading_time,
          author_id: p.author_id,
          is_pinned: p.is_pinned,
          badge: p.badge || "",
          pinned_order: p.pinned_order,
        })),
      };
      downloadText(JSON.stringify(payload, null, 2), `posts-${exportCategory}-${Date.now()}.json`, "application/json");
      toast.success(`تم تصدير ${posts.length} خبر`);
    } catch (e: any) {
      toast.error("فشل التصدير: " + e.message);
    }
  };

  const fetchByDateRange = async () => {
    let q = supabase
      .from("posts")
      .select("id, title, slug, views_count, created_at, published_at")
      .order("created_at", { ascending: false });
    if (htmlFrom) q = q.gte("created_at", htmlFrom);
    if (htmlTo) q = q.lte("created_at", htmlTo + "T23:59:59");
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  };

  const exportHtml = async () => {
    try {
      const posts = await fetchByDateRange();
      const fromAr = htmlFrom ? formatArDate(htmlFrom) : "البداية";
      const toAr = htmlTo ? formatArDate(htmlTo) : formatArDate(new Date());
      const period = `${fromAr} — ${toAr}`;
      const rows = posts.map((p, i) => `
        <tr>
          <td>${i + 1}</td>
          <td><a href="${getPostUrl(p.slug || "", p.published_at || p.created_at || "")}" target="_blank" rel="noopener">${escapeHtml(p.title)}</a></td>
          <td><span class="views-badge">${(p.views_count || 0).toLocaleString("ar-EG")}</span></td>
          <td>${formatArShortDate(p.published_at || p.created_at || "")}</td>
        </tr>`).join("");
      const year = new Date().getFullYear();
      const html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>تقرير حصاد اليوم</title><style>
body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f2f5; padding: 20px; text-align: right; margin: 0; }
.card { max-width: 900px; margin: auto; background: white; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }
.header-band { background: ${BRAND_COLOR}; padding: 22px 20px 14px; text-align: center; }
.header-band h1 { color: white; font-size: 32px; font-weight: bold; margin: 0 0 4px; }
.header-band p { color: #C8D8F0; font-style: italic; font-size: 14px; margin: 0; }
.body-content { padding: 24px 28px; }
.report-title { color: ${BRAND_COLOR}; font-size: 24px; font-weight: bold; text-align: center; text-decoration: underline; margin: 0 0 8px; }
.divider { border: none; border-top: 2px solid ${BRAND_COLOR}; margin: 8px 0 16px; }
.report-meta { text-align: center; font-size: 15px; color: #334155; margin-bottom: 20px; }
.report-meta strong { color: ${BRAND_COLOR}; }
.intro p { font-size: 14px; color: #334155; line-height: 1.9; margin: 0 0 10px; text-align: justify; }
table { width: 100%; border-collapse: collapse; margin-top: 20px; }
th, td { border: 1px solid #e5e7eb; padding: 10px 12px; text-align: right; }
th { background: ${BRAND_COLOR}; color: white; font-size: 14px; }
td { font-size: 13px; color: #334155; }
tr:nth-child(even) td { background: #F8FAFC; }
a { color: #1A56CC; text-decoration: underline; font-weight: 600; }
.views-badge { background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 999px; font-size: 12px; font-weight: bold; }
.footer { text-align: center; font-size: 12px; color: #94A3B8; border-top: 1px solid #e5e7eb; padding: 14px; margin-top: 20px; }
@media print {
  body { background: white; padding: 0; }
  .card { box-shadow: none; border-radius: 0; max-width: 100%; }
  a { color: #1A56CC; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
}
</style></head><body><div class="card">
<div class="header-band"><h1>حصاد اليوم</h1><p>Hasad Al-Youm &nbsp;·&nbsp; Arab News Network</p></div>
<div class="body-content">
<h2 class="report-title">التقرير الصحفي الشهري</h2>
<hr class="divider"/>
<div class="report-meta"><strong>إجمالي الأخبار: ${posts.length} خبراً</strong> &nbsp;&nbsp;|&nbsp;&nbsp; <strong>الفترة:</strong> ${period}</div>
<div class="intro">
  <p>يُصدر موقع "حصاد اليوم" الإخباري — من قلب العاصمة صنعاء — تقريره الصحفي الشهري الشامل، الذي يرصد ويحلل المشهدين الإعلامي والميداني على الساحتين المحلية والدولية، خلال الفترة الممتدة من ${fromAr} وحتى ${toAr}.</p>
  <p>يضمّ التقرير نخبة من أبرز العناوين الإخبارية الموثّقة، التي تعكس في مجملها التطورات المتسارعة والتحولات الميدانية بالغة الدلالة في الشأن اليمني، فضلاً عن القضايا ذات الامتداد الإقليمي والدولي.</p>
  <p>وتسهيلاً على الباحثين، والمتابعين، والإعلاميين، تُمثّل هذه المادة أرشيفاً رقمياً تفاعلياً وموثوقاً؛ يتيح للقارئ النقر على أي عنوان للانتقال مباشرةً والاطلاع على تفاصيل التغطية الكاملة.</p>
</div>
<table><thead><tr><th>#</th><th>العنوان</th><th>المشاهدات</th><th>التاريخ</th></tr></thead><tbody>${rows}</tbody></table>
<div class="footer">© حصاد اليوم — جميع الحقوق محفوظة ${year} | hasadalyoum.com</div>
</div></div></body></html>`;
      downloadText(html, `hasad-report-${Date.now()}.html`, "text/html");
      toast.success(`تم تصدير ${posts.length} خبر`);
    } catch (e: any) {
      toast.error("فشل التصدير: " + e.message);
    }
  };

  const exportWord = async () => {
    try {
      const posts = await fetchByDateRange();
      const fromAr = htmlFrom ? formatArDate(htmlFrom) : "البداية";
      const toAr = htmlTo ? formatArDate(htmlTo) : formatArDate(new Date());
      const period = `${fromAr} — ${toAr}`;
      const year = new Date().getFullYear();

      // Build relationships for hyperlinks
      const rels = posts.map((p, i) => `<Relationship Id="rId${100 + i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${escapeXml(getPostUrl(p.slug || "", (p as any).published_at || (p as any).created_at || ""))}" TargetMode="External"/>`).join("");

      // Reusable XML fragments matching the Hasad Al-Youm reference template
      const FONT = `<w:rFonts w:ascii="Arial" w:cs="Arial" w:eastAsia="Arial" w:hAnsi="Arial"/>`;
      const BORDER = `<w:top w:val="single" w:sz="4" w:space="0" w:color="cbd5e1"/><w:left w:val="single" w:sz="4" w:space="0" w:color="cbd5e1"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="cbd5e1"/><w:right w:val="single" w:sz="4" w:space="0" w:color="cbd5e1"/>`;
      const HEAD_MAR = `<w:tcMar><w:top w:w="100" w:type="dxa"/><w:left w:w="140" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="140" w:type="dxa"/></w:tcMar>`;
      const CELL_MAR_CTR = `<w:tcMar><w:top w:w="80" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar>`;
      const CELL_MAR_TXT = `<w:tcMar><w:top w:w="80" w:type="dxa"/><w:left w:w="140" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="140" w:type="dxa"/></w:tcMar>`;

      const tableRows = posts.map((p, i) => {
        const zebra = i % 2 === 1 ? "f8fafc" : "ffffff";
        const dateText = escapeXml(formatArShortDate(p.published_at || p.created_at || ""));
        const titleText = escapeXml(p.title);
        const views = (p.views_count || 0).toString();
        return `
<w:tr><w:trPr><w:cantSplit/></w:trPr>
  <w:tc><w:tcPr><w:tcW w:w="1200" w:type="dxa"/><w:tcBorders>${BORDER}</w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="${zebra}"/>${CELL_MAR_CTR}<w:vAlign w:val="center"/></w:tcPr>
    <w:p><w:pPr><w:jc w:val="center"/><w:bidi/></w:pPr><w:r><w:rPr>${FONT}<w:color w:val="334155"/><w:sz w:val="18"/><w:szCs w:val="18"/><w:rtl/></w:rPr><w:t xml:space="preserve">${dateText}</w:t></w:r></w:p>
  </w:tc>
  <w:tc><w:tcPr><w:tcW w:w="1080" w:type="dxa"/><w:tcBorders>${BORDER}</w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="${zebra}"/>${CELL_MAR_CTR}<w:vAlign w:val="center"/></w:tcPr>
    <w:p><w:pPr><w:jc w:val="center"/><w:bidi/></w:pPr><w:r><w:rPr>${FONT}<w:color w:val="334155"/><w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr><w:t>${views}</w:t></w:r></w:p>
  </w:tc>
  <w:tc><w:tcPr><w:tcW w:w="7200" w:type="dxa"/><w:tcBorders>${BORDER}</w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="${zebra}"/>${CELL_MAR_TXT}<w:vAlign w:val="center"/></w:tcPr>
    <w:p><w:pPr><w:jc w:val="right"/><w:bidi/></w:pPr><w:hyperlink r:id="rId${100 + i}" w:history="1"><w:r><w:rPr>${FONT}<w:color w:val="1a56cc"/><w:sz w:val="19"/><w:szCs w:val="19"/><w:u w:val="single"/><w:rtl/></w:rPr><w:t xml:space="preserve">${titleText}</w:t></w:r></w:hyperlink></w:p>
  </w:tc>
  <w:tc><w:tcPr><w:tcW w:w="600" w:type="dxa"/><w:tcBorders>${BORDER}</w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="${zebra}"/>${CELL_MAR_CTR}<w:vAlign w:val="center"/></w:tcPr>
    <w:p><w:pPr><w:jc w:val="center"/><w:bidi/></w:pPr><w:r><w:rPr>${FONT}<w:color w:val="334155"/><w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr><w:t>${i + 1}</w:t></w:r></w:p>
  </w:tc>
</w:tr>`;
      }).join("");

      const headerCell = (label: string, w: number, align: "right" | "center") =>
        `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/><w:tcBorders>${BORDER}</w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="${BRAND_COLOR_HEX.toLowerCase()}"/>${HEAD_MAR}<w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="${align}"/><w:bidi/></w:pPr><w:r><w:rPr>${FONT}<w:b/><w:bCs/><w:color w:val="ffffff"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:rtl/></w:rPr><w:t>${label}</w:t></w:r></w:p></w:tc>`;

      const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<w:body>
  <w:p><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="${BRAND_COLOR_HEX.toLowerCase()}"/><w:spacing w:before="0" w:after="0"/><w:jc w:val="center"/><w:bidi/></w:pPr><w:r><w:rPr>${FONT}<w:b/><w:bCs/><w:color w:val="ffffff"/><w:sz w:val="56"/><w:szCs w:val="56"/><w:rtl/></w:rPr><w:t>حصاد اليوم</w:t></w:r></w:p>
  <w:p><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="${BRAND_COLOR_HEX.toLowerCase()}"/><w:spacing w:before="0" w:after="240"/><w:jc w:val="center"/></w:pPr><w:r><w:rPr>${FONT}<w:i/><w:iCs/><w:color w:val="bfdbfe"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">Hasad Al-Youm  ·  Arab News Network</w:t></w:r></w:p>
  <w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="10" w:space="0" w:color="c9a227"/></w:pBdr><w:spacing w:before="200" w:after="80"/><w:jc w:val="center"/><w:bidi/></w:pPr><w:r><w:rPr>${FONT}<w:b/><w:bCs/><w:color w:val="${BRAND_COLOR_HEX.toLowerCase()}"/><w:sz w:val="44"/><w:szCs w:val="44"/><w:rtl/></w:rPr><w:t>التقرير الصحفي الشهري</w:t></w:r></w:p>
  <w:p><w:pPr><w:spacing w:before="120" w:after="60"/><w:jc w:val="center"/><w:bidi/></w:pPr>
    <w:r><w:rPr>${FONT}<w:b/><w:bCs/><w:color w:val="334155"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:rtl/></w:rPr><w:t xml:space="preserve">إجمالي الأخبار: </w:t></w:r>
    <w:r><w:rPr>${FONT}<w:color w:val="334155"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:rtl/></w:rPr><w:t xml:space="preserve">${posts.length} خبراً</w:t></w:r>
    <w:r><w:rPr>${FONT}<w:color w:val="cbd5e1"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">    |    </w:t></w:r>
    <w:r><w:rPr>${FONT}<w:b/><w:bCs/><w:color w:val="334155"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:rtl/></w:rPr><w:t xml:space="preserve">الفترة: </w:t></w:r>
    <w:r><w:rPr>${FONT}<w:color w:val="334155"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:rtl/></w:rPr><w:t xml:space="preserve">${escapeXml(period)}</w:t></w:r>
  </w:p>
  <w:p><w:pPr><w:spacing w:before="160" w:after="0"/></w:pPr></w:p>
  <w:p><w:pPr><w:spacing w:before="80" w:after="80"/><w:jc w:val="right"/><w:bidi/></w:pPr><w:r><w:rPr>${FONT}<w:color w:val="334155"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:rtl/></w:rPr><w:t xml:space="preserve">يُصدر موقع "حصاد اليوم" الإخباري — من قلب العاصمة صنعاء — تقريره الصحفي الشهري الشامل، الذي يرصد ويحلل المشهدين الإعلامي والميداني على الساحتين المحلية والدولية، خلال الفترة الممتدة من ${escapeXml(fromAr)} وحتى ${escapeXml(toAr)}.</w:t></w:r></w:p>
  <w:p><w:pPr><w:spacing w:before="80" w:after="80"/><w:jc w:val="right"/><w:bidi/></w:pPr><w:r><w:rPr>${FONT}<w:color w:val="334155"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:rtl/></w:rPr><w:t xml:space="preserve">يضمّ التقرير نخبة من أبرز العناوين الإخبارية الموثّقة، التي تعكس في مجملها التطورات المتسارعة والتحولات الميدانية بالغة الدلالة في الشأن اليمني، فضلاً عن القضايا ذات الامتداد الإقليمي والدولي.</w:t></w:r></w:p>
  <w:p><w:pPr><w:spacing w:before="80" w:after="80"/><w:jc w:val="right"/><w:bidi/></w:pPr><w:r><w:rPr>${FONT}<w:color w:val="334155"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:rtl/></w:rPr><w:t xml:space="preserve">وتسهيلاً على الباحثين، والمتابعين، والإعلاميين، تُمثّل هذه المادة أرشيفاً رقمياً تفاعلياً وموثوقاً؛ يتيح للقارئ النقر على أي عنوان للانتقال مباشرةً والاطلاع على تفاصيل التغطية الكاملة.</w:t></w:r></w:p>
  <w:p><w:pPr><w:spacing w:before="0" w:after="160"/></w:pPr></w:p>
  <w:tbl>
    <w:tblPr><w:tblW w:w="10080" w:type="dxa"/><w:bidiVisual/><w:tblBorders>${BORDER}<w:insideH w:val="single" w:sz="4" w:space="0" w:color="cbd5e1"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="cbd5e1"/></w:tblBorders></w:tblPr>
    <w:tblGrid><w:gridCol w:w="1200"/><w:gridCol w:w="1080"/><w:gridCol w:w="7200"/><w:gridCol w:w="600"/></w:tblGrid>
    <w:tr><w:trPr><w:tblHeader/></w:trPr>
      ${headerCell("التاريخ", 1200, "center")}
      ${headerCell("المشاهدات", 1080, "center")}
      ${headerCell("العنوان", 7200, "right")}
      ${headerCell("#", 600, "center")}
    </w:tr>
    ${tableRows}
  </w:tbl>
  <w:p><w:pPr><w:spacing w:before="120" w:after="60"/><w:jc w:val="center"/><w:bidi/></w:pPr><w:r><w:rPr>${FONT}<w:color w:val="cbd5e1"/><w:sz w:val="18"/><w:szCs w:val="18"/><w:rtl/></w:rPr><w:t xml:space="preserve">© حصاد اليوم — جميع الحقوق محفوظة ${year} | hasadalyoum.com</w:t></w:r></w:p>
  <w:sectPr><w:pgSz w:w="12240" w:h="15840" w:orient="portrait"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="720" w:footer="720" w:gutter="0"/><w:bidi/></w:sectPr>
</w:body>
</w:document>`;

      const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`;

      const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>`;

      const mainRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

      const settings = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="14"/></w:compat><w:themeFontLang w:val="en-US" w:bidi="ar-SA"/></w:settings>`;
      const docRelsFinal = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>${rels}</Relationships>`;

      const zip = new JSZip();
      zip.file("[Content_Types].xml", contentTypes);
      zip.folder("_rels")!.file(".rels", mainRels);
      const wordF = zip.folder("word")!;
      wordF.file("document.xml", doc);
      wordF.file("settings.xml", settings);
      wordF.folder("_rels")!.file("document.xml.rels", docRelsFinal);
      const blob = await zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const fmtLabel = (d: string | Date) => {
        const dt = new Date(d);
        const day = dt.getDate();
        const month = dt.toLocaleDateString("ar-YE", { month: "long" });
        return `${day} ${month}`;
      };
      const fileYear = new Date(htmlTo || new Date()).getFullYear();
      const fromLabel = htmlFrom ? fmtLabel(htmlFrom) : fmtLabel(new Date());
      const toLabel = htmlTo ? fmtLabel(htmlTo) : fmtLabel(new Date());
      downloadBlob(blob, `فترة ${fromLabel} — ${toLabel}.${fileYear}م.docx`);
      toast.success(`تم تصدير ${posts.length} خبر`);
    } catch (e: any) {
      toast.error("فشل التصدير: " + e.message);
    }
  };

  // ============ Section 2 — smart growth ============
  const [autoGrowth, setAutoGrowth] = useState(true);
  const [growthCategory, setGrowthCategory] = useState<string>("all");
  const [growthFrom, setGrowthFrom] = useState("");
  const [minViews, setMinViews] = useState(150);
  const [maxViews, setMaxViews] = useState(800);
  const [targetSpecific, setTargetSpecific] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPosts, setSelectedPosts] = useState<Array<{ id: string; title: string; views: number }>>([]);
  const [updating, setUpdating] = useState(false);

  const { data: searchResults } = useQuery({
    queryKey: ["maint-search", searchTerm],
    queryFn: async () => {
      if (!searchTerm.trim()) return [];
      const { data } = await supabase
        .from("posts").select("id, title, views_count")
        .ilike("title", `%${searchTerm}%`).limit(10);
      return data || [];
    },
    enabled: targetSpecific && searchTerm.length > 1,
  });

  const computeAutoViews = (createdAt: string, isNewsReports: boolean) => {
    const ageH = (Date.now() - new Date(createdAt).getTime()) / 3600000;
    // قسم "أخبار وتقارير": المنطق الأصلي — باقي الأقسام: نفس البنية بنطاق مصغّر ضمن 126-683
    let lo = isNewsReports ? 600 : 451;
    let hi = isNewsReports ? 1500 : 683;
    if (ageH < 1) { lo = isNewsReports ? 150 : 126; hi = isNewsReports ? 388 : 250; }
    else if (ageH < 5) { lo = isNewsReports ? 455 : 251; hi = isNewsReports ? 700 : 450; }
    return Math.floor(lo + Math.random() * (hi - lo));
  };

  const applyGrowth = async () => {
    setUpdating(true);
    try {
      let targets: Array<{ id: string; created_at: string; views_count: number; target?: number; isNewsReports?: boolean }> = [];
      if (targetSpecific) {
        targets = selectedPosts.map((p) => ({ id: p.id, created_at: "", views_count: 0, target: p.views }));
      } else {
        let q = supabase.from("posts").select("id, created_at, views_count, category:categories(name)");
        if (growthCategory !== "all") q = q.eq("category_id", growthCategory);
        if (growthFrom) q = q.gte("created_at", growthFrom);
        const { data } = await q;
        targets = (data || []).map((p: any) => ({
          id: p.id,
          created_at: p.created_at,
          views_count: p.views_count,
          isNewsReports: p.category?.name === "أخبار وتقارير",
        }));
      }
      let updated = 0;
      for (const t of targets) {
        const v = t.target != null ? t.target :
          autoGrowth ? computeAutoViews(t.created_at, !!t.isNewsReports) :
          Math.floor(minViews + Math.random() * (maxViews - minViews));
        const { error } = await supabase.from("posts").update({ views_count: v }).eq("id", t.id);
        if (!error) updated++;
      }
      toast.success(`تم تحديث ${updated} خبر`);
    } catch (e: any) {
      toast.error("فشل التحديث: " + e.message);
    } finally {
      setUpdating(false);
    }
  };

  const recycleViews = async () => {
    setUpdating(true);
    try {
      let targets: Array<{ id: string; views_count: number }> = [];
      if (targetSpecific) {
        targets = selectedPosts.map((p) => ({ id: p.id, views_count: p.views }));
      } else {
        let q = supabase.from("posts").select("id, views_count");
        if (growthCategory !== "all") q = q.eq("category_id", growthCategory);
        if (growthFrom) q = q.gte("created_at", growthFrom);
        const { data } = await q;
        targets = (data || []) as any;
      }
      let updated = 0;
      for (const t of targets) {
        const base = t.views_count || 100;
        const variance = base * 0.25;
        const v = Math.max(0, Math.floor(base + (Math.random() * 2 - 1) * variance));
        const { error } = await supabase.from("posts").update({ views_count: v }).eq("id", t.id);
        if (!error) updated++;
      }
      toast.success(`تم إعادة تدوير ${updated} خبر`);
    } catch (e: any) {
      toast.error("فشل: " + e.message);
    } finally {
      setUpdating(false);
    }
  };

  // ============ Section 3 — image maintenance ============
  const [deleteOriginal, setDeleteOriginal] = useState(false);
  const [imgProgress, setImgProgress] = useState({ done: 0, total: 0, running: false });

  const optimizeAllImages = async () => {
    setImgProgress({ done: 0, total: 0, running: true });
    try {
      const { data: posts } = await supabase
        .from("posts").select("id, featured_image")
        .not("featured_image", "is", null);
      const targets = (posts || []).filter((p) => p.featured_image && !p.featured_image.endsWith(".webp"));
      setImgProgress({ done: 0, total: targets.length, running: true });

      for (let i = 0; i < targets.length; i++) {
        const p = targets[i];
        try {
          const res = await fetch(p.featured_image!);
          const blob = await res.blob();
          const file = new File([blob], "img.jpg", { type: blob.type || "image/jpeg" });
          const optimized = await optimizeImage(file);
          const fileName = `optimized-${Date.now()}-${i}.webp`;
          const { error: upErr } = await supabase.storage.from("post-images").upload(fileName, optimized.blob, { contentType: "image/webp" });
          if (upErr) throw upErr;
          const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(fileName);
          await supabase.from("posts").update({ featured_image: urlData.publicUrl }).eq("id", p.id);

          if (deleteOriginal) {
            const oldPath = p.featured_image!.split("/post-images/")[1];
            if (oldPath) await supabase.storage.from("post-images").remove([oldPath]);
          }
        } catch (e) { console.error("optimize failed", e); }
        setImgProgress({ done: i + 1, total: targets.length, running: true });
      }
      toast.success(`تم تحسين ${targets.length} صورة`);
    } catch (e: any) {
      toast.error("فشل: " + e.message);
    } finally {
      setImgProgress((p) => ({ ...p, running: false }));
    }
  };

  const cleanOrphans = async () => {
    try {
      toast.info("جاري الفحص...");
      const { data: files } = await supabase.storage.from("post-images").list("", { limit: 1000 });
      const { data: posts } = await supabase.from("posts").select("featured_image");
      const used = new Set(
        (posts || []).map((p) => p.featured_image?.split("/post-images/")[1]).filter(Boolean) as string[]
      );
      const orphans = (files || []).filter((f) => !used.has(f.name)).map((f) => f.name);
      if (orphans.length === 0) { toast.success("لا توجد ملفات يتيمة"); return; }
      const { error } = await supabase.storage.from("post-images").remove(orphans);
      if (error) throw error;
      toast.success(`تم حذف ${orphans.length} ملف يتيم`);
    } catch (e: any) {
      toast.error("فشل: " + e.message);
    }
  };

  // ============ Section 5 — backups ============
  const exportAllPosts = async () => {
    const { data, error } = await supabase.from("posts").select("*");
    if (error) { toast.error("فشل"); return; }
    const payload = { exported_at: new Date().toISOString(), type: "posts", total: data!.length, data };
    downloadText(JSON.stringify(payload, null, 2), `backup-posts-${Date.now()}.json`, "application/json");
    toast.success(`تم تصدير ${data!.length} خبر`);
  };
  const exportAuthors = async () => {
    const { data, error } = await supabase.from("authors").select("*");
    if (error) { toast.error("فشل"); return; }
    const payload = { exported_at: new Date().toISOString(), type: "authors", total: data!.length, data };
    downloadText(JSON.stringify(payload, null, 2), `backup-authors-${Date.now()}.json`, "application/json");
    toast.success(`تم تصدير ${data!.length} كاتب`);
  };
  const exportFullBackup = async () => {
    const [pRes, aRes] = await Promise.all([
      supabase.from("posts").select("*"),
      supabase.from("authors").select("*"),
    ]);
    if (pRes.error || aRes.error) { toast.error("فشل"); return; }
    const payload = {
      exported_at: new Date().toISOString(),
      type: "full_backup",
      posts: { total: pRes.data!.length, data: pRes.data },
      authors: { total: aRes.data!.length, data: aRes.data },
    };
    downloadText(JSON.stringify(payload, null, 2), `full-backup-${Date.now()}.json`, "application/json");
    toast.success("تم تصدير النسخة الاحتياطية الكاملة");
  };

  const progressPct = useMemo(() => imgProgress.total ? (imgProgress.done / imgProgress.total) * 100 : 0, [imgProgress]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Wrench className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">الصيانة والأرشفة</h1>
        </div>

        {/* Section 1 */}
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Globe className="h-5 w-5" /> الأرشفة العالمية والنسخ الاحتياطي</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button onClick={pingGoogle}><Globe className="h-4 w-4 ml-2" /> أرشفة لحظية</Button>
              <Button variant="outline" onClick={generateRobots}><FileCode className="h-4 w-4 ml-2" /> توليد robots.txt</Button>
              <Button variant="outline" onClick={generateSitemap}><Map className="h-4 w-4 ml-2" /> توليد sitemap.xml</Button>
            </div>

            <div className="border-t pt-4 space-y-3">
              <Label>تصدير JSON بفلتر التصنيف</Label>
              <div className="flex flex-wrap gap-2 items-center">
                <Select value={exportCategory} onValueChange={setExportCategory}>
                  <SelectTrigger className="w-60"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل التصنيفات</SelectItem>
                    {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={exportJsonByCategory}><Download className="h-4 w-4 ml-2" /> تصدير JSON</Button>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <Label>تصدير HTML / Word / JSON (بفلتر التاريخ - اختياري)</Label>
              <div className="grid grid-cols-2 gap-2 max-w-md">
                <div><Label className="text-xs">من</Label><Input type="date" value={htmlFrom} onChange={(e) => setHtmlFrom(e.target.value)} /></div>
                <div><Label className="text-xs">إلى</Label><Input type="date" value={htmlTo} onChange={(e) => setHtmlTo(e.target.value)} /></div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={exportHtml}><Download className="h-4 w-4 ml-2" /> تصدير HTML</Button>
                <Button variant="outline" onClick={exportWord}><Download className="h-4 w-4 ml-2" /> تصدير Word</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2 */}
        <Card>
          <CardHeader><CardTitle className="text-lg">الفلترة الذكية (النمو)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between border rounded p-3">
              <Label>نظام التدرج الآلي حسب عمر الخبر</Label>
              <Switch checked={autoGrowth} onCheckedChange={setAutoGrowth} />
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>التصنيف</Label>
                <Select value={growthCategory} onValueChange={setGrowthCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل التصنيفات</SelectItem>
                    {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>من تاريخ</Label><Input type="date" value={growthFrom} onChange={(e) => setGrowthFrom(e.target.value)} /></div>
              {!autoGrowth && <>
                <div className="space-y-1"><Label>الحد الأدنى للمشاهدات</Label><Input type="number" value={minViews} onChange={(e) => setMinViews(+e.target.value)} /></div>
                <div className="space-y-1"><Label>الحد الأقصى للمشاهدات</Label><Input type="number" value={maxViews} onChange={(e) => setMaxViews(+e.target.value)} /></div>
              </>}
            </div>

            <div className="flex items-center justify-between border rounded p-3">
              <Label>استهداف أخبار محددة</Label>
              <Switch checked={targetSpecific} onCheckedChange={setTargetSpecific} />
            </div>

            {targetSpecific && (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="بحث بالعنوان..." className="pr-9" />
                </div>
                {searchResults && searchResults.length > 0 && (
                  <div className="border rounded max-h-48 overflow-auto">
                    {searchResults.map((r) => (
                      <button key={r.id} className="w-full text-right px-3 py-2 hover:bg-muted text-sm" onClick={() => {
                        if (!selectedPosts.find(p => p.id === r.id)) {
                          setSelectedPosts([...selectedPosts, { id: r.id, title: r.title, views: r.views_count || 0 }]);
                        }
                        setSearchTerm("");
                      }}>{r.title}</button>
                    ))}
                  </div>
                )}
                {selectedPosts.length > 0 && (
                  <div className="border rounded divide-y">
                    {selectedPosts.map((p, i) => (
                      <div key={p.id} className="flex items-center gap-2 p-2">
                        <span className="flex-1 text-sm truncate">{p.title}</span>
                        <Input type="number" className="w-24" value={p.views} onChange={(e) => {
                          const v = +e.target.value;
                          setSelectedPosts(selectedPosts.map((sp, j) => j === i ? { ...sp, views: v } : sp));
                        }} />
                        <Button size="icon" variant="ghost" onClick={() => setSelectedPosts(selectedPosts.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={applyGrowth} disabled={updating}>
                {updating && <Loader2 className="h-4 w-4 animate-spin ml-2" />} تحديث المستهدف
              </Button>
              <Button variant="outline" onClick={recycleViews} disabled={updating}>
                <Shuffle className="h-4 w-4 ml-2" /> إعادة التدوير العشوائي
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Section 3 */}
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ImgIcon className="h-5 w-5" /> الصيانة الفنية</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 border rounded p-3">
              <Checkbox id="del-orig" checked={deleteOriginal} onCheckedChange={(v) => setDeleteOriginal(!!v)} />
              <Label htmlFor="del-orig">حذف الصورة الأصلية بعد التحويل</Label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={optimizeAllImages} disabled={imgProgress.running}>
                {imgProgress.running && <Loader2 className="h-4 w-4 animate-spin ml-2" />} تحسين الصور
              </Button>
              <Button variant="outline" onClick={cleanOrphans}><Trash2 className="h-4 w-4 ml-2" /> تنظيف الملفات</Button>
            </div>
            {imgProgress.total > 0 && (
              <div className="space-y-1">
                <Progress value={progressPct} />
                <p className="text-xs text-muted-foreground">{imgProgress.done} / {imgProgress.total}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 4 */}
        <JsonNewsImporter />

        {/* Section 5 */}
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Database className="h-5 w-5" /> النسخ الاحتياطي للبيانات</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportAllPosts}><Download className="h-4 w-4 ml-2" /> تصدير الأخبار (JSON)</Button>
            <Button variant="outline" onClick={exportAuthors}><Download className="h-4 w-4 ml-2" /> تصدير الكتّاب (JSON)</Button>
            <Button onClick={exportFullBackup}><Download className="h-4 w-4 ml-2" /> تصدير نسخة احتياطية كاملة</Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Maintenance;