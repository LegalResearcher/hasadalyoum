CREATE OR REPLACE FUNCTION public.get_bot_post_status(_post_id uuid)
RETURNS TABLE(found boolean, status text, slug text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT true, p.status::text, p.slug, p.created_at
  FROM public.posts p
  WHERE p.id = _post_id
  UNION ALL
  SELECT false, NULL::text, NULL::text, NULL::timestamptz
  WHERE NOT EXISTS (SELECT 1 FROM public.posts p WHERE p.id = _post_id)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_bot_post_status(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_bot_post_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bot_post_status(uuid) TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'authors'
      AND policyname = 'authors_bot_insert'
  ) THEN
    CREATE POLICY "authors_bot_insert"
    ON public.authors
    FOR INSERT
    TO anon
    WITH CHECK (true);
  END IF;
END $$;