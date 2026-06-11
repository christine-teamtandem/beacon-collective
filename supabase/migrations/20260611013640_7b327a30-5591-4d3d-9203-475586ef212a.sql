
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS managed_by_parent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT '{"announcement":true,"message":true,"session_reminder":true,"curriculum_upload":true}'::jsonb;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT public.has_role(_user_id, 'admin'::public.app_role) $$;
