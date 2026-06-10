
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('mentee', 'mentor', 'admin', 'parent');
CREATE TYPE public.program_type AS ENUM ('vanguard', 'flow');
CREATE TYPE public.log_category AS ENUM ('mentee_wins', 'engagement', 'family_liaison');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  program public.program_type,
  avatar_url TEXT,
  bio TEXT,
  age INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role function (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- get primary role helper
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
  ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'mentor' THEN 2 WHEN 'parent' THEN 3 WHEN 'mentee' THEN 4 END
  LIMIT 1
$$;

-- Mentor assignments
CREATE TABLE public.mentor_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(mentor_id, mentee_id)
);
GRANT SELECT, INSERT, DELETE ON public.mentor_assignments TO authenticated;
GRANT ALL ON public.mentor_assignments TO service_role;
ALTER TABLE public.mentor_assignments ENABLE ROW LEVEL SECURITY;

-- Parent links
CREATE TABLE public.parent_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(parent_id, child_id)
);
GRANT SELECT, INSERT, DELETE ON public.parent_links TO authenticated;
GRANT ALL ON public.parent_links TO service_role;
ALTER TABLE public.parent_links ENABLE ROW LEVEL SECURITY;

-- Weekly progress
CREATE TABLE public.weekly_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program public.program_type NOT NULL,
  week_number INT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  reflection TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(mentee_id, program, week_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_progress TO authenticated;
GRANT ALL ON public.weekly_progress TO service_role;
ALTER TABLE public.weekly_progress ENABLE ROW LEVEL SECURITY;

-- Tracking logs (mentor entries)
CREATE TABLE public.tracking_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category public.log_category NOT NULL,
  title TEXT NOT NULL,
  note TEXT,
  week_number INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tracking_logs TO authenticated;
GRANT ALL ON public.tracking_logs TO service_role;
ALTER TABLE public.tracking_logs ENABLE ROW LEVEL SECURITY;

-- Workbook entries
CREATE TABLE public.workbook_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_number INT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workbook_entries TO authenticated;
GRANT ALL ON public.workbook_entries TO service_role;
ALTER TABLE public.workbook_entries ENABLE ROW LEVEL SECURITY;

-- ===== POLICIES =====

-- profiles
CREATE POLICY "view own profile" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);
CREATE POLICY "view assigned mentee profile" ON public.profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.mentor_assignments WHERE mentor_id = auth.uid() AND mentee_id = profiles.id));
CREATE POLICY "view mentor profile if assigned" ON public.profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.mentor_assignments WHERE mentee_id = auth.uid() AND mentor_id = profiles.id));
CREATE POLICY "view child profile" ON public.profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.parent_links WHERE parent_id = auth.uid() AND child_id = profiles.id));
CREATE POLICY "admin view all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- user_roles (read own, admin reads all; insert only own self-assignment except admin)
CREATE POLICY "view own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "self assign role on signup" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND role <> 'admin');

-- mentor_assignments
CREATE POLICY "mentor sees own assignments" ON public.mentor_assignments FOR SELECT TO authenticated
  USING (mentor_id = auth.uid() OR mentee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manages assignments" ON public.mentor_assignments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin deletes assignments" ON public.mentor_assignments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- parent_links
CREATE POLICY "parent sees own links" ON public.parent_links FOR SELECT TO authenticated
  USING (parent_id = auth.uid() OR child_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manages parent links" ON public.parent_links FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin deletes parent links" ON public.parent_links FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- weekly_progress
CREATE POLICY "mentee manages own progress" ON public.weekly_progress FOR ALL TO authenticated
  USING (mentee_id = auth.uid()) WITH CHECK (mentee_id = auth.uid());
CREATE POLICY "mentor views assigned progress" ON public.weekly_progress FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.mentor_assignments WHERE mentor_id = auth.uid() AND mentee_id = weekly_progress.mentee_id));
CREATE POLICY "parent views child progress" ON public.weekly_progress FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.parent_links WHERE parent_id = auth.uid() AND child_id = weekly_progress.mentee_id));
CREATE POLICY "admin views all progress" ON public.weekly_progress FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- tracking_logs
CREATE POLICY "mentor manages own logs" ON public.tracking_logs FOR ALL TO authenticated
  USING (mentor_id = auth.uid()) WITH CHECK (mentor_id = auth.uid());
CREATE POLICY "mentee views logs about self" ON public.tracking_logs FOR SELECT TO authenticated
  USING (mentee_id = auth.uid());
CREATE POLICY "parent views child logs" ON public.tracking_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.parent_links WHERE parent_id = auth.uid() AND child_id = tracking_logs.mentee_id));
CREATE POLICY "admin views all logs" ON public.tracking_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- workbook_entries
CREATE POLICY "mentor manages own workbook" ON public.workbook_entries FOR ALL TO authenticated
  USING (mentor_id = auth.uid()) WITH CHECK (mentor_id = auth.uid());
CREATE POLICY "admin views all workbook" ON public.workbook_entries FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ===== TRIGGERS =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, program)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'program','')::public.program_type
  );
  -- Auto-assign role from signup metadata (defaults to mentee)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'role','')::public.app_role, 'mentee')
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_progress_updated BEFORE UPDATE ON public.weekly_progress
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_workbook_updated BEFORE UPDATE ON public.workbook_entries
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
