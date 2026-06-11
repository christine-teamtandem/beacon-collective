
-- Zoom OAuth connection per user
CREATE TABLE public.zoom_connections (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  zoom_user_id text,
  zoom_email text,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  scope text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.zoom_connections TO authenticated;
GRANT ALL ON public.zoom_connections TO service_role;

ALTER TABLE public.zoom_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "zoom_conn_owner_select" ON public.zoom_connections
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "zoom_conn_owner_delete" ON public.zoom_connections
  FOR DELETE TO authenticated USING (user_id = auth.uid());
-- INSERT/UPDATE only via service_role (server fn), no policy needed for authenticated.

CREATE TRIGGER zoom_connections_updated_at
  BEFORE UPDATE ON public.zoom_connections
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Track which Zoom meeting backs a session
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS zoom_meeting_id text;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS zoom_start_url text;

-- Short-lived OAuth state tokens (CSRF protection for callback)
CREATE TABLE public.zoom_oauth_states (
  state text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.zoom_oauth_states TO service_role;
ALTER TABLE public.zoom_oauth_states ENABLE ROW LEVEL SECURITY;
-- no policies — accessed only via service_role from server routes
