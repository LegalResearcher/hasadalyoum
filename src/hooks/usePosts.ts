import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * حقول القوائم (الرئيسية / الأقسام / الأكثر قراءة): تستبعد عمداً عمود content
 * (نص المقال الكامل) لأنه غير مستخدم في بطاقات العرض، وهو غالباً أكبر عمود في
 * الجدول. هذا يقلّل Database Egress على Supabase بشكل كبير مقارنة بـ select("*").
 * صفحة المقال المفرد (usePostBySlug) وحدها تجلب content لأنها تعرضه فعلياً.
 */
const LIST_FIELDS = `
  id, title, slug, excerpt, featured_image, thumbnail_image, category_id,
  author_id, user_id, source_type, external_video_url, status, is_featured,
  is_breaking, is_pinned, pinned_order, views_count, word_count, reading_time,
  meta_title, meta_description, meta_keywords, scheduled_at, hide_after,
  published_at, created_at, updated_at
`;

export interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  featured_image: string | null;
  thumbnail_image: string | null;
  category_id: string | null;
  author_id: string | null;
  user_id: string | null;
  source_type: string;
  external_video_url: string | null;
  status: "draft" | "scheduled" | "published" | "hidden" | "under_review";
  is_featured: boolean;
  is_breaking: boolean;
  is_pinned?: boolean;
  pinned_order?: number | null;
  views_count: number;
  word_count: number;
  reading_time: number;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  scheduled_at: string | null;
  hide_after: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  author?: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
}

export const usePosts = (options?: { 
  categorySlug?: string; 
  limit?: number; 
  featured?: boolean;
  breaking?: boolean;
}) => {
  return useQuery({
    queryKey: ["posts", options],
    queryFn: async () => {
      let query = supabase
        .from("posts")
        .select(`
          ${LIST_FIELDS},
          category:categories(id, name, slug),
          author:authors(id, name, avatar_url)
        `)
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false });

      if (options?.categorySlug) {
        const { data: category } = await supabase
          .from("categories")
          .select("id")
          .eq("slug", options.categorySlug)
          .maybeSingle();
        
        if (category) {
          query = query.eq("category_id", category.id);
        }
      }

      if (options?.featured) {
        query = query.eq("is_featured", true);
      }

      if (options?.breaking) {
        query = query.eq("is_breaking", true);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Post[];
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const usePostBySlug = (slug: string) => {
  return useQuery({
    queryKey: ["post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          category:categories(id, name, slug),
          author:authors(id, name, avatar_url, bio)
        `)
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();

      if (error) throw error;
      return data as Post | null;
    },
    enabled: !!slug,
  });
};

export const useFeaturedPosts = (limit: number = 10) => {
  return useQuery({
    queryKey: ["featured-posts", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          ${LIST_FIELDS},
          category:categories(id, name, slug)
        `)
        .eq("status", "published")
        .eq("is_featured", true)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(limit);

      if (error) throw error;
      return data as Post[];
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const usePostsByCategory = (categorySlug: string, limit?: number) => {
  return useQuery({
    queryKey: ["posts-by-category", categorySlug, limit],
    queryFn: async () => {
      const { data: category } = await supabase
        .from("categories")
        .select("id, posts_count")
        .eq("slug", categorySlug)
        .maybeSingle();

      if (!category) return [];

      const postLimit = limit || category.posts_count || 5;

      const { data, error } = await supabase
        .from("posts")
        .select(`
          ${LIST_FIELDS},
          category:categories(id, name, slug),
          author:authors(id, name, avatar_url)
        `)
        .eq("status", "published")
        .eq("category_id", category.id)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(postLimit);

      if (error) throw error;
      return data as Post[];
    },
    enabled: !!categorySlug,
    staleTime: 1000 * 60 * 5,
  });
};

export const useIncrementPostView = () => {
  return useMutation({
    mutationFn: async (postId: string) => {
      // Insert view record (analytics log)
      await supabase.from("post_views").insert({ post_id: postId });
      // تحديث العداد المجمّع views_count على المنشور نفسه
      // (كان مفقوداً سابقاً — مما يعني أن المشاهدات لم تكن تُحتسب فعلياً
      // وأن صفحة "الأكثر قراءة" ستبقى فارغة من الترتيب الحقيقي دون هذا الاستدعاء)
      await supabase.rpc("increment_views", { post_id: postId });
    },
  });
};

/**
 * هوك "الأكثر قراءة": يدمج الأخبار المثبتة يدوياً (is_pinned + pinned_order)
 * في مواضعها المحددة، ويُكمّل باقي المراكز تلقائياً بالأخبار الأعلى مشاهدة
 * (views_count). نفس منطق موقع الجنوب، مُكيّف لحقول حصاد اليوم.
 */
export const useMostReadPosts = (limit: number = 12) => {
  return useQuery({
    queryKey: ["most-read-posts", limit],
    queryFn: async () => {
      const selectFields = `
        ${LIST_FIELDS},
        category:categories(id, name, slug),
        author:authors(id, name, avatar_url)
      `;

      // 1) الأخبار المثبتة بترتيب محدد - تحجز مكانها بغض النظر عن المشاهدات
      const { data: pinnedData, error: pinnedError } = await supabase
        .from("posts")
        .select(selectFields)
        .eq("status", "published")
        .eq("is_pinned", true)
        .not("pinned_order", "is", null)
        .order("pinned_order", { ascending: true });

      if (pinnedError) throw pinnedError;
      const pinnedPosts = (pinnedData as Post[]) || [];

      // 2) باقي الأخبار مرتبة حسب عدد المشاهدات
      const { data: viewsData, error: viewsError } = await supabase
        .from("posts")
        .select(selectFields)
        .eq("status", "published")
        .order("views_count", { ascending: false })
        .limit(limit + pinnedPosts.length);

      if (viewsError) throw viewsError;
      const pinnedIds = new Set(pinnedPosts.map((p) => p.id));
      const viewsPosts = ((viewsData as Post[]) || []).filter((p) => !pinnedIds.has(p.id));

      // 3) الدمج: كل خبر مثبت يحجز مكانه، والباقي يُكمّل تلقائياً بالمشاهدات
      const merged: (Post | null)[] = new Array(limit).fill(null);
      const overflowPinned: Post[] = [];

      pinnedPosts.forEach((p) => {
        const slot = (p.pinned_order || 0) - 1;
        if (slot >= 0 && slot < limit && !merged[slot]) {
          merged[slot] = p;
        } else {
          overflowPinned.push(p);
        }
      });

      const fillQueue = [...overflowPinned, ...viewsPosts];
      let fillIndex = 0;
      for (let i = 0; i < limit; i++) {
        if (!merged[i] && fillIndex < fillQueue.length) {
          merged[i] = fillQueue[fillIndex++];
        }
      }

      return merged.filter((p): p is Post => p !== null);
    },
    staleTime: 1000 * 60 * 5,
  });
};
