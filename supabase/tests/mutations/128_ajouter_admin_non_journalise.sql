-- mutation: ajouter_admin_tenga n'inscrit plus l'ajout au journal
DO $$
DECLARE
  d text := pg_get_functiondef('app.ajouter_admin_tenga(uuid)'::regprocedure);
  n text := d;
BEGIN
  IF length(d) - length(replace(d, $a$PERFORM private.journaliser(v_uid, 'admin.ajouter', 'utilisateur', p_utilisateur);$a$, '')) <> length($a$PERFORM private.journaliser(v_uid, 'admin.ajouter', 'utilisateur', p_utilisateur);$a$) THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  n := replace(n, $a$PERFORM private.journaliser(v_uid, 'admin.ajouter', 'utilisateur', p_utilisateur);$a$, $b$PERFORM 1;$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
