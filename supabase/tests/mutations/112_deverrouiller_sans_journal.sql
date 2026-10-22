-- mutation: le déverrouillage ne laisse pas la trace attendue
DO $$
DECLARE
  d text := pg_get_functiondef('app.deverrouiller_mot_de_passe(uuid)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$'connexion.mdp.deverrouillage'$a$, $b$'connexion.mdp.autre'$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
