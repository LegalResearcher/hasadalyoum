import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Pencil, Trash2, ArrowRight, LogOut, Users, User } from "lucide-react";
import { translateError } from "@/lib/errorTranslator";

interface EditorForm {
  email: string;
  password: string;
  fullName: string;
  role: "admin" | "editor" | "author";
}

const defaultForm: EditorForm = {
  email: "",
  password: "",
  fullName: "",
  role: "editor",
};

interface EditorData {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  full_name: string;
  avatar_url: string | null;
  email?: string;
}

const Editors = () => {
  const navigate = useNavigate();
  const { userRole, user, loading, signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EditorForm>(defaultForm);
  const [editingUser, setEditingUser] = useState<EditorData | null>(null);
  const [editFormData, setEditFormData] = useState({ fullName: "", role: "editor" as "admin" | "editor" | "author" });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!loading && userRole !== "admin") {
      navigate("/admin");
    }
  }, [userRole, loading, navigate]);

  const { data: editors, isLoading } = useQuery({
    queryKey: ["editors"],
    queryFn: async () => {
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*")
        .in("role", ["admin", "editor", "author"]);

      if (rolesError) throw rolesError;

      const userIds = roles.map((r) => r.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      // جلب البريد الإلكتروني لكل مستخدم عبر دالة list-users
      // (لا يُخزَّن البريد في جدولي profiles/user_roles، فقط في نظام Auth)
      let emailByUserId: Record<string, string> = {};
      try {
        const { data: listData, error: listError } = await supabase.functions.invoke("list-users");
        if (!listError && listData?.users) {
          emailByUserId = Object.fromEntries(
            listData.users.map((u: { id: string; email: string }) => [u.id, u.email])
          );
        }
      } catch (e) {
        console.error("فشل جلب البريد الإلكتروني للمستخدمين:", e);
      }

      return roles.map((role) => {
        const profile = profiles.find((p) => p.user_id === role.user_id);
        return {
          ...role,
          full_name: profile?.full_name || `مستخدم ${role.user_id.slice(0, 7)}`,
          avatar_url: profile?.avatar_url,
          email: emailByUserId[role.user_id],
        };
      });
    },
    enabled: userRole === "admin",
  });

  const createEditorMutation = useMutation({
    mutationFn: async (data: EditorForm) => {
      // إنشاء المستخدم من السيرفر مباشرة عبر Edge Function (create-user)
      // بدلاً من supabase.auth.signUp() على العميل، والتي قد تستبدل
      // جلسة الأدمن الحالية بجلسة المستخدم الجديد وتتطلب تأكيد بريد يدوي
      const { data: result, error } = await supabase.functions.invoke("create-user", {
        body: {
          email: data.email,
          password: data.password,
          fullName: data.fullName,
          role: data.role,
        },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      return result.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["editors"] });
      setDialogOpen(false);
      setFormData(defaultForm);
      toast({ title: "تم الإنشاء", description: "تم إنشاء المستخدم بنجاح" });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: translateError(error),
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ userId, fullName, role }: { userId: string; fullName: string; role: "admin" | "editor" | "author" }) => {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("user_id", userId);

      if (profileError) throw profileError;

      const { error: roleError } = await supabase
        .from("user_roles")
        .update({ role })
        .eq("user_id", userId);

      if (roleError) throw roleError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["editors"] });
      setEditDialogOpen(false);
      setEditingUser(null);
      toast({ title: "تم التحديث", description: "تم تحديث بيانات المستخدم بنجاح" });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: translateError(error), variant: "destructive" });
    },
  });

  const deleteEditorMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (roleError) throw roleError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["editors"] });
      setDeleteId(null);
      toast({ title: "تم الحذف", description: "تم حذف صلاحيات المستخدم بنجاح" });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: translateError(error), variant: "destructive" });
    },
  });

  const handleSubmit = async () => {
    if (!formData.email || !formData.password || !formData.fullName) {
      toast({ title: "خطأ", description: "جميع الحقول مطلوبة", variant: "destructive" });
      return;
    }

    if (formData.password.length < 6) {
      toast({ title: "خطأ", description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل", variant: "destructive" });
      return;
    }

    setIsCreating(true);
    await createEditorMutation.mutateAsync(formData);
    setIsCreating(false);
  };

  const handleEdit = (editor: EditorData) => {
    setEditingUser(editor);
    setEditFormData({ fullName: editor.full_name, role: editor.role as "admin" | "editor" | "author" });
    setEditDialogOpen(true);
  };

  const handleUpdateSubmit = () => {
    if (!editingUser) return;
    updateMutation.mutate({
      userId: editingUser.user_id,
      fullName: editFormData.fullName,
      role: editFormData.role,
    });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-primary text-primary-foreground px-4 py-1">مدير</Badge>;
      case "editor":
        return <Badge className="bg-slate-600 text-white px-4 py-1">محرر</Badge>;
      case "author":
        return <Badge className="bg-emerald-600 text-white px-4 py-1">كاتب</Badge>;
      default:
        return <Badge variant="secondary">{role}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (userRole !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-background" dir="rtl">
      {/* Header */}
      <div className="bg-white dark:bg-card shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">إدارة المستخدمين</h1>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => navigate("/admin")} className="flex items-center gap-2">
                العودة للوحة التحكم
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" onClick={handleSignOut} className="flex items-center gap-2">
                تسجيل الخروج
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-3xl mx-auto">
          <CardContent className="p-6">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-primary" />
                <div>
                  <h2 className="text-xl font-bold">المستخدمون</h2>
                  <p className="text-sm text-muted-foreground">إدارة المستخدمين وصلاحياتهم</p>
                </div>
              </div>
              <Button onClick={() => { setFormData(defaultForm); setDialogOpen(true); }} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                إضافة مستخدم
              </Button>
            </div>

            {/* Users List */}
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : editors && editors.length > 0 ? (
              <div className="space-y-4">
                {editors.map((editor) => {
                  const isCurrentUser = editor.user_id === user?.id;
                  return (
                    <div
                      key={editor.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        isCurrentUser ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900" : "bg-white dark:bg-card"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          isCurrentUser ? "bg-red-100 text-red-500" : "bg-blue-100 text-blue-500"
                        }`}>
                          <Pencil className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{editor.full_name}</span>
                            {isCurrentUser && <span className="text-xs text-muted-foreground">(أنت)</span>}
                          </div>
                          {editor.email && (
                            <span className="text-xs text-muted-foreground block">{editor.email}</span>
                          )}
                          <span className="text-sm text-muted-foreground">
                            {editor.role === "admin" ? "مدير" : editor.role === "editor" ? "محرر" : "كاتب"}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {getRoleBadge(editor.role)}
                        
                        {isCurrentUser ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate("/admin/profile")}
                            className="flex items-center gap-2"
                          >
                            <Pencil className="h-4 w-4" />
                            تعديل بياناتي
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(editor)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteId(editor.user_id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">لا يوجد مستخدمون حتى الآن</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة مستخدم جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">الاسم الكامل</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="أدخل الاسم الكامل"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="example@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="أدخل كلمة المرور"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">الصلاحية</Label>
              <Select
                value={formData.role}
                onValueChange={(value: "admin" | "editor" | "author") => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الصلاحية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="author">كاتب</SelectItem>
                  <SelectItem value="editor">محرر</SelectItem>
                  <SelectItem value="admin">مدير</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSubmit} disabled={isCreating}>
              {isCreating && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              إضافة
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل بيانات المستخدم</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editFullName">الاسم الكامل</Label>
              <Input
                id="editFullName"
                value={editFormData.fullName}
                onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                placeholder="أدخل الاسم الكامل"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editRole">الصلاحية</Label>
              <Select
                value={editFormData.role}
                onValueChange={(value: "admin" | "editor" | "author") => setEditFormData({ ...editFormData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الصلاحية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="author">كاتب</SelectItem>
                  <SelectItem value="editor">محرر</SelectItem>
                  <SelectItem value="admin">مدير</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleUpdateSubmit} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              حفظ التغييرات
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم إزالة صلاحيات هذا المستخدم. لن يتمكن بعدها من الوصول للوحة التحكم.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteEditorMutation.mutate(deleteId)}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Editors;
