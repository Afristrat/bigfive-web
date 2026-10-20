-- mutation: la contrainte du seuil d'anonymat (au moins 5) est retirée
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint
            WHERE conrelid = 'private.settings'::regclass AND contype = 'c'
              AND pg_get_constraintdef(oid) LIKE '%seuil_anonymat%'
  LOOP
    EXECUTE format('ALTER TABLE private.settings DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;
