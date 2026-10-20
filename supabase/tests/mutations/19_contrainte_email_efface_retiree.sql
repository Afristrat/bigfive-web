-- mutation: la contrainte « adresse effacée à l'acceptation » est retirée de app.invitations
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint
            WHERE conrelid = 'app.invitations'::regclass AND contype = 'c'
              AND pg_get_constraintdef(oid) LIKE '%(acceptee_le IS NULL) = (email IS NOT NULL)%'
  LOOP
    EXECUTE format('ALTER TABLE app.invitations DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;
