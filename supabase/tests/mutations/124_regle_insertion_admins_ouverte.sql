-- mutation: la règle d'insertion de tenga_owner dans private.tenga_admins n'est plus liée à l'appelant (revenue à WITH CHECK (true))
DO $$
DECLARE
  d text;
BEGIN
  SELECT p.with_check INTO d FROM pg_policies p
   WHERE p.schemaname = 'private' AND p.tablename = 'tenga_admins' AND p.policyname = 'tenga_admins_insertion_owner';
  IF d IS NULL OR length(d) - length(replace(d, 'suis_admin_tenga()', '')) <> length('suis_admin_tenga()') THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  ALTER POLICY tenga_admins_insertion_owner ON private.tenga_admins WITH CHECK (true);
END $$;
