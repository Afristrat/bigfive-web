-- mutation: retirer_admin_tenga n'inscrit plus le retrait au journal
DO $$
DECLARE
  d text := pg_get_functiondef('app.retirer_admin_tenga(uuid)'::regprocedure);
  n text := d;
BEGIN
  IF length(d) - length(replace(d, $a$PERFORM private.journaliser(v_uid, 'admin.retirer', 'utilisateur', p_utilisateur);$a$, '')) <> length($a$PERFORM private.journaliser(v_uid, 'admin.retirer', 'utilisateur', p_utilisateur);$a$) THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  n := replace(n, $a$PERFORM private.journaliser(v_uid, 'admin.retirer', 'utilisateur', p_utilisateur);$a$, $b$PERFORM 1;$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
