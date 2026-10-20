-- mutation: le seuil d'anonymat lu par la photographie est abaissé à 1 dans la fonction (la contrainte de la table reste en place)
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
