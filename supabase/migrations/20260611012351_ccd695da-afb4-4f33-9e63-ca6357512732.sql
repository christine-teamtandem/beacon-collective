
-- ===== profiles addition =====
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_announcements_at timestamptz DEFAULT now();

-- ===== sessions =====
CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program public.program_type NOT NULL,
  cohort text,
  mentor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  zoom_url text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;
GRANT ALL ON public.sessions TO service_role;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_select_same_program" ON public.sessions FOR SELECT TO authenticated
  USING (program = public.get_user_program(auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sessions_insert_mentor_admin" ON public.sessions FOR INSERT TO authenticated
  WITH CHECK (
    (public.has_role(auth.uid(), 'mentor') AND program = public.get_user_program(auth.uid()))
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "sessions_update_mentor_admin" ON public.sessions FOR UPDATE TO authenticated
  USING (
    (public.has_role(auth.uid(), 'mentor') AND program = public.get_user_program(auth.uid()))
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "sessions_delete_mentor_admin" ON public.sessions FOR DELETE TO authenticated
  USING (
    (public.has_role(auth.uid(), 'mentor') AND program = public.get_user_program(auth.uid()))
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE TRIGGER sessions_touch BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== announcements =====
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program public.program_type NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ann_select_same_program" ON public.announcements FOR SELECT TO authenticated
  USING (program = public.get_user_program(auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ann_insert_mentor_admin" ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (
    (public.has_role(auth.uid(), 'mentor') AND program = public.get_user_program(auth.uid()))
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "ann_update_owner_admin" ON public.announcements FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ann_delete_owner_admin" ON public.announcements FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER ann_touch BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== chat =====
CREATE TYPE public.thread_kind AS ENUM ('direct', 'group');

CREATE TABLE public.chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.thread_kind NOT NULL,
  program public.program_type,
  cohort text,
  title text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_thread_members (
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX chat_messages_thread_idx ON public.chat_messages(thread_id, created_at DESC);
CREATE INDEX chat_thread_members_user_idx ON public.chat_thread_members(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_threads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_thread_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_threads, public.chat_thread_members, public.chat_messages TO service_role;

-- Helper: is the caller a member of a thread? SECURITY DEFINER to avoid recursive RLS on members.
CREATE OR REPLACE FUNCTION public.is_thread_member(_thread_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.chat_thread_members WHERE thread_id = _thread_id AND user_id = _user_id)
$$;

ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_thread_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "threads_select_member_or_admin" ON public.chat_threads FOR SELECT TO authenticated
  USING (public.is_thread_member(id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "threads_insert_admin" ON public.chat_threads FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'mentor'));

CREATE POLICY "tm_select_self_or_admin" ON public.chat_thread_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_thread_member(thread_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "tm_insert_admin_or_self" ON public.chat_thread_members FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'mentor') OR user_id = auth.uid());
CREATE POLICY "tm_update_self" ON public.chat_thread_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "msg_select_members" ON public.chat_messages FOR SELECT TO authenticated
  USING (public.is_thread_member(thread_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "msg_insert_members" ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_thread_member(thread_id, auth.uid()));
CREATE POLICY "msg_delete_owner_or_admin" ON public.chat_messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Trigger: auto direct thread when mentor_assignments row added
CREATE OR REPLACE FUNCTION public.ensure_direct_thread()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_thread_id uuid;
  v_program public.program_type;
BEGIN
  SELECT program INTO v_program FROM public.profiles WHERE id = NEW.mentee_id;

  SELECT t.id INTO v_thread_id
  FROM public.chat_threads t
  WHERE t.kind = 'direct'
    AND EXISTS (SELECT 1 FROM public.chat_thread_members m WHERE m.thread_id = t.id AND m.user_id = NEW.mentee_id)
    AND EXISTS (SELECT 1 FROM public.chat_thread_members m WHERE m.thread_id = t.id AND m.user_id = NEW.mentor_id)
  LIMIT 1;

  IF v_thread_id IS NULL THEN
    INSERT INTO public.chat_threads (kind, program, title) VALUES ('direct', v_program, NULL) RETURNING id INTO v_thread_id;
    INSERT INTO public.chat_thread_members (thread_id, user_id) VALUES (v_thread_id, NEW.mentee_id), (v_thread_id, NEW.mentor_id);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER mentor_assignment_direct_thread AFTER INSERT ON public.mentor_assignments
  FOR EACH ROW EXECUTE FUNCTION public.ensure_direct_thread();

-- Trigger: auto-add to program group thread when program is set/changed on profile
CREATE OR REPLACE FUNCTION public.ensure_program_group_membership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_thread_id uuid;
BEGIN
  IF NEW.program IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.program IS NOT DISTINCT FROM NEW.program THEN RETURN NEW; END IF;

  SELECT id INTO v_thread_id FROM public.chat_threads WHERE kind = 'group' AND program = NEW.program AND cohort IS NULL LIMIT 1;
  IF v_thread_id IS NULL THEN
    INSERT INTO public.chat_threads (kind, program, title)
    VALUES ('group', NEW.program, CASE NEW.program WHEN 'vanguard' THEN 'Vanguard Brotherhood' WHEN 'flow' THEN 'Flow Collective' END)
    RETURNING id INTO v_thread_id;
  END IF;

  INSERT INTO public.chat_thread_members (thread_id, user_id) VALUES (v_thread_id, NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER profile_program_group AFTER INSERT OR UPDATE OF program ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.ensure_program_group_membership();

-- Backfill: program group threads + members for existing profiles
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT id, program FROM public.profiles WHERE program IS NOT NULL LOOP
    PERFORM public.ensure_program_group_membership() FROM (SELECT 1) s;
  END LOOP;
END $$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
