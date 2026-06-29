import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { GripVertical, Menu, Save, Loader2, Info } from "lucide-react";
import { toast } from "sonner";

// ─── الواجهة ──────────────────────────────────────────────────────────────────
interface CategoryStructure {
  id: string;              // id من category_settings
  category_id: string;
  category_name: string;   // name من categories
  show_in_menu: boolean;
  show_in_home: boolean;
  menu_order: number;      // display_order في category_settings
  home_order: number;      // home_order (نضيفه للجدول)
  home_post_limit: number; // posts_per_page
}

// ─── جلب البيانات (join categories + category_settings) ──────────────────────
const useCategoryStructure = () => {
  return useQuery({
    queryKey: ["category-structure"],
    queryFn: async (): Promise<CategoryStructure[]> => {
      // جلب category_settings مع join للـ categories
      const { data: settings, error: sErr } = await supabase
        .from("category_settings")
        .select("id, category_id, display_order, show_in_menu, posts_per_page, categories(id, name)")
        .order("display_order", { ascending: true });

      if (sErr) throw sErr;

      // جلب كل الأقسام النشطة + قسم most-read الوهمي (is_active=false)
      const { data: allCats, error: cErr } = await supabase
        .from("categories")
        .select("id, name, slug, is_active")
        .or("is_active.eq.true,slug.eq.most-read")
        .order("display_order", { ascending: true });

      if (cErr) throw cErr;

      const settingsMap = new Map((settings || []).map((s: any) => [s.category_id, s]));

      // دمج: الأقسام التي لها إعدادات + الأقسام الجديدة بدون إعدادات
      const result: CategoryStructure[] = (allCats || []).map((cat: any, idx: number) => {
        const s = settingsMap.get(cat.id);
        return {
          id: s?.id || "",
          category_id: cat.id,
          category_name: cat.name,
          show_in_menu: cat.slug === "most-read" ? false : (s?.show_in_menu ?? false),
          show_in_home: (s as any)?.show_in_home ?? false,
          menu_order: s?.display_order ?? idx + 1,
          home_order: (s as any)?.home_order ?? idx + 1,
          home_post_limit: s?.posts_per_page ?? 6,
        };
      });

      return result.sort((a, b) => a.menu_order - b.menu_order);
    },
    staleTime: 1000 * 60 * 2,
  });
};

// ─── حفظ دفعي ─────────────────────────────────────────────────────────────────
const useBatchSaveCategoryStructure = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: CategoryStructure[]) => {
      for (const item of items) {
        const payload: any = {
          category_id: item.category_id,
          display_order: item.menu_order,
          show_in_menu: item.show_in_menu,
          show_in_home: item.show_in_home,
          home_order: item.home_order,
          posts_per_page: item.home_post_limit,
          updated_at: new Date().toISOString(),
        };

        if (item.id) {
          // تحديث موجود
          const { error } = await supabase
            .from("category_settings")
            .update(payload)
            .eq("id", item.id);
          if (error) throw error;
        } else {
          // إدراج جديد
          const { error } = await supabase
            .from("category_settings")
            .upsert(payload, { onConflict: "category_id" });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-structure"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["menu-categories"] });
      toast.success("تم حفظ إعدادات الأقسام بنجاح");
    },
    onError: () => {
      toast.error("فشل في حفظ التغييرات");
    },
  });
};

// ─── المكوّن الرئيسي ───────────────────────────────────────────────────────────
const SiteStructureManager = () => {
  const { data: categories, isLoading } = useCategoryStructure();
  const batchSave = useBatchSaveCategoryStructure();

  const [local, setLocal] = useState<CategoryStructure[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  useEffect(() => {
    if (categories) {
      setLocal([...categories].sort((a, b) => a.menu_order - b.menu_order));
    }
  }, [categories]);

  // ─── تبديل Switch ──────────────────────────────────────────────────────────
  const handleToggle = (
    catId: string,
    field: "show_in_menu" | "show_in_home",
    value: boolean
  ) => {
    setLocal((prev) =>
      prev.map((c) => (c.category_id === catId ? { ...c, [field]: value } : c))
    );
    setHasChanges(true);
  };

  // ─── تغيير ترتيب الرئيسية ──────────────────────────────────────────────────
  const handleHomeOrder = (catId: string, value: number) => {
    setLocal((prev) =>
      prev.map((c) => (c.category_id === catId ? { ...c, home_order: value } : c))
    );
    setHasChanges(true);
  };

  // ─── تغيير عدد الأخبار ─────────────────────────────────────────────────────
  const handleLimit = (catId: string, value: number) => {
    setLocal((prev) =>
      prev.map((c) => (c.category_id === catId ? { ...c, home_post_limit: value } : c))
    );
    setHasChanges(true);
  };

  // ─── Drag & Drop ───────────────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, catId: string) => {
    setDraggedId(catId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, catId: string) => {
    e.preventDefault();
    if (catId !== draggedId) setDragOverId(catId);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    setLocal((prev) => {
      const items = [...prev];
      const fromIdx = items.findIndex((i) => i.category_id === draggedId);
      const toIdx = items.findIndex((i) => i.category_id === targetId);
      const [moved] = items.splice(fromIdx, 1);
      items.splice(toIdx, 0, moved);
      // إعادة ترقيم menu_order
      return items.map((item, idx) => ({ ...item, menu_order: idx + 1 }));
    });

    setDraggedId(null);
    setDragOverId(null);
    setHasChanges(true);
  };

  // ─── حفظ الكل ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    await batchSave.mutateAsync(local);
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="border-none shadow-md overflow-hidden" dir="rtl">
      <CardHeader className="bg-white border-b">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Menu className="h-5 w-5 text-red-600" />
              هيكلية الموقع والصفحة الرئيسية
            </CardTitle>
            <CardDescription className="text-sm text-gray-500">
              تحكم في ظهور الأقسام في القائمة العلوية والصفحة الرئيسية - اسحب الصفوف لإعادة الترتيب
            </CardDescription>
          </div>
          {hasChanges && (
            <Button
              onClick={handleSave}
              disabled={batchSave.isPending}
              className="bg-slate-800 hover:bg-slate-900 text-white shadow-lg animate-in fade-in zoom-in duration-300"
            >
              {batchSave.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <Save className="h-4 w-4 ml-2" />
              )}
              حفظ الهيكلية الجديدة
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50 text-gray-600">
              <tr className="border-b">
                <th className="p-4 font-bold">القسم</th>
                <th className="p-4 text-center font-bold">تفعيل القائمة</th>
                <th className="p-4 text-center font-bold">تفعيل الرئيسية</th>
                <th className="p-4 text-center font-bold w-32">ترتيب الرئيسية</th>
                <th className="p-4 text-center font-bold w-32">عدد الأخبار</th>
              </tr>
            </thead>
            <tbody>
              {local.map((cat) => (
                <tr
                  key={cat.category_id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, cat.category_id)}
                  onDragOver={(e) => handleDragOver(e, cat.category_id)}
                  onDrop={(e) => handleDrop(e, cat.category_id)}
                  onDragEnd={() => { setDraggedId(null); setDragOverId(null); }}
                  className={`border-b transition-colors ${
                    draggedId === cat.category_id
                      ? "opacity-40 bg-gray-100"
                      : dragOverId === cat.category_id
                      ? "bg-blue-50 border-r-4 border-r-blue-700"
                      : "hover:bg-gray-50/80"
                  }`}
                >
                  {/* اسم القسم */}
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-5 w-5 text-gray-300 cursor-grab active:cursor-grabbing hover:text-slate-700 transition-colors" />
                      <span className="font-bold text-slate-700">{cat.category_name}</span>
                    </div>
                  </td>

                  {/* تفعيل القائمة — أزرق داكن (مخفي لـ most-read) */}
                  <td className="p-4 text-center">
                    {cat.category_name === "الأكثر قراءة" ? (
                      <span className="text-xs text-gray-400">—</span>
                    ) : (
                      <Switch
                        checked={cat.show_in_menu}
                        onCheckedChange={(v) => handleToggle(cat.category_id, "show_in_menu", v)}
                        className="data-[state=checked]:bg-slate-800"
                      />
                    )}
                  </td>

                  {/* تفعيل الرئيسية — أحمر */}
                  <td className="p-4 text-center">
                    <Switch
                      checked={cat.show_in_home}
                      onCheckedChange={(v) => handleToggle(cat.category_id, "show_in_home", v)}
                      className="data-[state=checked]:bg-red-600"
                    />
                  </td>

                  {/* ترتيب الرئيسية */}
                  <td className="p-4">
                    <Input
                      type="number"
                      min={0}
                      value={cat.home_order}
                      onChange={(e) =>
                        handleHomeOrder(cat.category_id, parseInt(e.target.value) || 0)
                      }
                      className="w-20 mx-auto text-center font-bold"
                    />
                  </td>

                  {/* عدد الأخبار */}
                  <td className="p-4">
                    <Input
                      type="number"
                      min={1}
                      value={cat.home_post_limit}
                      onChange={(e) =>
                        handleLimit(cat.category_id, parseInt(e.target.value) || 5)
                      }
                      className="w-20 mx-auto text-center font-bold"
                      disabled={!cat.show_in_home}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* تلميح سريع */}
        <div className="m-6 p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex gap-3 items-start">
          <Info className="h-5 w-5 text-blue-700 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-800 space-y-1">
            <p className="font-bold">تلميح سريع:</p>
            <p>• ترتيب القائمة يتم تلقائياً عند سحب الصفوف للأعلى أو الأسفل.</p>
            <p>• الأقسام التي تظهر في الرئيسية يفضل أن يكون عدد أخبارها بين 4 إلى 8 لتوازن التصميم.</p>
            <p>• تأكد من حفظ التغييرات بعد الانتهاء من الترتيب لتظهر للزوار فوراً.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SiteStructureManager;
