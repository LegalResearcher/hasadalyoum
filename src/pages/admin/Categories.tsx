import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAllCategorySettings, useUpdateCategorySettings } from "@/hooks/useCategories";
import { translateError } from "@/lib/errorTranslator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CategoryForm {
  id?: string;
  name: string;
  slug: string;
  description: string;
  display_order: number;
  posts_count: number;
  is_active: boolean;
  show_in_menu: boolean;
  display_style: "grid" | "list";
  posts_per_page: number;
}

const defaultForm: CategoryForm = {
  name: "",
  slug: "",
  description: "",
  display_order: 0,
  posts_count: 5,
  is_active: true,
  show_in_menu: true,
  display_style: "grid",
  posts_per_page: 12,
};

const Categories = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CategoryForm>(defaultForm);
  const { data: allSettings } = useAllCategorySettings();
  const updateSettingsMutation = useUpdateCategorySettings();

  const { data: categories, isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: CategoryForm) => {
      const { show_in_menu, display_style, posts_per_page, ...categoryData } = data;

      let categoryId = data.id;

      if (categoryId) {
        const { error } = await supabase
          .from("categories")
          .update(categoryData)
          .eq("id", categoryId);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from("categories")
          .insert(categoryData)
          .select("id")
          .single();
        if (error) throw error;
        categoryId = inserted.id;
      }

      // إعدادات العرض (الظهور في القائمة + نمط العرض + عدد المنشورات بالصفحة)
      // مفصولة في جدول category_settings المستقل
      const { error: settingsError } = await supabase
        .from("category_settings")
        .upsert(
          { category_id: categoryId, show_in_menu, display_style, posts_per_page, display_order: categoryData.display_order },
          { onConflict: "category_id" }
        );
      if (settingsError) throw settingsError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["all-category-settings"] });
      queryClient.invalidateQueries({ queryKey: ["menu-categories"] });
      toast.success(formData.id ? "تم تحديث القسم" : "تم إضافة القسم");
      setDialogOpen(false);
      setFormData(defaultForm);
    },
    onError: (error: any) => {
      toast.error(translateError(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("تم حذف القسم");
      setDeleteId(null);
    },
    onError: (error: any) => {
      toast.error(translateError(error));
    },
  });

  const handleEdit = (category: any) => {
    const settings = allSettings?.find((s) => s.category_id === category.id);
    setFormData({
      ...category,
      show_in_menu: settings?.show_in_menu ?? true,
      display_style: settings?.display_style ?? "grid",
      posts_per_page: settings?.posts_per_page ?? 12,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.slug) {
      toast.error("يرجى ملء الحقول المطلوبة");
      return;
    }
    saveMutation.mutate(formData);
  };

  const generateSlug = (name: string) => {
    return name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\u0600-\u06FFa-z0-9-]/g, "");
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">إدارة الأقسام</h1>
          <Button onClick={() => { setFormData(defaultForm); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 ml-2" />
            قسم جديد
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الترتيب</TableHead>
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right">الرابط</TableHead>
                    <TableHead className="text-right">عدد الأخبار</TableHead>
                    <TableHead className="text-right">في القائمة؟</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories?.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell>{cat.display_order}</TableCell>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell dir="ltr">{cat.slug}</TableCell>
                      <TableCell>{cat.posts_count}</TableCell>
                      <TableCell>
                        {(allSettings?.find((s) => s.category_id === cat.id)?.show_in_menu ?? true) ? (
                          <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">✓ ظاهر</span>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">مخفي</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          cat.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                        }`}>
                          {cat.is_active ? "نشط" : "غير نشط"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(cat)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(cat.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{formData.id ? "تعديل القسم" : "إضافة قسم جديد"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>اسم القسم *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    name: e.target.value,
                    slug: prev.slug || generateSlug(e.target.value),
                  }))}
                  placeholder="اسم القسم"
                />
              </div>

              <div className="space-y-2">
                <Label>الرابط (Slug) *</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="رابط-القسم"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label>الوصف</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="وصف القسم"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الترتيب</Label>
                  <Input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData((prev) => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>عدد الأخبار في الواجهة</Label>
                  <Input
                    type="number"
                    value={formData.posts_count}
                    onChange={(e) => setFormData((prev) => ({ ...prev, posts_count: parseInt(e.target.value) || 5 }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label>نشط</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
                />
              </div>

              <div className="border-t pt-4 space-y-4">
                <p className="text-sm font-semibold text-muted-foreground">إعدادات العرض (صفحة القسم العامة)</p>

                <div className="flex items-center justify-between">
                  <Label>ظاهر في قائمة التنقل</Label>
                  <Switch
                    checked={formData.show_in_menu}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, show_in_menu: checked }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>نمط العرض</Label>
                    <Select
                      value={formData.display_style}
                      onValueChange={(v: "grid" | "list") => setFormData((prev) => ({ ...prev, display_style: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="grid">شبكي (Grid)</SelectItem>
                        <SelectItem value="list">قائمة (List)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>عدد المنشورات بالصفحة</Label>
                    <Input
                      type="number"
                      value={formData.posts_per_page}
                      onChange={(e) => setFormData((prev) => ({ ...prev, posts_per_page: parseInt(e.target.value) || 12 }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                  حفظ
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
              <AlertDialogDescription>
                سيتم حذف القسم نهائياً. لن يتم حذف الأخبار المرتبطة به.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteId && deleteMutation.mutate(deleteId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                حذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default Categories;
