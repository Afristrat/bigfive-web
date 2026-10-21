-- mutation: la règle de verrou de ligne laisse tenga_owner modifier private.tenga_admins (WITH CHECK (true))
DO $$
DECLARE
  d text;
BEGIN
  SELECT p.qual INTO d FROM pg_policies p
   WHERE p.schemaname = 'private' AND p.tablename = 'tenga_admins' AND p.policyname = 'tenga_admins_verrou_owner';
  IF d IS NULL OR length(d) - length(replace(d, 'suis_admin_tenga()', '')) <> length('suis_admin_tenga()') THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  ALTER POLICY tenga_admins_verrou_owner ON private.tenga_admins WITH CHECK (true);
END $$;
