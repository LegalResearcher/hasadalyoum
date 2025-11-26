import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  featured_image: string | null;
  category_id: string | null;
  author_id: string | null;
  user_id: string | null;
  source_type: string;
  external_video_url: string | null;
  status: "draft" | "scheduled" | "published" | "hidden";
  is_featured: boolean;
  is_breaking: boolean;
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
          *,
          category:categories(id, name, slug),
          author:authors(id, name, avatar_url)
        `)
        .eq("status", "published")
        .order("published_at", { ascending: false });

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
          *,
          category:categories(id, name, slug)
        `)
        .eq("status", "published")
        .eq("is_featured", true)
        .order("published_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as Post[];
    },
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
          *,
          category:categories(id, name, slug),
          author:authors(id, name, avatar_url)
        `)
        .eq("status", "published")
        .eq("category_id", category.id)
        .order("published_at", { ascending: false })
        .limit(postLimit);

      if (error) throw error;
      return data as Post[];
    },
    enabled: !!categorySlug,
  });
};

export const useIncrementPostView = () => {
  return useMutation({
    mutationFn: async (postId: string) => {
      // Insert view record
      await supabase.from("post_views").insert({ post_id: postId });
    },
  });
};
