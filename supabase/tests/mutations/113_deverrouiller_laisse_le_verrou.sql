-- mutation: le déverrouillage n'efface pas l'état du compte
DO $$
DECLARE
  d text := pg_get_functiondef('app.deverrouiller_mot_de_passe(uuid)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$DELETE FROM private.etat_mdp WHERE user_id = p_utilisateur;$a$, $b$DELETE FROM private.etat_mdp WHERE false;$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
