-- mutation: lister_administrateurs_tenga ne désigne plus la ligne de l'appelant (est_moi toujours faux)
DO $$
DECLARE
  d text := pg_get_functiondef('app.lister_administrateurs_tenga()'::regprocedure);
  n text := d;
BEGIN
  IF length(d) - length(replace(d, $a$(a.user_id = v_uid)$a$, '')) <> length($a$(a.user_id = v_uid)$a$) THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  n := replace(n, $a$(a.user_id = v_uid)$a$, $b$false$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
