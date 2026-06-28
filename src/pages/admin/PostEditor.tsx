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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, ArrowRight, Image as ImageIcon, Video, Clock, FileText, AlertTriangle, Sparkles, Eraser, Eye } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { useAuthors } from "@/hooks/useAuthors";
import { useAuth } from "@/hooks/useAuth";
import { translateError } from "@/lib/errorTranslator";
import { optimizeImage, isOptimizableImage, formatFileSize } from "@/lib/imageOptimizer";
import { applyWatermark } from "@/lib/imageWatermark";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const OPENING_PHRASES = [
  "كشفت مصادر مطلعة أن...",
  "علمت حصاد اليوم من مصادر خاصة أن...",
  "أفادت تقارير موثوقة بأن...",
  "تشير المعطيات المتوفرة إلى أن...",
  "في سياق متصل، أكدت مصادر أن...",
];

const DRAFT_KEY = "hasad_draft_new";

// تنسيق فقرات: سطر جديد بعد كل علامة ترقيم نهائية (. ؟ !)
function formatParagraphs(text: string): string {
  return text
    .replace(/([.!؟?])\s+/g, "$1\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const PostEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, userRole } = useAuth();
  const { data: siteSettings } = useSiteSettings();
  const watermarkLogoUrl = siteSettings?.watermark_logo_url;
  const [enableWatermark, setEnableWatermark] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const isNew = !id || id === "new";
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [splitCount, setSplitCount] = useState(2);
  const [showSeoPreview, setShowSeoPreview] = useState(false);
  const lastAutoSaveRef = useRef<number>(0);
  const draftRestoreCheckedRef = useRef(false);

  const { data: categories } = useCategories();
  const { data: authors } = useAuthors();

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    featured_image: "",
    additional_images: [] as string[],
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
    badge: "",
    is_pinned: false,
    pinned_order: null as number | null,
  });

  const { data: post, isLoading: postLoading } = useQuery({
    queryKey: ["post", id],
    queryFn: async () => {
      if (isNew) return null;
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
  });

  useEffect(() => {
    if (post) {
      setFormData({
        title: post.title || "",
        slug: post.slug || "",
        excerpt: post.excerpt || "",
        content: post.content || "",
        featured_image: post.featured_image || "",
        additional_images: [],
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
        badge: (post as any).badge || "",
        is_pinned: (post as any).is_pinned || false,
        pinned_order: (post as any).pinned_order ?? null,
      });
    }
  }, [post]);

  // عند فتح خبر جديد: حقن عبارة افتتاحية + استعادة المسودة من localStorage
  useEffect(() => {
    if (!isNew || draftRestoreCheckedRef.current) return;
    draftRestoreCheckedRef.current = true;
    const stored = localStorage.getItem(DRAFT_KEY);
    if (stored) {
      toast("وُجدت مسودة محفوظة، هل تريد استعادتها؟", {
        action: { label: "نعم", onClick: () => { try { setFormData((p) => ({ ...p, ...JSON.parse(stored) })); toast.success("تم استعادة المسودة"); } catch { /* ignore */ } } },
        cancel: { label: "لا", onClick: () => localStorage.removeItem(DRAFT_KEY) },
        duration: 10000,
      });
    } else {
      const phrase = OPENING_PHRASES[Math.floor(Math.random() * OPENING_PHRASES.length)];
      setFormData((p) => ({ ...p, content: phrase + " " }));
    }
  }, [isNew]);

  // حفظ المسودة في localStorage عند أي تغيير (خبر جديد فقط)
  useEffect(() => {
    if (!isNew) return;
    if (!formData.title && !formData.content) return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
  }, [formData, isNew]);

  // فحص تكرار العنوان/الـ slug مع debounce 500ms
  useEffect(() => {
    if (!formData.title) { setDuplicateWarning(null); return; }
    const t = setTimeout(async () => {
      let q = supabase.from("posts").select("id, title").or(`title.eq.${formData.title},slug.eq.${formData.slug}`).limit(1);
      if (!isNew && id) q = q.neq("id", id);
      const { data } = await q;
      if (data && data.length > 0) setDuplicateWarning("⚠️ يوجد خبر آخر بنفس العنوان أو الرابط");
      else setDuplicateWarning(null);
    }, 500);
    return () => clearTimeout(t);
  }, [formData.title, formData.slug, isNew, id]);

  const generateSlug = (title: string) => {
    return title
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\u0600-\u06FFa-z0-9-]/g, "")
      .slice(0, 100);
  };

  const countWords = (text: string) => {
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  const estimateReadingTime = (text: string) => {
    const words = countWords(text);
    return Math.ceil(words / 200);
  };

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title),
      meta_title: prev.meta_title || title.slice(0, 60),
    }));
  };

  const generateKeywords = (title: string, content: string) => {
    const text = `${title} ${content}`.replace(/<[^>]*>/g, "");
    const words = text.split(/\s+/).filter(word => word.length > 3);
    const wordCount: Record<string, number> = {};
    words.forEach(word => {
      const clean = word.replace(/[^\u0600-\u06FFa-zA-Z]/g, "");
      if (clean.length > 3) {
        wordCount[clean] = (wordCount[clean] || 0) + 1;
      }
    });
    return Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word)
      .join(", ");
  };

  const handleContentChange = (content: string) => {
    const excerpt = content.replace(/<[^>]*>/g, "").slice(0, 200);
    const keywords = generateKeywords(formData.title, content);
    setFormData((prev) => ({
      ...prev,
      content,
      excerpt: prev.excerpt || excerpt,
      meta_description: prev.meta_description || excerpt.slice(0, 160),
      meta_keywords: prev.meta_keywords || keywords,
    }));
  };

  // عند اللصق في المحتوى: تنسيق فقرات تلقائي
  const handleContentPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    const formatted = formatParagraphs(pasted);
    const ta = e.currentTarget;
    const before = formData.content.slice(0, ta.selectionStart);
    const after = formData.content.slice(ta.selectionEnd);
    handleContentChange(before + formatted + after);
  };

  // عند الكتابة: أضف \n مباشرة بعد علامة ترقيم (. ؟ !)
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
    const sentences = formData.content.replace(/<[^>]*>/g, "").split(/(?<=[.!؟?])\s+/).filter(Boolean);
    const excerpt = sentences.slice(0, splitCount).join(" ").slice(0, 300);
    setFormData((p) => ({ ...p, excerpt }));
    toast.success("تم استخراج الملخص");
  };

  const isValidUUID = (str: string | undefined): boolean => {
    if (!str) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Validate UUID for updates
      if (!isNew && !isValidUUID(id)) {
        throw new Error("معرف الخبر غير صالح");
      }

      const wordCount = countWords(formData.content);
      const readingTime = estimateReadingTime(formData.content);

      const { additional_images, ...rest } = formData;

      // تعبئة حقول SEO تلقائياً إن كانت فارغة
      const auto_meta_title = rest.meta_title || rest.title.slice(0, 60);
      const auto_meta_desc = rest.meta_description || rest.excerpt || rest.content.replace(/<[^>]*>/g, "").slice(0, 160);
      const auto_meta_kw = rest.meta_keywords || generateKeywords(rest.title, rest.content);

      const postData = {
        ...rest,
        meta_title: auto_meta_title,
        meta_description: auto_meta_desc,
        meta_keywords: auto_meta_kw,
        word_count: wordCount,
        reading_time: readingTime,
        published_at: formData.status === "published" ? new Date().toISOString() : null,
        scheduled_at: formData.scheduled_at || null,
        hide_after: formData.hide_after || null,
        category_id: isValidUUID(formData.category_id) ? formData.category_id : null,
        author_id: isValidUUID(formData.author_id) ? formData.author_id : null,
        pinned_order: formData.is_pinned ? formData.pinned_order : null,
      };

      if (isNew) {
        const { error } = await supabase.from("posts").insert({ ...postData, user_id: user?.id || null });
        if (error) throw error;
      } else {
        // لا نُعيد كتابة user_id عند التعديل، لنحافظ على الكاتب الأصلي للمنشور
        // (مهم لصلاحيات RLS التي تتيح للكاتب تعديل منشوراته الخاصة فقط)
        const { error } = await supabase.from("posts").update(postData).eq("id", id);
        if (error) throw error;
      }

      // ping Google عند النشر
      if (formData.status === "published") {
        try { fetch(`https://www.google.com/ping?sitemap=https://hasadalyoum.com/sitemap.xml`, { mode: "no-cors" }); } catch { /* ignore */ }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      toast.success(isNew ? "تم إنشاء الخبر بنجاح" : "تم حفظ التغييرات");
      if (isNew) localStorage.removeItem(DRAFT_KEY);
      navigate("/admin/posts");
    },
    onError: (error: any) => {
      toast.error(translateError(error));
    },
  });

  // حفظ تلقائي كل 30 ثانية للمسودة الجديدة
  useEffect(() => {
    if (!isNew) return;
    const interval = setInterval(async () => {
      if (formData.status !== "draft" || !formData.title.trim()) return;
      if (Date.now() - lastAutoSaveRef.current < 25000) return;
      lastAutoSaveRef.current = Date.now();
      try {
        await supabase.from("posts").insert({
          title: formData.title,
          slug: formData.slug || `auto-${Date.now()}`,
          content: formData.content,
          excerpt: formData.excerpt,
          status: "draft",
          user_id: user?.id || null,
        });
        toast.success("تم الحفظ التلقائي", { duration: 1500 });
      } catch { /* silent */ }
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

      // تحسين الصورة (تصغير + تحويل WebP + ضغط) قبل الرفع
      if (isOptimizableImage(file)) {
        toast.info(`جاري تحسين الصورة... (${formatFileSize(file.size)})`);
        const optimized = await optimizeImage(file);
        fileToUpload = optimized.blob;
        contentType = "image/webp";
        fileName = `${Date.now()}.webp`;
        toast.success(`تم ضغط الصورة: ${formatFileSize(optimized.originalSize)} ← ${formatFileSize(optimized.optimizedSize)}`);
      } else {
        const fileExt = file.name.split(".").pop();
        fileName = `${Date.now()}.${fileExt}`;
      }

      // العلامة المائية (اختياري، فقط إن فعّلها الأدمن وكان شعار العلامة مُعرَّفاً في الإعدادات)
      if (enableWatermark && watermarkLogoUrl) {
        try {
          toast.info("جاري إضافة العلامة المائية...");
          const watermarked = await applyWatermark(fileToUpload, watermarkLogoUrl);
          fileToUpload = watermarked.blob;
          fileName = `wm-${Date.now()}.webp`;
          contentType = "image/webp";
        } catch (wmError) {
          console.error("Watermark failed:", wmError);
          toast.error("فشلت إضافة العلامة المائية، سيتم رفع الصورة بدونها");
        }
      }

      const { error: uploadError } = await supabase.storage.from("post-images").upload(fileName, fileToUpload, { contentType });

      if (uploadError) {
        toast.error(translateError(uploadError));
        return;
      }

      const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(fileName);

      setFormData((prev) => ({ ...prev, featured_image: urlData.publicUrl }));
      toast.success("تم رفع الصورة بنجاح");
    } catch (error: any) {
      toast.error(translateError(error));
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleAdditionalImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(fileName, file);

      if (uploadError) {
        toast.error(`حدث خطأ أثناء رفع ${file.name}`);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("post-images")
        .getPublicUrl(fileName);

      setFormData((prev) => ({
        ...prev,
        additional_images: [...prev.additional_images, urlData.publicUrl],
      }));
    }
    toast.success("تم رفع الصور بنجاح");
  };

  const removeAdditionalImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      additional_images: prev.additional_images.filter((_, i) => i !== index),
    }));
  };

  if (!isNew && postLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  const wordCount = countWords(formData.content);
  const readingTime = estimateReadingTime(formData.content);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/posts")}>
              <ArrowRight className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">
              {isNew ? "خبر جديد" : "تعديل الخبر"}
            </h1>
          </div>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            ) : (
              <Save className="h-4 w-4 ml-2" />
            )}
            حفظ
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>العنوان</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="عنوان الخبر"
                  />
                </div>

                <div className="space-y-2">
                  <Label>الرابط (Slug)</Label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="رابط-الخبر"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <Label>المقتطف</Label>
                  <Textarea
                    value={formData.excerpt}
                    onChange={(e) => setFormData((prev) => ({ ...prev, excerpt: e.target.value }))}
                    placeholder="ملخص قصير للخبر"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>المحتوى</Label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder="محتوى الخبر..."
                    rows={15}
                    className="min-h-[300px]"
                  />
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      {wordCount} كلمة
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {readingTime} دقيقة للقراءة
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Media */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  الوسائط
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>الصورة الرئيسية</Label>
                  {formData.featured_image && (
                    <img
                      src={formData.featured_image}
                      alt="Featured"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  )}
                  <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={isUploadingImage} />
                  {isUploadingImage && <p className="text-xs text-muted-foreground">جاري المعالجة والرفع...</p>}
                  {watermarkLogoUrl && (
                    <div className="flex items-center justify-between border rounded-lg p-2">
                      <Label className="text-sm">إضافة العلامة المائية (شعار الموقع) على الصورة</Label>
                      <Switch checked={enableWatermark} onCheckedChange={setEnableWatermark} />
                    </div>
                  )}
                  <Input
                    value={formData.featured_image}
                    onChange={(e) => setFormData((prev) => ({ ...prev, featured_image: e.target.value }))}
                    placeholder="أو أدخل رابط الصورة"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <Label>وسائط إضافية (معرض الصور)</Label>
                  {formData.additional_images.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {formData.additional_images.map((img, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={img}
                            alt={`Additional ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeAdditionalImage(index)}
                            className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Input type="file" accept="image/*" multiple onChange={handleAdditionalImageUpload} />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    رابط فيديو خارجي
                  </Label>
                  <Input
                    value={formData.external_video_url}
                    onChange={(e) => setFormData((prev) => ({ ...prev, external_video_url: e.target.value }))}
                    placeholder="رابط YouTube / Facebook / X / TikTok / Instagram"
                    dir="ltr"
                  />
                </div>
              </CardContent>
            </Card>

            {/* SEO */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">SEO</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>عنوان الصفحة (Meta Title)</Label>
                  <Input
                    value={formData.meta_title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, meta_title: e.target.value }))}
                    placeholder="عنوان الصفحة للمحركات"
                    maxLength={60}
                  />
                  <p className="text-xs text-muted-foreground">{formData.meta_title.length}/60</p>
                </div>

                <div className="space-y-2">
                  <Label>الوصف (Meta Description)</Label>
                  <Textarea
                    value={formData.meta_description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, meta_description: e.target.value }))}
                    placeholder="وصف الصفحة للمحركات"
                    maxLength={160}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">{formData.meta_description.length}/160</p>
                </div>

                <div className="space-y-2">
                  <Label>الكلمات المفتاحية</Label>
                  <Input
                    value={formData.meta_keywords}
                    onChange={(e) => setFormData((prev) => ({ ...prev, meta_keywords: e.target.value }))}
                    placeholder="كلمة1, كلمة2, كلمة3"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">النشر</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>الحالة</Label>
                  {userRole === "author" ? (
                    <p className="text-sm text-muted-foreground bg-amber-50 border border-amber-200 rounded p-2">
                      🔍 سيُرسل هذا المنشور للمراجعة من قبل الإدارة قبل نشره — لا يمكن للكاتب النشر مباشرة.
                    </p>
                  ) : (
                    <Select
                      value={formData.status}
                      onValueChange={(value: any) => setFormData((prev) => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">مسودة</SelectItem>
                        <SelectItem value="published">منشور</SelectItem>
                        <SelectItem value="scheduled">مجدول</SelectItem>
                        <SelectItem value="under_review">🔍 قيد المراجعة</SelectItem>
                        <SelectItem value="hidden">مخفي</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {formData.status === "scheduled" && (
                  <div className="space-y-2">
                    <Label>موعد النشر</Label>
                    <Input
                      type="datetime-local"
                      value={formData.scheduled_at}
                      onChange={(e) => setFormData((prev) => ({ ...prev, scheduled_at: e.target.value }))}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>إخفاء بعد</Label>
                  <Input
                    type="datetime-local"
                    value={formData.hide_after}
                    onChange={(e) => setFormData((prev) => ({ ...prev, hide_after: e.target.value }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>خبر مميز</Label>
                  <Switch
                    checked={formData.is_featured}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_featured: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>خبر عاجل</Label>
                  <Switch
                    checked={formData.is_breaking}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_breaking: checked }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">التصنيف</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>القسم</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, category_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر القسم" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>الكاتب</Label>
                  <Select
                    value={formData.author_id}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, author_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الكاتب" />
                    </SelectTrigger>
                    <SelectContent>
                      {authors?.map((author) => (
                        <SelectItem key={author.id} value={author.id}>
                          {author.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>نوع الخبر / المصدر</Label>
                  <Input
                    value={formData.source_type}
                    onChange={(e) => setFormData((prev) => ({ ...prev, source_type: e.target.value }))}
                    placeholder="حصاد اليوم | خاص"
                  />
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
