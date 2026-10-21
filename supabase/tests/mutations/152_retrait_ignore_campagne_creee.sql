-- mutation: le retrait supprime le créateur d'une campagne
DO $$
DECLARE
  d text := pg_get_functiondef('app.retirer_compte_sans_appartenance(uuid)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$app.campaigns c WHERE c.cree_par = p_utilisateur$a$, $b$app.campaigns c WHERE false$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
