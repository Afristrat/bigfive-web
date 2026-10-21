-- mutation: lister_administrateurs_tenga trie par identifiant et non par date d'ajout
DO $$
DECLARE
  d text := pg_get_functiondef('app.lister_administrateurs_tenga()'::regprocedure);
  n text := d;
BEGIN
  IF length(d) - length(replace(d, $a$ORDER BY a.ajoute_le, a.user_id$a$, '')) <> length($a$ORDER BY a.ajoute_le, a.user_id$a$) THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  n := replace(n, $a$ORDER BY a.ajoute_le, a.user_id$a$, $b$ORDER BY a.user_id$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
