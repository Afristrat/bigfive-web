-- mutation: une connexion réussie efface un blocage ou un verrouillage posé par un autre essai
DO $$
DECLARE
  d text := pg_get_functiondef('app.mdp_succes(uuid,bigint)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$IF FOUND AND v_etat.cause IS DISTINCT FROM v_essai.id$a$, $b$IF false AND v_etat.cause IS DISTINCT FROM v_essai.id$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
