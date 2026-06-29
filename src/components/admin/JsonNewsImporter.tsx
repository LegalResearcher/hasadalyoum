import { useState, useRef, ChangeEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  FileJson,
  Trash2,
  Upload,
  Image as ImageIcon,
  Loader2,
  Send,
  Radio,
  Wand2,
} from "lucide-react";
import { generateMetaTitle, generateSEOSlug, extractSEOKeywords } from "@/lib/seoHelpers";
import { optimizeImage, isOptimizableImage, formatFileSize } from "@/lib/imageOptimizer";
import { useCategories } from "@/hooks/useCategories";
import { useAuthors } from "@/hooks/useAuthors";

// ─── الثوابت ─────────────────────────────────────────────────────────────────
const DEFAULT_SOURCE = "حصاد اليوم | خاص";
const BADGES = ["انفراد", "عاجل", "خاص", "حصري", "تقرير", "متابعة"];

// ─── واجهة الخبر المستورد ─────────────────────────────────────────────────────
interface ImportedPost {
  _key: string;
  title: string;
  content: string;
  excerpt: string;
  source: string;
  badge: string;
  category_id: string;
  status: "published" | "draft" | "scheduled";
  author_id: string;
  scheduled_at: string;
  featured_image: string;
  external_video_url: string;
  meta_title: string;
  meta_description: string;
  slug: string;
  is_pinned: boolean;
  is_featured: boolean;
  excerptSentences: number;
  uploading?: boolean;
  sortPosition?: string;
}

// ─── مساعدات ─────────────────────────────────────────────────────────────────
const extractExcerpt = (content: string, sentences: number = 1): string => {
  if (!content) return "";
  const parts = content.split(/(?<=[.؟!.?!])\s+/).filter(Boolean);
  if (parts.length <= 1) return content.substring(0, 200).trim();
  return parts.slice(0, Math.max(1, sentences)).join(" ").trim();
};

const stripExcerptFromContent = (content: string, excerpt: string): string => {
  if (!excerpt || !content) return content;
  const trimmed = content.trimStart();
  if (trimmed.startsWith(excerpt)) return trimmed.slice(excerpt.length).trimStart();
  return content;
};

const formatContentParagraphs = (text: string): string => {
  if (!text) return text;
  return text
    .replace(/([.؟!])\s*/g, "$1\n")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .join("\n");
};

const buildSlug = (title: string): string => {
  const base = generateSEOSlug(title) || title
    .replace(/[^\u0600-\u06FF\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return `${base}-${Date.now().toString(36)}`;
};

// ─── المكوّن الرئيسي ─────────────────────────────────────────────────────────
const JsonNewsImporter = () => {
  const [posts, setPosts] = useState<ImportedPost[]>([]);
  const [scheduleMode, setScheduleMode] = useState<"instant" | "interval" | "custom">("instant");
  const [intervalStart, setIntervalStart] = useState("");
  const [intervalMinutes, setIntervalMinutes] = useState("10");
  const [isPublishing, setIsPublishing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [showRawBox, setShowRawBox] = useState(false);
  const [rawText, setRawText] = useState("");
  const [autoArchive, setAutoArchive] = useState(false);
  const [autoSeedViews, setAutoSeedViews] = useState(true);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: categories = [] } = useCategories();
  const { data: authors = [] } = useAuthors();

  // الفئة الافتراضية: أول فئة متاحة أو ""
  const defaultCategoryId = categories[0]?.id ?? "";

  // ─── بناء كائن خبر افتراضي ─────────────────────────────────────────────────
  const makePost = (
    title: string,
    rawContent: string,
    idx: number
  ): ImportedPost => {
    const excerpt = extractExcerpt(rawContent, 1);
    const content = formatContentParagraphs(stripExcerptFromContent(rawContent, excerpt));
    return {
      _key: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      title,
      content,
      excerpt,
      source: DEFAULT_SOURCE,
      badge: "",
      category_id: defaultCategoryId,
      status: "published",
      author_id: "",
      scheduled_at: "",
      featured_image: "",
      external_video_url: "",
      meta_title: generateMetaTitle(title),
      meta_description: excerpt.substring(0, 160),
      slug: buildSlug(title),
      is_pinned: false,
      is_featured: false,
      excerptSentences: 1,
      sortPosition: "",
    };
  };

  // ─── معالجة مصفوفة JSON ────────────────────────────────────────────────────
  const processJsonArray = (json: any[]) => {
    const mapped: ImportedPost[] = json.map((item: any, idx: number) =>
      makePost(String(item.title || "").trim(), String(item.content || "").trim(), idx)
    );
    setPosts((prev) => [...prev, ...mapped]);
    toast.success(`تم تحميل ${mapped.length} خبر`);
  };

  // ─── لصق JSON ─────────────────────────────────────────────────────────────
  const handlePasteJson = () => {
    if (!pasteText.trim()) return;
    try {
      const json = JSON.parse(pasteText);
      if (!Array.isArray(json)) { toast.error("يجب أن يكون JSON مصفوفة []"); return; }
      processJsonArray(json);
      setPasteText("");
      setShowPasteBox(false);
    } catch {
      toast.error("النص المُلصق ليس JSON صحيحاً");
    }
  };

  // ─── لصق نص أخبار خام مقسَّم بـ # ────────────────────────────────────────
  const handleRawText = () => {
    if (!rawText.trim()) return;
    const blocks = rawText.split(/(?=^#\s)/m).map((b) => b.trim()).filter(Boolean);
    if (blocks.length === 0) {
      toast.error("لم يتم العثور على أخبار. تأكد من أن كل خبر يبدأ بـ #");
      return;
    }
    const mapped: ImportedPost[] = blocks.map((block, idx) => {
      const lines = block.split("\n");
      const titleRaw = lines[0]
        .replace(/^#+\s*/, "").replace(/\*\*/g, "").replace(/\*/g, "").trim();
      const bodyRaw = lines.slice(1).join(" ").replace(/\*\*/g, "").replace(/\*/g, "").trim();
      return makePost(titleRaw, bodyRaw, idx);
    });
    setPosts((prev) => [...prev, ...mapped]);
    toast.success(`تم تحليل ${mapped.length} خبر من النص`);
    setRawText("");
    setShowRawBox(false);
  };

  // ─── رفع ملف JSON ─────────────────────────────────────────────────────────
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (!Array.isArray(json)) { toast.error("يجب أن يكون الملف مصفوفة []"); return; }
      processJsonArray(json);
    } catch {
      toast.error("فشل قراءة ملف JSON");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ─── تحديث / حذف خبر ──────────────────────────────────────────────────────
  const updatePost = (key: string, patch: Partial<ImportedPost>) =>
    setPosts((prev) => prev.map((p) => (p._key === key ? { ...p, ...patch } : p)));

  const removePost = (key: string) =>
    setPosts((prev) => prev.filter((p) => p._key !== key));

  // ─── تقسيم تلقائي للملخص ──────────────────────────────────────────────────
  const autoSplitExcerpt = (key: string, sentences: number) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p._key !== key) return p;
        const fullContent = p.excerpt ? `${p.excerpt} ${p.content}`.trim() : p.content;
        const newExcerpt = extractExcerpt(fullContent, sentences);
        const newContent = stripExcerptFromContent(fullContent, newExcerpt);
        return {
          ...p,
          excerptSentences: sentences,
          excerpt: newExcerpt,
          content: newContent,
          meta_description: newExcerpt.substring(0, 160),
        };
      })
    );
  };

  // ─── رفع صورة ──────────────────────────────────────────────────────────────
  const handleImageUpload = async (key: string, file: File) => {
    updatePost(key, { uploading: true });
    try {
      let fileToUpload: Blob = file;
      let fileName: string;
      if (isOptimizableImage(file)) {
        toast.info(`جاري تحسين الصورة... (${formatFileSize(file.size)})`);
        const optimized = await optimizeImage(file);
        fileToUpload = optimized.blob;
        fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.webp`;
        toast.success(
          `تم ضغط الصورة: ${formatFileSize(optimized.originalSize)} → ${formatFileSize(optimized.optimizedSize)}`
        );
      } else {
        const ext = file.name.split(".").pop();
        fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${ext}`;
      }
      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(fileName, fileToUpload, {
          contentType: isOptimizableImage(file) ? "image/webp" : file.type,
        });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from("post-images")
        .getPublicUrl(fileName);
      updatePost(key, { featured_image: publicUrl, uploading: false });
      toast.success("تم رفع الصورة");
    } catch (err: any) {
      updatePost(key, { uploading: false });
      toast.error(`فشل رفع الصورة: ${err.message || ""}`);
    }
  };

  // ─── حساب وقت الجدولة ──────────────────────────────────────────────────────
  const buildScheduledAt = (index: number): string | null => {
    if (scheduleMode === "instant") return null;
    if (scheduleMode === "interval") {
      if (!intervalStart) return null;
      const start = new Date(intervalStart);
      start.setMinutes(start.getMinutes() + (parseInt(intervalMinutes) || 0) * index);
      return start.toISOString();
    }
    return null;
  };

  // ─── نشر خبر واحد ─────────────────────────────────────────────────────────
  const publishOne = async (post: ImportedPost, index: number): Promise<{ id: string; slug: string } | null> => {
    try {
      const wordCount = post.content.trim().split(/\s+/).filter(Boolean).length;
      const readingTime = Math.ceil(wordCount / 200);
      const keywords = extractSEOKeywords(post.title, post.content);

      let finalStatus: string = post.status;
      let finalScheduledAt: string | null = null;
      let createdAt: string = new Date().toISOString();

      if (scheduleMode === "instant") {
        finalStatus = "published";
        finalScheduledAt = null;
      } else if (scheduleMode === "interval") {
        const sched = buildScheduledAt(index);
        if (sched) {
          finalStatus = "scheduled";
          finalScheduledAt = sched;
          createdAt = sched;
        }
      } else if (scheduleMode === "custom") {
        if (post.scheduled_at) {
          finalStatus = "scheduled";
          finalScheduledAt = new Date(post.scheduled_at).toISOString();
          createdAt = finalScheduledAt;
        }
      }

      // حساب الموضع إذا حُدِّد
      if (post.sortPosition && !isNaN(parseInt(post.sortPosition))) {
        const position = parseInt(post.sortPosition);
        const { data: existingPosts } = await supabase
          .from("posts")
          .select("created_at")
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(position + 1);

        if (existingPosts && existingPosts.length > 0) {
          if (position === 1) {
            const latest = new Date(existingPosts[0].created_at);
            latest.setMinutes(latest.getMinutes() + 1);
            createdAt = latest.toISOString();
          } else if (existingPosts.length >= position) {
            const newer = new Date(existingPosts[position - 2].created_at);
            const older = new Date(existingPosts[position - 1].created_at);
            createdAt = new Date((newer.getTime() + older.getTime()) / 2).toISOString();
          } else {
            const oldest = new Date(existingPosts[existingPosts.length - 1].created_at);
            oldest.setMinutes(oldest.getMinutes() - 1);
            createdAt = oldest.toISOString();
          }
        }
      }

      const slug = post.slug || buildSlug(post.title);

      const { data: inserted, error } = await supabase.from("posts").insert({
        title: post.title,
        content: post.content,
        excerpt: post.excerpt || null,
        slug,
        category_id: post.category_id || null,
        status: finalStatus,
        scheduled_at: finalScheduledAt,
        published_at: finalStatus === "published" ? createdAt : null,
        created_at: createdAt,
        source_type: post.source,
        badge: post.badge || null,
        author_id: post.author_id || null,
        featured_image: post.featured_image || null,
        external_video_url: post.external_video_url || null,
        meta_title: post.meta_title || generateMetaTitle(post.title),
        meta_description: post.meta_description?.substring(0, 160) || null,
        meta_keywords: keywords.join(", ") || null,
        word_count: wordCount,
        reading_time: readingTime,
        views_count: 0,
        is_featured: post.is_featured || false,
        is_pinned: post.is_pinned || false,
      }).select("id, slug").single();

      if (error) throw error;
      return { id: inserted.id, slug: inserted.slug };
    } catch (err: any) {
      console.error(err);
      toast.error(`فشل نشر "${post.title.slice(0, 30)}": ${err.message || ""}`);
      return null;
    }
  };

  // ─── تحسين مشاهدات ─────────────────────────────────────────────────────────
  const seedViewsForPosts = async (publishedIds: string[]) => {
    if (!publishedIds.length) return;
    try {
      const { data: postsData } = await supabase
        .from("posts")
        .select("id, views_count, created_at")
        .in("id", publishedIds);
      if (!postsData || postsData.length === 0) return;
      const now = new Date();
      for (const p of postsData) {
        const current = p.views_count || 0;
        const diffMin = (now.getTime() - new Date(p.created_at).getTime()) / 60000;
        let final = 0;
        if (current < 150) {
          if (diffMin < 60) final = Math.floor(Math.random() * (388 - 150 + 1)) + 150;
          else if (diffMin < 300) final = Math.floor(Math.random() * (700 - 455 + 1)) + 455;
          else final = Math.floor(Math.random() * (1500 - 600 + 1)) + 600;
        } else {
          final = current + Math.floor(Math.random() * 50) + 10;
        }
        await supabase.from("posts").update({ views_count: final }).eq("id", p.id);
      }
      toast.success(`تم تحسين مشاهدات ${postsData.length} خبر`);
    } catch {
      toast.error("فشل تحسين المشاهدات");
    }
  };

  // ─── نشر الكل ──────────────────────────────────────────────────────────────
  const publishAll = async (withIndexing: boolean = false) => {
    if (!posts.length) return;
    if (scheduleMode === "interval" && !intervalStart) {
      toast.error("حدد وقت بداية الفارق الزمني");
      return;
    }
    setIsPublishing(true);
    setProgress(0);
    setResult(null);

    let success = 0;
    const remaining: ImportedPost[] = [];
    const publishedIds: string[] = [];
    const publishedUrls: string[] = [];

    for (let i = 0; i < posts.length; i++) {
      const res = await publishOne(posts[i], i);
      if (res) {
        success++;
        publishedIds.push(res.id);
        publishedUrls.push(`https://hasadalyoum.com/article/${res.slug}`);
      } else {
        remaining.push(posts[i]);
      }
      setProgress(Math.round(((i + 1) / posts.length) * 100));
    }

    setPosts(remaining);
    const resultData = { success, failed: posts.length - success };
    setResult(resultData);
    toast.success(`تم نشر ${success} من ${posts.length} خبر`);

    // تحسين المشاهدات تلقائياً
    if (autoSeedViews && publishedIds.length > 0) {
      await seedViewsForPosts(publishedIds);
    }

    // فهرسة Google
    if (publishedUrls.length > 0) {
      if (withIndexing) {
        try {
          await fetch("/api/ping-sitemap", { method: "GET" }).catch(() => {});
          await fetch(
            `https://www.google.com/ping?sitemap=${encodeURIComponent("https://hasadalyoum.com/sitemap.xml")}`,
            { mode: "no-cors" }
          );
          toast.success(`تم إرسال ${publishedUrls.length} رابط لـ Google فهرسة فورية`);
        } catch { /* silent */ }
      } else {
        fetch("/api/ping-sitemap", { method: "GET" }).catch(() => {});
      }
    }

    setIsPublishing(false);
    setProgress(0);
  };

  // ─── واجهة المستخدم ────────────────────────────────────────────────────────
  return (
    <div className="p-3 md:p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-4 shadow-sm" dir="rtl">
      {/* الترويسة */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-emerald-100 pb-3 gap-3">
        <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
          <FileJson className="h-4 w-4" /> استيراد أخبار من JSON
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 text-xs"
          >
            <FileJson className="ml-1 h-4 w-4" /> استيراد JSON
          </Button>
          <Button
            onClick={() => { setShowPasteBox((v) => !v); setShowRawBox(false); }}
            variant="outline"
            className="border-emerald-500 text-emerald-700 hover:bg-emerald-100 h-9 text-xs"
          >
            📋 لصق JSON
          </Button>
          <Button
            onClick={() => { setShowRawBox((v) => !v); setShowPasteBox(false); }}
            variant="outline"
            className="border-blue-400 text-blue-700 hover:bg-blue-50 h-9 text-xs"
          >
            📰 لصق نص أخبار
          </Button>
        </div>
      </div>

      {/* صندوق لصق JSON */}
      {showPasteBox && (
        <div className="bg-white border border-emerald-200 rounded-lg p-3 space-y-2">
          <Label className="text-xs font-bold text-emerald-800">الصق نص JSON هنا</Label>
          <Textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={`[{ "id": 1, "title": "عنوان الخبر", "content": "محتوى الخبر..." }]`}
            className="min-h-[120px] text-xs font-mono bg-slate-50 resize-y"
            dir="ltr"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { setShowPasteBox(false); setPasteText(""); }} className="h-8 text-xs">إلغاء</Button>
            <Button onClick={handlePasteJson} disabled={!pasteText.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs">
              ✓ تحليل وإضافة
            </Button>
          </div>
        </div>
      )}

      {/* صندوق لصق نص خام */}
      {showRawBox && (
        <div className="bg-white border border-blue-200 rounded-lg p-3 space-y-2">
          <Label className="text-xs font-bold text-blue-800">الصق نص الأخبار هنا</Label>
          <p className="text-[10px] text-blue-600">
            كل خبر يبدأ بـ <code className="bg-blue-50 px-1 rounded"># **العنوان**</code> ثم المحتوى في السطر التالي
          </p>
          <Textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={"# **عنوان الخبر**\nمحتوى الخبر الجملة الأولى تنتهي بنقطة. باقي المحتوى هنا..."}
            className="min-h-[150px] text-xs bg-slate-50 resize-y"
            dir="rtl"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { setShowRawBox(false); setRawText(""); }} className="h-8 text-xs">إلغاء</Button>
            <Button onClick={handleRawText} disabled={!rawText.trim()} className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs">
              ✓ تحليل وإضافة
            </Button>
          </div>
        </div>
      )}

      {/* نتيجة آخر استيراد */}
      {result && (
        <div className="text-sm bg-white border border-emerald-200 p-3 rounded-lg">
          ✓ نجاح: <b>{result.success}</b> &nbsp;—&nbsp; ✗ فشل: <b>{result.failed}</b>
        </div>
      )}

      {posts.length > 0 && (
        <>
          {/* خيارات الجدولة الجماعية */}
          <div className="bg-white rounded-lg p-3 border border-emerald-100 space-y-3">
            <Label className="text-xs font-bold text-emerald-900">خيارات الجدولة الجماعية</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {(["instant", "interval", "custom"] as const).map((mode) => (
                <Button
                  key={mode}
                  variant={scheduleMode === mode ? "default" : "outline"}
                  onClick={() => setScheduleMode(mode)}
                  className={scheduleMode === mode ? "bg-emerald-600 text-white h-9 text-xs" : "h-9 text-xs"}
                >
                  {mode === "instant" ? "نشر فوري" : mode === "interval" ? "فارق زمني ثابت" : "وقت محدد لكل خبر"}
                </Button>
              ))}
            </div>
            {scheduleMode === "interval" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
                <div className="space-y-1">
                  <Label className="text-[11px]">وقت البداية</Label>
                  <Input type="datetime-local" value={intervalStart} onChange={(e) => setIntervalStart(e.target.value)} className="h-9 bg-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">دقائق بين كل خبر</Label>
                  <Input type="number" value={intervalMinutes} onChange={(e) => setIntervalMinutes(e.target.value)} className="h-9 bg-white" />
                </div>
              </div>
            )}
          </div>

          {/* قائمة الأخبار */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {posts.map((post, idx) => (
              <Card key={post._key} className="border-emerald-200 shadow-sm">
                <CardContent className="p-3 space-y-3">
                  {/* رأس الكارت */}
                  <div className="flex items-center justify-between border-b pb-2 gap-2">
                    <span className="text-xs font-bold text-emerald-700">خبر #{idx + 1}</span>
                    <div className="flex items-center gap-2 flex-1 justify-end">
                      <div className="flex items-center gap-1.5">
                        <Label className="text-[10px] text-gray-500 whitespace-nowrap">الموضع #</Label>
                        <Input
                          type="number"
                          min={1}
                          placeholder="تلقائي"
                          value={post.sortPosition || ""}
                          onChange={(e) => updatePost(post._key, { sortPosition: e.target.value })}
                          className="h-7 w-20 text-xs bg-white text-center"
                        />
                      </div>
                      <Button size="sm" variant="destructive" onClick={() => removePost(post._key)} className="h-7 text-xs">
                        <Trash2 className="h-3 w-3 ml-1" /> حذف
                      </Button>
                    </div>
                  </div>

                  {/* محتوى الخبر */}
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold">العنوان</Label>
                      <Input
                        value={post.title}
                        onChange={(e) =>
                          updatePost(post._key, {
                            title: e.target.value,
                            slug: buildSlug(e.target.value),
                            meta_title: generateMetaTitle(e.target.value),
                          })
                        }
                        className="h-9 bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px]">المصدر</Label>
                        <Input value={post.source} onChange={(e) => updatePost(post._key, { source: e.target.value })} className="h-9 bg-white" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px]">الوسم (Badge)</Label>
                        <Select value={post.badge || "none"} onValueChange={(v) => updatePost(post._key, { badge: v === "none" ? "" : v })}>
                          <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="بدون وسم" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">بدون وسم</SelectItem>
                            {BADGES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* الملخص */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-[11px]">الملخص (Excerpt)</Label>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min={1}
                            value={post.excerptSentences}
                            onChange={(e) => updatePost(post._key, { excerptSentences: parseInt(e.target.value) || 1 })}
                            className="h-7 w-14 bg-white text-xs"
                          />
                          <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => autoSplitExcerpt(post._key, post.excerptSentences)}>
                            <Wand2 className="h-3 w-3 ml-1" /> تقسيم تلقائي
                          </Button>
                        </div>
                      </div>
                      <Textarea
                        value={post.excerpt}
                        onChange={(e) => updatePost(post._key, { excerpt: e.target.value, meta_description: e.target.value.substring(0, 160) })}
                        className="bg-white min-h-[60px] text-sm"
                      />
                    </div>

                    {/* المحتوى */}
                    <div className="space-y-1">
                      <Label className="text-[11px]">المحتوى</Label>
                      <Textarea
                        value={post.content}
                        onChange={(e) => {
                          const val = e.target.value;
                          const last2 = val.slice(-2);
                          if (/[.؟!?]\s$/.test(last2)) {
                            updatePost(post._key, { content: val.trimEnd() + "\n" });
                          } else {
                            updatePost(post._key, { content: val });
                          }
                        }}
                        className="bg-white min-h-[150px] text-sm"
                      />
                    </div>
                  </div>

                  {/* إعدادات النشر */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2 border-t">
                    <div className="space-y-1">
                      <Label className="text-[11px]">التصنيف</Label>
                      <Select value={post.category_id || "none"} onValueChange={(v) => updatePost(post._key, { category_id: v === "none" ? "" : v })}>
                        <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="اختر تصنيفاً" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">بدون تصنيف</SelectItem>
                          {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">الحالة</Label>
                      <Select value={post.status} onValueChange={(v: any) => updatePost(post._key, { status: v })}>
                        <SelectTrigger className="h-9 bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="published">نشر فوري</SelectItem>
                          <SelectItem value="draft">مسودة</SelectItem>
                          <SelectItem value="scheduled">مجدول</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">الكاتب</Label>
                      <Select
                        value={post.author_id || "none"}
                        onValueChange={(v) => updatePost(post._key, { author_id: v === "none" ? "" : v })}
                      >
                        <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="المحرر" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">المحرر</SelectItem>
                          {authors.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {(post.status === "scheduled" || scheduleMode === "custom") && (
                    <div className="space-y-1">
                      <Label className="text-[11px]">وقت الجدولة</Label>
                      <Input type="datetime-local" value={post.scheduled_at} onChange={(e) => updatePost(post._key, { scheduled_at: e.target.value })} className="h-9 bg-white" />
                    </div>
                  )}

                  {/* الوسائط */}
                  <div className="space-y-2 pt-2 border-t">
                    <Label className="text-[11px] font-bold">الوسائط</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="رابط الصورة"
                        value={post.featured_image}
                        onChange={(e) => updatePost(post._key, { featured_image: e.target.value })}
                        className="h-9 bg-white flex-1"
                      />
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleImageUpload(post._key, f);
                            e.target.value = "";
                          }}
                        />
                        <Button asChild size="sm" variant="outline" className="h-9" disabled={post.uploading}>
                          <span>
                            {post.uploading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <><Upload className="h-3 w-3 ml-1" /> رفع</>
                            )}
                          </span>
                        </Button>
                      </label>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 text-blue-600 border-blue-300 hover:bg-blue-50 whitespace-nowrap"
                        onClick={() =>
                          window.open(
                            `https://www.google.com/search?q=${encodeURIComponent(post.title)}&tbm=isch`,
                            "_blank"
                          )
                        }
                        title="بحث عن صورة في Google"
                      >
                        🔍 صورة
                      </Button>
                    </div>
                    {post.featured_image && (
                      <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                        <ImageIcon className="h-4 w-4 text-slate-500" />
                        <span className="text-[10px] truncate flex-1">{post.featured_image}</span>
                      </div>
                    )}
                    <Input
                      placeholder="رابط فيديو خارجي (YouTube...)"
                      value={post.external_video_url}
                      onChange={(e) => updatePost(post._key, { external_video_url: e.target.value })}
                      className="h-9 bg-white"
                    />
                  </div>

                  {/* إعدادات SEO */}
                  <div className="space-y-2 pt-2 border-t">
                    <Label className="text-[11px] font-bold">إعدادات SEO</Label>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Meta Title (60 حرف)</Label>
                      <Input
                        value={post.meta_title}
                        maxLength={70}
                        onChange={(e) => updatePost(post._key, { meta_title: e.target.value })}
                        className="h-9 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Meta Description (160 حرف)</Label>
                      <Textarea
                        value={post.meta_description}
                        maxLength={160}
                        onChange={(e) => updatePost(post._key, { meta_description: e.target.value })}
                        className="bg-white min-h-[50px] text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Slug</Label>
                      <Input
                        value={post.slug}
                        onChange={(e) => updatePost(post._key, { slug: e.target.value })}
                        className="h-9 bg-white text-xs"
                        dir="ltr"
                      />
                    </div>
                    <div className="flex items-center gap-4 pt-1 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`pin-${post._key}`}
                          checked={post.is_pinned}
                          onCheckedChange={(c) => updatePost(post._key, { is_pinned: !!c })}
                        />
                        <Label htmlFor={`pin-${post._key}`} className="text-[11px] cursor-pointer">تثبيت في الأكثر قراءة</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`feat-${post._key}`}
                          checked={post.is_featured}
                          onCheckedChange={(c) => updatePost(post._key, { is_featured: !!c })}
                        />
                        <Label htmlFor={`feat-${post._key}`} className="text-[11px] cursor-pointer">خبر مميز (السلايدر)</Label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {isPublishing && <Progress value={progress} className="h-1" />}

          {/* تحسين المشاهدات */}
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <Checkbox
              id="auto-seed-views"
              checked={autoSeedViews}
              onCheckedChange={(c) => setAutoSeedViews(!!c)}
            />
            <Label htmlFor="auto-seed-views" className="text-xs cursor-pointer text-amber-800 font-medium">
              تحسين المشاهدات تلقائياً بعد النشر
            </Label>
          </div>

          {/* أزرار النشر */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
            <Button
              onClick={() => publishAll(false)}
              disabled={isPublishing || posts.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 font-bold"
            >
              {isPublishing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <><Send className="h-4 w-4 ml-2" /> نشر الكل ({posts.length})</>
              )}
            </Button>
            <Button
              onClick={() => publishAll(true)}
              disabled={isPublishing || posts.length === 0}
              className="bg-orange-600 hover:bg-orange-700 text-white h-10 font-bold"
            >
              {isPublishing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <><Radio className="h-4 w-4 ml-2" /> نشر + فهرسة فورية</>
              )}
            </Button>
          </div>
        </>
      )}

      {posts.length === 0 && (
        <div className="text-center text-xs text-emerald-700 py-6">
          الصيغة المطلوبة: مصفوفة JSON تحوي كائنات بحقول{" "}
          <code dir="ltr" className="bg-white px-2 py-1 rounded">
            {`[{ "id": 1, "title": "...", "content": "..." }]`}
          </code>
        </div>
      )}
    </div>
  );
};

export default JsonNewsImporter;
