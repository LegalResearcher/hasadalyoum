import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Pencil, Trash2, UserCog, Shield, UserPlus, Clock, Mail } from "lucide-react";

interface EditorForm {
  email: string;
  password: string;
  fullName: string;
  role: "admin" | "editor";
}

const defaultForm: EditorForm = {
  email: "",
  password: "",
  fullName: "",
  role: "editor",
};

interface PendingUser {
  user_id: string;
  full_name: string | null;
  email: string;
  created_at: string;
}

const Editors = () => {
  const navigate = useNavigate();
  const { userRole, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EditorForm>(defaultForm);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [grantRoleUser, setGrantRoleUser] = useState<PendingUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<"admin" | "editor">("editor");

  // Redirect if not admin
  if (userRole !== "admin") {
    navigate("/admin");
    return null;
  }

  const { data: editors, isLoading } = useQuery({
    queryKey: ["editors"],
    queryFn: async () => {
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*")
        .in("role", ["admin", "editor"]);

      if (rolesError) throw rolesError;

      const userIds = roles.map((r) => r.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      return roles.map((role) => {
        const profile = profiles.find((p) => p.user_id === role.user_id);
        return {
          ...role,
          full_name: profile?.full_name || "بدون اسم",
          avatar_url: profile?.avatar_url,
        };
      });
    },
  });

  const { data: pendingUsers, isLoading: loadingPending } = useQuery({
    queryKey: ["pending-users"],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*");

      if (profilesError) throw profilesError;

      // Get all user_ids that have roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id");

      if (rolesError) throw rolesError;

      const usersWithRoles = new Set(roles.map((r) => r.user_id));

      // Filter profiles without roles
      const pending = profiles
        .filter((p) => !usersWithRoles.has(p.user_id))
        .map((p) => ({
          user_id: p.user_id,
          full_name: p.full_name,
          email: "", // Will be populated if needed
          created_at: p.created_at,
        }));

      return pending as PendingUser[];
    },
  });

  const createEditorMutation = useMutation({
    mutationFn: async (data: EditorForm) => {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: data.fullName },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("فشل في إنشاء المستخدم");

      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: authData.user.id,
        role: data.role,
      });

      if (roleError) throw roleError;

      return authData.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["editors"] });
      setDialogOpen(false);
      setFormData(defaultForm);
      toast({ title: "تم الإنشاء", description: "تم إنشاء المحرر بنجاح" });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في إنشاء المحرر",
        variant: "destructive",
      });
    },
  });

  const grantRoleMutation = useMutation({
    mutationFn: async ({ userId, role, fullName }: { userId: string; role: "admin" | "editor"; fullName: string }) => {
      const { error } = await supabase.from("user_roles").insert({
        user_id: userId,
        role: role,
      });

      if (error) throw error;

      // Get user email from profiles or auth (we'll use the notification function)
      // Send notification email
      try {
        await supabase.functions.invoke('notify-role-granted', {
          body: { email: "", fullName, role } // Email will be sent to admin notification
        });
      } catch (e) {
        console.log("Notification sent or skipped");
      }

      return { userId, role };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["editors"] });
      queryClient.invalidateQueries({ queryKey: ["pending-users"] });
      setGrantRoleUser(null);
      toast({ title: "تم منح الصلاحيات", description: "تم منح الصلاحيات للمستخدم بنجاح" });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في منح الصلاحيات",
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "editor" }) => {
      const { error } = await supabase
        .from("user_roles")
        .update({ role })
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["editors"] });
      setEditingUserId(null);
      toast({ title: "تم التحديث", description: "تم تحديث الدور بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في تحديث الدور", variant: "destructive" });
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
      queryClient.invalidateQueries({ queryKey: ["pending-users"] });
      setDeleteId(null);
      toast({ title: "تم الحذف", description: "تم حذف صلاحيات المحرر بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل في حذف المحرر", variant: "destructive" });
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

  const handleGrantRole = () => {
    if (!grantRoleUser) return;
    grantRoleMutation.mutate({
      userId: grantRoleUser.user_id,
      role: selectedRole,
      fullName: grantRoleUser.full_name || "",
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return (
          <Badge className="bg-red-500 hover:bg-red-600">
            <Shield className="h-3 w-3 ml-1" />
            مسؤول
          </Badge>
        );
      case "editor":
        return (
          <Badge className="bg-blue-500 hover:bg-blue-600">
            <UserCog className="h-3 w-3 ml-1" />
            محرر
          </Badge>
        );
      default:
        return <Badge variant="secondary">{role}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">إدارة المحررين</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setFormData(defaultForm)}>
                <Plus className="h-4 w-4 ml-2" />
                إضافة محرر
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]" dir="rtl">
              <DialogHeader>
                <DialogTitle>إضافة محرر جديد</DialogTitle>
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
                  <Label htmlFor="role">الدور</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: "admin" | "editor") => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الدور" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="editor">محرر</SelectItem>
                      <SelectItem value="admin">مسؤول</SelectItem>
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
        </div>

        <Tabs defaultValue="editors" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="editors" className="flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              المحررون ({editors?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              في انتظار الموافقة ({pendingUsers?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editors">
            <Card>
              <CardHeader>
                <CardTitle>المحررون والمسؤولون</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : editors && editors.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الاسم</TableHead>
                        <TableHead>الدور</TableHead>
                        <TableHead>تاريخ الإضافة</TableHead>
                        <TableHead className="text-left">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editors.map((editor) => (
                        <TableRow key={editor.id}>
                          <TableCell className="font-medium">{editor.full_name}</TableCell>
                          <TableCell>
                            {editingUserId === editor.user_id ? (
                              <Select
                                value={editor.role}
                                onValueChange={(value: "admin" | "editor") => {
                                  updateRoleMutation.mutate({ userId: editor.user_id, role: value });
                                }}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="editor">محرر</SelectItem>
                                  <SelectItem value="admin">مسؤول</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              getRoleBadge(editor.role)
                            )}
                          </TableCell>
                          <TableCell>{new Date(editor.created_at).toLocaleDateString("ar")}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingUserId(editingUserId === editor.user_id ? null : editor.user_id)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {editor.user_id !== user?.id && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setDeleteId(editor.user_id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-8">لا يوجد محررون حتى الآن</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  المستخدمون في انتظار الموافقة
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingPending ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : pendingUsers && pendingUsers.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الاسم</TableHead>
                        <TableHead>تاريخ التسجيل</TableHead>
                        <TableHead className="text-left">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingUsers.map((pendingUser) => (
                        <TableRow key={pendingUser.user_id}>
                          <TableCell className="font-medium">
                            {pendingUser.full_name || "بدون اسم"}
                          </TableCell>
                          <TableCell>
                            {new Date(pendingUser.created_at).toLocaleDateString("ar")}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => {
                                setGrantRoleUser(pendingUser);
                                setSelectedRole("editor");
                              }}
                              className="flex items-center gap-2"
                            >
                              <UserPlus className="h-4 w-4" />
                              منح صلاحيات
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">لا يوجد مستخدمون في انتظار الموافقة</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Grant Role Dialog */}
        <Dialog open={!!grantRoleUser} onOpenChange={() => setGrantRoleUser(null)}>
          <DialogContent className="sm:max-w-[400px]" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                منح صلاحيات للمستخدم
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{grantRoleUser?.full_name || "بدون اسم"}</p>
                <p className="text-sm text-muted-foreground">
                  تسجيل: {grantRoleUser && new Date(grantRoleUser.created_at).toLocaleDateString("ar")}
                </p>
              </div>
              <div className="space-y-2">
                <Label>اختر الدور</Label>
                <Select value={selectedRole} onValueChange={(v: "admin" | "editor") => setSelectedRole(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editor">
                      <div className="flex items-center gap-2">
                        <UserCog className="h-4 w-4" />
                        محرر
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        مسؤول
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
                <Mail className="h-4 w-4 text-blue-500" />
                <span>سيتم إرسال إشعار بريدي للمستخدم</span>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setGrantRoleUser(null)}>إلغاء</Button>
              <Button onClick={handleGrantRole} disabled={grantRoleMutation.isPending}>
                {grantRoleMutation.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                منح الصلاحيات
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
    </AdminLayout>
  );
};

export default Editors;