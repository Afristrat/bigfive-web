-- mutation: app.reseau_retirer exige une campagne ouverte : le retrait est refusé après la clôture
DO $$
DECLARE
  d text := pg_get_functiondef('app.reseau_retirer(uuid)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$FROM private.reseau_participation(p_participation, v_uid) r;$a$, $b$FROM private.reseau_participation(p_participation, v_uid) r WHERE r.campagne_statut = 'ouverte';$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
