import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { translateError } from "@/lib/errorTranslator";

const Settings = () => {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<Record<string, string>>({
    site_name: "حصاد اليوم",
    site_description: "منبر إعلامي يمني حُر ومستقل",
    site_keywords: "أخبار, اليمن, صحافة",
    facebook_url: "https://www.facebook.com/",
    twitter_url: "https://x.com/hasadalyoum1",
    telegram_url: "https://t.me/hasadalyoum",
    youtube_url: "https://youtube.com/",
    whatsapp_url: "",
    watermark_logo_url: "",
  });
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const { data: siteSettings, isLoading } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (siteSettings) {
      const settingsMap: Record<string, string> = {};
      siteSettings.forEach((s) => {
        settingsMap[s.key] = s.value || "";
      });
      setSettings((prev) => ({ ...prev, ...settingsMap }));
    }
  }, [siteSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const [key, value] of Object.entries(settings)) {
        const { error } = await supabase
          .from("site_settings")
          .upsert({ key, value }, { onConflict: "key" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success("تم حفظ الإعدادات");
    },
    onError: (error: any) => {
      toast.error(translateError(error));
    },
  });

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const fileName = `watermark-logo-${Date.now()}.${file.name.split(".").pop()}`;
      const { error: uploadError } = await supabase.storage.from("post-images").upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(fileName);
      handleChange("watermark_logo_url", urlData.publicUrl);
      toast.success("تم رفع الشعار، لا تنسَ الضغط على (حفظ الإعدادات)");
    } catch (error: any) {
      toast.error(translateError(error));
    } finally {
      setIsUploadingLogo(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">إعدادات الموقع</h1>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            ) : (
              <Save className="h-4 w-4 ml-2" />
            )}
            حفظ الإعدادات
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle>الإعدادات العامة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>اسم الموقع</Label>
                <Input
                  value={settings.site_name}
                  onChange={(e) => handleChange("site_name", e.target.value)}
                  placeholder="اسم الموقع"
                />
              </div>

              <div className="space-y-2">
                <Label>وصف الموقع</Label>
                <Textarea
                  value={settings.site_description}
                  onChange={(e) => handleChange("site_description", e.target.value)}
                  placeholder="وصف الموقع"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>الكلمات المفتاحية</Label>
                <Input
                  value={settings.site_keywords}
                  onChange={(e) => handleChange("site_keywords", e.target.value)}
                  placeholder="كلمة1, كلمة2, كلمة3"
                />
              </div>
            </CardContent>
          </Card>

          {/* Social Media */}
          <Card>
            <CardHeader>
              <CardTitle>روابط التواصل الاجتماعي</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>فيسبوك</Label>
                <Input
                  value={settings.facebook_url}
                  onChange={(e) => handleChange("facebook_url", e.target.value)}
                  placeholder="https://facebook.com/..."
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label>X (تويتر)</Label>
                <Input
                  value={settings.twitter_url}
                  onChange={(e) => handleChange("twitter_url", e.target.value)}
                  placeholder="https://x.com/..."
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label>تيليغرام</Label>
                <Input
                  value={settings.telegram_url}
                  onChange={(e) => handleChange("telegram_url", e.target.value)}
                  placeholder="https://t.me/..."
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label>يوتيوب</Label>
                <Input
                  value={settings.youtube_url}
                  onChange={(e) => handleChange("youtube_url", e.target.value)}
                  placeholder="https://youtube.com/..."
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label>واتساب</Label>
                <Input
                  value={settings.whatsapp_url}
                  onChange={(e) => handleChange("whatsapp_url", e.target.value)}
                  placeholder="https://wa.me/..."
                  dir="ltr"
                />
              </div>
            </CardContent>
          </Card>

          {/* Watermark Logo */}
          <Card>
            <CardHeader>
              <CardTitle>شعار العلامة المائية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                ارفع نسخة شفافة (PNG) من شعار الموقع لاستخدامها كعلامة مائية اختيارية على صور الأخبار عند المشاركة.
                إن لم تُرفع، ستبقى خانة "العلامة المائية" غير ظاهرة في محرر الأخبار.
              </p>
              {settings.watermark_logo_url && (
                <img
                  src={settings.watermark_logo_url}
                  alt="شعار العلامة المائية"
                  className="h-20 object-contain bg-muted rounded-lg p-2"
                />
              )}
              <Input type="file" accept="image/png,image/webp" onChange={handleLogoUpload} disabled={isUploadingLogo} />
              {isUploadingLogo && <p className="text-xs text-muted-foreground">جاري الرفع...</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Settings;
