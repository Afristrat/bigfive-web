-- mutation: la gestion des groupes ne vérifie plus que l'appelant gère l'organisation (toute personne connectée gère)
DO $$
DECLARE
  d text := pg_get_functiondef('private.autoriser_composition(uuid)'::regprocedure);
  n text := replace(d, 'IF NOT FOUND OR NOT private.peut_gerer(v_org) THEN', 'IF NOT FOUND THEN');
BEGIN
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
