-- mutation: le contrôle de ce qui reste hors des groupes publiés (attaque par différence) est retiré, seul l'effectif du complément est contrôlé
DO $$
DECLARE
  d text := pg_get_functiondef('private.poser_agregats(uuid)'::regprocedure);
  n text := replace(d, 'OR (SELECT r.n FROM reste r WHERE r.domaine = pu.domaine) >= v_seuil)', 'OR true)');
BEGIN
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
