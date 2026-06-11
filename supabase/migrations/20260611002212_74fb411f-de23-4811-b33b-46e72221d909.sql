
-- Profile status enum
CREATE TYPE public.profile_status AS ENUM ('active','pending','inactive');
ALTER TABLE public.profiles ADD COLUMN status public.profile_status NOT NULL DEFAULT 'pending';

-- Helper: get user's program
CREATE OR REPLACE FUNCTION public.get_user_program(_user_id uuid)
RETURNS public.program_type
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT program FROM public.profiles WHERE id = _user_id $$;

-- Resources library
CREATE TABLE public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program public.program_type NOT NULL,
  week_number int,
  kind text NOT NULL DEFAULT 'file', -- 'file' | 'link'
  title text NOT NULL,
  description text,
  storage_bucket text,
  storage_path text,
  external_url text,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.resources TO authenticated;
GRANT ALL ON public.resources TO service_role;

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members of program can view resources"
ON public.resources FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.get_user_program(auth.uid()) = program
  OR EXISTS (
    SELECT 1 FROM public.mentor_assignments ma
    JOIN public.profiles p ON p.id = ma.mentee_id
    WHERE ma.mentor_id = auth.uid() AND p.program = resources.program
  )
);

CREATE POLICY "mentors and admins can insert resources"
ON public.resources FOR INSERT TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'mentor'))
);

CREATE POLICY "uploader or admin can update"
ON public.resources FOR UPDATE TO authenticated
USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "uploader or admin can delete"
ON public.resources FOR DELETE TO authenticated
USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_resources_updated BEFORE UPDATE ON public.resources
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
