ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS source_url TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS posts_source_url_unique ON public.posts(source_url) WHERE source_url IS NOT NULL;
GRANT INSERT ON public.posts TO anon;
DROP POLICY IF EXISTS "Allow anon insert for external scripts" ON public.posts;
CREATE POLICY "Allow anon insert for external scripts" ON public.posts FOR INSERT TO anon WITH CHECK (true);