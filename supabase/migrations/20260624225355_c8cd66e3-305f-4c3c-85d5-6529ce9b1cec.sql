
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS zoom_passcode text;

CREATE TABLE IF NOT EXISTS public.weekly_checkin_sends (
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  sent_for_week date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, user_id, sent_for_week)
);

GRANT ALL ON public.weekly_checkin_sends TO service_role;

ALTER TABLE public.weekly_checkin_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view checkin sends"
  ON public.weekly_checkin_sends FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));
