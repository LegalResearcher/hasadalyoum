import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { translateError } from "@/lib/errorTranslator";

/**
 * هوكات الإعدادات العامة والإعلانات وإعدادات الأقسام - حصاد اليوم
 * مُكيّفة لبنية حصاد اليوم الفعلية:
 * - site_settings: جدول key/value بسيط (نص)، خلافاً لبنية JSONB في الجنوب
 * - ad_banners: تدعم صورة + رابط أو كود HTML خام (إعلانات AdSense مثلاً) + جدولة زمنية
 * - category_settings: علائقية (category_id) خلافاً للنص الحر في الجنوب
 */

export type SiteSettingsMap = Record<string, string>;

// جلب جميع إعدادات الموقع كخريطة key -> value
export const useSiteSettings = () => {
  return useQuery({
    queryKey: ["site-settings"],
    queryFn: async (): Promise<SiteSettingsMap> => {
      const { data, error } = await supabase.from("site_settings").select("*");
      if (error) throw error;

      const map: SiteSettingsMap = {};
      data?.forEach((row) => {
        map[row.key] = row.value || "";
      });
      return map;
    },
    staleTime: 1000 * 60 * 5,
  });
};

// تحديث/إضافة إعداد واحد أو أكثر دفعة واحدة
export const useUpdateSiteSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Record<string, string>) => {
      for (const [key, value] of Object.entries(updates)) {
        const { error } = await supabase.from("site_settings").upsert({ key, value }, { onConflict: "key" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success("تم تحديث الإعدادات بنجاح");
    },
    onError: (error: any) => {
      toast.error(translateError(error));
    },
  });
};

export interface AdBanner {
  id: string;
  name: string;
  position: string;
  image_url: string | null;
  html_code: string | null;
  link_url: string | null;
  is_active: boolean;
  display_order: number;
  starts_at: string | null;
  ends_at: string | null;
}

// جلب كل الإعلانات (للوحة التحكم)
export const useAdBanners = () => {
  return useQuery({
    queryKey: ["ad-banners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ad_banners").select("*").order("display_order", { ascending: true });
      if (error) throw error;
      return data as AdBanner[];
    },
    staleTime: 1000 * 60 * 5,
  });
};

// جلب الإعلانات الفعّالة فقط لموضع معيّن (للواجهة العامة)
// تُستثنى الإعلانات المجدولة التي لم يحن وقتها بعد أو انتهت صلاحيتها
export const useActiveAdsByPosition = (position: string) => {
  return useQuery({
    queryKey: ["active-ads", position],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("ad_banners")
        .select("*")
        .eq("position", position)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;

      return ((data as AdBanner[]) || []).filter((ad) => {
        if (ad.starts_at && ad.starts_at > now) return false;
        if (ad.ends_at && ad.ends_at < now) return false;
        return true;
      });
    },
    staleTime: 1000 * 60 * 2,
  });
};

export const useCreateAdBanner = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (banner: Omit<AdBanner, "id">) => {
      const { error } = await supabase.from("ad_banners").insert([banner]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-banners"] });
      toast.success("تم إضافة الإعلان بنجاح");
    },
    onError: (error: any) => toast.error(translateError(error)),
  });
};

export const useUpdateAdBanner = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AdBanner> }) => {
      const { error } = await supabase.from("ad_banners").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-banners"] });
      toast.success("تم تحديث الإعلان بنجاح");
    },
    onError: (error: any) => toast.error(translateError(error)),
  });
};

export const useDeleteAdBanner = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ad_banners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-banners"] });
      toast.success("تم حذف الإعلان بنجاح");
    },
    onError: (error: any) => toast.error(translateError(error)),
  });
};
