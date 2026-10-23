-- mutation: retirer l'accord de réponse (app.reseau_consentir avec p_repondre faux) ne supprime plus les réponses
DO $$
DECLARE
  d text := pg_get_functiondef('app.reseau_consentir(uuid, boolean, boolean)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$    DELETE FROM app.reseau_reponses r WHERE r.repondant = p_participation;
  END IF;
  PERFORM private.journaliser(v_uid, 'reseau.consentir'$a$, $b$    NULL;
  END IF;
  PERFORM private.journaliser(v_uid, 'reseau.consentir'$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
