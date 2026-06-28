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
      .select("slug, updated_at, published_at")
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
    <loc>${escapeXml(getPostUrl(p.slug!))}</loc>
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

  const fetchPostsFiltered = async (categoryId: string | "all") => {
    let q = supabase
      .from("posts")
      .select("*, category:categories(name), author:authors(name)")
      .order("created_at", { ascending: false });
    if (categoryId !== "all") q = q.eq("category_id", categoryId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  };

  const exportJsonByCategory = async () => {
    try {
      const posts = await fetchPostsFiltered(exportCategory);
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
      const period = htmlFrom || htmlTo ? `${htmlFrom || "البداية"} → ${htmlTo || "اليوم"}` : "كل الفترات";
      const rows = posts.map((p, i) => `
        <tr>
          <td>${i + 1}</td>
          <td><a href="${getPostUrl(p.slug || "")}" target="_blank" rel="noopener">${escapeHtml(p.title)}</a></td>
          <td><span class="views">${(p.views_count || 0).toLocaleString("ar")}</span></td>
          <td>${(p.published_at || p.created_at || "").split("T")[0]}</td>
        </tr>`).join("");
      const html = `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>تقرير حصاد اليوم</title>
<style>
  body{margin:0;background:#f0f2f5;font-family:'Tahoma',sans-serif;padding:30px 12px}
  .card{max-width:900px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.06);overflow:hidden}
  .head{background:#0a0a0a;color:#fff;padding:18px 24px;display:flex;justify-content:space-between;align-items:center}
  .head .ar{font-size:22px;font-weight:bold} .head .en{opacity:.8;font-size:14px;letter-spacing:1px}
  .body{padding:28px}
  h1{color:hsl(41,77%,38%);border-bottom:2px solid hsl(41,77%,38%);padding-bottom:8px;margin:0 0 12px}
  .meta{color:#555;font-size:13px;margin-bottom:14px}
  .intro{color:#333;line-height:1.9;margin-bottom:22px}
  table{width:100%;border-collapse:collapse}
  thead th{background:hsl(41,77%,38%);color:#fff;padding:10px;text-align:right;font-weight:bold}
  tbody td{padding:10px;border-bottom:1px solid #eee;font-size:14px}
  tbody tr:hover{background:#fafafa}
  td a{color:#1a73e8;text-decoration:none} td a:hover{text-decoration:underline}
  .views{background:#dcfce7;color:#166534;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:bold}
  footer{text-align:center;color:#666;font-size:12px;padding:18px;border-top:1px solid #eee;background:#fafafa}
</style></head>
<body><div class="card">
  <div class="head"><div class="ar">حصاد اليوم</div><div class="en">Hasad Alyoum</div></div>
  <div class="body">
    <h1>تقرير الأخبار</h1>
    <div class="meta">إجمالي الأخبار: <b>${posts.length}</b> &nbsp;•&nbsp; الفترة: <b>${period}</b></div>
    <p class="intro">يستعرض هذا التقرير قائمة بالأخبار المنشورة على موقع حصاد اليوم خلال الفترة المحددة. تتضمن البيانات العنوان، تاريخ النشر، وعدد المشاهدات لكل خبر. يمكن النقر على عنوان أي خبر للانتقال إليه مباشرة على الموقع.</p>
    <table>
      <thead><tr><th>#</th><th>العنوان</th><th>المشاهدات</th><th>التاريخ</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <footer>© ${new Date().getFullYear()} حصاد اليوم — جميع الحقوق محفوظة</footer>
</div></body></html>`;
      downloadText(html, `hasad-report-${Date.now()}.html`, "text/html");
      toast.success(`تم تصدير ${posts.length} خبر`);
    } catch (e: any) {
      toast.error("فشل التصدير: " + e.message);
    }
  };

  const exportWord = async () => {
    try {
      const posts = await fetchByDateRange();
      const period = htmlFrom || htmlTo ? `${htmlFrom || "البداية"} → ${htmlTo || "اليوم"}` : "كل الفترات";

      // Build relationships for hyperlinks
      const rels = posts.map((p, i) => `<Relationship Id="rId${100 + i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${escapeXml(getPostUrl(p.slug || ""))}" TargetMode="External"/>`).join("");

      const tableRows = posts.map((p, i) => `
<w:tr>
  <w:tc><w:tcPr><w:tcW w:w="500" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:bidi/></w:pPr><w:r><w:t>${i + 1}</w:t></w:r></w:p></w:tc>
  <w:tc><w:tcPr><w:tcW w:w="5500" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:bidi/></w:pPr><w:hyperlink r:id="rId${100 + i}"><w:r><w:rPr><w:color w:val="1A73E8"/><w:u w:val="single"/><w:rtl/></w:rPr><w:t xml:space="preserve">${escapeXml(p.title)}</w:t></w:r></w:hyperlink></w:p></w:tc>
  <w:tc><w:tcPr><w:tcW w:w="1500" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:bidi/></w:pPr><w:r><w:t>${p.views_count || 0}</w:t></w:r></w:p></w:tc>
  <w:tc><w:tcPr><w:tcW w:w="1800" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:bidi/></w:pPr><w:r><w:t>${(p.published_at || p.created_at || "").split("T")[0]}</w:t></w:r></w:p></w:tc>
</w:tr>`).join("");

      const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<w:body>
  <w:p><w:pPr><w:bidi/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="48"/><w:rtl/></w:rPr><w:t>حصاد اليوم</w:t></w:r></w:p>
  <w:p><w:pPr><w:bidi/><w:jc w:val="center"/><w:pBdr><w:bottom w:val="single" w:sz="12" w:color="C9A227"/></w:pBdr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="C9A227"/><w:rtl/></w:rPr><w:t>تقرير الأخبار</w:t></w:r></w:p>
  <w:p><w:pPr><w:bidi/></w:pPr><w:r><w:rPr><w:rtl/></w:rPr><w:t xml:space="preserve">إجمالي الأخبار: ${posts.length} — الفترة: ${escapeXml(period)}</w:t></w:r></w:p>
  <w:tbl>
    <w:tblPr><w:tblW w:w="9300" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="CCCCCC"/><w:left w:val="single" w:sz="4" w:color="CCCCCC"/><w:bottom w:val="single" w:sz="4" w:color="CCCCCC"/><w:right w:val="single" w:sz="4" w:color="CCCCCC"/><w:insideH w:val="single" w:sz="4" w:color="CCCCCC"/><w:insideV w:val="single" w:sz="4" w:color="CCCCCC"/></w:tblBorders></w:tblPr>
    <w:tr>
      <w:tc><w:tcPr><w:tcW w:w="500" w:type="dxa"/><w:shd w:fill="C9A227"/></w:tcPr><w:p><w:pPr><w:bidi/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:rtl/></w:rPr><w:t>#</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:tcW w:w="5500" w:type="dxa"/><w:shd w:fill="C9A227"/></w:tcPr><w:p><w:pPr><w:bidi/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:rtl/></w:rPr><w:t>العنوان</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:tcW w:w="1500" w:type="dxa"/><w:shd w:fill="C9A227"/></w:tcPr><w:p><w:pPr><w:bidi/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:rtl/></w:rPr><w:t>المشاهدات</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:tcW w:w="1800" w:type="dxa"/><w:shd w:fill="C9A227"/></w:tcPr><w:p><w:pPr><w:bidi/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:rtl/></w:rPr><w:t>التاريخ</w:t></w:r></w:p></w:tc>
    </w:tr>
    ${tableRows}
  </w:tbl>
  <w:p><w:pPr><w:bidi/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="666666"/><w:rtl/></w:rPr><w:t>© ${new Date().getFullYear()} حصاد اليوم — جميع الحقوق محفوظة</w:t></w:r></w:p>
</w:body>
</w:document>`;

      const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`;

      const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

      const mainRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

      const zip = new JSZip();
      zip.file("[Content_Types].xml", contentTypes);
      zip.folder("_rels")!.file(".rels", mainRels);
      const wordF = zip.folder("word")!;
      wordF.file("document.xml", doc);
      wordF.folder("_rels")!.file("document.xml.rels", docRels);
      const blob = await zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      downloadBlob(blob, `hasad-report-${Date.now()}.docx`);
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

  const computeAutoViews = (createdAt: string) => {
    const ageH = (Date.now() - new Date(createdAt).getTime()) / 3600000;
    let lo = 600, hi = 1500;
    if (ageH < 1) { lo = 150; hi = 388; }
    else if (ageH < 5) { lo = 455; hi = 700; }
    return Math.floor(lo + Math.random() * (hi - lo));
  };

  const applyGrowth = async () => {
    setUpdating(true);
    try {
      let targets: Array<{ id: string; created_at: string; views_count: number; target?: number }> = [];
      if (targetSpecific) {
        targets = selectedPosts.map((p) => ({ id: p.id, created_at: "", views_count: 0, target: p.views }));
      } else {
        let q = supabase.from("posts").select("id, created_at, views_count");
        if (growthCategory !== "all") q = q.eq("category_id", growthCategory);
        if (growthFrom) q = q.gte("created_at", growthFrom);
        const { data } = await q;
        targets = (data || []) as any;
      }
      let updated = 0;
      for (const t of targets) {
        const v = t.target != null ? t.target :
          autoGrowth ? computeAutoViews(t.created_at) :
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
              <Label>تصدير HTML / Word (بفلتر التاريخ)</Label>
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