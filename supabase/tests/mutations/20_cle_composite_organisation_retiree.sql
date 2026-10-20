-- mutation: la clé étrangère composite (participation, organisation) est retirée de app.results
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint
            WHERE conrelid = 'app.results'::regclass AND contype = 'f'
              AND pg_get_constraintdef(oid) LIKE 'FOREIGN KEY (participation_id, organization_id)%'
  LOOP
    EXECUTE format('ALTER TABLE app.results DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;
