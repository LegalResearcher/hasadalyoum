CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS public._keep_alive (
  id integer PRIMARY KEY DEFAULT 1,
  pinged_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT _keep_alive_single_row CHECK (id = 1)
);

REVOKE ALL ON public._keep_alive FROM anon, authenticated;
GRANT ALL ON public._keep_alive TO service_role;

ALTER TABLE public._keep_alive ENABLE ROW LEVEL SECURITY;

INSERT INTO public._keep_alive (id, pinged_at) VALUES (1, now()) ON CONFLICT (id) DO NOTHING;