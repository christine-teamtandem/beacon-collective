
-- 1) chat_thread_members: remove self-add to any thread
DROP POLICY IF EXISTS tm_insert_admin_or_member ON public.chat_thread_members;
CREATE POLICY tm_insert_admin_or_member ON public.chat_thread_members
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    public.has_role(auth.uid(), 'mentor'::public.app_role)
    AND public.is_thread_member(thread_id, auth.uid())
  )
);

-- 2) sessions.zoom_start_url: hide privileged host URL from clients via column privileges
REVOKE SELECT ON public.sessions FROM authenticated;
GRANT SELECT (
  id, program, cohort, mentor_id, created_by, title, description,
  starts_at, ends_at, zoom_url, zoom_meeting_id, zoom_passcode,
  created_at, updated_at
) ON public.sessions TO authenticated;
-- service_role keeps full access (granted by default via GRANT ALL elsewhere; ensure it)
GRANT ALL ON public.sessions TO service_role;

-- 3) storage objects: mentors can only upload to their own program's bucket
DROP POLICY IF EXISTS "mentors and admins upload program files" ON storage.objects;
CREATE POLICY "mentors and admins upload program files" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = ANY (ARRAY['resources-vanguard'::text, 'resources-flow'::text])
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      public.has_role(auth.uid(), 'mentor'::public.app_role)
      AND public.get_user_program(auth.uid()) = public.bucket_program(bucket_id)
    )
  )
);

-- 4) tracking_logs UPDATE: prevent reassigning to a different mentee
DROP POLICY IF EXISTS "mentor updates logs for assigned mentees" ON public.tracking_logs;
CREATE POLICY "mentor updates logs for assigned mentees" ON public.tracking_logs
FOR UPDATE TO authenticated
USING (
  mentor_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.mentor_assignments ma
    WHERE ma.mentor_id = auth.uid()
      AND ma.mentee_id = tracking_logs.mentee_id
  )
)
WITH CHECK (
  mentor_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.mentor_assignments ma
    WHERE ma.mentor_id = auth.uid()
      AND ma.mentee_id = tracking_logs.mentee_id
  )
);
