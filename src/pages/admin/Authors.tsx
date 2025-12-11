import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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

interface AuthorForm {
  id?: string;
  name: string;
  bio: string;
  avatar_url: string;
  is_active: boolean;
}

const defaultForm: AuthorForm = {
  name: "",
  bio: "",
  avatar_url: "",
  is_active: true,
};

const Authors = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AuthorForm>(defaultForm);
  const [uploading, setUploading] = useState(false);

  const { data: authors, isLoading } = useQuery({
    queryKey: ["admin-authors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("authors")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: AuthorForm) => {
      if (data.id) {
        const { error } = await supabase
          .from("authors")
          .update({ name: data.name, bio: data.bio, avatar_url: data.avatar_url, is_active: data.is_active })
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("authors").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-authors"] });
      queryClient.invalidateQueries({ queryKey: ["authors"] });
      toast.success(formData.id ? "تم تحديث الكاتب" : "تم إضافة الكاتب");
      setDialogOpen(false);
      setFormData(defaultForm);
    },
    onError: () => {
      toast.error("حدث خطأ أثناء الحفظ");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("authors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-authors"] });
      queryClient.invalidateQueries({ queryKey: ["authors"] });
      toast.success("تم حذف الكاتب");
      setDeleteId(null);
    },
    onError: () => {
      toast.error("حدث خطأ أثناء الحذف");
    },
  });

  const handleEdit = (author: any) => {
    setFormData(author);
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error("يرجى إدخال اسم الكاتب");
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("author-avatars")
      .upload(fileName, file);

    if (uploadError) {
      toast.error("حدث خطأ أثناء رفع الصورة");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("author-avatars")
      .getPublicUrl(fileName);

    setFormData((prev) => ({ ...prev, avatar_url: urlData.publicUrl }));
    setUploading(false);
    toast.success("تم رفع الصورة بنجاح");
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">إدارة الكتّاب</h1>
          <Button onClick={() => { setFormData(defaultForm); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 ml-2" />
            كاتب جديد
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
                    <TableHead className="text-right">الصورة</TableHead>
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right">نبذة</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {authors?.map((author) => (
                    <TableRow key={author.id}>
                      <TableCell>
                        <Avatar>
                          <AvatarImage src={author.avatar_url || ""} alt={author.name} />
                          <AvatarFallback>{author.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">{author.name}</TableCell>
                      <TableCell className="max-w-xs truncate">{author.bio || "-"}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          author.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                        }`}>
                          {author.is_active ? "نشط" : "غير نشط"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(author)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(author.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!authors || authors.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        لا يوجد كتّاب بعد
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{formData.id ? "تعديل الكاتب" : "إضافة كاتب جديد"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex justify-center">
                <div className="text-center">
                  <Avatar className="w-24 h-24 mx-auto">
                    <AvatarImage src={formData.avatar_url} />
                    <AvatarFallback className="text-2xl">
                      {formData.name.charAt(0) || "؟"}
                    </AvatarFallback>
                  </Avatar>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="mt-2"
                    disabled={uploading}
                  />
                  {uploading && (
                    <p className="text-sm text-muted-foreground mt-1">جاري الرفع...</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>اسم الكاتب *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="اسم الكاتب"
                />
              </div>

              <div className="space-y-2">
                <Label>نبذة</Label>
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
                  placeholder="نبذة عن الكاتب"
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>نشط</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
                />
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
                سيتم حذف الكاتب نهائياً.
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

export default Authors;
