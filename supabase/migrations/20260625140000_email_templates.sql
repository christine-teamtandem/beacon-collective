-- Email template library: reusable, AI-generated or hand-built email layouts.
-- Templates are a shared library for staff (admins + mentors) who can compose email.

CREATE TABLE IF NOT EXISTS public.email_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  description   text,
  subject       text,
  html          text NOT NULL DEFAULT '',
  -- Structured block model for the drag-and-drop builder (null for raw-HTML templates).
  blocks        jsonb,
  thumbnail_url text,
  created_by    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_templates_created_by_idx ON public.email_templates(created_by);
CREATE INDEX IF NOT EXISTS email_templates_updated_at_idx ON public.email_templates(updated_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
GRANT ALL ON public.email_templates TO service_role;

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Read: any staff member who can send email (admin or mentor) sees the shared library.
CREATE POLICY "staff read templates" ON public.email_templates
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'mentor'::public.app_role)
  );

-- Insert: staff create templates owned by themselves.
CREATE POLICY "staff create own templates" ON public.email_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'mentor'::public.app_role)
    )
  );

-- Update: owner, or any admin.
CREATE POLICY "owner or admin update templates" ON public.email_templates
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- Delete: owner, or any admin.
CREATE POLICY "owner or admin delete templates" ON public.email_templates
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
