-- 1) chat_thread_members: remove self-insert branch
DROP POLICY IF EXISTS tm_insert_admin_or_self ON public.chat_thread_members;
CREATE POLICY tm_insert_admin_or_mentor ON public.chat_thread_members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'mentor'::public.app_role)
  );

-- 2) workbook_entries: split mentor policy; require assigned mentee on writes
DROP POLICY IF EXISTS "mentor manages own workbook" ON public.workbook_entries;
CREATE POLICY "mentor reads own workbook" ON public.workbook_entries
  FOR SELECT TO authenticated
  USING (mentor_id = auth.uid());
CREATE POLICY "mentor writes assigned workbook" ON public.workbook_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    mentor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.mentor_assignments ma
      WHERE ma.mentor_id = auth.uid() AND ma.mentee_id = workbook_entries.mentee_id
    )
  );
CREATE POLICY "mentor updates assigned workbook" ON public.workbook_entries
  FOR UPDATE TO authenticated
  USING (mentor_id = auth.uid())
  WITH CHECK (
    mentor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.mentor_assignments ma
      WHERE ma.mentor_id = auth.uid() AND ma.mentee_id = workbook_entries.mentee_id
    )
  );
CREATE POLICY "mentor deletes own workbook" ON public.workbook_entries
  FOR DELETE TO authenticated
  USING (mentor_id = auth.uid());

-- 3) sessions: restrict UPDATE to creator or admin
DROP POLICY IF EXISTS sessions_update_mentor_admin ON public.sessions;
CREATE POLICY sessions_update_creator_admin ON public.sessions
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );
DROP POLICY IF EXISTS sessions_delete_mentor_admin ON public.sessions;
CREATE POLICY sessions_delete_creator_admin ON public.sessions
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );