
-- 1. Privilege escalation: only allow self-assigning 'mentee'
DROP POLICY IF EXISTS "self assign role on signup" ON public.user_roles;
CREATE POLICY "self assign mentee on signup"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND role = 'mentee'::public.app_role);

-- 2. Mentees can read their own workbook entries
CREATE POLICY "mentee reads own workbook"
  ON public.workbook_entries
  FOR SELECT
  TO authenticated
  USING (mentee_id = auth.uid());

-- 3. Storage objects: UPDATE restricted to uploader or admin (resources buckets)
DROP POLICY IF EXISTS "uploader or admin updates file" ON storage.objects;
CREATE POLICY "uploader or admin updates file"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = ANY (ARRAY['resources-vanguard'::text, 'resources-flow'::text])
    AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
  )
  WITH CHECK (
    bucket_id = ANY (ARRAY['resources-vanguard'::text, 'resources-flow'::text])
    AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
  );

-- 4. Realtime authorization: enable RLS and deny-by-default
-- postgres_changes subscriptions use publications and are unaffected.
-- Broadcast/Presence require explicit policies; none are defined yet, so deny.
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny all realtime by default" ON realtime.messages;
CREATE POLICY "deny all realtime by default"
  ON realtime.messages
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);

-- 5. Lock down SECURITY DEFINER functions
-- Trigger-only functions: revoke from everyone
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_direct_thread() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_program_group_membership() FROM PUBLIC, anon, authenticated;

-- RLS helper functions: keep authenticated, revoke anon/public
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_user_program(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_program(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.is_thread_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_thread_member(uuid, uuid) TO authenticated;

-- bucket_program is IMMUTABLE SQL (not SECURITY DEFINER) but tighten anyway
REVOKE ALL ON FUNCTION public.bucket_program(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bucket_program(text) TO authenticated;
