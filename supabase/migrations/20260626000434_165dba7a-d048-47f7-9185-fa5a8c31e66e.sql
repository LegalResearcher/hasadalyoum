
-- ============ NEW COLUMNS ON posts ============
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS badge TEXT;
CREATE INDEX IF NOT EXISTS idx_posts_is_pinned ON public.posts(is_pinned);
CREATE INDEX IF NOT EXISTS idx_posts_views ON public.posts(views_count DESC);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON public.posts(slug);

-- ============ is_editor() ============
CREATE OR REPLACE FUNCTION public.is_editor(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'editor')
$$;

-- ============ increment_views ============
CREATE OR REPLACE FUNCTION public.increment_views(post_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.posts SET views_count = COALESCE(views_count, 0) + 1 WHERE id = post_id;
END;
$$;

-- ============ post_media ============
CREATE TABLE IF NOT EXISTS public.post_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image','video','youtube')),
  media_url TEXT NOT NULL,
  caption TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.post_media TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_media TO authenticated;
GRANT ALL ON public.post_media TO service_role;
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "post_media read all" ON public.post_media FOR SELECT USING (true);
CREATE POLICY "post_media admin/editor insert" ON public.post_media FOR INSERT WITH CHECK (public.is_admin_or_editor(auth.uid()));
CREATE POLICY "post_media admin/editor update" ON public.post_media FOR UPDATE USING (public.is_admin_or_editor(auth.uid()));
CREATE POLICY "post_media admin/editor delete" ON public.post_media FOR DELETE USING (public.is_admin_or_editor(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_post_media_post_id ON public.post_media(post_id);

-- ============ notification_settings ============
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN DEFAULT true,
  vapid_public_key TEXT,
  vapid_private_key TEXT,
  notify_on_new_post BOOLEAN DEFAULT true,
  notify_on_breaking BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notification_settings TO anon, authenticated;
GRANT ALL ON public.notification_settings TO service_role;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif read all" ON public.notification_settings FOR SELECT USING (true);
CREATE POLICY "notif admin insert" ON public.notification_settings FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "notif admin update" ON public.notification_settings FOR UPDATE USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_notif_updated BEFORE UPDATE ON public.notification_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ push_subscriptions ============
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push own select" ON public.push_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "push own insert" ON public.push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "push own delete" ON public.push_subscriptions FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "push admin select" ON public.push_subscriptions FOR SELECT USING (public.has_role(auth.uid(),'admin'));

-- ============ ad_banners ============
CREATE TABLE IF NOT EXISTS public.ad_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  image_url TEXT,
  html_code TEXT,
  link_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ad_banners TO anon, authenticated;
GRANT ALL ON public.ad_banners TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.ad_banners TO authenticated;
ALTER TABLE public.ad_banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ads read all" ON public.ad_banners FOR SELECT USING (true);
CREATE POLICY "ads admin insert" ON public.ad_banners FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "ads admin update" ON public.ad_banners FOR UPDATE USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "ads admin delete" ON public.ad_banners FOR DELETE USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_ads_updated BEFORE UPDATE ON public.ad_banners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ category_settings ============
CREATE TABLE IF NOT EXISTS public.category_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  display_style TEXT DEFAULT 'grid',
  posts_per_page INT DEFAULT 12,
  show_in_menu BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.category_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.category_settings TO authenticated;
GRANT ALL ON public.category_settings TO service_role;
ALTER TABLE public.category_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "catset read all" ON public.category_settings FOR SELECT USING (true);
CREATE POLICY "catset admin insert" ON public.category_settings FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "catset admin update" ON public.category_settings FOR UPDATE USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "catset admin delete" ON public.category_settings FOR DELETE USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_catset_updated BEFORE UPDATE ON public.category_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ migrations_log ============
CREATE TABLE IF NOT EXISTS public.migrations_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_name TEXT NOT NULL,
  description TEXT,
  sql_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.migrations_log TO authenticated;
GRANT ALL ON public.migrations_log TO service_role;
ALTER TABLE public.migrations_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mlog admin select" ON public.migrations_log FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "mlog admin insert" ON public.migrations_log FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'));
