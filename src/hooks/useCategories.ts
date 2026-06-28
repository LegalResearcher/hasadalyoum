import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
  posts_count: number;
  is_active: boolean;
  created_at: string;
}

export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as Category[];
    },
  });
};

// الأقسام التي يجب عرضها في شريط التنقل فقط (يتحكم بها الأدمن عبر category_settings)
export const useMenuCategories = () => {
  return useQuery({
    queryKey: ["menu-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("category_settings")
        .select("display_order, category:categories!inner(id, name, slug, is_active)")
        .eq("show_in_menu", true)
        .order("display_order", { ascending: true });

      if (error) throw error;

      return (data || [])
        .map((row: any) => row.category)
        .filter((cat: any) => cat?.is_active) as Pick<Category, "id" | "name" | "slug" | "is_active">[];
    },
  });
};

export const useCategoryBySlug = (slug: string) => {
  return useQuery({
    queryKey: ["category", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (error) throw error;
      return data as Category | null;
    },
    enabled: !!slug,
  });
};

export interface CategorySetting {
  id: string;
  category_id: string;
  display_style: "grid" | "list";
  posts_per_page: number;
  show_in_menu: boolean;
  display_order: number;
}

// إعدادات عرض قسم معيّن (نمط العرض + عدد المنشورات لكل صفحة)
// تُستخدم في صفحة القسم العامة /category/:slug
export const useCategorySettingsBySlug = (slug: string) => {
  return useQuery({
    queryKey: ["category-settings", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("category_settings")
        .select("*, category:categories!inner(slug)")
        .eq("category.slug", slug)
        .maybeSingle();

      if (error) throw error;
      return data as (CategorySetting & { category: { slug: string } }) | null;
    },
    enabled: !!slug,
  });
};

// كل إعدادات الأقسام (للوحة التحكم)
export const useAllCategorySettings = () => {
  return useQuery({
    queryKey: ["all-category-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("category_settings").select("*");
      if (error) throw error;
      return data as CategorySetting[];
    },
  });
};

// تحديث إعدادات قسم (upsert بالاعتماد على category_id الفريد)
export const useUpdateCategorySettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ categoryId, updates }: { categoryId: string; updates: Partial<Omit<CategorySetting, "id" | "category_id">> }) => {
      const { error } = await supabase
        .from("category_settings")
        .upsert({ category_id: categoryId, ...updates }, { onConflict: "category_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-category-settings"] });
      queryClient.invalidateQueries({ queryKey: ["category-settings"] });
    },
  });
};
