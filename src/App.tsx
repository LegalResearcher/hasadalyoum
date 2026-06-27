import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Article from "./pages/Article";
import Category from "./pages/Category";
import MostReadPage from "./pages/MostReadPage";
import RSSFeedsPage from "./pages/RSSFeedsPage";
import Auth from "./pages/Auth";
import Dashboard from "./pages/admin/Dashboard";
import Posts from "./pages/admin/Posts";
import PostEditor from "./pages/admin/PostEditor";
import Categories from "./pages/admin/Categories";
import Authors from "./pages/admin/Authors";
import BreakingNewsAdmin from "./pages/admin/BreakingNews";
import Media from "./pages/admin/Media";
import Tags from "./pages/admin/Tags";
import Settings from "./pages/admin/Settings";
import Profile from "./pages/admin/Profile";
import Editors from "./pages/admin/Editors";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Index />} />
          <Route path="/article/:slug" element={<Article />} />
          <Route path="/category/:slug" element={<Category />} />
          <Route path="/most-read" element={<MostReadPage />} />
          <Route path="/feed" element={<RSSFeedsPage />} />
          
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
          
          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
