import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Loader2, Megaphone } from "lucide-react";
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
import {
  useAdBanners,
  useCreateAdBanner,
  useUpdateAdBanner,
  useDeleteAdBanner,
  AdBanner,
} from "@/hooks/useSiteSettings";

const POSITIONS = [
  { value: "header", label: "أعلى الصفحة الرئيسية" },
  { value: "in-article", label: "داخل صفحة الخبر" },
  { value: "sidebar", label: "الشريط الجانبي" },
  { value: "footer", label: "أسفل الصفحة" },
];

type AdForm = Omit<AdBanner, "id">;

const defaultForm: AdForm = {
  name: "",
  position: "header",
  image_url: "",
  html_code: "",
  link_url: "",
  is_active: true,
  display_order: 0,
  starts_at: null,
  ends_at: null,
};

const Ads = () => {
  const { data: ads, isLoading } = useAdBanners();
  const createMutation = useCreateAdBanner();
  const updateMutation = useUpdateAdBanner();
  const deleteMutation = useDeleteAdBanner();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AdForm>(defaultForm);

  const openCreate = () => {
    setEditingId(null);
    setFormData(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (ad: AdBanner) => {
    setEditingId(ad.id);
    setFormData({
      name: ad.name,
      position: ad.position,
      image_url: ad.image_url || "",
      html_code: ad.html_code || "",
      link_url: ad.link_url || "",
      is_active: ad.is_active,
      display_order: ad.display_order,
      starts_at: ad.starts_at,
      ends_at: ad.ends_at,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) return;

    const payload = {
      ...formData,
      image_url: formData.image_url || null,
      html_code: formData.html_code || null,
      link_url: formData.link_url || null,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, updates: payload }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createMutation.mutate(payload, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Megaphone className="w-6 h-6" /> الإعلانات
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              أضف بانرات صور أو كود إعلانات (مثل AdSense) لمواضع مختلفة على الموقع
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 ml-2" /> إعلان جديد
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>الموضع</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الترتيب</TableHead>
                    <TableHead className="text-left">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ads?.map((ad) => (
                    <TableRow key={ad.id}>
                      <TableCell className="font-medium">{ad.name}</TableCell>
                      <TableCell>{POSITIONS.find((p) => p.value === ad.position)?.label || ad.position}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{ad.html_code ? "كود HTML" : "صورة"}</Badge>
                      </TableCell>
                      <TableCell>
                        {ad.is_active ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">فعّال</Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">متوقف</Badge>
                        )}
                      </TableCell>
                      <TableCell>{ad.display_order}</TableCell>
                      <TableCell className="text-left">
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(ad)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(ad.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {ads?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        لا توجد إعلانات بعد
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "تعديل الإعلان" : "إعلان جديد"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>اسم الإعلان (للتعريف الداخلي فقط)</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="مثال: بانر شركة الاتصالات" />
            </div>

            <div className="space-y-2">
              <Label>موضع العرض</Label>
              <Select value={formData.position} onValueChange={(v) => setFormData({ ...formData, position: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>رابط صورة الإعلان (اختياري إن استخدمت كود HTML)</Label>
              <Input value={formData.image_url || ""} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} placeholder="https://..." dir="ltr" />
            </div>

            <div className="space-y-2">
              <Label>رابط الوجهة عند النقر (مع الصورة فقط)</Label>
              <Input value={formData.link_url || ""} onChange={(e) => setFormData({ ...formData, link_url: e.target.value })} placeholder="https://..." dir="ltr" />
            </div>

            <div className="space-y-2">
              <Label>أو كود HTML/JS خام (مثل AdSense) — له الأولوية على الصورة</Label>
              <Textarea
                value={formData.html_code || ""}
                onChange={(e) => setFormData({ ...formData, html_code: e.target.value })}
                placeholder="<script>...</script>"
                dir="ltr"
                rows={4}
                className="font-mono text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>تاريخ البدء (اختياري)</Label>
                <Input
                  type="datetime-local"
                  value={formData.starts_at ? formData.starts_at.slice(0, 16) : ""}
                  onChange={(e) => setFormData({ ...formData, starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                />
              </div>
              <div className="space-y-2">
                <Label>تاريخ الانتهاء (اختياري)</Label>
                <Input
                  type="datetime-local"
                  value={formData.ends_at ? formData.ends_at.slice(0, 16) : ""}
                  onChange={(e) => setFormData({ ...formData, ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>ترتيب العرض (الأصغر يظهر أولاً)</Label>
              <Input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="flex items-center justify-between border rounded-lg p-3">
              <Label>تفعيل الإعلان</Label>
              <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} />
            </div>

            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="w-full"
            >
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              حفظ
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذا الإعلان؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default Ads;
