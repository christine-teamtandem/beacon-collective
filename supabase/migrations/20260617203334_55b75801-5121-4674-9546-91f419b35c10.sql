
-- 1) Hide zoom_start_url from authenticated users (host URL grants meeting control)
REVOKE SELECT (zoom_start_url) ON public.sessions FROM authenticated;
REVOKE SELECT (zoom_start_url) ON public.sessions FROM anon;
-- service_role retains full access via GRANT ALL

-- 2) chat_thread_members: mentor can only add to threads they're already in
DROP POLICY IF EXISTS tm_insert_admin_or_mentor ON public.chat_thread_members;
CREATE POLICY tm_insert_admin_or_member ON public.chat_thread_members
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR (
    public.has_role(auth.uid(), 'mentor')
    AND public.is_thread_member(thread_id, auth.uid())
  )
  OR user_id = auth.uid()
);

-- 3) tracking_logs: scope DELETE to current assignment
DROP POLICY IF EXISTS "mentor deletes own logs" ON public.tracking_logs;
CREATE POLICY "mentor deletes own logs" ON public.tracking_logs
FOR DELETE TO authenticated
USING (
  mentor_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.mentor_assignments ma
    WHERE ma.mentor_id = auth.uid() AND ma.mentee_id = tracking_logs.mentee_id
  )
);

-- 4) workbook_entries: scope DELETE to current assignment
DROP POLICY IF EXISTS "mentor deletes own workbook" ON public.workbook_entries;
CREATE POLICY "mentor deletes own workbook" ON public.workbook_entries
FOR DELETE TO authenticated
USING (
  mentor_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.mentor_assignments ma
    WHERE ma.mentor_id = auth.uid() AND ma.mentee_id = workbook_entries.mentee_id
  )
);
