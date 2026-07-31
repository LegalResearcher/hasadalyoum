import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Article from "./pages/Article";
import ArticleLegacyRedirect from "./pages/ArticleLegacyRedirect";
import Category from "./pages/Category";
import MostReadPage from "./pages/MostReadPage";
import RSSFeedsPage from "./pages/RSSFeedsPage";
import PostRedirect from "./pages/PostRedirect";
import NewsSlugRedirect from "./pages/NewsSlugRedirect";
import NotFound from "./pages/NotFound";

// تحميل كسول (code-split) لصفحة الدخول ولوحة التحكم بالكامل — هذي الصفحات
// يستخدمها المحررون فقط، مو القارئ العادي، فما لها داعي تنزل ضمن حزمة JS
// الأساسية اللي يحمّلها كل زائر يفتح الموقع عشان يقرا خبر.
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const Posts = lazy(() => import("./pages/admin/Posts"));
const PostEditor = lazy(() => import("./pages/admin/PostEditor"));
const Categories = lazy(() => import("./pages/admin/Categories"));
const Authors = lazy(() => import("./pages/admin/Authors"));
const BreakingNewsAdmin = lazy(() => import("./pages/admin/BreakingNews"));
const Media = lazy(() => import("./pages/admin/Media"));
const Tags = lazy(() => import("./pages/admin/Tags"));
const Settings = lazy(() => import("./pages/admin/Settings"));
const Profile = lazy(() => import("./pages/admin/Profile"));
const Editors = lazy(() => import("./pages/admin/Editors"));
const Ads = lazy(() => import("./pages/admin/Ads"));
const Maintenance = lazy(() => import("./pages/admin/Maintenance"));

const queryClient = new QueryClient();

// شاشة تحميل بسيطة تظهر لحظة تنزيل حزمة الدخول/لوحة التحكم فقط
const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" closeButton richColors />
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/article/:slug" element={<ArticleLegacyRedirect />} />
            <Route path="/:year/:month/:day/:slug" element={<Article />} />
            <Route path="/category/:slug" element={<Category />} />
            <Route path="/most-read" element={<MostReadPage />} />
            <Route path="/feed" element={<RSSFeedsPage />} />
            <Route path="/post/:id" element={<PostRedirect />} />
            <Route path="/news/:slug" element={<NewsSlugRedirect />} />

            {/* Auth */}
            <Route path="/auth" element={<Auth />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<Dashboard />} />
            <Route path="/admin/posts" element={<Posts />} />
            <Route path="/admin/posts/new" element={<PostEditor />} />
            <Route path="/admin/posts/:id" element={<PostEditor />} />
            <Route path="/admin/categories" element={<Categories />} />
            <Route path="/admin/authors" element={<Authors />} />
            <Route path="/admin/breaking" element={<BreakingNewsAdmin />} />
            <Route path="/admin/media" element={<Media />} />
            <Route path="/admin/tags" element={<Tags />} />
            <Route path="/admin/settings" element={<Settings />} />
            <Route path="/admin/profile" element={<Profile />} />
            <Route path="/admin/editors" element={<Editors />} />
            <Route path="/admin/ads" element={<Ads />} />
            <Route path="/admin/maintenance" element={<Maintenance />} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
