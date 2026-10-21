-- mutation: le retrait supprime un compte qui a une participation
DO $$
DECLARE
  d text := pg_get_functiondef('app.retirer_compte_sans_appartenance(uuid)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$app.participations p WHERE p.user_id = p_utilisateur$a$, $b$app.participations p WHERE false$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
