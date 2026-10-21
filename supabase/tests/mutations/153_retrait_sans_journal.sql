-- mutation: le retrait ne journalise plus
DO $$
DECLARE
  d text := pg_get_functiondef('app.retirer_compte_sans_appartenance(uuid)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$PERFORM private.journaliser(p_utilisateur, 'compte.retirer_orphelin', 'utilisateur', p_utilisateur);$a$, $b$$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
