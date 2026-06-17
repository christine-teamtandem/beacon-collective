
CREATE TABLE public.week_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program public.program_type NOT NULL,
  week_number int NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.week_lessons TO authenticated;
GRANT ALL ON public.week_lessons TO service_role;

ALTER TABLE public.week_lessons ENABLE ROW LEVEL SECURITY;

-- Read: admins always; users in matching program; mentors with mentees in that program
CREATE POLICY "view week lessons in program"
ON public.week_lessons FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.get_user_program(auth.uid()) = program
  OR EXISTS (
    SELECT 1 FROM public.mentor_assignments ma
    JOIN public.profiles p ON p.id = ma.mentee_id
    WHERE ma.mentor_id = auth.uid() AND p.program = week_lessons.program
  )
);

-- Insert: admins and mentors only, must own the row
CREATE POLICY "admin or mentor inserts lesson"
ON public.week_lessons FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'mentor'))
);

-- Update: author or admin
CREATE POLICY "author or admin updates lesson"
ON public.week_lessons FOR UPDATE TO authenticated
USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Delete: author or admin
CREATE POLICY "author or admin deletes lesson"
ON public.week_lessons FOR DELETE TO authenticated
USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_week_lessons_updated
BEFORE UPDATE ON public.week_lessons
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_week_lessons_program_week ON public.week_lessons(program, week_number, position);
