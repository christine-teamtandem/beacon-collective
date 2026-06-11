-- Fix tracking_logs: mentor can only log for assigned mentees
DROP POLICY IF EXISTS "mentor manages own logs" ON public.tracking_logs;
CREATE POLICY "mentor manages own logs select" ON public.tracking_logs
  FOR SELECT TO authenticated
  USING (mentor_id = auth.uid());
CREATE POLICY "mentor inserts logs for assigned mentees" ON public.tracking_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    mentor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.mentor_assignments ma
      WHERE ma.mentor_id = auth.uid() AND ma.mentee_id = tracking_logs.mentee_id
    )
  );
CREATE POLICY "mentor updates logs for assigned mentees" ON public.tracking_logs
  FOR UPDATE TO authenticated
  USING (mentor_id = auth.uid())
  WITH CHECK (
    mentor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.mentor_assignments ma
      WHERE ma.mentor_id = auth.uid() AND ma.mentee_id = tracking_logs.mentee_id
    )
  );
CREATE POLICY "mentor deletes own logs" ON public.tracking_logs
  FOR DELETE TO authenticated
  USING (mentor_id = auth.uid());

-- user_roles: admin UPDATE/DELETE policies
CREATE POLICY "admins update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "admins delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- zoom_connections: explicit INSERT/UPDATE ownership
CREATE POLICY "user inserts own zoom connection" ON public.zoom_connections
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "user updates own zoom connection" ON public.zoom_connections
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- zoom_oauth_states: server-only via service role. Add a deny-all-by-default policy so RLS is explicit.
CREATE POLICY "no client access to oauth states" ON public.zoom_oauth_states
  FOR ALL TO authenticated, anon
  USING (false)
  WITH CHECK (false);