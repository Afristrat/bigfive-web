-- mutation: app.reseau_releve rend les réponses de tout le groupe, pas seulement celles du répondant
DO $$
DECLARE
  d text := pg_get_functiondef('app.reseau_releve(uuid)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$FROM app.reseau_reponses r WHERE r.repondant = p_participation), '[]'::jsonb));$a$, $b$FROM app.reseau_reponses r WHERE r.group_id = v_groupe), '[]'::jsonb));$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
