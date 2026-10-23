-- mutation: la purge quotidienne oublie le relevé du réseau (ni réponses ni lignes de membre échues supprimées)
DO $$
DECLARE
  d text := pg_get_functiondef('private.purger_quotidien()'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$DELETE FROM app.reseau_reponses
   WHERE repondu_le <$a$, $b$DELETE FROM app.reseau_reponses
   WHERE false AND repondu_le <$b$);
  n := replace(n, $a$DELETE FROM app.reseau_membres
   WHERE maj_le <$a$, $b$DELETE FROM app.reseau_membres
   WHERE false AND maj_le <$b$);
  IF n = d OR position('false AND maj_le' IN n) = 0 OR position('false AND repondu_le' IN n) = 0 THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
