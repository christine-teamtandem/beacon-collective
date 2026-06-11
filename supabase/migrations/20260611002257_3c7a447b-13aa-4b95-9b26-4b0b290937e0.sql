
CREATE OR REPLACE FUNCTION public.bucket_program(_bucket text)
RETURNS public.program_type LANGUAGE sql IMMUTABLE SET search_path = public
AS $$
  SELECT CASE _bucket
    WHEN 'resources-vanguard' THEN 'vanguard'::public.program_type
    WHEN 'resources-flow' THEN 'flow'::public.program_type
  END
$$;
