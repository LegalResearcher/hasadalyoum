import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, FolderOpen, Users, Eye, TrendingUp, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [postsRes, categoriesRes, authorsRes, viewsRes] = await Promise.all([
        supabase.from("posts").select("id", { count: "exact" }),
        supabase.from("categories").select("id", { count: "exact" }),
        supabase.from("authors").select("id", { count: "exact" }),
        supabase.from("post_views").select("id", { count: "exact" }),
      ]);

      return {
        posts: postsRes.count || 0,
        categories: categoriesRes.count || 0,
        authors: authorsRes.count || 0,
        views: viewsRes.count || 0,
      };
    },
  });

  const { data: recentPosts } = useQuery({
    queryKey: ["recent-posts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, title, status, created_at, views_count")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const { data: topPosts } = useQuery({
    queryKey: ["top-posts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, title, views_count")
        .order("views_count", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const statCards = [
    { label: "إجمالي الأخبار", value: stats?.posts || 0, icon: FileText, color: "text-blue-600" },
    { label: "الأقسام", value: stats?.categories || 0, icon: FolderOpen, color: "text-green-600" },
    { label: "الكتّاب", value: stats?.authors || 0, icon: Users, color: "text-purple-600" },
    { label: "إجمالي المشاهدات", value: stats?.views || 0, icon: Eye, color: "text-orange-600" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">لوحة التحكم</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <stat.icon className={`h-10 w-10 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Posts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                آخر الأخبار
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentPosts?.map((post) => (
                  <div key={post.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{post.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString("ar-SA")}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      post.status === "published" ? "bg-green-100 text-green-700" :
                      post.status === "draft" ? "bg-yellow-100 text-yellow-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {post.status === "published" ? "منشور" : 
                       post.status === "draft" ? "مسودة" : post.status}
                    </span>
                  </div>
                ))}
                {(!recentPosts || recentPosts.length === 0) && (
                  <p className="text-center text-muted-foreground py-4">لا توجد أخبار بعد</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Posts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                الأكثر قراءة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topPosts?.map((post, index) => (
                  <div key={post.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{post.title}</p>
                    </div>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      {post.views_count || 0}
                    </span>
                  </div>
                ))}
                {(!topPosts || topPosts.length === 0) && (
                  <p className="text-center text-muted-foreground py-4">لا توجد بيانات</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
