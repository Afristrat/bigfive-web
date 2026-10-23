-- mutation: app.reseau_consentir accepte une campagne close
DO $$
DECLARE
  d text := pg_get_functiondef('app.reseau_consentir(uuid, boolean, boolean)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$WHERE c.id = v_campagne AND c.statut = 'ouverte' FOR SHARE OF c$a$, $b$WHERE c.id = v_campagne FOR SHARE OF c$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
