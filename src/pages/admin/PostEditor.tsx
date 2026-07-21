import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, ArrowRight, Image as ImageIcon, Video, Clock, FileText, AlertTriangle, Sparkles, Eraser, Eye } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { useAuthors } from "@/hooks/useAuthors";
import { useAuth } from "@/hooks/useAuth";
import { translateError } from "@/lib/errorTranslator";
import { optimizeImage, isOptimizableImage, formatFileSize } from "@/lib/imageOptimizer";
import { applyWatermark, generateWatermarkPreview } from "@/lib/imageWatermark";
import { applyHeadlineDesign, generateHeadlineDesignPreview } from "@/lib/imageHeadlineDesign";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { generateMetaTitle, generateSEOSlug, extractSEOKeywords, pingSearchEngines } from "@/lib/seoHelpers";
import { getPostUrl, SITE_URL } from "@/lib/postUrl";

// ── InternalLinkingSuggestions (inline) ──────────────────────────────────────
import { useQuery as useQueryIL } from "@tanstack/react-query";
import { Link2, ExternalLink, Copy, Check, FileInput } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const STOP_WORDS = new Set([
  'في','من','على','إلى','عن','مع','هذا','هذه','التي','الذي','أن','كان','بين',
  'ما','لم','قد','بعد','قبل','أو','و','ال','إن','لا','إذا','كل','ذلك','أي',
  'هو','هي','نحن','هم','أنت','لكن','حتى','عند','كما','ثم','أما','منذ','خلال',
  'ضد','نحو','بل','لو','إذ','مثل','تلك','هناك','أيضا','أيضاً','فقط','لأن'
]);

function extractKeywords(text: string): string[] {
  const words = text
    .replace(/[^\u0621-\u064A\u0660-\u0669a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
  return [...new Set(words)];
}

function calcRelevance(keywords: string[], post: any): number {
  let score = 0;
  const postText = `${post.title} ${post.excerpt || ''} ${post.content?.substring(0, 500) || ''}`.toLowerCase();
  const postKw = new Set(extractKeywords(postText));
  for (const kw of keywords) {
    if (postKw.has(kw.toLowerCase())) score += 2;
    if (post.title.includes(kw)) score += 5;
  }
  return score;
}

function generateReadAlsoBlock(links: Array<{ title: string; url: string }>): string {
  if (!links.length) return '';
  const linksHtml = links.map(l => `<a href="${l.url}">${l.title}</a>`).join('\n  ');
  return `<div class="read-also-box">\n  <strong>اقرأ أيضاً:</strong>\n  ${linksHtml}\n</div>`;
}

function InternalLinkingSuggestions({ title, content, currentPostId, onInsertToEditor }: {
  title: string; content: string; currentPostId?: string;
  onInsertToEditor?: (html: string) => void;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [debouncedKw, setDebouncedKw] = useState<string[]>([]);

  const keywords = extractKeywords(`${title} ${content}`);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedKw(keywords), 500);
    return () => clearTimeout(t);
  }, [title, content]);

  const { data: suggestions = [], isLoading } = useQueryIL({
    queryKey: ['il-suggestions', debouncedKw.slice(0, 10).join(',')],
    queryFn: async () => {
      if (!debouncedKw.length) return [];
      const { data } = await supabase
        .from('posts').select('id,title,slug,excerpt,content,category_id,created_at')
        .eq('status', 'published').order('created_at', { ascending: false }).limit(100);
      return (data || [])
        .filter((p: any) => p.id !== currentPostId)
        .map((p: any) => ({ ...p, score: calcRelevance(debouncedKw, p) }))
        .filter((p: any) => p.score > 3)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 8);
    },
    enabled: debouncedKw.length > 0,
    staleTime: 30000,
  });

  const getUrl = (post: any) => getPostUrl(post.slug || '', post.created_at || post.published_at || new Date().toISOString());

  const handleCopy = async (post: any) => {
    const link = `<a href="${getUrl(post)}">${post.title}</a>`;
    try { await navigator.clipboard.writeText(link); setCopiedId(post.id); toast.success("تم نسخ الرابط"); setTimeout(() => setCopiedId(null), 2000); }
    catch { toast.error("فشل نسخ الرابط"); }
  };

  const toggle = (id: string) => setSelected(prev => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s;
  });

  const insertSelected = () => {
    const links = suggestions.filter((p: any) => selected.has(p.id)).map((p: any) => ({ title: p.title, url: getUrl(p) }));
    if (!links.length) { toast.error("يرجى اختيار رابط واحد على الأقل"); return; }
    const html = generateReadAlsoBlock(links);
    if (onInsertToEditor) { onInsertToEditor(html); toast.success(`تم إدراج ${links.length} روابط`); setSelected(new Set()); }
    else { navigator.clipboard.writeText(html); toast.success(`تم نسخ ${links.length} روابط`); setSelected(new Set()); }
  };

  if (!title && !content) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Link2 className="h-4 w-4 text-primary" />
            اقتراحات الروابط الداخلية (اقرأ أيضاً)
          </CardTitle>
          {suggestions.length > 0 && (
            <Button type="button" variant="ghost" size="sm" className="text-xs h-7"
              onClick={() => setSelected(selected.size === suggestions.length ? new Set() : new Set(suggestions.map((p: any) => p.id)))}>
              {selected.size === suggestions.length ? 'إلغاء الكل' : 'تحديد الكل'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="mr-2 text-sm text-muted-foreground">جاري البحث...</span>
          </div>
        ) : suggestions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            {keywords.length === 0 ? "ابدأ بكتابة العنوان والمحتوى للحصول على اقتراحات" : "لم يتم العثور على مقالات ذات صلة"}
          </p>
        ) : (
          <div className="space-y-2">
            {suggestions.map((post: any) => (
              <div key={post.id} className={`flex items-start gap-2 p-2 rounded-md bg-background border transition-all ${selected.has(post.id) ? 'border-primary bg-primary/5 shadow-sm' : 'hover:border-primary/50'}`}>
                <Checkbox checked={selected.has(post.id)} onCheckedChange={() => toggle(post.id)} className="mt-1" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{post.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">تطابق: {post.score}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopy(post)}>
                    {copiedId === post.id ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(getUrl(post), '_blank')}>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {selected.size > 0 && (
              <div className="pt-3 border-t mt-3">
                <Button type="button" onClick={insertSelected} className="w-full bg-primary hover:bg-primary/90" size="sm">
                  <FileInput className="h-4 w-4 ml-2" />
                  {onInsertToEditor ? `إدراج ${selected.size} روابط في المحتوى` : `نسخ ${selected.size} روابط كـ "اقرأ أيضاً"`}
                </Button>
              </div>
            )}
            <div className="pt-2 text-xs text-muted-foreground space-y-1">
              <p>💡 حدد عدة روابط ثم اضغط الزر لإدراجها مباشرة في المحتوى</p>
              <p>📋 سيتم إدراج صندوق "اقرأ أيضاً" احترافي بتنسيق جاهز</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

const OPENING_PHRASES = [
  "كشفت مصادر مطلعة أن...",
  "علمت حصاد اليوم من مصادر خاصة أن...",
  "أفادت تقارير موثوقة بأن...",
  "تشير المعطيات المتوفرة إلى أن...",
  "في سياق متصل، أكدت مصادر أن...",
];

const DRAFT_KEY = "hasad_draft_new";

function formatParagraphs(text: string): string {
  if (!text) return text;
  return text
    .replace(/([.؟!])\s*/g, "$1\n")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .join("\n");
}

const PostEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, userRole } = useAuth();
  const { data: siteSettings } = useSiteSettings();
  const watermarkLogoUrl = siteSettings?.watermark_logo_url;

  const isNew = !id || id === "new";
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [enableWatermark, setEnableWatermark] = useState(false);
  const [watermarkPreview, setWatermarkPreview] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  // نوع العلامة: 'corner' = شعار صغير بالزاوية (القديم) — 'headline' = شريط
  // العنوان السفلي (شعار + اسم الموقع + عنوان الخبر)، نفس تصميم البوت التلقائي
  const [watermarkStyle, setWatermarkStyle] = useState<'corner' | 'headline'>('headline');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [splitCount, setSplitCount] = useState(2);
  const [preSplitContent, setPreSplitContent] = useState<{ content: string; excerpt: string } | null>(null);
  const [showSeoPreview, setShowSeoPreview] = useState(false);
  const [autoSeedViewsOnPublish, setAutoSeedViewsOnPublish] = useState(false);
  const lastAutoSaveRef = useRef<number>(0);
  const draftRestoreCheckedRef = useRef(false);

  // ─── تتبع ما إذا كان النشر جديداً (من draft/scheduled → published) ──────────
  const prevStatusRef = useRef<string | null>(null);

  const { data: categories } = useCategories();
  const { data: authors } = useAuthors();

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    featured_image: "",
    gallery_images: [] as string[],
    category_id: "",
    author_id: "",
    status: "draft" as "draft" | "published" | "scheduled" | "hidden" | "under_review",
    is_featured: false,
    is_breaking: false,
    source_type: "حصاد اليوم | خاص",
    external_video_url: "",
    meta_title: "",
    meta_description: "",
    meta_keywords: "",
    scheduled_at: "",
    hide_after: "",
    badge: "انفراد",
    is_pinned: false,
    pinned_order: null as number | null,
    publication_date: "",
  });

  const { data: post, isLoading: postLoading } = useQuery({
    queryKey: ["post", id],
    queryFn: async () => {
      if (isNew) return null;
      const { data, error } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
  });

  useEffect(() => {
    if (post) {
      const d = new Date(post.created_at || "");
      const tzOff = d.getTimezoneOffset() * 60000;
      const localDate = new Date(d.getTime() - tzOff).toISOString().slice(0, 16);
      // حفظ الحالة السابقة للخبر قبل أي تعديل
      prevStatusRef.current = post.status || "draft";
      setFormData({
        title: post.title || "",
        slug: post.slug || "",
        excerpt: post.excerpt || "",
        content: post.content || "",
        featured_image: post.featured_image || "",
        gallery_images: (post as any).gallery_images || [],
        category_id: post.category_id || "",
        author_id: post.author_id || "",
        status: post.status || "draft",
        is_featured: post.is_featured || false,
        is_breaking: post.is_breaking || false,
        source_type: post.source_type || "حصاد اليوم | خاص",
        external_video_url: post.external_video_url || "",
        meta_title: post.meta_title || "",
        meta_description: post.meta_description || "",
        meta_keywords: post.meta_keywords || "",
        scheduled_at: post.scheduled_at ? post.scheduled_at.slice(0, 16) : "",
        hide_after: post.hide_after ? post.hide_after.slice(0, 16) : "",
        badge: (post as any).badge || "انفراد",
        is_pinned: (post as any).is_pinned || false,
        pinned_order: (post as any).pinned_order ?? null,
        publication_date: localDate,
      });
    }
  }, [post]);

  useEffect(() => {
    if (!isNew || draftRestoreCheckedRef.current) return;
    draftRestoreCheckedRef.current = true;
    const stored = localStorage.getItem(DRAFT_KEY);
    if (stored) {
      toast("وُجدت مسودة محفوظة، هل تريد استعادتها؟", {
        action: { label: "نعم", onClick: () => { try { setFormData((p) => ({ ...p, ...JSON.parse(stored) })); toast.success("تم استعادة المسودة"); } catch { } } },
        cancel: { label: "لا", onClick: () => localStorage.removeItem(DRAFT_KEY) },
        duration: 10000,
      });
    } else {
      const phrase = OPENING_PHRASES[Math.floor(Math.random() * OPENING_PHRASES.length)];
      setFormData((p) => ({ ...p, content: phrase + " " }));
    }
  }, [isNew]);

  useEffect(() => {
    if (!isNew) return;
    if (!formData.title && !formData.content) return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
  }, [formData, isNew]);

  // فحص تكرار العنوان مع debounce
  useEffect(() => {
    if (!formData.title) { setDuplicateWarning(null); return; }
    setIsCheckingDuplicate(true);
    const t = setTimeout(async () => {
      let q = supabase.from("posts").select("id").or(`title.eq.${formData.title},slug.eq.${formData.slug}`).limit(1);
      if (!isNew && id) q = q.neq("id", id);
      const { data } = await q;
      setIsCheckingDuplicate(false);
      setDuplicateWarning(data && data.length > 0 ? "⚠️ يوجد خبر آخر بنفس العنوان أو الرابط" : null);
    }, 500);
    return () => clearTimeout(t);
  }, [formData.title, formData.slug, isNew, id]);

  const generateSlug = (title: string) =>
    title.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\u0600-\u06FFa-z0-9-]/g, "").slice(0, 100);

  const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
  const estimateReadingTime = (text: string) => Math.ceil(countWords(text) / 200);

  const generateKeywords = (title: string, content: string) => {
    const text = `${title} ${content}`.replace(/<[^>]*>/g, "");
    const words = text.split(/\s+/).filter(w => w.length > 3);
    const wc: Record<string, number> = {};
    words.forEach(w => { const c = w.replace(/[^\u0600-\u06FFa-zA-Z]/g, ""); if (c.length > 3) wc[c] = (wc[c] || 0) + 1; });
    return Object.entries(wc).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([w]) => w).join(", ");
  };

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev, title,
      slug: prev.slug || generateSEOSlug(title),
      meta_title: prev.meta_title || generateMetaTitle(title),
    }));
  };

  const handleContentChange = (content: string) => {
    const excerpt = content.replace(/<[^>]*>/g, "").slice(0, 200);
    const keywords = generateKeywords(formData.title, content);
    setFormData(prev => ({
      ...prev, content,
      excerpt: prev.excerpt || excerpt,
      meta_description: prev.meta_description || excerpt.slice(0, 160),
      meta_keywords: prev.meta_keywords || keywords,
    }));
  };

  const handleContentPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    const formatted = formatParagraphs(pasted);
    const ta = e.currentTarget;
    const before = formData.content.slice(0, ta.selectionStart);
    const after = formData.content.slice(ta.selectionEnd);
    handleContentChange(before + formatted + after);
  };

  const handleContentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ([".", "!", "؟", "?"].includes(e.key)) {
      const ta = e.currentTarget;
      const pos = ta.selectionStart;
      setTimeout(() => {
        const v = ta.value;
        if (v[pos - 1] && [".", "!", "؟", "?"].includes(v[pos - 1]) && v[pos] !== "\n") {
          const updated = v.slice(0, pos) + "\n" + v.slice(pos);
          handleContentChange(updated);
          requestAnimationFrame(() => ta.setSelectionRange(pos + 1, pos + 1));
        }
      }, 0);
    }
  };

  const handleFormatParagraphs = () => {
    handleContentChange(formatParagraphs(formData.content).replace(/\n/g, "\n\n"));
    toast.success("تم تنسيق الفقرات");
  };

  const handleAutoSplitExcerpt = () => {
    const content = formData.content.replace(/<[^>]*>/g, "").trim();
    if (!content) { toast.error("أدخل محتوى الخبر أولاً"); return; }
    setPreSplitContent({ content: formData.content, excerpt: formData.excerpt });
    const sentenceRegex = /[^.。]*[.。]/g;
    const sentences: string[] = [];
    let match;
    while ((match = sentenceRegex.exec(content)) !== null && sentences.length < splitCount) {
      sentences.push(match[0].trim());
    }
    if (sentences.length > 0) {
      const excerpt = sentences.join(" ").trim();
      let bodyStart = 0;
      for (const s of sentences) { const idx = content.indexOf(s, bodyStart); bodyStart = idx + s.length; }
      const body = content.substring(bodyStart).trim();
      setFormData(p => ({ ...p, excerpt, content: body }));
      toast.success(`تم استخراج ${sentences.length} جملة كملخص`);
    } else {
      toast.error("لم يتم العثور على جملة كاملة تنتهي بنقطة");
    }
  };

  // ينتج معاينة الصورة حسب الأسلوب المختار (شعار بالزاوية أو شريط العنوان)
  const buildWatermarkPreview = async (imageUrl: string): Promise<string> => {
    if (watermarkStyle === 'headline') {
      const headlineText = (formData.title || '').trim();
      if (!headlineText) {
        throw new Error('أدخل عنوان الخبر أولاً لتوليد شريط العنوان');
      }
      return generateHeadlineDesignPreview(imageUrl, watermarkLogoUrl, headlineText);
    }
    return generateWatermarkPreview(imageUrl, watermarkLogoUrl);
  };

  // Watermark preview
  const handleWatermarkToggle = async (checked: boolean) => {
    setEnableWatermark(checked);
    if (checked && formData.featured_image && watermarkLogoUrl) {
      setIsGeneratingPreview(true);
      try {
        const preview = await buildWatermarkPreview(formData.featured_image);
        setWatermarkPreview(preview);
      } catch (error: any) {
        toast.error(error?.message || "فشل في إنشاء معاينة العلامة المائية");
        setEnableWatermark(false);
      } finally { setIsGeneratingPreview(false); }
    } else { setWatermarkPreview(null); }
  };

  // Regenerate preview when image changes while watermark is enabled
  const regenerateWatermarkPreview = async (imageUrl: string) => {
    if (enableWatermark && imageUrl && watermarkLogoUrl) {
      setIsGeneratingPreview(true);
      try {
        const preview = await buildWatermarkPreview(imageUrl);
        setWatermarkPreview(preview);
      } catch (error) {
        console.error('Failed to regenerate watermark preview:', error);
      } finally { setIsGeneratingPreview(false); }
    }
  };

  // إعادة توليد معاينة شريط العنوان تلقائياً عند تعديل عنوان الخبر (بعد
  // توقف الكتابة بثانية واحدة) — لأن التصميم يعتمد على نص العنوان مباشرة
  useEffect(() => {
    if (!enableWatermark || watermarkStyle !== 'headline' || !formData.featured_image) return;
    const timeout = setTimeout(() => {
      regenerateWatermarkPreview(formData.featured_image);
    }, 1000);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.title, watermarkStyle, enableWatermark]);

  const isValidUUID = (str?: string) =>
    !!str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

  // seedViews
  const seedViewsForPost = async (postId: string) => {
    try {
      const { data: p } = await supabase.from("posts").select("id,views_count,created_at,category:categories(name)").eq("id", postId).single();
      if (!p) return;
      const now = new Date();
      const current = p.views_count || 0;
      const diffMin = (now.getTime() - new Date(p.created_at).getTime()) / (1000 * 60);
      const isNewsReports = (p.category as any)?.name === "أخبار وتقارير";
      let final = 0;
      if (isNewsReports) {
        // المنطق الأصلي: يُطبّق فقط على قسم "أخبار وتقارير"
        if (current < 150) {
          if (diffMin < 60) final = Math.floor(Math.random() * (388 - 150 + 1)) + 150;
          else if (diffMin < 300) final = Math.floor(Math.random() * (700 - 455 + 1)) + 455;
          else final = Math.floor(Math.random() * (1500 - 600 + 1)) + 600;
        } else { final = current + Math.floor(Math.random() * 50) + 10; }
      } else {
        // نفس بنية المنطق (تقسيم زمني ثلاثي) لكن بنطاقات مصغّرة ضمن 126-683 لباقي الأقسام
        if (current < 126) {
          if (diffMin < 60) final = Math.floor(Math.random() * (250 - 126 + 1)) + 126;
          else if (diffMin < 300) final = Math.floor(Math.random() * (450 - 251 + 1)) + 251;
          else final = Math.floor(Math.random() * (683 - 451 + 1)) + 451;
        } else { final = Math.min(683, current + Math.floor(Math.random() * 21) + 5); }
      }
      await supabase.from("posts").update({ views_count: final }).eq("id", postId);
      toast.success(`تم تحسين المشاهدات (${final})`);
    } catch { toast.error("فشل تحسين المشاهدات"); }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!isNew && !isValidUUID(id)) throw new Error("معرف الخبر غير صالح");

      // تحديد ما إذا كان هذا نشراً جديداً (من غير منشور → منشور)
      const isNewPublish =
        formData.status === "published" &&
        (isNew || (prevStatusRef.current !== null && prevStatusRef.current !== "published"));

      const wordCount = countWords(formData.content);
      const readingTime = estimateReadingTime(formData.content);
      const { publication_date, ...rest } = formData;

      // العلامة المائية: رفع صورة منفصلة عند الحفظ وحفظ URL الجديد
      let finalImageUrl = rest.featured_image;
      if (enableWatermark && rest.featured_image && watermarkLogoUrl) {
        const usingHeadline = watermarkStyle === 'headline';
        try {
          toast.info(usingHeadline ? "جاري تصميم صورة الخبر بشريط العنوان..." : "جاري إنشاء صورة المشاركة مع العلامة المائية...");
          const wm = usingHeadline
            ? await applyHeadlineDesign(rest.featured_image, watermarkLogoUrl, (rest.title || '').trim())
            : await applyWatermark(rest.featured_image, watermarkLogoUrl);
          const wmFileName = `og-${Math.random().toString(36).substring(2)}-${Date.now()}.webp`;
          const { error: wmErr } = await supabase.storage.from("post-images").upload(wmFileName, wm.blob, { contentType: "image/webp" });
          if (!wmErr) {
            const { data: wmUrl } = supabase.storage.from("post-images").getPublicUrl(wmFileName);
            finalImageUrl = wmUrl.publicUrl;
            toast.success(usingHeadline ? "تم تصميم صورة الخبر بنجاح" : "تم إنشاء صورة المشاركة بنجاح");
          } else {
            toast.error("فشل رفع صورة العلامة المائية، سيتم استخدام الصورة الأصلية");
          }
        } catch {
          toast.error("فشل إنشاء العلامة المائية، سيتم استخدام الصورة الأصلية");
        }
      }

      const postData: any = {
        ...rest,
        featured_image: finalImageUrl,
        meta_title: rest.meta_title || rest.title.slice(0, 60),
        meta_description: rest.meta_description || rest.excerpt || rest.content.replace(/<[^>]*>/g, "").slice(0, 160),
        meta_keywords: rest.meta_keywords || generateKeywords(rest.title, rest.content),
        word_count: wordCount,
        reading_time: readingTime,
        published_at: formData.status === "published" ? new Date().toISOString() : null,
        scheduled_at: formData.scheduled_at || null,
        hide_after: formData.hide_after || null,
        category_id: isValidUUID(formData.category_id) ? formData.category_id : null,
        author_id: isValidUUID(formData.author_id) ? formData.author_id : null,
        pinned_order: formData.is_pinned ? formData.pinned_order : null,
      };

      // publication_date → created_at (يدوي)
      if (publication_date) {
        if (isNew) {
          postData.created_at = new Date(publication_date).toISOString();
        } else {
          const original = post?.created_at
            ? (() => { const d = new Date(post.created_at); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); })()
            : null;
          if (!original || publication_date !== original) {
            postData.created_at = new Date(publication_date).toISOString();
          }
        }
      }

      let postId: string | undefined;
      if (isNew) {
        const { data: newPost, error } = await supabase.from("posts").insert({ ...postData, user_id: user?.id || null }).select().single();
        if (error) throw error;
        postId = newPost.id;
      } else {
        const { error } = await supabase.from("posts").update(postData).eq("id", id);
        if (error) throw error;
        postId = id;
      }

      if (formData.status === "published") {
        try { fetch(`https://www.google.com/ping?sitemap=${SITE_URL}/sitemap.xml`, { mode: "no-cors" }); } catch { }
      }

      return { postId, isNewPublish, slug: postData.slug || formData.slug };
    },
    onSuccess: async (result) => {
      const postId = result?.postId;
      const isNewPublish = result?.isNewPublish;
      const slug = result?.slug;

      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      toast.success(isNew ? "تم إنشاء الخبر بنجاح" : "تم حفظ التغييرات");
      if (isNew) localStorage.removeItem(DRAFT_KEY);

      // تحسين المشاهدات تلقائياً
      if (autoSeedViewsOnPublish && postId && formData.status === "published") {
        await seedViewsForPost(postId);
      }

      // فهرسة Google عند أي نشر جديد (من draft/scheduled → published) — نفس منطق الجنوب فويس حرفياً
      if (isNewPublish && slug) {
        const postUrl = getPostUrl(slug, new Date().toISOString());

        // Ping sitemap لـ Google و Bing في الخلفية
        pingSearchEngines(`${SITE_URL}/sitemap.xml`)
          .then((res) => console.log("Ping results:", res))
          .catch((err) => console.error("Ping failed:", err));

        // Log the final URL being sent to Google for verification
        console.log('🔗 URL being sent to Google Indexing API:', postUrl);
        toast.info(`جاري إرسال الرابط: ${postUrl}`);

        try {
          // Call Google Indexing API via edge function
          const { data, error } = await supabase.functions.invoke('google-indexing', {
            body: { urls: [postUrl], type: 'URL_UPDATED' }
          });

          // Check for edge function invocation error
          if (error) {
            console.error('Google Indexing API invocation error:', error);
            console.error('Failed URL:', postUrl);
            toast.error('تم نشر الخبر، لكن فشل الاتصال بـ Google Indexing API. تحقق من إعداد مفتاح الخدمة.');
          } else if (data?.error) {
            // Check for API-level error in response
            console.error('Google Indexing API returned error:', data.error);
            console.error('Failed URL:', postUrl);
            toast.error(`تم نشر الخبر، لكن فشلت الفهرسة: ${data.error}`);
          } else {
            // Check if indexing was actually successful
            const indexingResult = data?.results?.[0];
            if (indexingResult?.success === true) {
              toast.success('تم نشر الخبر وإرسال طلب الفهرسة إلى Google بنجاح!');
              console.log('✅ Indexing successful for URL:', postUrl);
              console.log('Indexing response:', indexingResult);
            } else if (indexingResult?.success === false) {
              // API returned but indexing failed
              const errorDetails = indexingResult?.data?.error?.message || indexingResult?.error || 'خطأ غير معروف';
              console.error('❌ Indexing failed for URL:', postUrl);
              console.error('Error details:', indexingResult);
              toast.error(`تم نشر الخبر، لكن فشلت الفهرسة: ${errorDetails}`);
            } else {
              // Unexpected response structure
              console.warn('⚠️ Unexpected indexing response for URL:', postUrl);
              console.warn('Response:', data);
              toast.warning('تم نشر الخبر. حالة الفهرسة غير مؤكدة.');
            }
          }
        } catch (error) {
          // Network/other error
          console.error('Publish with indexing error:', error);
        }
      }

      navigate("/admin/posts");
    },
    onError: (error: any) => { toast.error(translateError(error)); },
  });

  // حفظ تلقائي كل 30 ثانية
  useEffect(() => {
    if (!isNew) return;
    const interval = setInterval(async () => {
      if (formData.status !== "draft" || !formData.title.trim()) return;
      if (Date.now() - lastAutoSaveRef.current < 25000) return;
      lastAutoSaveRef.current = Date.now();
      try {
        await supabase.from("posts").insert({ title: formData.title, slug: formData.slug || `auto-${Date.now()}`, content: formData.content, excerpt: formData.excerpt, status: "draft", user_id: user?.id || null });
        toast.success("تم الحفظ التلقائي", { duration: 1500 });
      } catch { }
    }, 30000);
    return () => clearInterval(interval);
  }, [isNew, formData, user]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      let fileToUpload: Blob = file;
      let fileName: string;
      let contentType = file.type;
      if (isOptimizableImage(file)) {
        toast.info(`جاري تحسين الصورة... (${formatFileSize(file.size)})`);
        const optimized = await optimizeImage(file);
        fileToUpload = optimized.blob; contentType = "image/webp"; fileName = `${Date.now()}.webp`;
        toast.success(`تم ضغط الصورة: ${formatFileSize(optimized.originalSize)} ← ${formatFileSize(optimized.optimizedSize)}`);
      } else { fileName = `${Date.now()}.${file.name.split(".").pop()}`; }

      // ⚠️ لا تُطبَّق العلامة/شريط العنوان هنا وقت الرفع — تُطبَّق مرة واحدة فقط
      // عند الحفظ النهائي (saveMutation) لتفادي تكرار العلامة على نفس الصورة.
      // هنا فقط نرفع الصورة الأصلية (أو المضغوطة)، ونحدّث معاينة العلامة إن كانت مفعّلة.

      const { error: uploadError } = await supabase.storage.from("post-images").upload(fileName, fileToUpload, { contentType });
      if (uploadError) { toast.error(translateError(uploadError)); return; }
      const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, featured_image: urlData.publicUrl }));
      if (enableWatermark) regenerateWatermarkPreview(urlData.publicUrl);
      toast.success("تم رفع الصورة بنجاح");
    } catch (error: any) { toast.error(translateError(error)); }
    finally { setIsUploadingImage(false); }
  };

  const [isUploadingGallery, setIsUploadingGallery] = useState(false);

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setIsUploadingGallery(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        let fileToUpload: Blob = file;
        let fileName: string;
        let contentType = file.type;
        if (isOptimizableImage(file)) {
          const optimized = await optimizeImage(file);
          fileToUpload = optimized.blob; contentType = "image/webp"; fileName = `gallery-${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
        } else {
          fileName = `gallery-${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split(".").pop()}`;
        }
        const { error: uploadError } = await supabase.storage.from("post-images").upload(fileName, fileToUpload, { contentType });
        if (uploadError) { toast.error(translateError(uploadError)); continue; }
        const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(fileName);
        uploadedUrls.push(urlData.publicUrl);
      }
      if (uploadedUrls.length) {
        setFormData(prev => ({ ...prev, gallery_images: [...prev.gallery_images, ...uploadedUrls] }));
        toast.success(`تم رفع ${uploadedUrls.length} صورة بنجاح`);
      }
    } catch (error: any) { toast.error(translateError(error)); }
    finally { setIsUploadingGallery(false); e.target.value = ""; }
  };

  const removeGalleryImage = (index: number) => {
    setFormData(prev => ({ ...prev, gallery_images: prev.gallery_images.filter((_, i) => i !== index) }));
  };

  if (!isNew && postLoading) {
    return <AdminLayout><div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AdminLayout>;
  }

  const wordCount = countWords(formData.content);
  const readingTime = estimateReadingTime(formData.content);
  const isAdmin = userRole !== "author";

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/posts")}>
              <ArrowRight className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">{isNew ? "خبر جديد" : "تعديل الخبر"}</h1>
          </div>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Save className="h-4 w-4 ml-2" />}
            {saveMutation.isPending ? "جاري الحفظ..." : (isNew ? "نشر الخبر" : "تحديث الخبر")}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">

            {/* ── القسم 1: المحتوى الأساسي ── */}
            <Card>
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-100/80 border-b border-gray-200 rounded-t-lg">
                <span className="text-xs font-bold text-gray-700">المحتوى الأساسي</span>
              </div>
              <CardContent className="pt-4 space-y-4">

                {/* العنوان */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">عنوان الخبر *</Label>
                  <Input value={formData.title} onChange={(e) => handleTitleChange(e.target.value)}
                    className={`h-11 text-base ${duplicateWarning ? "border-amber-500" : ""}`} />
                  {duplicateWarning && (
                    <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" /><span>{duplicateWarning}</span>
                    </div>
                  )}
                  {isCheckingDuplicate && (
                    <p className="text-xs text-blue-500 flex items-center gap-1">
                      <span className="inline-block w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
                      جاري التحقق...
                    </p>
                  )}
                </div>

                {/* نوع الخبر + وسم */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-600">نوع الخبر / المصدر</Label>
                    <Input value={formData.source_type} onChange={(e) => setFormData(p => ({ ...p, source_type: e.target.value }))} placeholder="حصاد اليوم | خاص" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-600">وسم الخبر</Label>
                    <Input value={formData.badge} onChange={(e) => setFormData(p => ({ ...p, badge: e.target.value }))} placeholder="انفراد" maxLength={30} />
                  </div>
                </div>

                {/* ملخص الخبر */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <Label className="text-xs font-semibold text-gray-600">ملخص الخبر</Label>
                    <div className="flex gap-2 flex-wrap items-center">
                      <div className="flex items-center gap-1">
                        <Label className="text-xs text-muted-foreground">عدد الجمل:</Label>
                        <Select value={String(splitCount)} onValueChange={(v) => setSplitCount(+v)}>
                          <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <Button type="button" variant="secondary" size="sm" className="h-7 text-xs" onClick={handleAutoSplitExcerpt}>
                        <Sparkles className="h-3 w-3 ml-1" /> تقسيم تلقائي
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="h-7 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50" onClick={handleFormatParagraphs}>
                        ¶ تنسيق فقرات
                      </Button>
                      {preSplitContent && (
                        <Button type="button" variant="outline" size="sm" className="h-7 text-xs text-amber-600 border-amber-300 hover:bg-amber-50"
                          onClick={() => { setFormData(p => ({ ...p, content: preSplitContent.content, excerpt: preSplitContent.excerpt })); setPreSplitContent(null); toast.success("تم استعادة النص الأصلي"); }}>
                          تراجع
                        </Button>
                      )}
                      {formData.excerpt && !preSplitContent && (
                        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-destructive"
                          onClick={() => setFormData(p => ({ ...p, excerpt: "" }))}>
                          <Eraser className="h-3 w-3 ml-1" /> مسح الملخص
                        </Button>
                      )}
                    </div>
                  </div>
                  <Textarea value={formData.excerpt} onChange={(e) => setFormData(p => ({ ...p, excerpt: e.target.value }))} rows={2}
                    placeholder="اضغط 'تقسيم تلقائي' لاستخراج الجملة الأولى كملخص، أو اكتب ملخصاً مخصصاً"
                    className="rounded-xl border-gray-200 resize-none text-sm" />
                </div>

                {/* محتوى الخبر */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">محتوى الخبر *</Label>
                  <Textarea ref={contentTextareaRef} value={formData.content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    onPaste={handleContentPaste} onKeyDown={handleContentKeyDown}
                    placeholder="الصق نص الخبر هنا..." rows={15}
                    className="w-full rounded-xl border-gray-200 text-sm leading-relaxed resize-y min-h-[280px]" />
                  <div className="flex items-center gap-3 text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg">
                    <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{wordCount} كلمة</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{readingTime} دقيقة قراءة</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* اقتراحات الربط الداخلي */}
            {(formData.title || formData.content) && (
              <InternalLinkingSuggestions
                title={formData.title} content={formData.content} currentPostId={id}
                onInsertToEditor={(html) => {
                  const ta = contentTextareaRef.current;
                  if (ta) {
                    const start = ta.selectionStart;
                    const end = ta.selectionEnd;
                    const newContent = formData.content.substring(0, start) + '\n\n' + html + '\n\n' + formData.content.substring(end);
                    handleContentChange(newContent);
                    setTimeout(() => { if (ta) { ta.focus(); ta.setSelectionRange(start + html.length + 4, start + html.length + 4); } }, 100);
                  } else {
                    handleContentChange(formData.content + '\n\n' + html);
                  }
                }}
              />
            )}

            {/* ── الوسائط ── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" /> الوسائط
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>الصورة الرئيسية</Label>
                  {formData.featured_image && <img src={formData.featured_image} alt="Featured" className="w-full h-48 object-cover rounded-lg" />}
                  <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={isUploadingImage} />
                  {isUploadingImage && <p className="text-xs text-muted-foreground">جاري المعالجة والرفع...</p>}
                  {watermarkLogoUrl && (
                    <label className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl cursor-pointer hover:bg-blue-100/60 transition-colors">
                      <Checkbox checked={enableWatermark} onCheckedChange={(c) => handleWatermarkToggle(c === true)} disabled={isGeneratingPreview} />
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-blue-800 flex items-center gap-1.5">
                          <ImageIcon className="h-3.5 w-3.5" /> إضافة علامة مائية احترافية
                        </p>
                        <p className="text-xs text-blue-500 mt-0.5">
                          {watermarkStyle === 'headline'
                            ? "شريط سفلي فيه شعار الموقع + اسمه + عنوان الخبر (نفس تصميم البوت التلقائي)"
                            : "شعار الموقع فقط بزاوية الصورة"}
                        </p>
                      </div>
                      {isGeneratingPreview && <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />}
                    </label>
                  )}
                  {enableWatermark && (
                    <div className="flex gap-2 px-1">
                      <button
                        type="button"
                        onClick={() => { setWatermarkStyle('headline'); if (formData.featured_image) regenerateWatermarkPreview(formData.featured_image); }}
                        className={`flex-1 text-xs font-semibold py-2 rounded-lg border transition-colors ${watermarkStyle === 'headline' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'}`}
                      >
                        شريط العنوان
                      </button>
                      <button
                        type="button"
                        onClick={() => { setWatermarkStyle('corner'); if (formData.featured_image) regenerateWatermarkPreview(formData.featured_image); }}
                        className={`flex-1 text-xs font-semibold py-2 rounded-lg border transition-colors ${watermarkStyle === 'corner' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'}`}
                      >
                        شعار الزاوية فقط
                      </button>
                    </div>
                  )}
                  {enableWatermark && watermarkPreview && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-600">معاينة الصورة النهائية:</p>
                      <div className="rounded-xl overflow-hidden border border-blue-200 shadow-sm">
                        <img src={watermarkPreview} alt="معاينة الصورة" className="w-full" style={{ aspectRatio: '1200/630' }} />
                      </div>
                    </div>
                  )}
                  <Input value={formData.featured_image} onChange={(e) => setFormData(p => ({ ...p, featured_image: e.target.value }))} placeholder="أو أدخل رابط الصورة" dir="ltr" />
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <Label>صور إضافية للخبر</Label>
                  {formData.gallery_images.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {formData.gallery_images.map((url, idx) => (
                        <div key={idx} className="relative group">
                          <img src={url} alt={`صورة ${idx + 1}`} className="w-full h-20 object-cover rounded-lg border" />
                          <button
                            type="button"
                            onClick={() => removeGalleryImage(idx)}
                            className="absolute top-1 left-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-90 hover:opacity-100"
                          >×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Input type="file" accept="image/*" multiple onChange={handleGalleryUpload} disabled={isUploadingGallery} />
                  {isUploadingGallery && <p className="text-xs text-muted-foreground">جاري رفع الصور...</p>}
                  <p className="text-xs text-gray-400">يمكنك اختيار عدة صور دفعة واحدة، ستظهر مع الخبر</p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Video className="h-4 w-4" /> رابط فيديو خارجي</Label>
                  <Input value={formData.external_video_url} onChange={(e) => setFormData(p => ({ ...p, external_video_url: e.target.value }))}
                    placeholder="رابط YouTube / Facebook / X / TikTok / Instagram" dir="ltr" />
                </div>
              </CardContent>
            </Card>

            {/* ── SEO ── */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>SEO</span>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setShowSeoPreview(s => !s)}>
                    <Eye className="h-4 w-4 ml-1" /> معاينة Google
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {showSeoPreview && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
                    <p className="text-xs text-gray-500 mb-2">معاينة نتيجة البحث في Google:</p>
                    <div className="bg-white p-3 rounded border">
                      <p className="text-blue-700 text-lg hover:underline cursor-pointer truncate">{formData.meta_title || formData.title || "عنوان المقال"}</p>
                      <p className="text-green-700 text-sm" dir="ltr">hasad-alyoum.com/article/{formData.slug || "..."}</p>
                      <p className="text-gray-600 text-sm mt-1 line-clamp-2">{formData.meta_description || formData.excerpt || "وصف المقال..."}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-4 mb-2">معاينة المشاركة على Facebook:</p>
                    <div className="bg-white rounded border overflow-hidden">
                      {formData.featured_image && <img src={formData.featured_image} alt="معاينة" className="w-full h-40 object-cover" />}
                      <div className="p-3 bg-gray-100">
                        <p className="text-xs text-gray-500 uppercase">hasad-alyoum.com</p>
                        <p className="font-bold text-gray-900 truncate">{formData.meta_title || formData.title || "عنوان المقال"}</p>
                        <p className="text-sm text-gray-600 line-clamp-2">{formData.meta_description || formData.excerpt || "وصف المقال..."}</p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>عنوان SEO</Label>
                    <span className={`text-xs ${formData.meta_title.length > 55 ? "text-red-500" : "text-gray-400"}`}>{formData.meta_title.length}/60</span>
                  </div>
                  <Input value={formData.meta_title} onChange={(e) => setFormData(p => ({ ...p, meta_title: e.target.value }))} placeholder={formData.title || "سيُؤخذ من العنوان"} maxLength={60} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>وصف SEO</Label>
                    <span className={`text-xs ${formData.meta_description.length > 150 ? "text-red-500" : "text-gray-400"}`}>{formData.meta_description.length}/160</span>
                  </div>
                  <Textarea value={formData.meta_description} onChange={(e) => setFormData(p => ({ ...p, meta_description: e.target.value }))}
                    placeholder={formData.excerpt || "سيُؤخذ من الملخص"} maxLength={160} rows={2} className="resize-none" />
                </div>
                <div className="space-y-2">
                  <Label>الرابط الثابت (Slug)</Label>
                  <Input value={formData.slug} onChange={(e) => setFormData(p => ({ ...p, slug: e.target.value }))}
                    placeholder={generateSlug(formData.title) || "سيُولّد من العنوان"} dir="ltr" className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label>الكلمات المفتاحية</Label>
                  <Input value={formData.meta_keywords} onChange={(e) => setFormData(p => ({ ...p, meta_keywords: e.target.value }))} placeholder="كلمة1, كلمة2, كلمة3" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">

            {/* النشر */}
            <Card>
              <CardHeader><CardTitle className="text-lg">إعدادات النشر</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>الحالة</Label>
                  {userRole === "author" ? (
                    <p className="text-sm text-muted-foreground bg-amber-50 border border-amber-200 rounded p-2">
                      🔍 سيُرسل هذا المنشور للمراجعة من قبل الإدارة قبل نشره
                    </p>
                  ) : (
                    <Select value={formData.status} onValueChange={(v: any) => setFormData(p => ({ ...p, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="published">✅ منشور</SelectItem>
                        <SelectItem value="draft">📝 مسودة</SelectItem>
                        <SelectItem value="under_review">🔍 قيد المراجعة</SelectItem>
                        <SelectItem value="scheduled">⏰ مجدول</SelectItem>
                        <SelectItem value="hidden">مخفي</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {formData.status === "scheduled" && (
                  <div className="space-y-2">
                    <Label>موعد النشر</Label>
                    <Input type="datetime-local" value={formData.scheduled_at} onChange={(e) => setFormData(p => ({ ...p, scheduled_at: e.target.value }))} />
                    <p className="text-xs text-emerald-600">سيُنشر تلقائياً في الموعد المحدد (توقيت عدن GMT+3)</p>
                  </div>
                )}

                {isAdmin && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 text-xs font-semibold text-gray-600">
                      🗓 وقت النشر (تحكم يدوي)
                    </Label>
                    <Input type="datetime-local" value={formData.publication_date} onChange={(e) => setFormData(p => ({ ...p, publication_date: e.target.value }))} />
                    <p className="text-xs text-gray-400">اختياري — اتركه فارغاً لاستخدام الوقت الحالي</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>إخفاء بعد</Label>
                  <Input type="datetime-local" value={formData.hide_after} onChange={(e) => setFormData(p => ({ ...p, hide_after: e.target.value }))} />
                </div>

                <div className="flex items-center justify-between">
                  <Label>⭐ خبر مميز (السلايدر)</Label>
                  <Switch checked={formData.is_featured} onCheckedChange={(c) => setFormData(p => ({ ...p, is_featured: c }))} />
                </div>

                <div className="flex items-center justify-between">
                  <Label>خبر عاجل</Label>
                  <Switch checked={formData.is_breaking} onCheckedChange={(c) => setFormData(p => ({ ...p, is_breaking: c }))} />
                </div>

                <div className="flex items-center justify-between">
                  <Label>📌 تثبيت في الأكثر قراءة</Label>
                  <Switch checked={formData.is_pinned} onCheckedChange={(c) => setFormData(p => ({ ...p, is_pinned: c, pinned_order: c ? (p.pinned_order || 1) : null }))} />
                </div>
                {formData.is_pinned && (
                  <div className="space-y-2">
                    <Label>ترتيب التثبيت</Label>
                    <Input type="number" min={1} value={formData.pinned_order ?? 1} onChange={(e) => setFormData(p => ({ ...p, pinned_order: +e.target.value || 1 }))} />
                  </div>
                )}

                {/* تحسين المشاهدات */}
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  <Checkbox checked={autoSeedViewsOnPublish} onCheckedChange={(c) => setAutoSeedViewsOnPublish(c === true)} />
                  <div>
                    <p className="text-xs font-semibold text-amber-800">تحسين المشاهدات تلقائياً</p>
                    <p className="text-xs text-amber-600">يُضاف عدد مشاهدات واقعي عند النشر</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* التصنيف */}
            <Card>
              <CardHeader><CardTitle className="text-lg">التصنيف</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>القسم</Label>
                  <Select value={formData.category_id} onValueChange={(v) => setFormData(p => ({ ...p, category_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="اختر القسم" /></SelectTrigger>
                    <SelectContent>{categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الكاتب</Label>
                  <Select value={formData.author_id} onValueChange={(v) => setFormData(p => ({ ...p, author_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="اختر الكاتب" /></SelectTrigger>
                    <SelectContent>{authors?.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default PostEditor;
