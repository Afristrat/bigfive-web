-- mutation: app.relire_bloc ne retire plus les espaces Unicode (insécables, fines, idéographique...) qui entourent le commentaire
DO $m$
DECLARE
  d text := pg_get_functiondef('app.relire_bloc(text, text, text, text)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff$a$, '');
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $m$;
