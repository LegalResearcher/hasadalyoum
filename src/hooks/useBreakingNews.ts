import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BreakingNewsItem {
  id: string;
  text: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export const useBreakingNews = () => {
  return useQuery({
    queryKey: ["breaking-news"],
    queryFn: async () => {
      // First get breaking news items from the breaking_news table
      const { data: breakingItems, error: breakingError } = await supabase
        .from("breaking_news")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (breakingError) throw breakingError;

      // Also get posts marked as breaking
      const { data: breakingPosts, error: postsError } = await supabase
        .from("posts")
        .select("id, title")
        .eq("status", "published")
        .eq("is_breaking", true)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(5);

      if (postsError) throw postsError;

      // Combine both sources
      const combined = [
        ...(breakingItems || []),
        ...(breakingPosts || []).map((post) => ({
          id: post.id,
          text: post.title,
          is_active: true,
          display_order: 100,
          created_at: new Date().toISOString(),
        })),
      ];

      return combined as BreakingNewsItem[];
    },
  });
};
