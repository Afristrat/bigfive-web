-- mutation: les fonctions de gestion des groupes ne contrôlent plus le brouillon (seul le déclencheur de gel retient encore)
DO $$
DECLARE
  d text := pg_get_functiondef('private.autoriser_composition(uuid)'::regprocedure);
  n text := replace(d, 'IF v_statut <> ''brouillon'' THEN', 'IF false THEN');
BEGIN
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
