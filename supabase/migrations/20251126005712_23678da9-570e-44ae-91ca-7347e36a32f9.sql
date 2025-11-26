
-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'author');

-- Create enum for post status
CREATE TYPE public.post_status AS ENUM ('draft', 'scheduled', 'published', 'hidden');

-- Create user_roles table (CRITICAL: separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'author',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create categories table
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    display_order INT DEFAULT 0,
    posts_count INT DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create authors table (for opinions section)
CREATE TABLE public.authors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tags table
CREATE TABLE public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    usage_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create posts table
CREATE TABLE public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    excerpt TEXT,
    content TEXT,
    featured_image TEXT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    author_id UUID REFERENCES public.authors(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    source_type TEXT DEFAULT 'حصاد اليوم | خاص',
    external_video_url TEXT,
    status post_status DEFAULT 'draft',
    is_featured BOOLEAN DEFAULT false,
    is_breaking BOOLEAN DEFAULT false,
    views_count INT DEFAULT 0,
    word_count INT DEFAULT 0,
    reading_time INT DEFAULT 0,
    meta_title TEXT,
    meta_description TEXT,
    meta_keywords TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    hide_after TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create post_tags junction table
CREATE TABLE public.post_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
    UNIQUE (post_id, tag_id)
);

-- Create post_revisions table
CREATE TABLE public.post_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    title TEXT,
    content TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create post_views table for analytics
CREATE TABLE public.post_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create breaking_news table
CREATE TABLE public.breaking_news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    text TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create media table
CREATE TABLE public.media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    filename TEXT,
    file_type TEXT,
    file_size INT,
    alt_text TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create site_settings table
CREATE TABLE public.site_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breaking_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is admin or editor
CREATE OR REPLACE FUNCTION public.is_admin_or_editor(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'editor')
  )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for categories (public read, admin write)
CREATE POLICY "Categories are viewable by everyone" ON public.categories
FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories" ON public.categories
FOR ALL USING (public.is_admin_or_editor(auth.uid()));

-- RLS Policies for authors (public read, admin write)
CREATE POLICY "Authors are viewable by everyone" ON public.authors
FOR SELECT USING (true);

CREATE POLICY "Admins can manage authors" ON public.authors
FOR ALL USING (public.is_admin_or_editor(auth.uid()));

-- RLS Policies for tags (public read, authenticated write)
CREATE POLICY "Tags are viewable by everyone" ON public.tags
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage tags" ON public.tags
FOR ALL USING (public.is_admin_or_editor(auth.uid()));

-- RLS Policies for posts
CREATE POLICY "Published posts are viewable by everyone" ON public.posts
FOR SELECT USING (status = 'published' OR (auth.uid() IS NOT NULL AND public.is_admin_or_editor(auth.uid())));

CREATE POLICY "Admins and editors can insert posts" ON public.posts
FOR INSERT WITH CHECK (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Admins and editors can update posts" ON public.posts
FOR UPDATE USING (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Admins can delete posts" ON public.posts
FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for post_tags
CREATE POLICY "Post tags are viewable by everyone" ON public.post_tags
FOR SELECT USING (true);

CREATE POLICY "Admins can manage post tags" ON public.post_tags
FOR ALL USING (public.is_admin_or_editor(auth.uid()));

-- RLS Policies for post_revisions
CREATE POLICY "Admins can view revisions" ON public.post_revisions
FOR SELECT USING (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Admins can manage revisions" ON public.post_revisions
FOR ALL USING (public.is_admin_or_editor(auth.uid()));

-- RLS Policies for post_views (public insert for tracking)
CREATE POLICY "Anyone can insert views" ON public.post_views
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view analytics" ON public.post_views
FOR SELECT USING (public.is_admin_or_editor(auth.uid()));

-- RLS Policies for breaking_news
CREATE POLICY "Breaking news is viewable by everyone" ON public.breaking_news
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage breaking news" ON public.breaking_news
FOR ALL USING (public.is_admin_or_editor(auth.uid()));

-- RLS Policies for media
CREATE POLICY "Media is viewable by everyone" ON public.media
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can upload media" ON public.media
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage their own media" ON public.media
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any media" ON public.media
FOR DELETE USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);

-- RLS Policies for site_settings
CREATE POLICY "Site settings are viewable by everyone" ON public.site_settings
FOR SELECT USING (true);

CREATE POLICY "Admins can manage site settings" ON public.site_settings
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_authors_updated_at BEFORE UPDATE ON public.authors
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.categories (name, slug, display_order, posts_count) VALUES
('أخبار محلية', 'local-news', 1, 5),
('أخبار وتقارير', 'news-reports', 2, 5),
('اليمن في الصحافة', 'yemen-press', 3, 4),
('شؤون دولية', 'international', 4, 3),
('آراء واتجاهات', 'opinions', 5, 4),
('علوم وتكنولوجيا', 'technology', 6, 2),
('رياضة', 'sports', 7, 3),
('فيديو حصاد اليوم', 'video', 8, 3),
('عاجل', 'breaking', 9, 0);

-- Create storage bucket for post images
INSERT INTO storage.buckets (id, name, public) VALUES ('post-images', 'post-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('author-avatars', 'author-avatars', true);

-- Storage policies
CREATE POLICY "Post images are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'post-images');

CREATE POLICY "Authenticated users can upload post images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'post-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Author avatars are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'author-avatars');

CREATE POLICY "Admins can upload author avatars" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'author-avatars' AND auth.uid() IS NOT NULL);
