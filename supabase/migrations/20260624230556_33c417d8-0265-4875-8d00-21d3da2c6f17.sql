
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS birthday date,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS hobbies text[],
  ADD COLUMN IF NOT EXISTS favorites text,
  ADD COLUMN IF NOT EXISTS goals text,
  ADD COLUMN IF NOT EXISTS fun_facts text;

-- Column-level privileges: hide address from the Data API entirely
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (
  id, full_name, program, avatar_url, bio, age, created_at, updated_at, status,
  last_seen_announcements_at, managed_by_parent, notification_prefs,
  email, birthday, hobbies, favorites, goals, fun_facts
) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Secure read for the address column
CREATE OR REPLACE FUNCTION public.get_profile_address(_profile_id uuid)
RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_addr text; v_allowed boolean;
BEGIN
  v_allowed := (
    _profile_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.parent_links
      WHERE parent_id = auth.uid() AND child_id = _profile_id
    )
  );
  IF NOT v_allowed THEN RETURN NULL; END IF;
  SELECT address INTO v_addr FROM public.profiles WHERE id = _profile_id;
  RETURN v_addr;
END $$;

REVOKE ALL ON FUNCTION public.get_profile_address(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profile_address(uuid) TO authenticated;
