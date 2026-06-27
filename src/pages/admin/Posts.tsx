import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Eye, Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";
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

const Posts = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: posts, isLoading } = useQuery({
    queryKey: ["admin-posts", search],
    queryFn: async () => {
      let query = supabase
        .from("posts")
        .select(`
          id, title, slug, status, is_featured, is_breaking, views_count, created_at, published_at,
          categories(name),
          authors(name)
        `)
        .order("created_at", { ascending: false });

      if (search) {
        query = query.ilike("title", `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      toast.success("تم حذف الخبر بنجاح");
      setDeleteId(null);
    },
    onError: () => {
      toast.error("حدث خطأ أثناء الحذف");
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">منشور</Badge>;
      case "draft":
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">مسودة</Badge>;
      case "scheduled":
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">مجدول</Badge>;
      case "hidden":
        return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">مخفي</Badge>;
      case "under_review":
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">🔍 قيد المراجعة</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <h1 className="text-2xl font-bold">إدارة الأخبار</h1>
          <Button asChild>
            <Link to="/admin/posts/new">
              <Plus className="h-4 w-4 ml-2" />
              خبر جديد
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث في الأخبار..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">العنوان</TableHead>
                      <TableHead className="text-right">القسم</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">المشاهدات</TableHead>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posts?.map((post) => (
                      <TableRow key={post.id}>
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="font-medium truncate">{post.title}</p>
                            <div className="flex gap-1 mt-1">
                              {post.is_featured && (
                                <Badge variant="outline" className="text-xs">مميز</Badge>
                              )}
                              {post.is_breaking && (
                                <Badge variant="destructive" className="text-xs">عاجل</Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{post.categories?.name || "-"}</TableCell>
                        <TableCell>{getStatusBadge(post.status || "draft")}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            {post.views_count || 0}
                          </span>
                        </TableCell>
                        <TableCell>
                          {new Date(post.created_at).toLocaleDateString("ar-SA")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" asChild>
                              <Link to={`/admin/posts/${post.id}`}>
                                <Pencil className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setDeleteId(post.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!posts || posts.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          لا توجد أخبار
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
              <AlertDialogDescription>
                لا يمكن التراجع عن هذا الإجراء. سيتم حذف الخبر نهائياً.
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

export default Posts;
