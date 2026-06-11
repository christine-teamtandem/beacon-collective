
CREATE OR REPLACE FUNCTION public.bucket_program(_bucket text)
RETURNS public.program_type LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _bucket
    WHEN 'resources-vanguard' THEN 'vanguard'::public.program_type
    WHEN 'resources-flow' THEN 'flow'::public.program_type
  END
$$;

CREATE POLICY "members read program files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id IN ('resources-vanguard','resources-flow') AND (
    public.has_role(auth.uid(),'admin')
    OR public.get_user_program(auth.uid()) = public.bucket_program(bucket_id)
    OR EXISTS (
      SELECT 1 FROM public.mentor_assignments ma
      JOIN public.profiles p ON p.id = ma.mentee_id
      WHERE ma.mentor_id = auth.uid() AND p.program = public.bucket_program(bucket_id)
    )
  )
);

CREATE POLICY "mentors and admins upload program files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('resources-vanguard','resources-flow')
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'mentor'))
);

CREATE POLICY "uploader or admin deletes file"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id IN ('resources-vanguard','resources-flow')
  AND (owner = auth.uid() OR public.has_role(auth.uid(),'admin'))
);
