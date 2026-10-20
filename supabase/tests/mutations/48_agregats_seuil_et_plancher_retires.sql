-- mutation: seuil d'anonymat retiré de la photographie ET plancher d'effectif retiré de la table (plus aucune ceinture)
DO $$
DECLARE
  d text := pg_get_functiondef('private.poser_agregats(uuid)'::regprocedure);
  n text := replace(d, 'v_seuil  integer := (SELECT s.seuil_anonymat FROM private.settings s)', 'v_seuil  integer := 1');
BEGIN
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
ALTER TABLE app.group_aggregates DROP CONSTRAINT effectif_publie_plancher;
