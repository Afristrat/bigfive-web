-- mutation: le complément d'un groupe est publié quel que soit son effectif (aucun contrôle du complément, plancher de la table retiré)
DO $$
DECLARE
  d text := pg_get_functiondef('private.poser_agregats(uuid)'::regprocedure);
  n text := replace(replace(d, 'WHERE (c.n = 0 OR c.n >= v_seuil)', 'WHERE true'), 'OR (SELECT r.n FROM reste r WHERE r.domaine = pu.domaine) >= v_seuil)', 'OR true)');
BEGIN
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
ALTER TABLE app.group_aggregates DROP CONSTRAINT effectif_publie_plancher;
