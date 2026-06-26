-- Vanguard / Flow session workflow: link sessions to a participant mentee.
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS participant_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS sessions_participant_id_idx ON public.sessions (participant_id);

COMMENT ON COLUMN public.sessions.participant_id IS
  'Primary mentee participant for 1:1 sessions; used for confirmation emails and calendar invites.';
